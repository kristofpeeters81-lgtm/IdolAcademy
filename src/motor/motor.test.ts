import { describe, expect, it } from 'vitest';
import { cameraErrorCode } from './camera';
import { countVisibleBodyPoints, FULL_BODY_POINTS, LANDMARK_COUNT } from './landmarks';
import { decideAutoModel, SETTLE_SECONDS, type AutoModelInput } from './modelChoice';
import { RateMeter, RollingAverage } from './stats';
import { nextTimestamp } from './timestamps';
import type { Landmark } from './types';

describe('RateMeter', () => {
  it('meet 30 tikken per seconde', () => {
    const m = new RateMeter(1000);
    for (let i = 0; i <= 30; i++) m.tick(1000 + (i * 1000) / 30);
    expect(m.rate(2000)).toBeCloseTo(30, 0);
  });

  it('zakt naar 0 als de stroom stopt', () => {
    const m = new RateMeter(1000);
    for (let i = 0; i < 10; i++) m.tick(i * 33);
    expect(m.rate(5000)).toBe(0);
  });

  it('geeft 0 bij minder dan twee tikken', () => {
    const m = new RateMeter();
    m.tick(10);
    expect(m.rate(10)).toBe(0);
  });
});

describe('RollingAverage', () => {
  it('houdt enkel de laatste waarden bij', () => {
    const a = new RollingAverage(3);
    [100, 1, 2, 3].forEach((v) => a.push(v));
    expect(a.average).toBe(2);
    expect(a.count).toBe(3);
  });

  it('is 0 zonder waarden', () => {
    expect(new RollingAverage().average).toBe(0);
  });
});

describe('decideAutoModel', () => {
  const base: AutoModelInput = { current: 'lite', secondsOnModel: 10, detectionFps: 30, inferenceMs: 8, fullRejected: false };

  it('beslist niets tijdens de opwarmtijd', () => {
    expect(decideAutoModel({ ...base, secondsOnModel: SETTLE_SECONDS - 0.1 })).toBe('keep');
  });

  it('waardeert lite op naar full op een snel toestel', () => {
    expect(decideAutoModel(base)).toBe('upgrade');
  });

  it('blijft op lite als de rekentijd al krap is', () => {
    expect(decideAutoModel({ ...base, inferenceMs: 25 })).toBe('keep');
  });

  it('blijft op lite als de fps te laag is', () => {
    expect(decideAutoModel({ ...base, detectionFps: 18 })).toBe('keep');
  });

  it('probeert full nooit opnieuw na een afkeuring', () => {
    expect(decideAutoModel({ ...base, fullRejected: true })).toBe('keep');
  });

  it('gaat terug naar lite als full te traag is', () => {
    expect(decideAutoModel({ ...base, current: 'full', detectionFps: 10 })).toBe('downgrade');
  });

  it('houdt full als het vlot loopt', () => {
    expect(decideAutoModel({ ...base, current: 'full', detectionFps: 25 })).toBe('keep');
  });
});

describe('countVisibleBodyPoints', () => {
  const pose = (visibility: number, x = 0.5): Landmark[] =>
    Array.from({ length: LANDMARK_COUNT }, () => ({ x, y: 0.5, z: 0, visibility }));

  it('telt alle 9 kernpunten als iedereen goed zichtbaar is', () => {
    expect(countVisibleBodyPoints(pose(0.9))).toBe(FULL_BODY_POINTS.length);
  });

  it('telt geen punten met lage zekerheid', () => {
    expect(countVisibleBodyPoints(pose(0.2))).toBe(0);
  });

  it('telt geen punten buiten het beeld', () => {
    expect(countVisibleBodyPoints(pose(0.9, 1.2))).toBe(0);
  });

  it('geeft 0 als er niemand in beeld is', () => {
    expect(countVisibleBodyPoints(null)).toBe(0);
  });
});

describe('cameraErrorCode', () => {
  const err = (name: string) => Object.assign(new Error('x'), { name });

  it.each([
    ['NotAllowedError', 'denied'],
    ['NotFoundError', 'not-found'],
    ['OverconstrainedError', 'not-found'],
    ['NotReadableError', 'busy'],
    ['IetsAnders', 'unknown'],
  ] as const)('%s → %s', (name, code) => {
    expect(cameraErrorCode(err(name))).toBe(code);
  });

  it('herkent ook een DOMException-achtig object', () => {
    expect(cameraErrorCode({ name: 'NotAllowedError' })).toBe('denied');
  });

  it('valt terug op unknown bij rommel', () => {
    expect(cameraErrorCode('stuk')).toBe('unknown');
  });
});

describe('nextTimestamp', () => {
  it('rondt af op hele milliseconden', () => {
    expect(nextTimestamp(1000.4, 0)).toBe(1000);
  });

  it('stijgt altijd minstens 1 ms, ook als de klok terugloopt of stilstaat', () => {
    expect(nextTimestamp(15753.0005, 15753)).toBe(15754);
    expect(nextTimestamp(900, 1000)).toBe(1001);
  });
});
