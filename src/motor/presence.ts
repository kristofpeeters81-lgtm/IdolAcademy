import { allVisible, isVisible, type BodyPose } from './body';
import type { BodyNeeds } from './detectors';
import { FULL_BODY_POINTS, LM } from './landmarks';

/** De punten die per soort game zichtbaar moeten zijn. */
export const NEEDED_POINTS: Record<BodyNeeds, readonly number[]> = {
  full: FULL_BODY_POINTS,
  upper: [LM.nose, LM.leftShoulder, LM.rightShoulder, LM.leftElbow, LM.rightElbow, LM.leftWrist, LM.rightWrist, LM.leftHip, LM.rightHip],
};

/**
 * Is de speler (nog) in beeld? Met hysterese, zodat één gemist beeld het spel niet pauzeert (#18).
 * - 'in': alle nodige punten zichtbaar;
 * - 'deels': lichaam gevonden, maar niet alle nodige punten;
 * - 'weg': langer dan `awayMs` niemand (of minder dan de helft van de punten) in beeld.
 */
export type Presence = 'in' | 'deels' | 'weg';

export const PRESENCE = {
  awayMs: 800,
  backMs: 300,
};

export class PresenceTracker {
  private state: Presence = 'weg';
  private lastSeenAt = -Infinity;
  private fullSince: number | null = null;

  constructor(private needs: BodyNeeds) {}

  setNeeds(needs: BodyNeeds): void {
    this.needs = needs;
  }

  update(b: BodyPose): Presence {
    const points = NEEDED_POINTS[this.needs];
    const seen = b.present ? points.filter((i) => isVisible(b, i)).length : 0;
    if (seen >= points.length / 2) this.lastSeenAt = b.t;

    if (b.present && allVisible(b, points)) {
      this.fullSince ??= b.t;
      if (this.state !== 'in' && b.t - this.fullSince >= (this.state === 'weg' ? PRESENCE.backMs : 0)) this.state = 'in';
    } else {
      this.fullSince = null;
      if (b.t - this.lastSeenAt > PRESENCE.awayMs) this.state = 'weg';
      else if (this.state === 'in') this.state = 'deels';
    }
    return this.state;
  }

  get current(): Presence {
    return this.state;
  }
}
