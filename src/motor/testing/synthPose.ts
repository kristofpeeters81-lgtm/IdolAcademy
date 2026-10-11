import { LM, LANDMARK_COUNT } from '../landmarks';
import type { Landmark, PoseFrame } from '../types';

/**
 * Synthetisch "poppetje" voor tests: bouwt 33 MediaPipe-punten zoals een camera recht van voren
 * ze zou zien (2D-projectie). Bewegingen naar de camera toe (knie vooruit bij squat/knieheffen)
 * worden nagebootst als "verkorting" van het dijbeen in beeld — precies wat de detectoren ook
 * in het echt te zien krijgen.
 *
 * Eenheden: beeldhoogte (y 0..1, x 0..aspect). Links/rechts = van de spéler; zijn linkerkant
 * ligt in het ruwe camerabeeld rechts (grotere x).
 */
export interface SynthParams {
  /** Romplengte (beeldhoogte). Kleiner = verder van de camera. */
  torso?: number;
  /** Midden van het lichaam (x, beeldhoogte-eenheden). Standaard het midden van het beeld. */
  cx?: number;
  /** Hoogte van de vloer (y van de enkels bij stilstaan). */
  floorY?: number;
  /** Squatdiepte 0 (rechtop) .. 1 (diep). */
  squat?: number;
  /** Knieheffing per been 0 (neer) .. 1 (dijbeen horizontaal, naar de camera). */
  leftKneeLift?: number;
  rightKneeLift?: number;
  /** Armhoek in graden: 0 = naar beneden, 90 = zijwaarts horizontaal, 180 = recht omhoog. */
  leftArm?: number;
  rightArm?: number;
  /** Elleboog gebogen 0 (gestrekt) .. 1 (volledig, hand bij schouder). */
  leftElbow?: number;
  rightElbow?: number;
  /** Extra spreiding van de voeten (romplengtes, per kant). */
  legSpread?: number;
  /** Sprong: hele lichaam omhoog (romplengtes). */
  jump?: number;
  /** Zijwaartse verplaatsing (romplengtes); positief = naar de linkerkant van de speler. */
  shift?: number;
  /** Bukken: schouders zakken (romplengtes). */
  duck?: number;
  visibility?: number;
  aspect?: number;
}

const deg = (d: number) => (d * Math.PI) / 180;

