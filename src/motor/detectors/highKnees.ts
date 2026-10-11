import { allVisible, type BodyPose } from '../body';
import { LM } from '../landmarks';
import { CadenceMeter, clamp, fmt, RepCounter, WindowMax, type Detector, type DetectorReading } from './common';

/**
 * Knieën hoog / sprinten op de plaats (Spotlight Sprint). Per been: hoe ver komt de knie
 * omhoog t.o.v. de eigen heup? Gemeten t.o.v. de heup (niet de vloer), zodat meespringen niet
 * telt.
 *
 * heffing = 1 − (knie.y − heup.y) / (dezelfde afstand rechtop)   → 0 neer, ~0,85 dijbeen horizontaal
 *
 * Eén stap = één knie omhoog en terug. Tempo = stappen per minuut over de laatste 5 s.
 */
export const HIGH_KNEES = {
  enter: 0.3,
  exit: 0.12,
  minRepMs: 80,
  standingWindowMs: 10_000,
};

type Leg = { hip: number; knee: number; reps: RepCounter; standing: WindowMax; lift: number | null };

export class HighKneesDetector implements Detector {
  private readonly legs: Leg[] = [
    { hip: LM.leftHip, knee: LM.leftKnee, reps: this.counter(), standing: new WindowMax(HIGH_KNEES.standingWindowMs), lift: null },
    { hip: LM.rightHip, knee: LM.rightKnee, reps: this.counter(), standing: new WindowMax(HIGH_KNEES.standingWindowMs), lift: null },
  ];
  private readonly cadence = new CadenceMeter(5000);
  private t = 0;

  private counter(): RepCounter {
    return new RepCounter(HIGH_KNEES.enter, HIGH_KNEES.exit, HIGH_KNEES.minRepMs);
  }

  update(b: BodyPose): void {
    this.t = b.t;
    for (const leg of this.legs) {
      if (!b.present || b.torso <= 0 || !allVisible(b, [leg.hip, leg.knee])) {
        leg.lift = null;
        continue;
      }
      const rel = (b.pts[leg.knee].y - b.pts[leg.hip].y) / b.torso;
      leg.standing.push(rel, b.t);
      const standing = leg.standing.value ?? rel;
      leg.lift = standing > 0.2 ? clamp(1 - rel / standing) : 0;
      if (leg.reps.update(leg.lift, b.t)) this.cadence.hit(b.t);
    }
  }

  reading(): DetectorReading {
    const lifts = this.legs.map((l) => l.lift).filter((v): v is number => v !== null);
    const [l, r] = this.legs;
    return {
      count: l.reps.count + r.reps.count,
      unit: 'stappen',
      signal: lifts.length > 0 ? Math.max(...lifts) : null,
      thresholds: [HIGH_KNEES.enter, HIGH_KNEES.exit],
      state: lifts.length === 0 ? 'knieën niet zichtbaar' : l.reps.active || r.reps.active ? 'knie omhoog' : 'neer',
      detail: `tempo ${Math.round(this.cadence.perMinute(this.t))}/min · links ${l.reps.count} · rechts ${r.reps.count} · hoogste ${fmt(Math.max(l.reps.lastPeak, r.reps.lastPeak))}`,
    };
  }

  reset(): void {
    for (const leg of this.legs) {
      leg.reps.reset();
      leg.standing.reset();
      leg.lift = null;
    }
    this.cadence.reset();
  }
}
