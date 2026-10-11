import type { BodyPose } from '../motor/body';
import { HighKneesDetector } from '../motor/detectors/highKnees';
import { GameCore } from './core';
import { goalFor, percentOf, starsFor, type Age } from './scoring';
import type { GameResult, GameSession, GameView } from './types';

/**
 * Spotlight Sprint (#12, #27, #45): knieën hoog, zo snel mogelijk, 20 s (#29: korte explosieve
 * inspanning). Elke stap vult de spotlight; bij het leeftijdsdoel gaat hij aan.
 */
export const SPOTLIGHT = {
  durationMs: 20_000,
  /**
   * Stappen (beide benen samen) in 20 s per leeftijd. Voorlopig (#45): ±1,75 stappen/s voor een
   * 6-jarige tot ±2,75/s vanaf 13 jaar. Af te stellen met echte opnames.
   */
  goals: { 6: 35, 7: 38, 8: 41, 9: 44, 10: 47, 11: 50, 12: 53, 13: 55 } as Record<Age, number>,
  /** Na het doel: elke zoveel extra stappen een "PERFECT!". */
  bonusEvery: 10,
};

export class SpotlightSprintSession implements GameSession {
  private readonly knees = new HighKneesDetector();
  private readonly core: GameCore;
  private nextBonus: number;
  private bestTempo = 0;

  constructor(private readonly age: number) {
    this.core = new GameCore(SPOTLIGHT.durationMs, goalFor(SPOTLIGHT.goals, age));
    this.nextBonus = this.core.goal + SPOTLIGHT.bonusEvery;
  }

  get finished(): boolean {
    return this.core.finished;
  }

  update(body: BodyPose, playing: boolean): void {
    if (this.core.tick(body, playing) === null) return;
    this.knees.update(body);
    this.bestTempo = Math.max(this.bestTempo, this.knees.tempo);
    const steps = this.knees.steps;
    this.core.progress(steps, 'SPOTLIGHT ON!');
    while (this.core.goalReached && steps >= this.nextBonus) {
      this.core.push('PERFECT!', 'bonus');
      this.nextBonus += SPOTLIGHT.bonusEvery;
    }
  }

  view(): GameView {
    const c = this.core;
    const steps = this.knees.steps;
    return {
      durationMs: c.durationMs,
      remainingMs: c.remainingMs,
      count: steps,
      unit: 'stappen',
      goal: c.goal,
      progress: steps / c.goal,
      energy: c.energy.energy,
      zone: c.zone,
      coach: this.coachLine(steps),
      events: c.takeEvents(),
      finished: c.finished,
      scene: { type: 'spotlight' },
    };
  }

  result(): GameResult {
    const c = this.core;
    const steps = this.knees.steps;
    const percent = percentOf(steps, c.goal);
    const [left, right] = this.knees.perLeg;
    return {
      gameId: 'spotlight',
      count: steps,
      unit: 'stappen',
      goal: c.goal,
      percent,
      stars: starsFor(percent),
      age: this.age,
      zoneSeconds: [...c.zones.seconds] as [number, number, number, number],
      details: [
        { label: 'Beste tempo', value: `${Math.round(this.bestTempo)} stappen/min` },
        { label: 'Intens of explosief', value: `${c.intensePercent()}% van de tijd` },
        { label: 'Links / rechts', value: `${left} / ${right}` },
      ],
    };
  }

  private coachLine(steps: number): string {
    const c = this.core;
    if (c.finished) return 'Wauw, wat een sprint!';
    if (c.elapsedMs === 0) return 'Knieën hoog, zo snel je kan!';
    if (c.remainingMs <= 5000) return c.goalReached ? 'Nog even! Hou vol!' : 'Nog 5 seconden! Sneller!';
    if (c.goalReached) return 'De spotlight is van jou! Ga door!';
    if (c.elapsedMs > 4000 && steps / c.goal < (c.elapsedMs / c.durationMs) * 0.7) return 'Hoger die knieën!';
    return 'Goed bezig, blijf gaan!';
  }
}
