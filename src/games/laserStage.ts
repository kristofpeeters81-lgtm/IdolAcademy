import { isVisible, type BodyPose } from '../motor/body';
import { LM } from '../motor/landmarks';
import { DodgeDetector, type DodgeZone } from '../motor/detectors/dodge';
import { GameCore } from './core';
import { goalFor, percentOf, starsFor, type Age } from './scoring';
import type { GameContext, GameResult, GameSession, GameView } from './types';

/**
 * Laser Stage (#12, #27): laserwanden komen op je af.
 *   hoog  → bukken      laag   → springen
 *   links → opening links op het scherm: stap naar links      rechts → idem rechts
 * Op het moment dat de wand aankomt (± een marge) moet je in de juiste houding staan (detector
 * `ontwijk`). De wanden komen steeds sneller. 40 s.
 */
export const LASER = {
  durationMs: 40_000,
  firstWallMs: 2500,
  /** Tijd tussen twee wanden: van 2,6 s naar 1,8 s. */
  gapStartMs: 2600,
  gapEndMs: 1800,
  /** Zo lang zie je een wand aankomen: van 2,2 s naar 1,6 s. */
  approachStartMs: 2200,
  approachEndMs: 1600,
  /** De houding telt als ze klopt tussen (aankomst − before) en (aankomst + after). */
  beforeMs: 350,
  afterMs: 200,
  showResultMs: 500,
  /** Ontweken wanden in 40 s per leeftijd. Voorlopig (#50). */
  goals: { 6: 8, 7: 9, 8: 10, 9: 11, 10: 12, 11: 13, 12: 14, 13: 15 } as Record<Age, number>,
};

export type WallKind = 'hoog' | 'laag' | 'links' | 'rechts';

interface Wall {
  id: number;
  kind: WallKind;
  dueMs: number;
  approachMs: number;
  state: 'komt' | 'ontweken' | 'geraakt';
  resolvedMs: number;
}

const INSTRUCTION: Record<WallKind, string> = { hoog: 'Bukken!', laag: 'Springen!', links: 'Naar links!', rechts: 'Naar rechts!' };

export class LaserStageSession implements GameSession {
  private readonly dodge = new DodgeDetector();
  private readonly core: GameCore;
  private readonly walls: Wall[] = [];
  private readonly random: () => number;
  private dodged = 0;
  /** Waar hoofd en enkels van de speler rechtop ongeveer zitten (0..1 van de beeldhoogte). */
  private headY = 0.28;
  private ankleY = 0.88;
  private readonly perKind: Record<WallKind, { ok: number; total: number }> = {
    hoog: { ok: 0, total: 0 },
    laag: { ok: 0, total: 0 },
    links: { ok: 0, total: 0 },
    rechts: { ok: 0, total: 0 },
  };

  constructor(
    private readonly age: number,
    private readonly ctx: GameContext,
  ) {
    this.core = new GameCore(LASER.durationMs, goalFor(LASER.goals, age));
    this.random = ctx.random ?? Math.random;
    this.plan();
  }

  get finished(): boolean {
    return this.core.finished;
  }

  /** Welke houding (vanuit de speler) ontwijkt deze wand? */
  required(kind: WallKind): DodgeZone {
    if (kind === 'hoog') return 'bukken';
    if (kind === 'laag') return 'springen';
    // Gespiegeld beeld: links op het scherm = linkerkant van de speler.
    if (this.ctx.mirrored) return kind;
    return kind === 'links' ? 'rechts' : 'links';
  }

