import { describe, expect, it } from 'vitest';
import { BodyTracker } from './body';
import { PresenceTracker } from './presence';
import { RecordingBuilder, parseRecording, recordingFileName, recordingToFrames } from './recording';
import { SpaceCheck, judgeSpace } from './spaceCheck';
import { synthLandmarks, synthSequence, type SynthParams } from './testing/synthPose';
import type { PoseFrame } from './types';

const bodyOf = (p: SynthParams) => {
  const tracker = new BodyTracker();
  const frame: PoseFrame = { landmarks: synthLandmarks(p), timestamp: 1000, inferenceMs: 0, aspect: 4 / 3 };
  return tracker.update(frame);
};

describe('judgeSpace', () => {
  it('is tevreden op een goede afstand in het midden', () => {
    expect(judgeSpace(bodyOf({ torso: 0.2 }), 'full').ok).toBe(true);
  });

  it('vraagt achteruit te stappen als je te dichtbij staat', () => {
    expect(judgeSpace(bodyOf({ torso: 0.3, floorY: 1.1 }), 'full').message).toMatch(/achteruit/);
  });

  it('vraagt dichterbij te komen als je te ver staat', () => {
    expect(judgeSpace(bodyOf({ torso: 0.08 }), 'full').message).toBe('Kom wat dichterbij');
  });

  it('vraagt naar het midden te gaan', () => {
    expect(judgeSpace(bodyOf({ cx: 0.25 }), 'full').message).toBe('Ga meer in het midden staan');
  });

  it('voor bovenlichaam-games mag je dichterbij staan (voeten uit beeld)', () => {
    const close = bodyOf({ torso: 0.32, floorY: 1.25 });
    expect(judgeSpace(close, 'full').ok).toBe(false);
    expect(judgeSpace(close, 'upper').ok).toBe(true);
  });

  it('voor bovenlichaam-games is de gewone afstand (hele lichaam in beeld) ook goed', () => {
    expect(judgeSpace(bodyOf({ torso: 0.2 }), 'upper').ok).toBe(true);
    expect(judgeSpace(bodyOf({ torso: 0.15 }), 'upper').ok).toBe(true);
  });

  it('meldt dat er niemand in beeld is', () => {
    const tracker = new BodyTracker();
    const empty = tracker.update({ landmarks: null, timestamp: 0, inferenceMs: 0, aspect: 4 / 3 });
    expect(judgeSpace(empty, 'full').message).toBe('Ga voor de camera staan');
  });
});

describe('SpaceCheck', () => {
  it('wordt pas klaar na 1,5 s aan één stuk goed staan', () => {
    const check = new SpaceCheck('full');
    const tracker = new BodyTracker();
    const frames = synthSequence(2, () => ({}));
    const statuses = frames.map((f) => check.update(tracker.update(f)).status);
    const firstDone = statuses.indexOf('klaar');
    expect(firstDone).toBeGreaterThanOrEqual(44); // ±1,5 s × 30 beelden
    expect(firstDone).toBeLessThanOrEqual(47);
  });

  it('begint opnieuw te tellen als je even uit de positie gaat', () => {
    const check = new SpaceCheck('full');
    const tracker = new BodyTracker();
    const frames = synthSequence(3, (t) => (t > 1 && t < 1.2 ? { cx: 0.2 } : {}));
    const statuses = frames.map((f) => check.update(tracker.update(f)).status);
    expect(statuses.indexOf('klaar')).toBeGreaterThan(80);
  });
});

describe('PresenceTracker', () => {
  it('pauzeert pas na 0,8 s weg en negeert één gemist beeld', () => {
    const presence = new PresenceTracker('full');
    const tracker = new BodyTracker();
    // 1 s in beeld, 1 beeld niemand, 1 s in beeld, dan 2 s weg.
    const frames = synthSequence(5, (t) => (Math.abs(t - 1) < 0.02 || t > 3 ? null : {}));
    const states = frames.map((f) => presence.update(tracker.update(f)));
    expect(states[29]).toBe('in');
    expect(states[31]).not.toBe('weg');
    expect(states[89]).toBe('in');
    expect(states[95]).not.toBe('weg'); // net weg, nog geen 0,8 s
    expect(states[149]).toBe('weg');
  });
});

describe('opnames', () => {
  it('bewaart en leest een opname terug zonder verlies van betekenis', () => {
    const builder = new RecordingBuilder();
    const frames = synthSequence(2, (t) => (t < 1 ? {} : null));
    for (const f of frames) builder.push(f);
    const rec = builder.build({ detector: 'squat', expected: 3, detected: 2, note: 'test', app: 'test' });
    const back = parseRecording(JSON.stringify(rec));
    expect(back.frames.length).toBe(frames.length);
    const replay = recordingToFrames(back);
    expect(replay[0].landmarks?.[0].x).toBeCloseTo(frames[0].landmarks![0].x, 3);
    expect(replay[45].landmarks).toBeNull();
  });

  it('weigert een vreemd bestand', () => {
    expect(() => parseRecording('{"hallo":1}')).toThrow(/Geen Idol Academy-opname/);
  });

  it('maakt een leesbare bestandsnaam', () => {
    expect(recordingFileName('squat', new Date(2026, 9, 11, 14, 5))).toBe('opname-squat-2026-10-11-1405.json');
  });
});
