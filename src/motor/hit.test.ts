import { describe, expect, it } from 'vitest';
import { BodyTracker } from './body';
import { hitsTarget, limbsOnScreen } from './hit';
import { synthLandmarks, type SynthParams } from './testing/synthPose';

const body = (p: SynthParams) =>
  new BodyTracker().update({ landmarks: synthLandmarks(p), timestamp: 0, inferenceMs: 0, aspect: 4 / 3 });

describe('limbsOnScreen', () => {
  it('spiegelt bij de frontcamera: de linkerhand van de speler staat links op het scherm', () => {
    const b = body({ leftArm: 90 }); // linkerarm zijwaarts
    const left = limbsOnScreen(b, true).find((p) => p.limb === 'linkerhand')!;
    const right = limbsOnScreen(b, true).find((p) => p.limb === 'rechterhand')!;
    expect(left.x).toBeLessThan(0.4);
    expect(right.x).toBeGreaterThan(left.x);
  });

  it('zonder spiegeling staat de linkerhand rechts in het beeld', () => {
    const left = limbsOnScreen(body({ leftArm: 90 }), false).find((p) => p.limb === 'linkerhand')!;
    expect(left.x).toBeGreaterThan(0.6);
  });

  it('geeft niets als er niemand in beeld is', () => {
    const empty = new BodyTracker().update({ landmarks: null, timestamp: 0, inferenceMs: 0, aspect: 4 / 3 });
    expect(limbsOnScreen(empty, true)).toEqual([]);
  });
});

describe('hitsTarget', () => {
  it('raakt een doel waar de hand is, en mist een doel ernaast', () => {
    const pts = limbsOnScreen(body({ leftArm: 170, rightArm: 10 }), true);
    const hand = pts.find((p) => p.limb === 'linkerhand')!;
    expect(hitsTarget(pts, { x: hand.x, y: hand.y, radius: 0.05 }, 4 / 3)).toContain('linkerhand');
    expect(hitsTarget(pts, { x: hand.x + 0.3, y: hand.y, radius: 0.05 }, 4 / 3)).toEqual([]);
  });

  it('kan ook met een voet raken', () => {
    const pts = limbsOnScreen(body({ leftKneeLift: 0.8 }), true);
    const foot = pts.find((p) => p.limb === 'linkervoet')!;
    expect(hitsTarget(pts, { x: foot.x, y: foot.y, radius: 0.04 }, 4 / 3)).toContain('linkervoet');
  });
});

describe('TargetPractice', () => {
  it('telt een raak en zet een nieuw doel ver genoeg van het vorige', async () => {
    const { TargetPractice } = await import('./targetPractice');
    const b = body({ leftArm: 170 });
    const hand = limbsOnScreen(b, true).find((p) => p.limb === 'linkerhand')!;
    // "Willekeur" die het eerste doel precies op de hand legt.
    const seq = [(hand.x - 0.15) / 0.7, (hand.y - 0.15) / 0.45, 0.95, 0.9];
    let i = 0;
    const tp = new TargetPractice(true, 4 / 3, () => seq[i++ % seq.length]);
    tp.update(b);
    expect(tp.reading().count).toBe(1);
    expect(Math.abs(tp.target().x - hand.x)).toBeGreaterThan(0.2);
  });
});
