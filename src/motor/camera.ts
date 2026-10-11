/**
 * Camera starten en stoppen. Het beeld gaat enkel naar het <video>-element in het geheugen;
 * er wordt niets opgeslagen of verstuurd (#4).
 */

export type Facing = 'user' | 'environment';
export type Resolution = '480p' | '720p';

export type CameraErrorCode = 'insecure' | 'no-api' | 'denied' | 'not-found' | 'busy' | 'unknown';

export class CameraError extends Error {
  constructor(
    readonly code: CameraErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'CameraError';
  }
}

const SIZES: Record<Resolution, { width: number; height: number }> = {
  '480p': { width: 640, height: 480 },
  '720p': { width: 1280, height: 720 },
};

/** Vertaalt een browserfout naar een eigen, uitlegbare foutcode. */
export function cameraErrorCode(err: unknown): CameraErrorCode {
  const name = err instanceof Error || (typeof err === 'object' && err !== null && 'name' in err) ? String((err as { name: unknown }).name) : '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'denied';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'not-found';
    case 'NotReadableError':
    case 'AbortError':
      return 'busy';
    default:
      return 'unknown';
  }
}

export interface CameraInfo {
  stream: MediaStream;
  width: number;
  height: number;
  /** Door de camera gemelde beeldsnelheid, indien bekend. */
  frameRate: number | null;
  facing: Facing;
}

export async function startCamera(video: HTMLVideoElement, facing: Facing, resolution: Resolution): Promise<CameraInfo> {
  if (!window.isSecureContext) throw new CameraError('insecure', 'De camera werkt enkel via https.');
  if (!navigator.mediaDevices?.getUserMedia) throw new CameraError('no-api', 'Deze browser ondersteunt geen camera.');

  const size = SIZES[resolution];
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: facing,
        width: { ideal: size.width },
        height: { ideal: size.height },
        frameRate: { ideal: 30 },
      },
    });
  } catch (err) {
    throw new CameraError(cameraErrorCode(err), err instanceof Error ? err.message : String(err));
  }

  // iOS/Safari: zonder deze attributen speelt de video niet inline of niet automatisch (#7, ongetest).
  video.setAttribute('playsinline', '');
  video.muted = true;
  video.srcObject = stream;
  await new Promise<void>((resolve) => {
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) resolve();
    else video.addEventListener('loadedmetadata', () => resolve(), { once: true });
  });
  await video.play();

  const settings = stream.getVideoTracks()[0]?.getSettings() ?? {};
  return {
    stream,
    width: video.videoWidth,
    height: video.videoHeight,
    frameRate: typeof settings.frameRate === 'number' ? settings.frameRate : null,
    facing,
  };
}

export function stopCamera(video: HTMLVideoElement): void {
  const stream = video.srcObject;
  if (stream instanceof MediaStream) for (const track of stream.getTracks()) track.stop();
  video.srcObject = null;
}
