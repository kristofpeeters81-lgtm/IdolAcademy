import type { BodyPose } from '../motor/body';
import type { BodyNeeds } from '../motor/detectors';

/**
 * Spellogica (#25): puur TypeScript, zonder React. Elke game is een `GameSession` die per
 * camerabeeld een `BodyPose` krijgt. De schil (src/app/game) tekent enkel wat `view()` teruggeeft.
 * Zo kan B-world de spelregels overnemen en enkel de visuals opnieuw maken (#33).
 */

export type GameId = 'spotlight' | 'lightstick' | 'laser' | 'punch' | 'jumpsquad' | 'freeze' | 'climb' | 'crawl';
export type GameCategory = 'cardio' | 'kracht' | 'test';

/** Iets wat gebeurt: kort groot tonen ("PERFECT!") en/of een geluid (raak, mis). */
export interface GameEvent {
  id: number;
  text: string;
  kind: 'milestone' | 'goal' | 'bonus' | 'hit' | 'miss';
  /** Groot in het midden tonen? (standaard ja; "raak"/"mis" bij elk doel niet) */
  popup?: boolean;
}

/** Zoals de speler het scherm ziet: links/rechts op het (eventueel gespiegelde) beeld. */
export type ScreenSide = 'links' | 'rechts';

/**
 * Wat een game bovenop het camerabeeld tekent. Coördinaten zijn schermcoördinaten (0..1 van het
 * camerabeeld zoals getoond). De schil kiest per `type` een tekening.
 */
export type GameScene =
  | { type: 'spotlight' }
  | { type: 'lightsticks'; targets: { id: number; x: number; y: number; radius: number; gold: boolean; life: number }[] }
  | {
      type: 'punch';
      cues: { id: number; side: ScreenSide | 'omhoog'; x: number; y: number; radius: number; approach: number; state: 'komt' | 'raak' | 'perfect' | 'mis' }[];
      beat: number;
    }
  | {
      type: 'laser';
      /** `y` = hoogte van de laser (0..1): bij "hoog" op hoofdhoogte, bij "laag" op enkelhoogte van de speler. */
      walls: { id: number; kind: 'hoog' | 'laag' | 'links' | 'rechts'; approach: number; state: 'komt' | 'ontweken' | 'geraakt'; y: number }[];
    };

/** Wat een game bij het aanmaken weet over het scherm. */
export interface GameContext {
  /** Wordt het beeld gespiegeld getoond (frontcamera)? */
  mirrored: boolean;
  /** Breedte/hoogte van het camerabeeld. */
  aspect: number;
  /** Toeval (vast te zetten in tests). */
  random?: () => number;
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
  /** Wat er over het camerabeeld getekend wordt. */
  scene: GameScene;
  /** Vast muziektempo (bv. Beat Punch speelt op de beat); anders volgt het tempo de Power-zone. */
  musicBpm?: number;
  /** Is wat de coach zegt een dringende instructie ("Bukken!")? Dan meteen uitspreken. */
  coachUrgent?: boolean;
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
  create?: (age: number, ctx: GameContext) => GameSession;
}
