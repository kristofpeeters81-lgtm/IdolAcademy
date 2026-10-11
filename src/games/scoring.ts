import { ENERGY } from '../motor/detectors/energy';

/**
 * Leeftijd, doelen en sterren (#10, #30). Iedereen speelt tegen zijn eigen leeftijdsdoel, zodat
 * een 6-jarige eerlijk kan winnen van een 12-jarige.
 */

/** Keuzes in de app: 6..12, en 13 = "13+ / volwassene". */
export const AGES = [6, 7, 8, 9, 10, 11, 12, 13] as const;
export type Age = (typeof AGES)[number];

export const ageLabel = (age: number): string => (age >= 13 ? '13+' : String(age));

export function isAge(value: unknown): value is Age {
  return typeof value === 'number' && (AGES as readonly number[]).includes(value);
}

/** Doel uit een tabel per leeftijd (jonger dan 6 → 6, ouder dan 13 → 13). */
export function goalFor(goals: Readonly<Record<Age, number>>, age: number): number {
  const a = Math.min(13, Math.max(6, Math.round(age))) as Age;
  return goals[a];
}

export const percentOf = (value: number, goal: number): number => (goal > 0 ? Math.round((value / goal) * 100) : 0);

/** Sterren: ≥ 50% ★ · ≥ 80% ★★ · ≥ 100% ★★★ (voorlopig, #45). */
export const STAR_THRESHOLDS = [50, 80, 100] as const;

export function starsFor(percent: number): 0 | 1 | 2 | 3 {
  return STAR_THRESHOLDS.filter((t) => percent >= t).length as 0 | 1 | 2 | 3;
}

/** Zone-index 0..3 voor een energie (zelfde grenzen als de energiemeter). */
export function zoneIndex(energy: number): number {
  const i = ENERGY.zones.findIndex((z) => energy < z.max);
  return i === -1 ? 3 : i;
}

/** Telt hoeveel seconden er in elke Power-zone bewogen werd. */
export class ZoneTimer {
  readonly seconds: [number, number, number, number] = [0, 0, 0, 0];

  add(energy: number, dtMs: number): void {
    this.seconds[zoneIndex(energy)] += dtMs / 1000;
  }

  /** Aandeel van de tijd in "intens" of "explosief" (0..1). */
  get intenseShare(): number {
    const total = this.seconds.reduce((a, b) => a + b, 0);
    return total > 0 ? (this.seconds[2] + this.seconds[3]) / total : 0;
  }
}