  update(body: BodyPose, playing: boolean): void {
    if (this.core.tick(body, playing) === null) return;
    const now = this.core.elapsedMs;
    this.dodge.update(body);
    const zone = this.dodge.current();
    // Lasers op de hoogte van déze speler: hoofd (bukken) en enkels (springen). Enkel bijwerken
    // als de speler rechtop in het midden staat, anders verspringen ze mee.
    if (zone === 'midden') {
      if (isVisible(body, LM.nose)) this.headY += (body.pts[LM.nose].y - this.headY) * 0.1;
      if (isVisible(body, LM.leftAnkle) && isVisible(body, LM.rightAnkle)) {
        const a = Math.max(body.pts[LM.leftAnkle].y, body.pts[LM.rightAnkle].y);
        this.ankleY += (a - this.ankleY) * 0.1;
      }
    }
    for (const w of this.walls) {
      if (w.state !== 'komt') continue;
      if (zone === this.required(w.kind) && now >= w.dueMs - LASER.beforeMs && now <= w.dueMs + LASER.afterMs) {
        w.state = 'ontweken';
        w.resolvedMs = now;
        this.dodged++;
        this.perKind[w.kind].ok++;
        this.core.push('', 'hit', false);
      } else if (now > w.dueMs + LASER.afterMs) {
        w.state = 'geraakt';
        w.resolvedMs = now;
        this.core.push('', 'miss', false);
      }
    }
    this.core.progress(this.dodged, 'LASER LEGEND!');
  }

  view(): GameView {
    const c = this.core;
    const now = c.elapsedMs;
    const next = this.walls.find((w) => w.state === 'komt' && now >= w.dueMs - w.approachMs);
    return {
      durationMs: c.durationMs,
      remainingMs: c.remainingMs,
      count: this.dodged,
      unit: 'ontweken',
      goal: c.goal,
      progress: this.dodged / c.goal,
      energy: c.energy.energy,
      zone: c.zone,
      coach: c.finished ? 'Niemand ontwijkt zoals jij!' : next ? INSTRUCTION[next.kind] : now < LASER.firstWallMs ? 'Let op de lasers!' : 'Klaar voor de volgende!',
      events: c.takeEvents(),
      finished: c.finished,
      coachUrgent: Boolean(next),
      scene: {
        type: 'laser',
        walls: this.walls
          .filter((w) => (w.state === 'komt' ? now >= w.dueMs - w.approachMs : now - w.resolvedMs <= LASER.showResultMs))
          .map((w) => ({
            id: w.id,
            kind: w.kind,
            approach: Math.max(0, Math.min(1, 1 - (w.dueMs - now) / w.approachMs)),
            state: w.state,
            y: w.kind === 'hoog' ? this.headY : w.kind === 'laag' ? this.ankleY - 0.02 : 0.5,
          })),
      },
    };
  }

  result(): GameResult {
    const c = this.core;
    const percent = percentOf(this.dodged, c.goal);
    const k = this.perKind;
    const frac = (x: { ok: number; total: number }) => `${x.ok}/${x.total}`;
    return {
      gameId: 'laser',
      count: this.dodged,
      unit: 'ontweken',
      goal: c.goal,
      percent,
      stars: starsFor(percent),
      age: this.age,
      zoneSeconds: [...c.zones.seconds] as [number, number, number, number],
      details: [
        { label: 'Ontweken', value: `${this.dodged} van ${this.walls.filter((w) => w.dueMs <= c.durationMs).length}` },
        { label: 'Bukken / springen', value: `${frac(k.hoog)} · ${frac(k.laag)}` },
        { label: 'Links / rechts', value: `${frac(k.links)} · ${frac(k.rechts)}` },
      ],
    };
  }

  /** Alle wanden vooraf inplannen (steeds sneller, nooit drie keer hetzelfde na elkaar). */
  private plan(): void {
    const kinds: WallKind[] = ['hoog', 'laag', 'links', 'rechts'];
    let due = LASER.firstWallMs;
    let id = 1;
    while (due <= LASER.durationMs - 300) {
      const f = due / LASER.durationMs;
      let kind = kinds[Math.floor(this.random() * kinds.length)];
      const n = this.walls.length;
      if (n >= 2 && this.walls[n - 1].kind === kind && this.walls[n - 2].kind === kind) kind = kinds[(kinds.indexOf(kind) + 1) % kinds.length];
      const approachMs = LASER.approachStartMs + (LASER.approachEndMs - LASER.approachStartMs) * f;
      this.walls.push({ id: id++, kind, dueMs: due, approachMs, state: 'komt', resolvedMs: 0 });
      this.perKind[kind].total++;
      due += LASER.gapStartMs + (LASER.gapEndMs - LASER.gapStartMs) * f;
    }
  }

  /** Voor tests: de geplande wanden. */
  get schedule(): readonly { kind: WallKind; dueMs: number }[] {
    return this.walls;
  }
}
