import type { BodyPose } from '../motor/body';
import { EnergyMeter } from '../motor/detectors/energy';
import { HighKneesDetector } from '../motor/detectors/highKnees';
import { goalFor, percentOf, starsFor, ZoneTimer, zoneIndex, type Age } from './scoring';
import type { GameEvent, GameResult, GameSession, GameView } from './types';

/**
 * Spotlight Sprint (#12, #27): knieën hoog, zo snel mogelijk, 20 s (#29: korte explosieve
 * inspanning). Elke stap vult de spotlight; bij het leeftijdsdoel gaat hij aan.
 */
export const SPOTLIGHT = {
  durationMs: 20_000,
  /**
   * Stappen (beide benen samen) in 20 s per leeftijd. Voorlopig (#45): ±1,75 stappen/s voor een
   * 6-jarige tot ±2,75/s vanaf 13 jaar. Af te stellen met echte opnames.
   */
  goals: { 6: 35, 7: 38, 8: 41, 9: 44, 10: 47, 11: 50, 12: 53, 13: 55 } as Record<Age, number>,
  milestones: [
    { at: 0.25, text: 'GOED ZO!' },
    { at: 0.5, text: 'HALFWEG!' },
    { at: 0.75, text: 'BIJNA!' },
  ],
  /** Na het doel: elke zoveel extra stappen een "PERFECT!". */
  bonusEvery: 10,
  /** Max. tijdsstap per beeld (ms): een hapering mag de klok niet laten verspringen. */
  maxStepMs: 200,
};

export class SpotlightSprintSession implements GameSession {
  private readonly knees = new HighKneesDetector();
  private readonly energy = new EnergyMeter();
  private readonly zones = new ZoneTimer();
  private readonly goal: number;
  private elapsedMs = 0;
  private lastT: number | null = null;
  private events: GameEvent[] = [];
  private nextEventId = 1;
  private milestone = 0;
  private goalReached = false;
  private nextBonus: number;
  private bestTempo = 0;

  constructor(private readonly age: number) {
    this.goal = goalFor(SPOTLIGHT.goals, age);
    this.nextBonus = this.goal + SPOTLIGHT.bonusEvery;
  }

  get finished(): boolean {
    return this.elapsedMs >= SPOTLIGHT.durationMs;
  }

  update(body: BodyPose, playing: boolean): void {
    const dt = this.lastT === null ? 0 : Math.min(SPOTLIGHT.maxStepMs, Math.max(0, body.t - this.lastT));
    this.lastT = body.t;
    if (!playing || this.finished) return;
    this.elapsedMs = Math.min(SPOTLIGHT.durationMs, this.elapsedMs + dt);
    this.knees.update(body);
    this.energy.update(body);
    this.zones.add(this.energy.energy, dt);
    this.bestTempo = Math.max(this.bestTempo, this.knees.tempo);

    const steps = this.knees.steps;
    const progress = steps / this.goal;
    while (this.milestone < SPOTLIGHT.milestones.length && progress >= SPOTLIGHT.milestones[this.milestone].at) {
      this.push(SPOTLIGHT.milestones[this.milestone].text, 'milestone');
      this.milestone++;
    }
    if (!this.goalReached && steps >= this.goal) {
      this.goalReached = true;
      this.milestone = SPOTLIGHT.milestones.length;
      this.push('SPOTLIGHT ON!', 'goal');
    }
    while (this.goalReached && steps >= this.nextBonus) {
      this.push('PERFECT!', 'bonus');
      this.nextBonus += SPOTLIGHT.bonusEvery;
    }
  }

  view(): GameView {
    const steps = this.knees.steps;
    const events = this.events;
    this.events = [];
    return {
      durationMs: SPOTLIGHT.durationMs,
      remainingMs: SPOTLIGHT.durationMs - this.elapsedMs,
      count: steps,
      unit: 'stappen',
      goal: this.goal,
      progress: steps / this.goal,
      energy: this.energy.energy,
      zone: zoneIndex(this.energy.energy),
      coach: this.coachLine(steps),
      events,
      finished: this.finished,
    };
  }

  result(): GameResult {
    const steps = this.knees.steps;
    const percent = percentOf(steps, this.goal);
    const [left, right] = this.knees.perLeg;
    return {
      gameId: 'spotlight',
      count: steps,
      unit: 'stappen',
      goal: this.goal,
      percent,
      stars: starsFor(percent),
      age: this.age,
      zoneSeconds: [...this.zones.seconds] as [number, number, number, number],
      details: [
        { label: 'Beste tempo', value: `${Math.round(this.bestTempo)} stappen/min` },
        { label: 'Intens of explosief', value: `${Math.round(this.zones.intenseShare * 100)}% van de tijd` },
        { label: 'Links / rechts', value: `${left} / ${right}` },
      ],
    };
  }

  private push(text: string, kind: GameEvent['kind']): void {
    this.events.push({ id: this.nextEventId++, text, kind });
  }

  private coachLine(steps: number): string {
    const remaining = SPOTLIGHT.durationMs - this.elapsedMs;
    if (this.finished) return 'Wauw, wat een sprint!';
    if (this.elapsedMs === 0) return 'Knieën hoog, zo snel je kan!';
    if (remaining <= 5000) return this.goalReached ? 'Nog even! Hou vol!' : 'Nog 5 seconden! Sneller!';
    if (this.goalReached) return 'De spotlight is van jou! Ga door!';
    if (this.elapsedMs > 4000 && steps / this.goal < (this.elapsedMs / SPOTLIGHT.durationMs) * 0.7) return 'Hoger die knieën!';
    return 'Goed bezig, blijf gaan!';
  }
}
