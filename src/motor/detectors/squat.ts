import { allVisible, type BodyPose } from '../body';
import { LM } from '../landmarks';
import { clamp, fmt, RepCounter, WindowMax, type Detector, type DetectorReading } from './common';

/**
 * Squats (Jump Squad). Van voren gezien gaan de knieën bij een squat vooral naar de camera toe;
 * een kniehoek in 2D is dan onbetrouwbaar. Wat wél zichtbaar is: het dijbeen wordt in beeld
 * "korter" (heup zakt naar de knie toe).
 *
 * diepte = 1 − (knie.y − heup.y) / (dezelfde afstand rechtop)   → 0 rechtop, ~0,75 bij een volle squat
 *
 * "Rechtop" = het maximum van de laatste 10 s, in romplengtes (zo maakt afstand niet uit).
 * Een sprongsquat telt als bonus: beide enkels komen kort na een squat ≥ 0,12 romp van de vloer.
 */
export const SQUAT = {
  /** Vanaf deze diepte zit je "in" de squat (kinderen zakken vaak niet diep: bewust mild). */
  enter: 0.35,
  /** Terug onder deze diepte = rechtop = herhaling geteld. */
  exit: 0.15,
  minRepMs: 300,
  /** Enkels zoveel romplengtes boven de vloer = sprong. */
  jumpHeight: 0.12,
  /** Een sprong telt als bonus binnen zoveel ms na een squat. */
  jumpWindowMs: 900,
  standingWindowMs: 10_000,
};

const NEEDED = [LM.leftHip, LM.rightHip, LM.leftKnee, LM.rightKnee];

export class SquatDetector implements Detector {
  private readonly reps = new RepCounter(SQUAT.enter, SQUAT.exit, SQUAT.minRepMs);
  private readonly standing = new WindowMax(SQUAT.standingWindowMs);
  private readonly floor = new WindowMax(SQUAT.standingWindowMs);
  private depth: number | null = null;
  private deepest = 0;
  private jumps = 0;
  private lastRepAt = -Infinity;
  private inAir = false;

  update(b: BodyPose): void {
    if (!b.present || b.torso <= 0 || !allVisible(b, NEEDED)) {
      this.depth = null;
      return;
    }
    const p = b.pts;
    const thigh = ((p[LM.leftKnee].y - p[LM.leftHip].y + (p[LM.rightKnee].y - p[LM.rightHip].y)) / 2) / b.torso;
    this.standing.push(thigh, b.t);
    const standing = this.standing.value ?? thigh;
    this.depth = standing > 0.2 ? clamp(1 - thigh / standing) : 0;
    if (this.reps.update(this.depth, b.t)) {
      this.lastRepAt = b.t;
      this.deepest = Math.max(this.deepest, this.reps.lastPeak);
    }

    // Sprong: beide enkels boven de vloer (vloer = laagste enkelpositie, grootste y).
    if (allVisible(b, [LM.leftAnkle, LM.rightAnkle])) {
      const ankles = (p[LM.leftAnkle].y + p[LM.rightAnkle].y) / 2 / b.torso;
      this.floor.push(ankles, b.t);
      const lift = (this.floor.value ?? ankles) - ankles;
      if (!this.inAir && lift >= SQUAT.jumpHeight) {
        this.inAir = true;
        if (b.t - this.lastRepAt <= SQUAT.jumpWindowMs || this.reps.active) this.jumps++;
      } else if (this.inAir && lift < SQUAT.jumpHeight / 2) {
        this.inAir = false;
      }
    }
  }

  reading(): DetectorReading {
    return {
      count: this.reps.count,
      unit: 'squats',
      signal: this.depth,
      thresholds: [SQUAT.enter, SQUAT.exit],
      state: this.depth === null ? 'heupen/knieën niet zichtbaar' : this.reps.active ? 'omlaag' : 'rechtop',
      detail: `diepte ${this.depth === null ? '–' : fmt(this.depth)} · diepste ${fmt(this.deepest)} · sprongsquats ${this.jumps}`,
    };
  }

  reset(): void {
    this.reps.reset();
    this.standing.reset();
    this.floor.reset();
    this.depth = null;
    this.deepest = 0;
    this.jumps = 0;
    this.inAir = false;
  }
}
