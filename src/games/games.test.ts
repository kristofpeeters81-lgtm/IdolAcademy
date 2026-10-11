import { describe, expect, it } from 'vitest';
import { BodyTracker } from '../motor/body';
import { synthSequence, type SynthParams } from '../motor/testing/synthPose';
import { GAMES } from './catalog';
import { ageLabel, goalFor, percentOf, starsFor, ZoneTimer } from './scoring';
import { SPOTLIGHT, SpotlightSprintSession } from './spotlightSprint';
import type { GameEvent } from './types';

/** Knieheffen: elke `stepS` seconden een knie (afwisselend). */
const kneesAt = (stepS: number) => (t: number): SynthParams => {
  const i = Math.floor(t / stepS);
  const lift = Math.sin(((t % stepS) / stepS) * Math.PI) * 0.7;
  return i % 2 === 0 ? { leftKneeLift: lift } : { rightKneeLift: lift };
};

function play(session: SpotlightSprintSession, seconds: number, move: (t: number) => SynthParams | null, playing: (t: number) => boolean = () => true) {
  const tracker = new BodyTracker();
  const events: GameEvent[] = [];
  // 1 s rechtop staan (zoals na de ruimte-check), dan spelen.
  const frames = synthSequence(1 + seconds, (t) => (t < 1 ? {} : move(t - 1)));
  frames.forEach((f, i) => {
    const t = i / 30 - 1;
    session.update(tracker.update(f), t >= 0 && playing(t));
    events.push(...session.view().events);
  });
  return events;
}

describe('scoring', () => {
  it('kiest het doel per leeftijd en begrenst buiten 6–13', () => {
    expect(goalFor(SPOTLIGHT.goals, 8)).toBe(41);
    expect(goalFor(SPOTLIGHT.goals, 4)).toBe(35);
    expect(goalFor(SPOTLIGHT.goals, 40)).toBe(55);
    expect(ageLabel(13)).toBe('13+');
  });

  it('geeft sterren bij 50/80/100%', () => {
    expect([49, 50, 79, 80, 99, 100, 150].map(starsFor)).toEqual([0, 1, 1, 2, 2, 3, 3]);
    expect(percentOf(41, 41)).toBe(100);
  });

  it('telt seconden per zone', () => {
    const z = new ZoneTimer();
    z.add(0.2, 1000);
    z.add(2, 1000);
    z.add(5, 2000);
    expect(z.seconds).toEqual([1, 0, 1, 2]);
    expect(z.intenseShare).toBeCloseTo(0.75);
  });
});

describe('SpotlightSprintSession', () => {
  it('telt stappen, stopt na 20 s en berekent het resultaat', () => {
    const s = new SpotlightSprintSession(8);
    // 4 stappen/s → ~80 stappen in 20 s; de 2 s extra mogen niet meer meetellen.
    play(s, 22, kneesAt(0.25));
    const v = s.view();
    expect(v.finished).toBe(true);
    expect(v.remainingMs).toBe(0);
    expect(v.count).toBeGreaterThanOrEqual(78);
    expect(v.count).toBeLessThanOrEqual(81);
    const r = s.result();
    expect(r.goal).toBe(41);
    expect(r.stars).toBe(3);
    expect(r.percent).toBeGreaterThan(180);
  });

  it('meldt mijlpalen, het doel en bonussen in de juiste volgorde', () => {
    const events = play(new SpotlightSprintSession(6), 20, kneesAt(0.25)).map((e) => e.text);
    expect(events.slice(0, 4)).toEqual(['GOED ZO!', 'HALFWEG!', 'BIJNA!', 'SPOTLIGHT ON!']);
    expect(events).toContain('PERFECT!');
  });

  it('de tijd loopt niet tijdens een pauze (uit beeld)', () => {
    const s = new SpotlightSprintSession(8);
    play(s, 10, kneesAt(0.25), (t) => t < 3 || t > 8); // 5 s pauze
    expect(s.view().remainingMs).toBeGreaterThan(14_500);
    expect(s.view().remainingMs).toBeLessThan(15_500);
  });

  it('stilstaan levert 0 sterren op', () => {
    const s = new SpotlightSprintSession(10);
    play(s, 21, () => ({}));
    expect(s.result()).toMatchObject({ count: 0, stars: 0, percent: 0 });
  });
});

describe('catalogus', () => {
  it('heeft de acht games uit #12/#27, waarvan er vier speelbaar zijn (blok 4 + 6)', () => {
    expect(GAMES.map((g) => g.name)).toEqual(['Spotlight Sprint', 'Lightstick Catch', 'Laser Stage', 'Beat Punch', 'Jump Squad', 'Freeze Pose', 'Sky Climb', 'Floor Crawl']);
    expect(GAMES.filter((g) => g.create).map((g) => g.id)).toEqual(['spotlight', 'lightstick', 'laser', 'punch']);
  });
});
