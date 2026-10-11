import { describe, expect, it } from 'vitest';
import { BodyTracker } from '../body';
import { synthSequence, wave, type SynthParams } from '../testing/synthPose';
import type { PoseFrame } from '../types';
import { ClimbDetector } from './climb';
import type { Detector } from './common';
import { DodgeDetector, type DodgeZone } from './dodge';
import { EnergyMeter } from './energy';
import { HighKneesDetector } from './highKnees';
import { HoldDetector } from './hold';
import { DETECTORS } from './index';
import { JumpingJackDetector } from './jumpingJack';
import { PunchDetector } from './punch';
import { SquatDetector } from './squat';

/** Laat camerabeelden door de normalisatie en de detector lopen. */
function run<D extends Detector>(detector: D, frames: PoseFrame[]): D {
  const tracker = new BodyTracker();
  for (const f of frames) detector.update(tracker.update(f));
  return detector;
}

/** Eerst 2 s rechtop staan (zoals na de ruimte-check), dan de beweging. */
function afterStanding(seconds: number, move: (t: number) => SynthParams | null, base: SynthParams = {}): PoseFrame[] {
  return synthSequence(2 + seconds, (t) => (t < 2 ? base : move(t - 2)));
}

describe('SquatDetector', () => {
  it('telt 10 squats', () => {
    const d = run(new SquatDetector(), afterStanding(20, (t) => ({ squat: wave(t, 2) * 0.8 })));
    expect(d.reading().count).toBe(10);
  });

  it('telt ondiepe kinder-squats (halve diepte) ook', () => {
    const d = run(new SquatDetector(), afterStanding(12, (t) => ({ squat: wave(t, 1.5) * 0.55 })));
    expect(d.reading().count).toBe(8);
  });

  it('telt een heel klein knikje niet', () => {
    const d = run(new SquatDetector(), afterStanding(10, (t) => ({ squat: wave(t, 1.5) * 0.25 })));
    expect(d.reading().count).toBe(0);
  });

  it('werkt even goed ver van de camera (kleinere romp)', () => {
    const d = run(new SquatDetector(), afterStanding(10, (t) => ({ squat: wave(t, 2) * 0.8, torso: 0.12 }), { torso: 0.12 }));
    expect(d.reading().count).toBe(5);
  });

  it('herkent sprongsquats als bonus', () => {
    const frames = afterStanding(9, (t) => {
      const phase = t % 3; // 0–2 s squat, 2–2,4 s sprong, rest stilstaan
      if (phase < 2) return { squat: wave(phase, 2) * 0.8 };
      if (phase < 2.4) return { jump: 0.3 * Math.sin(((phase - 2) / 0.4) * Math.PI) };
      return {};
    });
    const d = run(new SquatDetector(), frames);
    expect(d.reading().count).toBe(3);
    expect(d.reading().detail).toContain('sprongsquats 3');
  });

  it('telt niet als de knieën uit beeld zijn', () => {
    const d = run(new SquatDetector(), afterStanding(10, (t) => ({ squat: wave(t, 2) * 0.8, visibility: 0.2 })));
    expect(d.reading().count).toBe(0);
    expect(d.reading().signal).toBeNull();
  });
});

describe('HighKneesDetector', () => {
  it('telt afwisselende knieheffingen', () => {
    // Elke 0,25 s een knie: 4 stappen per seconde × 5 s = 20.
    const d = run(
      new HighKneesDetector(),
      afterStanding(5.5, (t) => {
        if (t >= 5) return {}; // laatste stap afmaken
        const i = Math.floor(t / 0.25);
        const lift = Math.sin(((t % 0.25) / 0.25) * Math.PI) * 0.7;
        return i % 2 === 0 ? { leftKneeLift: lift } : { rightKneeLift: lift };
      }),
    );
    const r = d.reading();
    expect(r.count).toBe(20);
    expect(r.detail).toMatch(/links 10 · rechts 10/);
  });

  it('telt springen op de plaats niet als knieheffen', () => {
    const d = run(new HighKneesDetector(), afterStanding(5, (t) => ({ jump: wave(t, 0.5) * 0.4 })));
    expect(d.reading().count).toBe(0);
  });
});

describe('JumpingJackDetector', () => {
  it('telt jumping jacks', () => {
    const d = run(
      new JumpingJackDetector(),
      afterStanding(8, (t) => {
        const o = wave(t, 1);
        return { leftArm: 10 + 160 * o, rightArm: 10 + 160 * o, legSpread: 0.6 * o };
      }),
    );
    expect(d.reading().count).toBe(8);
  });

  it('telt enkel armen zwaaien (zonder benen) niet', () => {
    const d = run(new JumpingJackDetector(), afterStanding(6, (t) => ({ leftArm: 10 + 100 * wave(t, 1), rightArm: 10 + 100 * wave(t, 1) })));
    expect(d.reading().count).toBe(0);
  });
});

