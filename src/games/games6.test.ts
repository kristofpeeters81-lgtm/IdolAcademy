import { describe, expect, it } from 'vitest';
import { BodyTracker } from '../motor/body';
import { LM } from '../motor/landmarks';
import { synthLandmarks, type SynthParams } from '../motor/testing/synthPose';
import type { PoseFrame } from '../motor/types';
import { BEAT_PUNCH, BeatPunchSession } from './beatPunch';
import { LaserStageSession, type WallKind } from './laserStage';
import { LightstickCatchSession } from './lightstickCatch';
import type { GameSession } from './types';

const ASPECT = 4 / 3;
const FPS = 30;

/** Vaste "willekeur" voor herhaalbare tests. */
function seeded(seed = 7): () => number {
  let x = seed;
  return () => (x = (x * 16807) % 2147483647) / 2147483647;
}

function frame(t: number, p: SynthParams, edit?: (lm: ReturnType<typeof synthLandmarks>) => void): PoseFrame {
  const lm = synthLandmarks({ ...p, aspect: ASPECT });
  edit?.(lm);
  return { landmarks: lm, timestamp: 1000 + t * 1000, inferenceMs: 20, aspect: ASPECT };
}

/**
 * Speelt een game: eerst 1 s rechtop (niet spelen), dan `seconds` spelen. `pose(elapsedMs, s)`
 * bepaalt per beeld de houding (en mag de punten aanpassen).
 */
function play(s: GameSession, seconds: number, pose: (elapsedMs: number) => { p: SynthParams; edit?: (lm: ReturnType<typeof synthLandmarks>) => void }) {
  const tracker = new BodyTracker();
  const n = Math.round((1 + seconds) * FPS);
  for (let i = 0; i < n; i++) {
    const t = i / FPS;
    const playing = t >= 1;
    const elapsed = Math.max(0, (t - 1) * 1000);
    const { p, edit } = playing ? pose(elapsed) : { p: {} };
    s.update(tracker.update(frame(t, p, edit)), playing);
    s.view();
  }
}

describe('Lightstick Catch', () => {
  const ctx = { mirrored: true, aspect: ASPECT };

  it('een hand op elke lightstick vangt ze allemaal (goud telt dubbel)', () => {
    const s = new LightstickCatchSession(8, { ...ctx, random: seeded() });
    play(s, 41, () => ({
      p: {},
      edit: (lm) => {
        const scene = s.view().scene;
        if (scene.type !== 'lightsticks' || scene.targets.length === 0) return;
        const t = scene.targets[0];
        // Schermcoördinaat → ruw camerabeeld (gespiegeld): x omkeren.
        for (const i of [LM.leftWrist, LM.leftIndex, LM.leftPinky]) lm[i] = { x: 1 - t.x, y: t.y, z: 0, visibility: 0.95 };
      },
    }));
    const r = s.result();
    expect(r.count).toBeGreaterThan(r.goal);
    expect(r.stars).toBe(3);
    expect(r.details.find((d) => d.label === 'Gouden sticks')?.value).not.toBe('0');
  });

  it('niet bewegen = niets gevangen, en de game stopt na 40 s', () => {
    const s = new LightstickCatchSession(8, { ...ctx, random: seeded() });
    play(s, 42, () => ({ p: {} }));
    expect(s.view().finished).toBe(true);
    expect(s.result().count).toBe(0);
  });
});

