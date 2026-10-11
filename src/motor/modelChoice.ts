import type { ModelVariant } from './types';

/**
 * Automatische modelkeuze (#3, #7): starten met het lichte model, en enkel opwaarderen naar
 * "full" als het toestel daar duidelijk ruimte voor heeft. Valt "full" tegen, dan terug naar
 * "lite" en nooit meer opnieuw proberen (geen heen-en-weer-gespring tijdens het spelen).
 */

export interface AutoModelInput {
  current: ModelVariant;
  /** Hoe lang het huidige model al draait (s). */
  secondsOnModel: number;
  /** Gemeten detecties per seconde. */
  detectionFps: number;
  /** Gemiddelde rekentijd per beeld (ms). */
  inferenceMs: number;
  /** Werd "full" al eens geprobeerd en afgekeurd? */
  fullRejected: boolean;
}

export type AutoModelDecision = 'keep' | 'upgrade' | 'downgrade';

/** Eerst zoveel seconden meten voor we beslissen (opstartschokken uitfilteren). */
export const SETTLE_SECONDS = 4;
/** Opwaarderen naar full als lite minstens zo vlot loopt… */
export const UPGRADE_MIN_FPS = 24;
/** …én er per beeld nog ruim tijd over is (full is ~2x zwaarder). */
export const UPGRADE_MAX_INFERENCE_MS = 15;
/** Op full: onder deze fps terug naar lite. */
export const DOWNGRADE_BELOW_FPS = 15;

export function decideAutoModel(input: AutoModelInput): AutoModelDecision {
  if (input.secondsOnModel < SETTLE_SECONDS) return 'keep';
  if (input.current === 'lite') {
    if (input.fullRejected) return 'keep';
    return input.detectionFps >= UPGRADE_MIN_FPS && input.inferenceMs <= UPGRADE_MAX_INFERENCE_MS ? 'upgrade' : 'keep';
  }
  return input.detectionFps < DOWNGRADE_BELOW_FPS ? 'downgrade' : 'keep';
}
