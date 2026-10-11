import { allVisible, type BodyPose } from '../body';
import { LM } from '../landmarks';
import { clamp, fmt, RepCounter, type Detector, type DetectorReading } from './common';

/**
 * Jumping jacks (opwarming). "Openheid" combineert armen en benen:
 * - armen: polsen t.o.v. de schouders (−1,1 romp = handen naast de heupen, +1,1 = boven het hoofd);
 * - benen: afstand tussen de enkels (≈0,5 romp gesloten, ≥1,3 romp open).
 * Eén herhaling = open en terug dicht.
 */
export const JUMPING_JACK = {
  enter: 0.7,
  exit: 0.3,
  minRepMs: 200,
  armWeight: 0.6,
};

const NEEDED = [LM.leftShoulder, LM.rightShoulder, LM.leftWrist, LM.rightWrist, LM.leftAnkle, LM.rightAnkle];

export class JumpingJackDetector implements Detector {
  private readonly reps = new RepCounter(JUMPING_JACK.enter, JUMPING_JACK.exit, JUMPING_JACK.minRepMs);
  private open: number | null = null;

  update(b: BodyPose): void {
    if (!b.present || b.torso <= 0 || !allVisible(b, NEEDED)) {
      this.open = null;
      return;
    }
    const p = b.pts;
    const armUp = (s: number, w: number) => clamp(((p[s].y - p[w].y) / b.torso + 1.1) / 2.2);
    const arms = (armUp(LM.leftShoulder, LM.leftWrist) + armUp(LM.rightShoulder, LM.rightWrist)) / 2;
    const spread = Math.abs(p[LM.leftAnkle].x - p[LM.rightAnkle].x) / b.torso;
    const legs = clamp((spread - 0.5) / 0.8);
    this.open = JUMPING_JACK.armWeight * arms + (1 - JUMPING_JACK.armWeight) * legs;
    this.reps.update(this.open, b.t);
  }

  reading(): DetectorReading {
    return {
      count: this.reps.count,
      unit: 'jumping jacks',
      signal: this.open,
      thresholds: [JUMPING_JACK.enter, JUMPING_JACK.exit],
      state: this.open === null ? 'armen/voeten niet zichtbaar' : this.reps.active ? 'open' : 'dicht',
      detail: `openheid ${this.open === null ? '–' : fmt(this.open)}`,
    };
  }

  reset(): void {
    this.reps.reset();
    this.open = null;
  }
}
