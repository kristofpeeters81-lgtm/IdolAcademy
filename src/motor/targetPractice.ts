import type { BodyPose } from './body';
import type { Detector, DetectorReading } from './detectors/common';
import { hitsTarget, limbsOnScreen, type Limb, type Target } from './hit';

/**
 * Raak-oefening (proef voor Lightstick Catch): telkens één doel op het scherm; raak het met een
 * hand en er verschijnt een nieuw. Doelen staan in schermcoördinaten (zoals de speler het beeld
 * ziet), dus dit test meteen of spiegelen klopt.
 */
export const TARGETS = {
  radius: 0.08,
  /** Doelen binnen dit gebied (fractie van het beeld) — reikbaar voor kinderen. */
  xMin: 0.15,
  xMax: 0.85,
  yMin: 0.15,
  yMax: 0.6,
  /** Nieuw doel minstens zo ver van het vorige (anders "gratis" raak). */
  minJump: 0.3,
};

export class TargetPractice implements Detector {
  private current: Target;
  private hits = 0;
  private lastLimb: Limb | null = null;
  private lastHitAt: number | null = null;
  private times: number[] = [];

  constructor(
    private readonly mirrored: boolean,
    /** Breedte/hoogte van het beeld. */
    private readonly aspect: number,
    private readonly random: () => number = Math.random,
  ) {
    this.current = this.next(null);
  }

  target(): Target {
    return this.current;
  }

  update(b: BodyPose): void {
    const points = limbsOnScreen(b, this.mirrored, ['linkerhand', 'rechterhand']);
    const hit = hitsTarget(points, this.current, this.aspect);
    if (hit.length === 0) return;
    this.hits++;
    this.lastLimb = hit[0];
    if (this.lastHitAt !== null) this.times.push(b.t - this.lastHitAt);
    this.lastHitAt = b.t;
    this.current = this.next(this.current);
  }

  reading(): DetectorReading {
    const avg = this.times.length ? this.times.reduce((a, c) => a + c, 0) / this.times.length / 1000 : null;
    return {
      count: this.hits,
      unit: 'geraakt',
      signal: null,
      thresholds: [],
      state: this.lastLimb ? `raak met ${this.lastLimb}!` : 'raak het doel met je hand',
      detail: `gemiddeld ${avg === null ? '–' : avg.toFixed(1).replace('.', ',')} s per doel`,
    };
  }

  reset(): void {
    this.hits = 0;
    this.lastLimb = null;
    this.lastHitAt = null;
    this.times = [];
    this.current = this.next(null);
  }

  private next(prev: Target | null): Target {
    for (let i = 0; i < 20; i++) {
      const t = {
        x: TARGETS.xMin + this.random() * (TARGETS.xMax - TARGETS.xMin),
        y: TARGETS.yMin + this.random() * (TARGETS.yMax - TARGETS.yMin),
        radius: TARGETS.radius,
      };
      if (!prev || Math.hypot((t.x - prev.x) * this.aspect, t.y - prev.y) >= TARGETS.minJump) return t;
    }
    return { x: prev && prev.x < 0.5 ? 0.75 : 0.25, y: 0.35, radius: TARGETS.radius };
  }
}
