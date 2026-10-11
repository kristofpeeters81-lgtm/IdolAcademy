import { ClimbDetector } from './climb';
import type { Detector } from './common';
import { DodgeDetector } from './dodge';
import { EnergyMeter } from './energy';
import { HighKneesDetector } from './highKnees';
import { HoldDetector } from './hold';
import { JumpingJackDetector } from './jumpingJack';
import { PunchDetector } from './punch';
import { SquatDetector } from './squat';

export type { Detector, DetectorReading } from './common';

/**
 * Overzicht van alle detectoren, met wat ze van het lichaam nodig hebben (#12, #27).
 * `needs`: 'full' = hele lichaam (9/9) in beeld, 'upper' = bovenlichaam volstaat (kan dichterbij).
 */
export type BodyNeeds = 'full' | 'upper';

export interface DetectorInfo {
  id: DetectorId;
  label: string;
  /** Voor welke game(s) deze detector dient. */
  game: string;
  /** Uitleg voor het kind/de tester. */
  howTo: string;
  needs: BodyNeeds;
  create: () => Detector;
}

export type DetectorId =
  | 'squat'
  | 'knieen'
  | 'jumpingjack'
  | 'stoot'
  | 'klim'
  | 'stoel'
  | 'ster'
  | 'vliegtuig'
  | 'ontwijk'
  | 'energie';

export const DETECTORS: readonly DetectorInfo[] = [
  { id: 'squat', label: 'Squats', game: 'Jump Squad', howTo: 'Zak door je knieën en kom terug recht. Spring voor een bonus.', needs: 'full', create: () => new SquatDetector() },
  { id: 'knieen', label: 'Knieën hoog', game: 'Spotlight Sprint', howTo: 'Loop zo snel je kan ter plaatse, knieën hoog.', needs: 'full', create: () => new HighKneesDetector() },
  { id: 'jumpingjack', label: 'Jumping jacks', game: 'Opwarming', howTo: 'Spring open (armen omhoog, benen wijd) en terug dicht.', needs: 'full', create: () => new JumpingJackDetector() },
  { id: 'stoot', label: 'Stoten', game: 'Beat Punch', howTo: 'Handen bij je kin, stoot snel opzij of omhoog.', needs: 'upper', create: () => new PunchDetector() },
  { id: 'klim', label: 'Klimmen', game: 'Sky Climb', howTo: 'Grijp afwisselend links en rechts hoog boven je hoofd. Knie mee = bonus.', needs: 'upper', create: () => new ClimbDetector() },
  { id: 'stoel', label: 'Houding: stoel', game: 'Freeze Pose', howTo: 'Zak diep door je knieën alsof je op een stoel zit, en hou vast.', needs: 'full', create: () => new HoldDetector('stoel') },
  { id: 'ster', label: 'Houding: ster', game: 'Freeze Pose', howTo: 'Armen zijwaarts, benen wijd, en hou vast.', needs: 'full', create: () => new HoldDetector('ster') },
  { id: 'vliegtuig', label: 'Houding: vliegtuig', game: 'Freeze Pose', howTo: 'Armen opzij, één voet van de grond, en hou vast.', needs: 'full', create: () => new HoldDetector('vliegtuig') },
  { id: 'ontwijk', label: 'Ontwijken', game: 'Laser Stage', howTo: 'Buk, spring, of stap opzij naar links of rechts.', needs: 'full', create: () => new DodgeDetector() },
  { id: 'energie', label: 'Bewegingsenergie', game: 'Power-score (alle games)', howTo: 'Beweeg rustig, dan wild: de energie volgt mee.', needs: 'upper', create: () => new EnergyMeter() },
];

export function detectorInfo(id: DetectorId): DetectorInfo {
  const info = DETECTORS.find((d) => d.id === id);
  if (!info) throw new Error(`Onbekende detector: ${id}`);
  return info;
}
