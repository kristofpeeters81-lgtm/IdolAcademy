import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { nextTimestamp } from './timestamps';
import type { Delegate, Landmark, ModelVariant, PoseFrame } from './types';

/**
 * Omhulsel rond MediaPipe Pose Landmarker (#3). Dit is het énige bestand dat MediaPipe kent;
 * de rest van de motor werkt met onze eigen types.
 *
 * Alle bestanden komen van onze eigen site (public/mediapipe), nooit van een CDN.
 */

export interface PoseTrackerOptions {
  variant: ModelVariant;
  /** Basis-URL van de app (bv. import.meta.env.BASE_URL). */
  baseUrl: string;
  /** Eerst GPU proberen (sneller), met automatische terugval op CPU. */
  preferGpu?: boolean;
}

export class PoseTracker {
  private lastTimestamp = 0;

  private constructor(
    private readonly landmarker: PoseLandmarker,
    readonly variant: ModelVariant,
    readonly delegate: Delegate,
  ) {}

  static async create(options: PoseTrackerOptions): Promise<PoseTracker> {
    const base = options.baseUrl.endsWith('/') ? options.baseUrl : `${options.baseUrl}/`;
    const fileset = await FilesetResolver.forVisionTasks(`${base}mediapipe/wasm`);
    const modelAssetPath = `${base}mediapipe/models/pose_landmarker_${options.variant}.task`;

    const delegates: Delegate[] = options.preferGpu === false ? ['CPU'] : ['GPU', 'CPU'];
    let lastError: unknown = null;
    for (const delegate of delegates) {
      try {
        const landmarker = await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath, delegate },
          runningMode: 'VIDEO',
          numPoses: 1, // altijd één speler tegelijk (#9)
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputSegmentationMasks: false,
        });
        return new PoseTracker(landmarker, options.variant, delegate);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Het bewegingsmodel kon niet starten.');
  }

  /** Detecteert de houding in het huidige videobeeld. */
  detect(video: HTMLVideoElement, now: number): PoseFrame {
    const timestamp = nextTimestamp(now, this.lastTimestamp);
    this.lastTimestamp = timestamp;
    const start = performance.now();
    const result = this.landmarker.detectForVideo(video, timestamp);
    const inferenceMs = performance.now() - start;
    const first = result.landmarks[0];
    const landmarks: Landmark[] | null = first
      ? first.map((p) => ({ x: p.x, y: p.y, z: p.z, visibility: p.visibility ?? 0 }))
      : null;
    const aspect = video.videoHeight > 0 ? video.videoWidth / video.videoHeight : 4 / 3;
    return { landmarks, timestamp, inferenceMs, aspect };
  }

  close(): void {
    this.landmarker.close();
  }
}
