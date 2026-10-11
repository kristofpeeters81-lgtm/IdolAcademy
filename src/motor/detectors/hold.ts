import { allVisible, type BodyPose, type Vec2 } from '../body';
import { LM } from '../landmarks';
import { fmt, type Detector, type DetectorReading } from './common';

/**
 * Houding vasthouden (Freeze Pose). Elke houding is een lijstje voorwaarden in romplengtes of
 * graden. Tijd telt enkel zolang je in de houding bent; een korte wiebel (< `graceMs`) breekt de
 * reeks niet, maar telt ook niet mee.
 */
export const HOLD = {
  graceMs: 400,
};

export type HoldPose = 'stoel' | 'ster' | 'vliegtuig';

/** Armhoek t.o.v. recht naar beneden (0° = langs het lichaam, 90° = zijwaarts, 180° = omhoog). */
function armAngle(shoulder: Vec2, wrist: Vec2): number {
  const dx = Math.abs(wrist.x - shoulder.x);
  const dy = wrist.y - shoulder.y;
  return (Math.atan2(dx, dy) * 180) / Math.PI;
}

interface PoseCheck {
  label: string;
  needs: number[];
  /** Score per voorwaarde: true = goed. Geeft ook een tip terug als het niet goed is. */
  check: (b: BodyPose) => { ok: boolean; tip: string };
}

const armsOut = (b: BodyPose): boolean => {
  const l = armAngle(b.pts[LM.leftShoulder], b.pts[LM.leftWrist]);
  const r = armAngle(b.pts[LM.rightShoulder], b.pts[LM.rightWrist]);
  return l >= 60 && l <= 125 && r >= 60 && r <= 125;
};

export const HOLD_POSES: Record<HoldPose, PoseCheck> = {
  stoel: {
    label: 'Stoel (zitten zonder stoel)',
    needs: [LM.leftHip, LM.rightHip, LM.leftKnee, LM.rightKnee],
    check: (b) => {
      // Dijbeen in beeld ≤ 0,55 romp ≈ diep gezakt (rechtop is ~0,95).
      const thigh = ((b.pts[LM.leftKnee].y - b.pts[LM.leftHip].y + (b.pts[LM.rightKnee].y - b.pts[LM.rightHip].y)) / 2) / b.torso;
      return { ok: thigh <= 0.55, tip: 'zak dieper door je knieën' };
    },
  },
  ster: {
    label: 'Ster (armen en benen wijd)',
    needs: [LM.leftShoulder, LM.rightShoulder, LM.leftWrist, LM.rightWrist, LM.leftAnkle, LM.rightAnkle],
    check: (b) => {
      if (!armsOut(b)) return { ok: false, tip: 'armen zijwaarts' };
      const spread = Math.abs(b.pts[LM.leftAnkle].x - b.pts[LM.rightAnkle].x) / b.torso;
      return { ok: spread >= 1.0, tip: 'benen wijder' };
    },
  },
  vliegtuig: {
    label: 'Vliegtuig (op één been, armen opzij)',
    needs: [LM.leftShoulder, LM.rightShoulder, LM.leftWrist, LM.rightWrist, LM.leftAnkle, LM.rightAnkle],
    check: (b) => {
      if (!armsOut(b)) return { ok: false, tip: 'armen zijwaarts' };
      const footUp = Math.abs(b.pts[LM.leftAnkle].y - b.pts[LM.rightAnkle].y) / b.torso;
      return { ok: footUp >= 0.3, tip: 'één voet van de grond' };
    },
  },
};

export class HoldDetector implements Detector {
  private heldMs = 0;
  private bestStreakMs = 0;
  private streakMs = 0;
  private lastT: number | null = null;
  private lastOkAt = -Infinity;
  private inPose = false;
  private tip = '';

  constructor(readonly pose: HoldPose) {}

  update(b: BodyPose): void {
    const def = HOLD_POSES[this.pose];
    const dt = this.lastT === null ? 0 : Math.min(200, b.t - this.lastT);
    this.lastT = b.t;
    if (!b.present || b.torso <= 0 || !allVisible(b, def.needs)) {
      this.inPose = false;
      this.tip = 'niet volledig in beeld';
    } else {
      const r = def.check(b);
      this.inPose = r.ok;
      this.tip = r.ok ? '' : r.tip;
    }
    if (this.inPose) {
      this.lastOkAt = b.t;
      this.heldMs += dt;
      this.streakMs += dt;
      this.bestStreakMs = Math.max(this.bestStreakMs, this.streakMs);
    } else if (b.t - this.lastOkAt > HOLD.graceMs) {
      this.streakMs = 0;
    }
  }

  reading(): DetectorReading {
    return {
      count: Math.floor(this.heldMs / 100) / 10,
      unit: 's vastgehouden',
      signal: this.inPose ? 1 : 0,
      thresholds: [0.5],
      state: this.inPose ? 'goed zo, vasthouden!' : this.tip || 'neem de houding aan',
      detail: `${HOLD_POSES[this.pose].label} · langste reeks ${fmt(this.bestStreakMs / 1000, 1)} s`,
    };
  }

  reset(): void {
    this.heldMs = 0;
    this.bestStreakMs = 0;
    this.streakMs = 0;
    this.lastT = null;
    this.lastOkAt = -Infinity;
    this.inPose = false;
  }
}
