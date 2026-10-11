import type { BodyPose } from '../motor/body';
import type { BodyNeeds } from '../motor/detectors';

/**
 * Spellogica (#25): puur TypeScript, zonder React. Elke game is een `GameSession` die per
 * camerabeeld een `BodyPose` krijgt. De schil (src/app/game) tekent enkel wat `view()` teruggeeft.
 * Zo kan B-world de spelregels overnemen en enkel de visuals opnieuw maken (#33).
 */

export type GameId = 'spotlight' | 'lightstick' | 'laser' | 'punch' | 'jumpsquad' | 'freeze' | 'climb' | 'crawl';
export type GameCategory = 'cardio' | 'kracht' | 'test';

/** Iets om kort groot te tonen ("PERFECT!", "SPOTLIGHT ON!"). */
export interface GameEvent {
  id: number;
  text: string;
  kind: 'milestone' | 'goal' | 'bonus';
}

export interface GameView {
  durationMs: number;
  remainingMs: number;
  count: number;
  unit: string;
  goal: number;
  /** count / goal (kan boven 1). */
  progress: number;
  /** Bewegingsenergie nu (romp/s) en de zone 0..3 (rustig..explosief). */
  energy: number;
  zone: number;
  /** Wat coach Lumi nu zegt. */
  coach: string;
  /** Nieuwe gebeurtenissen sinds de vorige `view()`. */
  events: GameEvent[];
  finished: boolean;
}

export interface GameResult {
  gameId: GameId;
  count: number;
  unit: string;
  goal: number;
  /** count als % van het leeftijdsdoel (#30). */
  percent: number;
  stars: 0 | 1 | 2 | 3;
  age: number;
  /** Seconden per Power-zone [rustig, matig, intens, explosief] (#26). */
  zoneSeconds: [number, number, number, number];
  /** Extra regels voor het resultatenscherm. */
  details: { label: string; value: string }[];
}

export interface GameSession {
  /** `playing` = false tijdens pauze/uit beeld: dan loopt de tijd niet en telt er niets. */
  update(body: BodyPose, playing: boolean): void;
  view(): GameView;
  result(): GameResult;
}

export interface GameInfo {
  id: GameId;
  name: string;
  /** Korte omschrijving op de kaart. */
  tagline: string;
  category: GameCategory;
  durationS: number;
  needs: BodyNeeds;
  /** Kleur (CSS) van de kaart. */
  color: string;
  /** Uitleg in 2–3 korte zinnen (Lumi zegt ze voor de start). */
  howTo: string[];
  /** Speelbaar in deze versie? (de rest volgt in blok 6/7) */
  create?: (age: number) => GameSession;
}
