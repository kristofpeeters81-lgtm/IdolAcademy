import { allVisible, type BodyPose } from './body';
import type { BodyNeeds } from './detectors';
import { LM } from './landmarks';
import { NEEDED_POINTS } from './presence';

/**
 * Ruimte-check (#18): staat de speler op een goede plek? Geeft één concrete tip tegelijk en
 * "klaar" pas als alles `holdMs` aan één stuk goed is.
 *
 * Grenzen (fractie van de beeldhoogte):
 * - lichaam (hoofd tot enkels, of hoofd tot heupen bij 'upper') moet tussen `minHeight` en
 *   `maxHeight` van het beeld innemen (te klein = te ver, te groot = te dichtbij);
 * - bovenaan en onderaan wat marge, zodat springen/armen omhoog niet uit beeld gaat;
 * - het midden van het lichaam niet te ver van het midden van het beeld.
 */
export const SPACE = {
  full: { minHeight: 0.45, maxHeight: 0.85 },
  upper: { minHeight: 0.3, maxHeight: 0.6 },
  margin: 0.04,
  maxOffCenter: 0.22,
  holdMs: 1500,
};

export type SpaceStatus = 'zoeken' | 'bijsturen' | 'bijna' | 'klaar';

export interface SpaceAdvice {
  status: SpaceStatus;
  message: string;
  /** 0..1: hoe ver het aftellen naar "klaar" is. */
  progress: number;
}

/** Eén beoordeling van één beeld, zonder geheugen (handig om te testen). */
export function judgeSpace(b: BodyPose, needs: BodyNeeds): { ok: boolean; message: string } {
  if (!b.present) return { ok: false, message: 'Ga voor de camera staan' };
  const p = b.pts;
  const top = p[LM.nose].y - 0.35 * b.torso; // kruin ≈ 0,35 romp boven de neus
  const bottomPoint = needs === 'full' ? Math.max(p[LM.leftAnkle].y, p[LM.rightAnkle].y) : Math.max(p[LM.leftHip].y, p[LM.rightHip].y);
  const height = bottomPoint - top;
  const limits = SPACE[needs];

  if (needs === 'full' && !allVisible(b, [LM.leftAnkle, LM.rightAnkle])) return { ok: false, message: 'Stap achteruit tot je voeten in beeld zijn' };
  if (top < SPACE.margin) return { ok: false, message: 'Stap achteruit: je hoofd valt bijna uit beeld' };
  if (bottomPoint > 1 - SPACE.margin) return { ok: false, message: 'Stap wat achteruit' };
  if (height > limits.maxHeight) return { ok: false, message: 'Stap wat achteruit' };
  if (height < limits.minHeight) return { ok: false, message: 'Kom wat dichterbij' };

  const centerX = (p[LM.leftHip].x + p[LM.rightHip].x) / 2 / b.aspect; // 0..1 van de beeldbreedte
  if (Math.abs(centerX - 0.5) > SPACE.maxOffCenter) return { ok: false, message: 'Ga meer in het midden staan' };

  if (!allVisible(b, NEEDED_POINTS[needs])) return { ok: false, message: 'Zorg dat je armen en benen goed zichtbaar zijn' };
  return { ok: true, message: 'Perfect, blijf zo staan…' };
}

export class SpaceCheck {
  private okSince: number | null = null;
  private done = false;

  constructor(private needs: BodyNeeds) {}

  setNeeds(needs: BodyNeeds): void {
    this.needs = needs;
    this.reset();
  }

  update(b: BodyPose): SpaceAdvice {
    if (this.done) return { status: 'klaar', message: 'Klaar!', progress: 1 };
    const j = judgeSpace(b, this.needs);
    if (!j.ok) {
      this.okSince = null;
      return { status: b.present ? 'bijsturen' : 'zoeken', message: j.message, progress: 0 };
    }
    this.okSince ??= b.t;
    const progress = Math.min(1, (b.t - this.okSince) / SPACE.holdMs);
    if (progress >= 1) {
      this.done = true;
      return { status: 'klaar', message: 'Klaar!', progress: 1 };
    }
    return { status: 'bijna', message: j.message, progress };
  }

  reset(): void {
    this.okSince = null;
    this.done = false;
  }
}
