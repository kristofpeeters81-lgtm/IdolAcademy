import { allVisible, dist, type BodyPose } from '../body';
import { LM } from '../landmarks';
import { fmt, type Detector, type DetectorReading } from './common';

/**
 * Stoten (Beat Punch). Van voren zie je een stoot recht naar de camera nauwelijks; daarom
 * stoten we naar doelen links/rechts/omhoog, en die zijn wél zichtbaar.
 *
 * reikwijdte = afstand schouder ↔ pols, in romplengtes (gestrekte arm ≈ 1,15; dekking ≈ 0,5)
 *
 * Een stoot telt als de arm snel van gebogen (< `from`) naar gestrekt (> `to`) gaat binnen
 * `maxMs`, en de hand niet naar beneden wijst (anders telt "armen laten hangen" mee).
 */
export const PUNCH = {
  from: 0.7,
  to: 0.95,
  /** Terug onder deze reikwijdte = klaar voor de volgende stoot met die arm. */
  rearm: 0.8,
  maxMs: 500,
  /** Hand mag niet lager zijn dan (heup − zoveel romp): anders hangt de arm gewoon. */
  minAboveHip: 0.3,
};

export type PunchDirection = 'links' | 'rechts' | 'omhoog';

interface Arm {
  shoulder: number;
  wrist: number;
  /** Laatste moment dat deze arm gebogen was. */
  bentAt: number;
  armed: boolean;
  count: number;
  reach: number | null;
}

export class PunchDetector implements Detector {
  private readonly arms: Arm[] = [
    { shoulder: LM.leftShoulder, wrist: LM.leftWrist, bentAt: -Infinity, armed: true, count: 0, reach: null },
    { shoulder: LM.rightShoulder, wrist: LM.rightWrist, bentAt: -Infinity, armed: true, count: 0, reach: null },
  ];
  private lastDirection: PunchDirection | null = null;
  /** Stoten sinds de vorige `takePunches()` (voor games die op timing werken). */
  private log: { t: number; direction: PunchDirection }[] = [];

  /** Geeft de nieuwe stoten (tijd + richting vanuit de speler) en leegt de lijst. */
  takePunches(): { t: number; direction: PunchDirection }[] {
    const out = this.log;
    this.log = [];
    return out;
  }
  private readonly directions: Record<PunchDirection, number> = { links: 0, rechts: 0, omhoog: 0 };

  update(b: BodyPose): void {
    for (const arm of this.arms) {
      if (!b.present || b.torso <= 0 || !allVisible(b, [arm.shoulder, arm.wrist, LM.leftHip, LM.rightHip])) {
        arm.reach = null;
        continue;
      }
      const s = b.pts[arm.shoulder];
      const w = b.pts[arm.wrist];
      const reach = dist(s, w) / b.torso;
      arm.reach = reach;
      if (reach < PUNCH.from) arm.bentAt = b.t;
      if (reach < PUNCH.rearm) arm.armed = true;

      const hipY = (b.pts[LM.leftHip].y + b.pts[LM.rightHip].y) / 2;
      const handHighEnough = w.y < hipY - PUNCH.minAboveHip * b.torso;
      const dx = w.x - s.x;
      const dy = w.y - s.y;
      const pointsDown = dy > Math.abs(dx); // meer dan 45° naar beneden
      if (arm.armed && reach > PUNCH.to && b.t - arm.bentAt <= PUNCH.maxMs && handHighEnough && !pointsDown) {
        arm.armed = false;
        arm.count++;
        // Richting vanuit de spéler: x groter = zijn linkerkant.
        const dir: PunchDirection = -dy > Math.abs(dx) ? 'omhoog' : dx > 0 ? 'links' : 'rechts';
        this.lastDirection = dir;
        this.log.push({ t: b.t, direction: dir });
        this.directions[dir]++;
      }
    }
  }

  reading(): DetectorReading {
    const reaches = this.arms.map((a) => a.reach).filter((v): v is number => v !== null);
    const d = this.directions;
    return {
      count: this.arms[0].count + this.arms[1].count,
      unit: 'stoten',
      signal: reaches.length > 0 ? Math.max(...reaches) : null,
      thresholds: [PUNCH.to, PUNCH.from],
      state: reaches.length === 0 ? 'armen niet zichtbaar' : this.lastDirection ? `laatste: ${this.lastDirection}` : 'klaar',
      detail: `links ${d.links} · rechts ${d.rechts} · omhoog ${d.omhoog} · reikwijdte ${reaches.length ? fmt(Math.max(...reaches)) : '–'}`,
    };
  }

  reset(): void {
    for (const arm of this.arms) {
      arm.bentAt = -Infinity;
      arm.armed = true;
      arm.count = 0;
      arm.reach = null;
    }
    this.lastDirection = null;
    this.log = [];
    this.directions.links = this.directions.rechts = this.directions.omhoog = 0;
  }
}