describe('PunchDetector', () => {
  const guard = { leftArm: 40, rightArm: 40, leftElbow: 1, rightElbow: 1 };

  it('telt snelle stoten opzij, met de juiste richting', () => {
    // Om de seconde een stoot: even links, oneven rechts. Stoot duurt 0,3 s.
    const frames = afterStanding(
      6,
      (t) => {
        const k = Math.floor(t);
        const s = t - k;
        if (s > 0.3) return guard;
        const e = Math.sin((s / 0.3) * Math.PI); // 0 → 1 → 0
        return k % 2 === 0
          ? { ...guard, leftArm: 40 + 50 * e, leftElbow: 1 - e }
          : { ...guard, rightArm: 40 + 50 * e, rightElbow: 1 - e };
      },
      guard,
    );
    const r = run(new PunchDetector(), frames).reading();
    expect(r.count).toBe(6);
    expect(r.detail).toContain('links 3 · rechts 3');
  });

  it('telt de armen laten zakken en hangen niet', () => {
    const frames = afterStanding(4, (t) => (t < 1 ? guard : { leftArm: 5, rightArm: 5 }), guard);
    expect(run(new PunchDetector(), frames).reading().count).toBe(0);
  });

  it('telt een trage strekking niet als stoot', () => {
    const frames = afterStanding(4, (t) => ({ ...guard, leftArm: 40 + 50 * Math.min(1, t / 3), leftElbow: 1 - Math.min(1, t / 3) }), guard);
    expect(run(new PunchDetector(), frames).reading().count).toBe(0);
  });
});

describe('ClimbDetector', () => {
  it('telt afwisselende klimgrepen', () => {
    const frames = afterStanding(6, (t) => {
      const k = Math.floor(t / 0.75);
      const up = wave(t % 0.75, 0.75);
      return k % 2 === 0 ? { leftArm: 20 + 155 * up, leftElbow: 0.2 } : { rightArm: 20 + 155 * up, rightElbow: 0.2 };
    });
    expect(run(new ClimbDetector(), frames).reading().count).toBe(8);
  });

  it('telt steeds dezelfde hand maar één keer', () => {
    const frames = afterStanding(6, (t) => ({ leftArm: 20 + 155 * wave(t, 1) }));
    expect(run(new ClimbDetector(), frames).reading().count).toBe(1);
  });
});

describe('HoldDetector', () => {
  it('meet hoe lang de stoel-houding vastgehouden wordt', () => {
    const frames = afterStanding(8, (t) => (t < 1 || t > 6 ? {} : { squat: 0.75 }));
    const r = run(new HoldDetector('stoel'), frames).reading();
    expect(r.count).toBeGreaterThanOrEqual(4.8);
    expect(r.count).toBeLessThanOrEqual(5.2);
  });

  it('herkent de ster', () => {
    const frames = afterStanding(4, () => ({ leftArm: 90, rightArm: 90, legSpread: 0.5 }));
    expect(run(new HoldDetector('ster'), frames).reading().count).toBeGreaterThan(3.8);
  });

  it('telt geen ster met de armen omlaag', () => {
    const frames = afterStanding(4, () => ({ leftArm: 10, rightArm: 10, legSpread: 0.5 }));
    const r = run(new HoldDetector('ster'), frames).reading();
    expect(r.count).toBe(0);
    expect(r.state).toBe('armen zijwaarts');
  });

  it('herkent het vliegtuig (één voet omhoog)', () => {
    const frames = afterStanding(3, () => ({ leftArm: 90, rightArm: 90, leftKneeLift: 0.5 }));
    expect(run(new HoldDetector('vliegtuig'), frames).reading().count).toBeGreaterThan(2.8);
  });
});

describe('DodgeDetector', () => {
  const zoneAt = (move: SynthParams): DodgeZone | null => {
    const d = run(new DodgeDetector(), afterStanding(1, () => move));
    return d.current();
  };

  it('herkent bukken', () => expect(zoneAt({ duck: 0.6 })).toBe('bukken'));
  it('herkent springen', () => expect(zoneAt({ jump: 0.3 })).toBe('springen'));
  it('herkent een stap naar de linkerkant van de speler', () => expect(zoneAt({ shift: 1 })).toBe('links'));
  it('herkent een stap naar rechts', () => expect(zoneAt({ shift: -1 })).toBe('rechts'));
  it('blijft in het midden bij stilstaan', () => expect(zoneAt({})).toBe('midden'));

  it('telt ontwijkingen', () => {
    const moves: SynthParams[] = [{}, { duck: 0.6 }, {}, { shift: 1 }, {}, { jump: 0.3 }, {}];
    const d = run(new DodgeDetector(), afterStanding(7, (t) => moves[Math.min(moves.length - 1, Math.floor(t))]));
    expect(d.reading().count).toBe(3);
  });
});

describe('EnergyMeter', () => {
  it('is laag bij stilstaan en hoog bij wild bewegen', () => {
    const still = run(new EnergyMeter(), afterStanding(3, () => ({})));
    const wild = run(
      new EnergyMeter(),
      afterStanding(3, (t) => ({ squat: wave(t, 0.6) * 0.6, leftArm: 20 + 150 * wave(t, 0.4), rightArm: 20 + 150 * wave(t + 0.2, 0.4) })),
    );
    expect(still.energy).toBeLessThan(0.1);
    expect(wild.energy).toBeGreaterThan(1.5);
  });
});

describe('detectorregister', () => {
  it('maakt van elke detector een werkend exemplaar', () => {
    const frames = afterStanding(1, () => ({}));
    for (const info of DETECTORS) {
      const r = run(info.create(), frames).reading();
      expect(typeof r.count).toBe('number');
      expect(r.unit.length).toBeGreaterThan(0);
    }
  });
});
