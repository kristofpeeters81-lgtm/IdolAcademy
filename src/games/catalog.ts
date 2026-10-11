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
  { id: 'lightstick', name: 'Lightstick Catch', tagline: 'Raak de lichtjes', category: 'cardio', durationS: 40, needs: 'upper', color: '#22e6ff', howTo: [] },
  { id: 'laser', name: 'Laser Stage', tagline: 'Buk, spring, ontwijk', category: 'cardio', durationS: 40, needs: 'full', color: '#c6ff3d', howTo: [] },
  { id: 'punch', name: 'Beat Punch', tagline: 'Stoot op de beat', category: 'cardio', durationS: 20, needs: 'upper', color: '#ffb020', howTo: [] },
  { id: 'jumpsquad', name: 'Jump Squad', tagline: 'Squats + sprong', category: 'kracht', durationS: 40, needs: 'full', color: '#8b5cf6', howTo: [] },
  { id: 'freeze', name: 'Freeze Pose', tagline: 'Hou je pose vast', category: 'kracht', durationS: 15, needs: 'full', color: '#22e6ff', howTo: [] },
  { id: 'climb', name: 'Sky Climb', tagline: 'Klim naar het dak', category: 'kracht', durationS: 40, needs: 'upper', color: '#ff3dae', howTo: [] },
  { id: 'crawl', name: 'Floor Crawl', tagline: 'Experimenteel', category: 'test', durationS: 30, needs: 'full', color: '#c6ff3d', howTo: [] },
];

export function gameInfo(id: string): GameInfo | undefined {
  return GAMES.find((g) => g.id === id);
}
