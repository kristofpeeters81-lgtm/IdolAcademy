import type { BodyPose } from '../motor/body';
import { EnergyMeter } from '../motor/detectors/energy';
import { ZoneTimer, zoneIndex } from './scoring';
import type { GameEvent } from './types';

/**
 * Gedeelde spelkern voor alle games: de klok (die stilstaat tijdens een pauze), bewegingsenergie
 * en Power-zones, gebeurtenissen, en de mijlpalen 25/50/75% + het doel.
 */
export const CORE = {
  /** Max. tijdsstap per beeld (ms): een hapering mag de klok niet laten verspringen. */
  maxStepMs: 200,
  milestones: [
    { at: 0.25, text: 'GOED ZO!' },
    { at: 0.5, text: 'HALFWEG!' },
    { at: 0.75, text: 'BIJNA!' },
  ],
};

export class GameCore {
  elapsedMs = 0;
  readonly energy = new EnergyMeter();
  readonly zones = new ZoneTimer();
  goalReached = false;
  private lastT: number | null = null;
  private events: GameEvent[] = [];
  private nextId = 1;
  private milestone = 0;

  constructor(
    readonly durationMs: number,
    readonly goal: number,
  ) {}

  get finished(): boolean {
    return this.elapsedMs >= this.durationMs;
  }

  get remainingMs(): number {
    return this.durationMs - this.elapsedMs;
  }

  get zone(): number {
    return zoneIndex(this.energy.energy);
  }

  /**
   * Per beeld aanroepen. Geeft de verstreken speeltijd (ms) terug, of `null` als er niet
   * gespeeld wordt (pauze, nog niet begonnen of al gedaan): dan mag de game niets doen.
   */
  tick(body: BodyPose, playing: boolean): number | null {
    const dt = this.lastT === null ? 0 : Math.min(CORE.maxStepMs, Math.max(0, body.t - this.lastT));
    this.lastT = body.t;
    if (!playing || this.finished) return null;
    this.elapsedMs = Math.min(this.durationMs, this.elapsedMs + dt);
    this.energy.update(body);
    this.zones.add(this.energy.energy, dt);
    return dt;
  }

  push(text: string, kind: GameEvent['kind'], popup = true): void {
    this.events.push({ id: this.nextId++, text, kind, popup });
  }

  /** Mijlpalen en doel controleren na een nieuwe telling. */
  progress(count: number, goalText: string): void {
    const p = count / this.goal;
    while (!this.goalReached && this.milestone < CORE.milestones.length && p >= CORE.milestones[this.milestone].at) {
      this.push(CORE.milestones[this.milestone].text, 'milestone');
      this.milestone++;
    }
    if (!this.goalReached && count >= this.goal) {
      this.goalReached = true;
      this.push(goalText, 'goal');
    }
  }

  takeEvents(): GameEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  intensePercent(): number {
    return Math.round(this.zones.intenseShare * 100);
  }
}