export function synthLandmarks(p: SynthParams = {}): Landmark[] {
  const aspect = p.aspect ?? 4 / 3;
  const T = p.torso ?? 0.2;
  const floor = p.floorY ?? 0.9;
  const cx = (p.cx ?? aspect / 2) + (p.shift ?? 0) * T;
  const jump = (p.jump ?? 0) * T;
  const squat = p.squat ?? 0;
  const thigh = 0.95 * T;
  const shin = 0.9 * T;
  const hipHalf = 0.25 * T;
  const shoulderHalf = 0.38 * T;
  const spread = (p.legSpread ?? 0) * T;

  // Verticale lengte van dijbeen/scheen in beeld (verkort bij squat of knieheffing).
  const thighV = (lift: number) => thigh * (1 - 0.75 * squat) * (1 - 0.85 * lift);
  const shinV = shin * (1 - 0.1 * squat);
  const liftL = p.leftKneeLift ?? 0;
  const liftR = p.rightKneeLift ?? 0;
  // De heup rust op het been dat het minst opgeheven is.
  const hipY = floor - jump - (thigh * (1 - 0.75 * squat) * (1 - 0.85 * Math.min(liftL, liftR)) + shinV);

  const pts: { x: number; y: number }[] = Array.from({ length: LANDMARK_COUNT }, () => ({ x: cx, y: hipY }));
  const set = (i: number, x: number, y: number) => (pts[i] = { x, y });

  // Benen. side = +1 voor links (grotere x), -1 voor rechts.
  const leg = (side: 1 | -1, lift: number, hip: number, knee: number, ankle: number, heel: number, toe: number) => {
    const hx = cx + side * hipHalf;
    set(hip, hx, hipY);
    const kx = hx + side * (0.15 * T * squat + spread / 2);
    const ky = hipY + thighV(lift);
    set(knee, kx, ky);
    const ax = hx + side * spread;
    const ay = ky + shinV;
    set(ankle, ax, ay);
    set(heel, ax, ay + 0.05 * T);
    set(toe, ax + side * 0.05 * T, ay + 0.08 * T);
  };
  leg(1, liftL, LM.leftHip, LM.leftKnee, LM.leftAnkle, LM.leftHeel, LM.leftFootIndex);
  leg(-1, liftR, LM.rightHip, LM.rightKnee, LM.rightAnkle, LM.rightHeel, LM.rightFootIndex);

  // Romp en hoofd.
  const duck = (p.duck ?? 0) * T;
  const shY = hipY - T + duck;
  set(LM.leftShoulder, cx + shoulderHalf, shY);
  set(LM.rightShoulder, cx - shoulderHalf, shY);
  const noseY = shY - 0.45 * T;
  set(LM.nose, cx, noseY);
  for (const [i, dx, dy] of [
    [LM.leftEyeInner, 0.04, -0.06],
    [LM.leftEye, 0.07, -0.06],
    [LM.leftEyeOuter, 0.1, -0.06],
    [LM.rightEyeInner, -0.04, -0.06],
    [LM.rightEye, -0.07, -0.06],
    [LM.rightEyeOuter, -0.1, -0.06],
    [LM.leftEar, 0.16, -0.02],
    [LM.rightEar, -0.16, -0.02],
    [LM.mouthLeft, 0.05, 0.08],
    [LM.mouthRight, -0.05, 0.08],
  ] as const) {
    set(i, cx + dx * T, noseY + dy * T);
  }

  // Armen.
  const arm = (side: 1 | -1, angle: number, bend: number, sh: number, el: number, wr: number, pinky: number, index: number, thumb: number) => {
    const s = pts[sh];
    const a = deg(angle);
    const dir = { x: side * Math.sin(a), y: Math.cos(a) };
    const e = { x: s.x + dir.x * 0.62 * T, y: s.y + dir.y * 0.62 * T };
    set(el, e.x, e.y);
    // Onderarm draait naar binnen/boven naarmate de elleboog meer gebogen is.
    const th = side * deg(150 * bend);
    const f = { x: dir.x * Math.cos(th) - dir.y * Math.sin(th), y: dir.x * Math.sin(th) + dir.y * Math.cos(th) };
    const w = { x: e.x + f.x * 0.55 * T, y: e.y + f.y * 0.55 * T };
    set(wr, w.x, w.y);
    for (const i of [pinky, index, thumb]) set(i, w.x + f.x * 0.08 * T, w.y + f.y * 0.08 * T);
  };
  arm(1, p.leftArm ?? 10, p.leftElbow ?? 0, LM.leftShoulder, LM.leftElbow, LM.leftWrist, LM.leftPinky, LM.leftIndex, LM.leftThumb);
  arm(-1, p.rightArm ?? 10, p.rightElbow ?? 0, LM.rightShoulder, LM.rightElbow, LM.rightWrist, LM.rightPinky, LM.rightIndex, LM.rightThumb);

  const v = p.visibility ?? 0.95;
  return pts.map((q) => ({ x: q.x / aspect, y: q.y, z: 0, visibility: v }));
}

/** Een reeks camerabeelden: `params(tSeconden)` bepaalt de houding op elk moment. */
export function synthSequence(seconds: number, params: (t: number) => SynthParams | null, fps = 30, aspect = 4 / 3): PoseFrame[] {
  const frames: PoseFrame[] = [];
  const n = Math.round(seconds * fps);
  for (let i = 0; i < n; i++) {
    const t = i / fps;
    const sp = params(t);
    frames.push({
      landmarks: sp ? synthLandmarks({ ...sp, aspect }) : null,
      timestamp: 1000 + t * 1000,
      inferenceMs: 20,
      aspect,
    });
  }
  return frames;
}

/** Zachte heen-en-weer-golf 0 → 1 → 0 met de gegeven periode (s). */
export const wave = (t: number, period: number): number => (1 - Math.cos((2 * Math.PI * t) / period)) / 2;
