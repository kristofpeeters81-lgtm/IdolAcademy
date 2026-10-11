import { isVisible, type BodyPose, type Vec2 } from '../body';
import { LM } from '../landmarks';
import { fmt, type Detector, type DetectorReading } from './common';

/**
 * Bewegingsenergie: de basis voor de Power-score (#26). Gemiddelde snelheid van de grote
 * gewrichten in romplengtes per seconde, afgevlakt over ~0,5 s.
 *
 * Snelheid wordt gemeten over ~100 ms (`spanMs`), niet van beeld tot beeld: de punten trillen
 * altijd een beetje, en dat trillen gedeeld door een heel klein tijdsverschil zou op een snel
 * toestel (meer beelden per seconde) schijnbaar veel "energie" geven. Zo is de meting even
 * eerlijk op 15 als op 60 fps.
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
  /** Verplaatsing meten over minstens zoveel tijd (ms). */
  spanMs: 100,
  /** Sprongen in tijd (bv. na een pauze) niet als snelheid meetellen. */
  maxGapMs: 400,
};

export function energyZone(value: number): string {
  return ENERGY.zones.find((z) => value < z.max)?.label ?? 'explosief';
}

export class EnergyMeter implements Detector {
  /** Recente houdingen (± de laatste `maxGapMs`), oudste eerst. */
  private history: { t: number; pts: Vec2[]; vis: boolean[] }[] = [];
  private value = 0;
  private peak = 0;
  /** Som van energie × tijd: "hoeveel werk" in totaal (romp). */
  private work = 0;

  get energy(): number {
    return this.value;
  }

  update(b: BodyPose): void {
    if (!b.present || b.torso <= 0) {
      this.history = [];
      return;
    }
    const vis = ENERGY.joints.map((i) => isVisible(b, i));
    const pts = ENERGY.joints.map((i) => b.pts[i]);
    // Vorige meetpunt: het recentste dat minstens `spanMs` oud is.
    let ref: (typeof this.history)[number] | null = null;
    for (const h of this.history) if (b.t - h.t >= ENERGY.spanMs) ref = h;
    this.history.push({ t: b.t, pts, vis });
    while (this.history.length > 0 && b.t - this.history[0].t > ENERGY.maxGapMs) this.history.shift();
    if (!ref) return;
    const dt = (b.t - ref.t) / 1000;

    let sum = 0;
    let n = 0;
    for (let j = 0; j < pts.length; j++) {
      if (!vis[j] || !ref.vis[j]) continue;
      sum += Math.hypot(pts[j].x - ref.pts[j].x, pts[j].y - ref.pts[j].y) / b.torso / dt;
      n++;
    }
    if (n < 4) return;
    const speed = sum / n;
    // Afvlakken per verstreken tijd sinds het vorige beeld (niet sinds het meetpunt).
    const prev = this.history.length >= 2 ? this.history[this.history.length - 2].t : ref.t;
    const step = (b.t - prev) / 1000;
    const a = 1 - Math.exp(-step / ENERGY.tau);
    this.value += (speed - this.value) * a;
    this.peak = Math.max(this.peak, this.value);
    this.work += this.value * step;
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
    this.history = [];
    this.value = 0;
    this.peak = 0;
    this.work = 0;
  }
}
