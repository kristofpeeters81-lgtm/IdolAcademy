import { BEAT_PUNCH, BeatPunchSession } from './beatPunch';
import { LASER, LaserStageSession } from './laserStage';
import { LIGHTSTICK, LightstickCatchSession } from './lightstickCatch';
import { SpotlightSprintSession, SPOTLIGHT } from './spotlightSprint';
import type { GameInfo } from './types';

/**
 * De acht trainingen van Idol Academy (#12, #27). Enkel games met `create` zijn al speelbaar;
 * de rest volgt in blok 6 en 7. Kleuren = stijl A (#43).
 */
export const GAMES: readonly GameInfo[] = [
  {
    id: 'spotlight',
    name: 'Spotlight Sprint',
    tagline: 'Knieën hoog',
    category: 'cardio',
    durationS: SPOTLIGHT.durationMs / 1000,
    needs: 'full',
    color: '#ff3dae',
    howTo: ['Loop ter plaatse, zo snel je kan.', 'Knieën hoog!', 'Elke stap vult de spotlight. Haal je doel en hij gaat aan!'],
    create: (age) => new SpotlightSprintSession(age),
  },
  {
    id: 'lightstick',
    name: 'Lightstick Catch',
    tagline: 'Vang de lichtjes',
    category: 'cardio',
    durationS: LIGHTSTICK.durationMs / 1000,
    needs: 'upper',
    color: '#22e6ff',
    howTo: ['Tik de lightsticks aan met je handen, voor ze doven.', 'Gouden sticks hangen hoog: strek je uit of spring! Ze tellen dubbel.'],
    create: (age, ctx) => new LightstickCatchSession(age, ctx),
  },
  {
    id: 'laser',
    name: 'Laser Stage',
    tagline: 'Buk, spring, ontwijk',
    category: 'cardio',
    durationS: LASER.durationMs / 1000,
    needs: 'full',
    color: '#c6ff3d',
    howTo: ['Laserwanden komen op je af.', 'Hoge laser: bukken. Lage laser: springen.', 'Opening links of rechts: stap opzij!'],
    create: (age, ctx) => new LaserStageSession(age, ctx),
  },
  {
    id: 'punch',
    name: 'Beat Punch',
    tagline: 'Stoot op de beat',
    category: 'cardio',
    durationS: BEAT_PUNCH.durationMs / 1000,
    needs: 'upper',
    color: '#ffb020',
    howTo: ['Handen bij je kin.', 'Als de ring rond het doel sluit: stoot snel naar die kant!', 'Precies op de tel = PERFECT.'],
    create: (age, ctx) => new BeatPunchSession(age, ctx),
  },
  { id: 'jumpsquad', name: 'Jump Squad', tagline: 'Squats + sprong', category: 'kracht', durationS: 40, needs: 'full', color: '#8b5cf6', howTo: [] },
  { id: 'freeze', name: 'Freeze Pose', tagline: 'Hou je pose vast', category: 'kracht', durationS: 15, needs: 'full', color: '#22e6ff', howTo: [] },
  { id: 'climb', name: 'Sky Climb', tagline: 'Klim naar het dak', category: 'kracht', durationS: 40, needs: 'upper', color: '#ff3dae', howTo: [] },
  { id: 'crawl', name: 'Floor Crawl', tagline: 'Experimenteel', category: 'test', durationS: 30, needs: 'full', color: '#c6ff3d', howTo: [] },
];

export function gameInfo(id: string): GameInfo | undefined {
  return GAMES.find((g) => g.id === id);
}
