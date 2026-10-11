import type { BodyPose } from '../motor/body';
import { hitsTarget, limbsOnScreen } from '../motor/hit';
import { GameCore } from './core';
import { goalFor, percentOf, starsFor, type Age } from './scoring';
import type { GameContext, GameResult, GameSession, GameView } from './types';

/**
 * Lightstick Catch (#12, #27): gloeiende lightsticks verschijnen rond de speler; tik ze aan met
 * je hand voor ze doven. Elke 5e is goud en hangt hoog boven je hoofd (strekken/springen!) en
 * telt dubbel. Na 15 s verschijnen er twee tegelijk, en ze doven steeds sneller.
 */
export const LIGHTSTICK = {
  durationMs: 40_000,
  /** Punten in 40 s per leeftijd (goud = 2). Voorlopig (#50). */
  goals: { 6: 16, 7: 18, 8: 20, 9: 22, 10: 24, 11: 26, 12: 28, 13: 30 } as Record<Age, number>,
  radius: 0.075,
  /** Levensduur van een lightstick: van 2,6 s bij de start naar 1,7 s op het einde. */
  lifeStartMs: 2600,
  lifeEndMs: 1700,
  goldEvery: 5,
  twoAtOnceAfterMs: 15_000,
  /** Kort wachten na een vangst/doven voor de volgende verschijnt. */
  respawnMs: 250,
  /** Gebied (fractie van het beeld) waar gewone sticks verschijnen: reikbaar voor kinderen. */
  area: { xMin: 0.12, xMax: 0.88, yMin: 0.15, yMax: 0.62 },
  goldY: { min: 0.05, max: 0.13 },
  minDistance: 0.25,
  /** Nieuwe sticks nooit binnen deze afstand van een hand: vangen moet altijd een beweging zijn. */
  minFromHands: 0.25,
};

interface Stick {
  id: number;
  x: number;
  y: number;
  gold: boolean;
  bornMs: number;
  lifeMs: number;
}

export class LightstickCatchSession implements GameSession {
  private readonly core: GameCore;
  private readonly random: () => number;
  private sticks: Stick[] = [];
  private nextId = 1;
  private spawned = 0;
  private points = 0;
  private caught = 0;
  private missed = 0;
  private gold = 0;
  private nextSpawnMs = 600;

  constructor(
    private readonly age: number,
    private readonly ctx: GameContext,
  ) {
    this.core = new GameCore(LIGHTSTICK.durationMs, goalFor(LIGHTSTICK.goals, age));
    this.random = ctx.random ?? Math.random;
  }

  get finished(): boolean {
    return this.core.finished;
  }

  update(body: BodyPose, playing: boolean): void {
    if (this.core.tick(body, playing) === null) return;
    const now = this.core.elapsedMs;

    // Vangen.
    const hands = limbsOnScreen(body, this.ctx.mirrored, ['linkerhand', 'rechterhand']);
    for (const s of [...this.sticks]) {
      if (hitsTarget(hands, { x: s.x, y: s.y, radius: LIGHTSTICK.radius }, this.ctx.aspect).length === 0) continue;
      this.remove(s);
      this.caught++;
      this.points += s.gold ? 2 : 1;
      if (s.gold) {
        this.gold++;
        this.core.push('GOUD!', 'bonus');
      } else {
        this.core.push('', 'hit', false);
      }
    }
    // Doven.
    for (const s of [...this.sticks]) {
      if (now - s.bornMs < s.lifeMs) continue;
      this.remove(s);
      this.missed++;
      this.core.push('', 'miss', false);
    }
    // Nieuwe.
    const wanted = now >= LIGHTSTICK.twoAtOnceAfterMs ? 2 : 1;
    if (this.sticks.length < wanted && now >= this.nextSpawnMs) this.spawn(now, hands);

    this.core.progress(this.points, 'FAN FAVORITE!');
  }

  view(): GameView {
    const c = this.core;
    const now = c.elapsedMs;
    return {
      durationMs: c.durationMs,
      remainingMs: c.remainingMs,
      count: this.points,
      unit: 'lichtjes',
      goal: c.goal,
      progress: this.points / c.goal,
      energy: c.energy.energy,
      zone: c.zone,
      coach: this.coachLine(),
      events: c.takeEvents(),
      finished: c.finished,
      scene: {
        type: 'lightsticks',
        targets: this.sticks.map((s) => ({ id: s.id, x: s.x, y: s.y, radius: LIGHTSTICK.radius, gold: s.gold, life: Math.max(0, 1 - (now - s.bornMs) / s.lifeMs) })),
      },
    };
  }

  result(): GameResult {
    const c = this.core;
    const percent = percentOf(this.points, c.goal);
    const total = this.caught + this.missed;
    return {
      gameId: 'lightstick',
      count: this.points,
      unit: 'lichtjes',
      goal: c.goal,
      percent,
      stars: starsFor(percent),
      age: this.age,
      zoneSeconds: [...c.zones.seconds] as [number, number, number, number],
      details: [
        { label: 'Gevangen', value: `${this.caught} van ${total} (${total ? Math.round((this.caught / total) * 100) : 0}%)` },
        { label: 'Gouden sticks', value: String(this.gold) },
        { label: 'Intens of explosief', value: `${c.intensePercent()}% van de tijd` },
      ],
    };
  }

  private remove(s: Stick): void {
    this.sticks = this.sticks.filter((t) => t !== s);
    this.nextSpawnMs = Math.max(this.nextSpawnMs, this.core.elapsedMs + LIGHTSTICK.respawnMs);
  }

  private spawn(now: number, hands: readonly { x: number; y: number }[]): void {
    this.spawned++;
    const gold = this.spawned % LIGHTSTICK.goldEvery === 0;
    const a = LIGHTSTICK.area;
    let x = 0.5;
    let y = 0.4;
    for (let i = 0; i < 20; i++) {
      x = a.xMin + this.random() * (a.xMax - a.xMin);
      y = gold ? LIGHTSTICK.goldY.min + this.random() * (LIGHTSTICK.goldY.max - LIGHTSTICK.goldY.min) : a.yMin + this.random() * (a.yMax - a.yMin);
      const dist = (p: { x: number; y: number }) => Math.hypot((p.x - x) * this.ctx.aspect, p.y - y);
      const far = this.sticks.every((s) => dist(s) >= LIGHTSTICK.minDistance) && hands.every((h) => dist(h) >= LIGHTSTICK.minFromHands);
      if (far) break;
    }
    const f = now / LIGHTSTICK.durationMs;
    const lifeMs = (gold ? 1.3 : 1) * (LIGHTSTICK.lifeStartMs + (LIGHTSTICK.lifeEndMs - LIGHTSTICK.lifeStartMs) * f);
    this.sticks.push({ id: this.nextId++, x, y, gold, bornMs: now, lifeMs });
  }

  private coachLine(): string {
    const c = this.core;
    if (c.finished) return 'Wat een fans heb jij!';
    if (c.elapsedMs === 0) return 'Vang de lichtjes met je handen!';
    if (this.sticks.some((s) => s.gold)) return 'Goud! Strek je uit, spring!';
    if (c.remainingMs <= 5000) return 'Nog 5 seconden! Snel!';
    if (c.elapsedMs >= LIGHTSTICK.twoAtOnceAfterMs && c.elapsedMs < LIGHTSTICK.twoAtOnceAfterMs + 2500) return 'Nu twee tegelijk!';
    return c.goalReached ? 'Je fans gaan uit de bol!' : 'Snel, voor ze doven!';
  }
}
