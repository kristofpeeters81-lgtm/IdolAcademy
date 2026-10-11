import { countVisibleBodyPoints } from './landmarks';
import { decideAutoModel } from './modelChoice';
import { PoseTracker } from './poseTracker';
import { SessionRecorder, type SessionSummary } from './sessionStats';
import { RateMeter, RollingAverage } from './stats';
import type { Delegate, ModelVariant, PoseFrame } from './types';

/**
 * De bewegingsmotor: leest elk nieuw camerabeeld, laat het model de houding bepalen en geeft
 * het resultaat door aan wie luistert (later: de minigames). Houdt ook de prestatiecijfers bij
 * en kiest in "auto" zelf tussen het lite- en full-model.
 */

export type ModelMode = 'auto' | ModelVariant;

export interface EngineStats {
  /** Nieuwe camerabeelden per seconde. */
  cameraFps: number;
  /** Gedetecteerde beelden per seconde (= wat de games effectief krijgen). */
  detectionFps: number;
  /** Gemiddelde rekentijd van het model per beeld (ms). */
  inferenceMs: number;
  mode: ModelMode;
  variant: ModelVariant | null;
  delegate: Delegate | null;
  /** Wordt er net een model geladen? */
  loading: boolean;
  /** Zichtbare kernpunten van het lichaam (0..9). */
  visibleBodyPoints: number;
  /** Laadtijd van het laatst geladen model (ms). */
  modelLoadMs: number | null;
  /** Werd full in auto-modus afgekeurd (te traag)? */
  fullRejected: boolean;
  lastError: string | null;
  /** Samenvatting van de laatste minuut met het huidige model (null = nog te weinig data). */
  session: SessionSummary | null;
}

export type FrameListener = (frame: PoseFrame) => void;

export class PoseEngine {
  private tracker: PoseTracker | null = null;
  private mode: ModelMode = 'auto';
  private loading = false;
  private fullRejected = false;
  private modelSince = 0;
  private modelLoadMs: number | null = null;
  private lastError: string | null = null;
  private lastVideoTime = -1;
  private visibleBodyPoints = 0;
  private rafId = 0;
  private lastAutoCheck = 0;
  private readonly listeners = new Set<FrameListener>();
  private readonly cameraRate = new RateMeter();
  private readonly detectionRate = new RateMeter();
  private readonly inference = new RollingAverage(30);
  private readonly session = new SessionRecorder();

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly baseUrl: string,
  ) {}

  onFrame(listener: FrameListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Kiest het model. "auto" start (of blijft) op lite en waardeert zelf op als het kan. */
  async setMode(mode: ModelMode): Promise<void> {
    this.mode = mode;
    if (mode === 'auto') this.fullRejected = false;
    const wanted: ModelVariant = mode === 'auto' ? (this.tracker?.variant ?? 'lite') : mode;
    if (this.tracker?.variant !== wanted) await this.load(wanted);
  }

  start(): void {
    if (this.rafId) return;
    const loop = (now: number) => {
      this.rafId = requestAnimationFrame(loop);
      this.tick(now);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  dispose(): void {
    this.stop();
    this.listeners.clear();
    this.tracker?.close();
    this.tracker = null;
  }

  getStats(now = performance.now()): EngineStats {
    return {
      cameraFps: this.cameraRate.rate(now),
      detectionFps: this.detectionRate.rate(now),
      inferenceMs: this.inference.average,
      mode: this.mode,
      variant: this.tracker?.variant ?? null,
      delegate: this.tracker?.delegate ?? null,
      loading: this.loading,
      visibleBodyPoints: this.visibleBodyPoints,
      modelLoadMs: this.modelLoadMs,
      fullRejected: this.fullRejected,
      lastError: this.lastError,
      session: this.session.summary(now),
    };
  }

  private tick(now: number): void {
    const video = this.video;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.currentTime === this.lastVideoTime) return;
    this.lastVideoTime = video.currentTime;
    this.cameraRate.tick(now);
    // Tijdens het laden van een ander model blijft het huidige model gewoon detecteren;
    // pas als het nieuwe klaar (en opgewarmd) is, wordt gewisseld.
    if (!this.tracker) return;

    let frame: PoseFrame;
    try {
      frame = this.tracker.detect(video, now);
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
      return;
    }
    this.detectionRate.tick(now);
    this.inference.push(frame.inferenceMs);
    this.visibleBodyPoints = countVisibleBodyPoints(frame.landmarks);
    this.session.push({ t: now, inferenceMs: frame.inferenceMs, visible: this.visibleBodyPoints });
    for (const listener of this.listeners) listener(frame);

    if (this.mode === 'auto' && now - this.lastAutoCheck > 1000) {
      this.lastAutoCheck = now;
      this.autoCheck(now);
    }
  }

  private autoCheck(now: number): void {
    if (!this.tracker) return;
    const decision = decideAutoModel({
      current: this.tracker.variant,
      secondsOnModel: (now - this.modelSince) / 1000,
      detectionFps: this.detectionRate.rate(now),
      inferenceMs: this.inference.average,
      fullRejected: this.fullRejected,
    });
    if (decision === 'upgrade') void this.load('full');
    if (decision === 'downgrade') {
      this.fullRejected = true;
      void this.load('lite');
    }
  }

  private async load(variant: ModelVariant): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    const start = performance.now();
    try {
      const next = await PoseTracker.create({ variant, baseUrl: this.baseUrl });
      // Opwarmbeeld: het allereerste beeld kost op GPU ~0,5–1 s (shaders compileren). Dat gebeurt
      // nu tijdens het laden, en telt niet mee in de prestatiecijfers.
      if (this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        try {
          next.detect(this.video, performance.now());
        } catch {
          // Opwarmen is optioneel; een fout hier verschijnt bij de eerste echte detectie.
        }
      }
      this.tracker?.close();
      this.tracker = next;
      this.modelLoadMs = performance.now() - start;
      this.lastError = null;
    } catch (err) {
      this.lastError = `Model "${variant}" laden mislukt: ${err instanceof Error ? err.message : String(err)}`;
      if (variant === 'full') this.fullRejected = true;
      if (!this.tracker) throw err;
    } finally {
      this.loading = false;
      this.modelSince = performance.now();
      this.detectionRate.reset();
      this.inference.reset();
      this.session.reset();
    }
  }
}
