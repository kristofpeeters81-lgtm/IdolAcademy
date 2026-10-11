import type { Landmark, PoseFrame } from './types';

/**
 * Opnames van bewegingen als testdata (#31). Er worden énkel lichaamspunten bewaard, nooit
 * beelden (#4). Een opname + "hoeveel deed je er echt?" wordt een automatische test.
 */
export const RECORDING_FORMAT = 'idol-academy-opname';
export const RECORDING_VERSION = 1;
/** Maximale opnameduur (s): begrenst de bestandsgrootte (~30 KB per seconde). */
export const MAX_RECORDING_SECONDS = 90;

export interface Recording {
  format: typeof RECORDING_FORMAT;
  version: number;
  /** Welke detector getest werd (DetectorId). */
  detector: string;
  /** Wat de speler/tester zelf telde. */
  expected: number;
  /** Wat de detector tijdens de opname telde (ter vergelijking). */
  detected: number;
  note: string;
  recordedAt: string;
  app: string;
  aspect: number;
  /** t = ms sinds start; lm = [x, y, z, zichtbaarheid] × 33, of null = niemand in beeld. */
  frames: { t: number; lm: number[][] | null }[];
}

const r4 = (n: number) => Math.round(n * 10_000) / 10_000;

export class RecordingBuilder {
  private readonly frames: Recording['frames'] = [];
  private start: number | null = null;
  private aspect = 4 / 3;

  push(frame: PoseFrame): void {
    this.start ??= frame.timestamp;
    const t = Math.round(frame.timestamp - this.start);
    if (t > MAX_RECORDING_SECONDS * 1000) return;
    this.aspect = frame.aspect;
    this.frames.push({ t, lm: frame.landmarks ? frame.landmarks.map((p) => [r4(p.x), r4(p.y), r4(p.z), r4(p.visibility)]) : null });
  }

  get seconds(): number {
    return this.frames.length > 0 ? this.frames[this.frames.length - 1].t / 1000 : 0;
  }

  build(meta: { detector: string; expected: number; detected: number; note: string; app: string }): Recording {
    return {
      format: RECORDING_FORMAT,
      version: RECORDING_VERSION,
      ...meta,
      recordedAt: new Date().toISOString(),
      aspect: r4(this.aspect),
      frames: this.frames,
    };
  }
}

/** Leest een opname terug en controleert het formaat. */
export function parseRecording(json: string): Recording {
  const data = JSON.parse(json) as Partial<Recording>;
  if (data.format !== RECORDING_FORMAT || typeof data.version !== 'number') throw new Error('Geen Idol Academy-opname');
  if (data.version > RECORDING_VERSION) throw new Error(`Opname-versie ${data.version} is nieuwer dan deze app`);
  if (typeof data.detector !== 'string' || typeof data.expected !== 'number' || !Array.isArray(data.frames) || typeof data.aspect !== 'number') {
    throw new Error('Opname is onvolledig');
  }
  return data as Recording;
}

/** Zet een opname terug om naar camerabeelden, zodat ze door de motor kunnen lopen. */
export function recordingToFrames(rec: Recording): PoseFrame[] {
  return rec.frames.map((f) => ({
    timestamp: 1000 + f.t,
    inferenceMs: 0,
    aspect: rec.aspect,
    landmarks: f.lm ? f.lm.map(([x, y, z, visibility]): Landmark => ({ x, y, z, visibility })) : null,
  }));
}

/** Bestandsnaam zoals "opname-squat-2026-10-11-1432.json". */
export function recordingFileName(detector: string, date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `opname-${detector}-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}.json`;
}
