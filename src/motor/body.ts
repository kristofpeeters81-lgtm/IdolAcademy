import { LM, LANDMARK_COUNT, VISIBLE_THRESHOLD } from './landmarks';
import type { PoseFrame } from './types';

/**
 * Normalisatie (#25): zet de ruwe MediaPipe-punten om naar een lichaam waarmee detectoren
 * kunnen rekenen, onafhankelijk van de afstand tot de camera en de lengte van het kind.
 *
 * - Eenheid "beeldhoogte": x wordt met de beeldverhouding vermenigvuldigd, zodat 0,1 horizontaal
 *   evenveel is als 0,1 verticaal.
 * - Schaal "romplengte" (torso): afstand midden-schouders ↔ midden-heupen. Detectoren drukken al
 *   hun drempels uit in romplengtes (bv. "heup zakt 0,4 romp").
 * - y loopt naar beneden (zoals in het beeld). x is het ruwe camerabeeld, niet gespiegeld: de
 *   linkerkant van de speler ligt in het beeld rechts (grotere x).
 */

export interface Vec2 {
  x: number;
  y: number;
}

export interface BodyPose {
  /** Tijdstip (ms). */
  t: number;
  /** Er is iemand in beeld (MediaPipe vond een lichaam). */
  present: boolean;
  /** 33 punten in beeldhoogte-eenheden (leeg als present = false). */
  pts: Vec2[];
  /** Zichtbaarheid per punt (0..1). */
  vis: number[];
  /** Romplengte in beeldhoogte-eenheden (afgevlakt; 0 als nog onbekend). */
  torso: number;
  aspect: number;
}

export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);
export const mid = (a: Vec2, b: Vec2): Vec2 => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Is punt i zichtbaar in deze houding? */
export function isVisible(body: BodyPose, i: number): boolean {
  return body.present && (body.vis[i] ?? 0) >= VISIBLE_THRESHOLD;
}

export function allVisible(body: BodyPose, points: readonly number[]): boolean {
  return points.every((i) => isVisible(body, i));
}

export const shoulderMid = (b: BodyPose): Vec2 => mid(b.pts[LM.leftShoulder], b.pts[LM.rightShoulder]);
export const hipMid = (b: BodyPose): Vec2 => mid(b.pts[LM.leftHip], b.pts[LM.rightHip]);

const TORSO_POINTS = [LM.leftShoulder, LM.rightShoulder, LM.leftHip, LM.rightHip];

/**
 * Houdt de romplengte stabiel bij. Bij voorover buigen (squat) lijkt de romp korter; daarom het
 * 80e percentiel van de laatste ~3 s en niet de huidige waarde.
 */
export class BodyTracker {
  private readonly torsoSamples: number[] = [];

  constructor(private readonly sampleCount = 90) {}

  update(frame: PoseFrame): BodyPose {
    const lms = frame.landmarks;
    if (!lms || lms.length < LANDMARK_COUNT) {
      return { t: frame.timestamp, present: false, pts: [], vis: [], torso: this.torso(), aspect: frame.aspect };
    }
    const pts = lms.map((p) => ({ x: p.x * frame.aspect, y: p.y }));
    const vis = lms.map((p) => p.visibility);
    const body: BodyPose = { t: frame.timestamp, present: true, pts, vis, torso: 0, aspect: frame.aspect };
    if (allVisible(body, TORSO_POINTS)) {
      this.torsoSamples.push(dist(shoulderMid(body), hipMid(body)));
      if (this.torsoSamples.length > this.sampleCount) this.torsoSamples.shift();
    }
    body.torso = this.torso();
    return body;
  }

  reset(): void {
    this.torsoSamples.length = 0;
  }

  private torso(): number {
    if (this.torsoSamples.length === 0) return 0;
    const sorted = [...this.torsoSamples].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.8))];
  }
}
