/**
 * Bewegingsmotor — gedeelde types.
 * De motor (alles in src/motor) is puur TypeScript zonder React, zodat B-world hem bij een
 * herbouw letterlijk kan overnemen (#25, #33).
 */

/** Eén lichaamspunt. x/y genormaliseerd 0..1 t.o.v. het camerabeeld (niet gespiegeld). */
export interface Landmark {
  x: number;
  y: number;
  /** Diepte, relatief t.o.v. de heupen; enkel op schaal, niet in meter. */
  z: number;
  /** 0..1 — hoe zeker het model is dat dit punt zichtbaar is. */
  visibility: number;
}

export type ModelVariant = 'lite' | 'full';
export type Delegate = 'GPU' | 'CPU';

/** Resultaat van één gedetecteerd camerabeeld. */
export interface PoseFrame {
  /** 33 punten, of null als er niemand in beeld is. */
  landmarks: Landmark[] | null;
  /** Tijdstip (performance.now(), ms). */
  timestamp: number;
  /** Hoe lang het model over dit beeld deed (ms). */
  inferenceMs: number;
}
