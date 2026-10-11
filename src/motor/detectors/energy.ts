import { isVisible, type BodyPose, type Vec2 } from '../body';
import { LM } from '../landmarks';
import { fmt, type Detector, type DetectorReading } from './common';

/**
 * Bewegingsenergie: de basis voor de Power-score (#26). Gemiddelde snelheid van de grote
 * gewrichten in romplengtes per seconde, afgevlakt over ~0,5 s.
 *
 * Voorlopige zones (worden in blok 4 afgesteld op de opnames, #31):
 *   < 0,6 rustig · < 1,5 matig · < 3 intens · ≥ 3 explosief
 */
export const ENERGY = {
  joints: [
    LM.leftWrist,
    LM.rightWrist,
    LM.leftElbow,
    LM.rightElbow,
    LM.leftKnee,
    LM.rightKnee,
    LM.leftAnkle,
    LM.rightAnkle,
    LM.leftHip,
    LM.rightHip,
    LM.leftShoulder,
    LM.rightShoulder,
  ],
  /** Afvlaktijd (s). */
  tau: 0.5,
  zones: [
    { max: 0.6, label: 'rustig' },
    { max: 1.5, label: 'matig' },
    { max: 3, label: 'intens' },
    { max: Infinity, label: 'explosief' },
  ],
  /** Sprongen in tijd (bv. na een pauze) niet als snelheid meetellen. */
  maxGapMs: 250,
};

export function energyZone(value: number): string {
  return ENERGY.zones.find((z) => value < z.max)?.label ?? 'explosief';
}

export class EnergyMeter implements Detector {
  private prev: { t: number; pts: Vec2[]; vis: boolean[] } | null = null;
  private value = 0;
  private peak = 0;
  /** Som van energie × tijd: "hoeveel werk" in totaal (romp). */
  private work = 0;

  get energy(): number {
    return this.value;
  }

  update(b: BodyPose): void {
    if (!b.present || b.torso <= 0) {
      this.prev = null;
      return;
    }
    const vis = ENERGY.joints.map((i) => isVisible(b, i));
    const pts = ENERGY.joints.map((i) => b.pts[i]);
    const prev = this.prev;
    this.prev = { t: b.t, pts, vis };
    if (!prev) return;
    const dt = (b.t - prev.t) / 1000;
    if (dt <= 0 || dt * 1000 > ENERGY.maxGapMs) return;

    let sum = 0;
    let n = 0;
    for (let j = 0; j < pts.length; j++) {
      if (!vis[j] || !prev.vis[j]) continue;
      sum += Math.hypot(pts[j].x - prev.pts[j].x, pts[j].y - prev.pts[j].y) / b.torso / dt;
      n++;
    }
    if (n < 4) return;
    const speed = sum / n;
    const a = 1 - Math.exp(-dt / ENERGY.tau);
    this.value += (speed - this.value) * a;
    this.peak = Math.max(this.peak, this.value);
    this.work += this.value * dt;
  }

  reading(): DetectorReading {
    return {
      count: Math.round(this.work * 10) / 10,
      unit: 'werk (romp)',
      signal: this.value,
      thresholds: ENERGY.zones.slice(0, 3).map((z) => z.max),
      state: energyZone(this.value),
      detail: `energie ${fmt(this.value)} · piek ${fmt(this.peak)}`,
    };
  }

  reset(): void {
    this.prev = null;
    this.value = 0;
    this.peak = 0;
    this.work = 0;
  }
}
