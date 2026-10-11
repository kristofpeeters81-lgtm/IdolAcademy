import type { BodyPose } from '../motor/body';
import { PunchDetector, type PunchDirection } from '../motor/detectors/punch';
import { GameCore } from './core';
import { goalFor, percentOf, starsFor, type Age } from './scoring';
import type { GameContext, GameResult, GameSession, GameView, ScreenSide } from './types';

/**
 * Beat Punch (#12, #27): op de beat (vast 120 bpm) komt links of rechts een doel aan, met een
 * ring die krimpt tot op de tel. Stoot naar die kant als de ring sluit. Vanaf 9 jaar komen er ook
 * doelen boven je hoofd (stoot omhoog). 20 s, kort en explosief (#29).
 *
 * Stoten worden van voren gezien als snelle strekkingen opzij/omhoog (detector `stoot`, #37).
 */
export const BEAT_PUNCH = {
  durationMs: 20_000,
  bpm: 120,
  firstCueMs: 2000,
  /** Om de 2 tellen (1 s) een doel. */
  cueEveryMs: 1000,
  /** Zo lang vooraf is het doel al zichtbaar (ring krimpt). */
  approachMs: 1000,
  /** Raak als de stoot binnen ± zoveel ms van de tel valt; "perfect" binnen de kleinste marge. */
  goodMs: 350,
  perfectMs: 150,
  upFromAge: 9,
  upChance: 0.2,
  /** Raak van 18 doelen, per leeftijd. Voorlopig (#50). */
  goals: { 6: 9, 7: 10, 8: 11, 9: 12, 10: 13, 11: 14, 12: 15, 13: 16 } as Record<Age, number>,
  positions: { links: { x: 0.2, y: 0.38 }, rechts: { x: 0.8, y: 0.38 }, omhoog: { x: 0.5, y: 0.1 } },
  radius: 0.09,
  /** Zo lang blijft een afgehandeld doel nog zichtbaar (raak/mis-kleur). */
  showResultMs: 400,
  comboEvery: 5,
};

type Side = ScreenSide | 'omhoog';

interface Cue {
  id: number;
  side: Side;
  dueMs: number;
  state: 'komt' | 'raak' | 'perfect' | 'mis';
  resolvedMs: number;
}

export class BeatPunchSession implements GameSession {
  private readonly punches = new PunchDetector();
  private readonly core: GameCore;
  private readonly cues: Cue[] = [];
  private hits = 0;
  private perfect = 0;
  private combo = 0;
  private bestCombo = 0;

  constructor(
    private readonly age: number,
    private readonly ctx: GameContext,
  ) {
    this.core = new GameCore(BEAT_PUNCH.durationMs, goalFor(BEAT_PUNCH.goals, age));
    const random = ctx.random ?? Math.random;
    let last: Side | null = null;
    let id = 1;
    for (let due = BEAT_PUNCH.firstCueMs; due <= BEAT_PUNCH.durationMs - 500; due += BEAT_PUNCH.cueEveryMs) {
      let side: Side = random() < 0.5 ? 'links' : 'rechts';
      if (age >= BEAT_PUNCH.upFromAge && random() < BEAT_PUNCH.upChance) side = 'omhoog';
      // Niet drie keer na elkaar dezelfde kant.
      if (side === last && this.cues.length >= 2 && this.cues[this.cues.length - 2].side === side) side = side === 'links' ? 'rechts' : 'links';
      this.cues.push({ id: id++, side, dueMs: due, state: 'komt', resolvedMs: 0 });
      last = side;
    }
  }

  get totalCues(): number {
    return this.cues.length;
  }

  get finished(): boolean {
    return this.core.finished;
  }

  /** Welke stootrichting (vanuit de speler) hoort bij een doel aan deze schermkant? */
  private expected(side: Side): PunchDirection {
    if (side === 'omhoog') return 'omhoog';
    // Gespiegeld beeld: links op het scherm = linkerkant van de speler.
    if (this.ctx.mirrored) return side;
    return side === 'links' ? 'rechts' : 'links';
  }

