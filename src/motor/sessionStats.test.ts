import { describe, expect, it } from 'vitest';
import { SessionRecorder, summarizeSession, type FrameSample } from './sessionStats';

/** Maakt `seconds` seconden aan beelden aan `fps`, met een vast aantal zichtbare punten. */
function frames(start: number, seconds: number, fps: number, visible: number, inferenceMs = 20): FrameSample[] {
  const n = Math.round(seconds * fps);
  return Array.from({ length: n }, (_, i) => ({ t: start + (i * 1000) / fps, inferenceMs, visible }));
}

describe('summarizeSession', () => {
  it('geeft null zonder genoeg data', () => {
    expect(summarizeSession([], 0)).toBeNull();
  });

  it('meet gemiddelde en traagste seconde', () => {
    const s = [...frames(0, 5, 30, 9), ...frames(5000, 2, 10, 9), ...frames(7000, 5, 30, 9)];
    const sum = summarizeSession(s, 12_000)!;
    expect(sum.minFps).toBe(10);
    expect(sum.avgFps).toBeGreaterThan(20);
    expect(sum.avgFps).toBeLessThan(30);
  });

  it('kijkt naar de hele minuut, niet naar het laatste moment', () => {
    // 50 s volledig in beeld, dan 5 s vlak bij het toestel (3/9) om op de knop te tikken.
    const s = [...frames(0, 50, 30, 9), ...frames(50_000, 5, 30, 3)];
    const sum = summarizeSession(s, 55_000)!;
    expect(sum.typicalVisible).toBe(9);
    expect(sum.fullBodyShare).toBeGreaterThan(0.85);
  });

  it('berekent de p95-rekentijd', () => {
    const s = frames(0, 10, 10, 9).map((f, i) => ({ ...f, inferenceMs: i < 95 ? 20 : 100 }));
    const sum = summarizeSession(s, 10_000)!;
    expect(sum.p95InferenceMs).toBe(100);
    expect(sum.avgInferenceMs).toBeCloseTo(24, 0);
  });

  it('negeert beelden buiten het venster', () => {
    const s = [...frames(0, 10, 30, 2), ...frames(100_000, 10, 30, 9)];
    expect(summarizeSession(s, 110_000)!.typicalVisible).toBe(9);
  });
});

describe('SessionRecorder', () => {
  it('houdt enkel het venster bij', () => {
    const r = new SessionRecorder(1000);
    for (const f of frames(0, 5, 30, 9)) r.push(f);
    expect(r.summary(5000)!.frames).toBeLessThanOrEqual(31);
  });
});

describe('summarizeSession — hapering', () => {
  it('ziet een hapering in de eerste seconde (gemiddelde nooit boven het minimum uit)', () => {
    // Eerste seconde: 1 beeld, dan 0,9 s stilstand; daarna vlot 30 fps.
    const s = [{ t: 0, inferenceMs: 900, visible: 9 }, ...frames(1000, 5, 30, 9)];
    const sum = summarizeSession(s, 6000)!;
    expect(sum.minFps).toBeLessThanOrEqual(sum.avgFps);
    expect(sum.minFps).toBe(1);
  });
});
