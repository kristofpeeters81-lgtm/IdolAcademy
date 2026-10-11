import { allVisible, type BodyPose } from '../body';
import { LM } from '../landmarks';
import { fmt, type Detector, type DetectorReading } from './common';

/**
 * Klimmen op de plaats (Sky Climb): afwisselend links en rechts een hand hoog boven het hoofd
 * steken, alsof je een touw/ladder grijpt. Een klimstap telt enkel als de hand afwisselt
 * (twee keer dezelfde hand = geen klimmen). Een opgeheven knie aan de andere kant is bonus.
 *
 * hoogte hand = (neus.y − pols.y) / romp   → > 0,1 = boven het hoofd, < −0,3 = weer omlaag
 */
export const CLIMB = {
  up: 0.1,
  down: -0.3,
  /** Knie zoveel romp hoger dan de andere = "knie mee" (bonus). */
  kneeBonus: 0.25,
};

export class ClimbDetector implements Detector {
  private readonly hands = [
    { wrist: LM.leftWrist, up: false, height: null as number | null, knee: LM.rightKnee, otherKnee: LM.leftKnee },
    { wrist: LM.rightWrist, up: false, height: null as number | null, knee: LM.leftKnee, otherKnee: LM.rightKnee },
  ];
  private count = 0;
  private withKnee = 0;
  private lastHand = -1;

  update(b: BodyPose): void {
    if (!b.present || b.torso <= 0 || !allVisible(b, [LM.nose])) {
      for (const h of this.hands) h.height = null;
      return;
    }
    const noseY = b.pts[LM.nose].y;
    this.hands.forEach((h, i) => {
      if (!allVisible(b, [h.wrist])) {
        h.height = null;
        return;
      }
      h.height = (noseY - b.pts[h.wrist].y) / b.torso;
      if (!h.up && h.height > CLIMB.up) {
        h.up = true;
        if (this.lastHand !== i) {
          this.count++;
          this.lastHand = i;
          if (allVisible(b, [h.knee, h.otherKnee]) && b.pts[h.otherKnee].y - b.pts[h.knee].y > CLIMB.kneeBonus * b.torso) {
            this.withKnee++;
          }
        }
      } else if (h.up && h.height < CLIMB.down) {
        h.up = false;
      }
    });
  }

  reading(): DetectorReading {
    const heights = this.hands.map((h) => h.height).filter((v): v is number => v !== null);
    return {
      count: this.count,
      unit: 'klimstappen',
      signal: heights.length > 0 ? Math.max(...heights) : null,
      thresholds: [CLIMB.up, CLIMB.down],
      state: heights.length === 0 ? 'handen niet zichtbaar' : this.lastHand === 0 ? 'volgende: rechts' : this.lastHand === 1 ? 'volgende: links' : 'klaar',
      detail: `met knie mee ${this.withKnee} · hoogste hand ${heights.length ? fmt(Math.max(...heights)) : '–'}`,
    };
  }

  reset(): void {
    for (const h of this.hands) {
      h.up = false;
      h.height = null;
    }
    this.count = 0;
    this.withKnee = 0;
    this.lastHand = -1;
  }
}