  update(body: BodyPose, playing: boolean): void {
    if (this.core.tick(body, playing) === null) {
      this.punches.takePunches(); // stoten tijdens een pauze tellen niet
      return;
    }
    const now = this.core.elapsedMs;
    this.punches.update(body);
    for (const p of this.punches.takePunches()) {
      const cue = this.cues.find((c) => c.state === 'komt' && Math.abs(c.dueMs - now) <= BEAT_PUNCH.goodMs && this.expected(c.side) === p.direction);
      if (!cue) continue;
      const perfect = Math.abs(cue.dueMs - now) <= BEAT_PUNCH.perfectMs;
      cue.state = perfect ? 'perfect' : 'raak';
      cue.resolvedMs = now;
      this.hits++;
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      if (perfect) this.perfect++;
      this.core.push(perfect ? 'PERFECT' : 'RAAK', perfect ? 'bonus' : 'hit', false);
      if (this.combo % BEAT_PUNCH.comboEvery === 0) this.core.push(`COMBO x${this.combo}!`, 'bonus');
    }
    for (const c of this.cues) {
      if (c.state === 'komt' && now > c.dueMs + BEAT_PUNCH.goodMs) {
        c.state = 'mis';
        c.resolvedMs = now;
        this.combo = 0;
        this.core.push('', 'miss', false);
      }
    }
    this.core.progress(this.hits, 'KNOCK-OUT!');
  }

  view(): GameView {
    const c = this.core;
    const now = c.elapsedMs;
    const beatMs = 60_000 / BEAT_PUNCH.bpm;
    return {
      durationMs: c.durationMs,
      remainingMs: c.remainingMs,
      count: this.hits,
      unit: 'raak',
      goal: c.goal,
      progress: this.hits / c.goal,
      energy: c.energy.energy,
      zone: c.zone,
      coach: this.coachLine(),
      events: c.takeEvents(),
      finished: c.finished,
      musicBpm: BEAT_PUNCH.bpm,
      scene: {
        type: 'punch',
        beat: (now % beatMs) / beatMs,
        cues: this.cues
          .filter((q) => (q.state === 'komt' ? now >= q.dueMs - BEAT_PUNCH.approachMs : now - q.resolvedMs <= BEAT_PUNCH.showResultMs))
          .map((q) => ({
            id: q.id,
            side: q.side,
            ...BEAT_PUNCH.positions[q.side],
            radius: BEAT_PUNCH.radius,
            approach: Math.max(0, Math.min(1, 1 - (q.dueMs - now) / BEAT_PUNCH.approachMs)),
            state: q.state,
          })),
      },
    };
  }

  result(): GameResult {
    const c = this.core;
    const percent = percentOf(this.hits, c.goal);
    return {
      gameId: 'punch',
      count: this.hits,
      unit: 'raak',
      goal: c.goal,
      percent,
      stars: starsFor(percent),
      age: this.age,
      zoneSeconds: [...c.zones.seconds] as [number, number, number, number],
      details: [
        { label: 'Raak', value: `${this.hits} van ${this.cues.length}` },
        { label: 'Perfect op de tel', value: String(this.perfect) },
        { label: 'Langste combo', value: String(this.bestCombo) },
      ],
    };
  }

  private coachLine(): string {
    const c = this.core;
    if (c.finished) return 'Wat een punch!';
    const next = this.cues.find((q) => q.state === 'komt' && q.dueMs - c.elapsedMs <= BEAT_PUNCH.approachMs);
    if (c.elapsedMs < BEAT_PUNCH.firstCueMs) return 'Handen omhoog, klaar om te stoten!';
    if (next) return next.side === 'omhoog' ? 'Omhoog!' : next.side === 'links' ? 'Links!' : 'Rechts!';
    return c.goalReached ? 'Knock-out! Ga door!' : 'Op de beat!';
  }
}
