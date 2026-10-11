import type { Landmark } from './types';

/**
 * Indexen van de 33 MediaPipe-lichaamspunten. Eigen kopie (i.p.v. MediaPipe-constanten), zodat
 * de rest van de motor niet van MediaPipe afhangt.
 * "Links/rechts" = links/rechts van de spéler zelf, niet van het scherm.
 */
export const LM = {
  nose: 0,
  leftEyeInner: 1,
  leftEye: 2,
  leftEyeOuter: 3,
  rightEyeInner: 4,
  rightEye: 5,
  rightEyeOuter: 6,
  leftEar: 7,
  rightEar: 8,
  mouthLeft: 9,
  mouthRight: 10,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftPinky: 17,
  rightPinky: 18,
  leftIndex: 19,
  rightIndex: 20,
  leftThumb: 21,
  rightThumb: 22,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
  leftHeel: 29,
  rightHeel: 30,
  leftFootIndex: 31,
  rightFootIndex: 32,
} as const;

export const LANDMARK_COUNT = 33;

/** Lijnen van het skelet (zonder gezicht/vingers: rustiger beeld, en die doen niet mee in de games). */
export const BODY_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [LM.leftShoulder, LM.rightShoulder],
  [LM.leftShoulder, LM.leftElbow],
  [LM.leftElbow, LM.leftWrist],
  [LM.rightShoulder, LM.rightElbow],
  [LM.rightElbow, LM.rightWrist],
  [LM.leftShoulder, LM.leftHip],
  [LM.rightShoulder, LM.rightHip],
  [LM.leftHip, LM.rightHip],
  [LM.leftHip, LM.leftKnee],
  [LM.leftKnee, LM.leftAnkle],
  [LM.rightHip, LM.rightKnee],
  [LM.rightKnee, LM.rightAnkle],
  [LM.leftAnkle, LM.leftFootIndex],
  [LM.rightAnkle, LM.rightFootIndex],
];

/** De punten die zichtbaar moeten zijn voor "hele lichaam in beeld" (hoofd, schouders, heupen, knieën, enkels). */
export const FULL_BODY_POINTS: readonly number[] = [
  LM.nose,
  LM.leftShoulder,
  LM.rightShoulder,
  LM.leftHip,
  LM.rightHip,
  LM.leftKnee,
  LM.rightKnee,
  LM.leftAnkle,
  LM.rightAnkle,
];

/** Drempel waarboven we een punt als "zichtbaar" beschouwen. */
export const VISIBLE_THRESHOLD = 0.5;

/** Hoeveel van de FULL_BODY_POINTS zichtbaar én binnen het beeld vallen (0..9). */
export function countVisibleBodyPoints(landmarks: readonly Landmark[] | null): number {
  if (!landmarks || landmarks.length < LANDMARK_COUNT) return 0;
  let n = 0;
  for (const i of FULL_BODY_POINTS) {
    const p = landmarks[i];
    if (p.visibility >= VISIBLE_THRESHOLD && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1) n++;
  }
  return n;
}
