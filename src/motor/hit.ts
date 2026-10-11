import { isVisible, type BodyPose } from './body';
import { LM } from './landmarks';

/**
 * Raken (Lightstick Catch): raakt een hand of voet een doel op het scherm?
 *
 * Doelen staan in **schermcoördinaten** (0..1 van breedte en hoogte, zoals de speler het beeld
 * ziet). Bij de frontcamera is het beeld gespiegeld; daarom zet `limbsOnScreen` de punten om met
 * `mirrored`. Zo raakt een kind dat naar een doel links op het scherm grijpt, ook echt dat doel.
 */
export type Limb = 'linkerhand' | 'rechterhand' | 'linkervoet' | 'rechtervoet';

const LIMB_POINTS: Record<Limb, readonly number[]> = {
  // Hand = gemiddelde van pols, wijsvinger en pink (stabieler dan één punt).
  linkerhand: [LM.leftWrist, LM.leftIndex, LM.leftPinky],
  rechterhand: [LM.rightWrist, LM.rightIndex, LM.rightPinky],
  linkervoet: [LM.leftAnkle, LM.leftFootIndex],
  rechtervoet: [LM.rightAnkle, LM.rightFootIndex],
};

export interface ScreenPoint {
  limb: Limb;
  /** 0..1 van de schermbreedte (zoals getoond). */
  x: number;
  /** 0..1 van de schermhoogte. */
  y: number;
}

/** Positie van handen en voeten zoals de speler ze op het scherm ziet. */
export function limbsOnScreen(b: BodyPose, mirrored: boolean, limbs: readonly Limb[] = ['linkerhand', 'rechterhand', 'linkervoet', 'rechtervoet']): ScreenPoint[] {
  if (!b.present) return [];
  const out: ScreenPoint[] = [];
  for (const limb of limbs) {
    const pts = LIMB_POINTS[limb].filter((i) => isVisible(b, i));
    if (pts.length === 0) continue;
    const x = pts.reduce((sum, i) => sum + b.pts[i].x, 0) / pts.length / b.aspect;
    const y = pts.reduce((sum, i) => sum + b.pts[i].y, 0) / pts.length;
    out.push({ limb, x: mirrored ? 1 - x : x, y });
  }
  return out;
}

export interface Target {
  /** Midden, schermcoördinaten 0..1. */
  x: number;
  y: number;
  /** Straal als fractie van de schermhoogte. */
  radius: number;
}

/**
 * Welke ledematen raken het doel? `aspect` = breedte/hoogte van het scherm, zodat een doel ook
 * op een breed scherm rond is.
 */
export function hitsTarget(points: readonly ScreenPoint[], target: Target, aspect: number): Limb[] {
  return points
    .filter((p) => Math.hypot((p.x - target.x) * aspect, p.y - target.y) <= target.radius)
    .map((p) => p.limb);
}