describe('Beat Punch', () => {
  /** Stoot met de arm aan de juiste kant, 0,3 s lang, beginnend 150 ms vóór de tel. */
  function puncher(s: BeatPunchSession, mirrored: boolean, wrongSide = false) {
    const guard: SynthParams = { leftArm: 40, rightArm: 40, leftElbow: 1, rightElbow: 1 };
    const cues: { dueMs: number; side: string }[] = [];
    for (let due = BEAT_PUNCH.firstCueMs; due <= BEAT_PUNCH.durationMs - 500; due += BEAT_PUNCH.cueEveryMs) cues.push({ dueMs: due, side: '' });
    return (elapsed: number) => {
      const scene = s.view().scene;
      if (scene.type !== 'punch') return { p: guard };
      const cue = scene.cues.find((c) => c.state === 'komt' && c.approach > 0.6);
      const due = cues.find((c) => elapsed >= c.dueMs - 150 && elapsed <= c.dueMs + 150);
      if (!cue || !due) return { p: guard };
      const e = Math.sin(Math.min(1, (elapsed - (due.dueMs - 150)) / 300) * Math.PI);
      // Gespiegeld: links op het scherm = linkerarm van de speler.
      let leftArm = cue.side === 'links' ? mirrored : !mirrored;
      if (wrongSide) leftArm = !leftArm;
      return { p: leftArm ? { ...guard, leftArm: 40 + 50 * e, leftElbow: 1 - e } : { ...guard, rightArm: 40 + 50 * e, rightElbow: 1 - e } };
    };
  }

  it('op de tel naar de juiste kant stoten = (bijna) alles raak', () => {
    const s = new BeatPunchSession(8, { mirrored: true, aspect: ASPECT, random: seeded() });
    play(s, 21, puncher(s, true));
    const r = s.result();
    expect(r.count).toBeGreaterThanOrEqual(s.totalCues - 1);
    expect(r.stars).toBe(3);
  });

  it('naar de verkeerde kant stoten telt niet', () => {
    const s = new BeatPunchSession(8, { mirrored: true, aspect: ASPECT, random: seeded() });
    play(s, 21, puncher(s, true, true));
    expect(s.result().count).toBe(0);
  });

  it('zonder spiegeling (achtercamera) wisselen links en rechts', () => {
    const s = new BeatPunchSession(8, { mirrored: false, aspect: ASPECT, random: seeded() });
    play(s, 21, puncher(s, false));
    expect(s.result().count).toBeGreaterThanOrEqual(s.totalCues - 1);
  });

  it('vraagt een vast tempo van 120 bpm aan de muziek', () => {
    expect(new BeatPunchSession(8, { mirrored: true, aspect: ASPECT }).view().musicBpm).toBe(120);
  });
});

describe('Laser Stage', () => {
  const posture = (kind: WallKind, mirrored: boolean): SynthParams => {
    if (kind === 'hoog') return { duck: 0.7 };
    if (kind === 'laag') return { jump: 0.3 };
    // Gespiegeld: opening links op het scherm = stap naar de linkerkant van de speler (shift +).
    const toPlayersLeft = kind === 'links' ? mirrored : !mirrored;
    return { shift: toPlayersLeft ? 1 : -1 };
  };

  function dodger(s: LaserStageSession, mirrored: boolean) {
    return (elapsed: number) => {
      const wall = s.schedule.find((w) => elapsed >= w.dueMs - 300 && elapsed <= w.dueMs + 100);
      return { p: wall ? posture(wall.kind, mirrored) : {} };
    };
  }

  it('de juiste houding op het juiste moment ontwijkt elke wand', () => {
    const s = new LaserStageSession(8, { mirrored: true, aspect: ASPECT, random: seeded() });
    play(s, 41, dodger(s, true));
    const r = s.result();
    expect(r.count).toBe(s.schedule.length);
    expect(r.stars).toBe(3);
  });

  it('stilstaan ontwijkt niets', () => {
    const s = new LaserStageSession(8, { mirrored: true, aspect: ASPECT, random: seeded() });
    play(s, 41, () => ({ p: {} }));
    expect(s.result().count).toBe(0);
  });

  it('legt de hoge laser op hoofdhoogte en de lage op enkelhoogte van de speler', () => {
    const s = new LaserStageSession(8, { mirrored: true, aspect: ASPECT, random: seeded() });
    const ys: Record<string, number> = {};
    const tracker = new BodyTracker();
    for (let i = 0; i < 40 * FPS; i++) {
      s.update(tracker.update(frame(i / FPS, {})), true);
      const scene = s.view().scene;
      if (scene.type === 'laser') for (const w of scene.walls) if (i > 3 * FPS) ys[w.kind] ??= w.y;
    }
    const nose = synthLandmarks({ aspect: ASPECT })[LM.nose].y;
    const ankle = synthLandmarks({ aspect: ASPECT })[LM.leftAnkle].y;
    expect(ys.hoog).toBeCloseTo(nose, 2);
    expect(ys.laag).toBeCloseTo(ankle - 0.02, 2);
  });

  it('plant de vier soorten wanden, steeds sneller, nooit 3× dezelfde na elkaar', () => {
    const s = new LaserStageSession(8, { mirrored: true, aspect: ASPECT, random: seeded(3) });
    const kinds = s.schedule.map((w) => w.kind);
    expect(new Set(kinds).size).toBe(4);
    for (let i = 2; i < kinds.length; i++) expect(kinds[i] === kinds[i - 1] && kinds[i] === kinds[i - 2]).toBe(false);
    const gaps = s.schedule.slice(1).map((w, i) => w.dueMs - s.schedule[i].dueMs);
    expect(gaps[gaps.length - 1]).toBeLessThan(gaps[0]);
  });
});
