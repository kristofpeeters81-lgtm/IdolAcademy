import type { CameraInfo } from '../motor/camera';
import type { EngineStats } from '../motor/poseEngine';

/** Gegevens over het toestel, voor het meetrapport (#21). Geen persoonsgegevens. */
export function deviceSummary(): Record<string, string | number | null> {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    userAgent: nav.userAgent,
    cpuCores: nav.hardwareConcurrency ?? null,
    memoryGb: nav.deviceMemory ?? null,
    screen: `${screen.width}x${screen.height} @${window.devicePixelRatio}x`,
    gpu: webglRenderer(),
  };
}

function webglRenderer(): string | null {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return 'geen WebGL2';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  } catch {
    return null;
  }
}

/** Een tekstrapport dat Kristof kan kopiëren en doorsturen na een test op een toestel. */
export function buildReport(stats: EngineStats, camera: CameraInfo | null, appVersion: string): string {
  const r = (n: number) => Math.round(n * 10) / 10;
  return JSON.stringify(
    {
      app: `Idol Academy ${appVersion}`,
      tijdstip: new Date().toISOString(),
      toestel: deviceSummary(),
      camera: camera ? { resolutie: `${camera.width}x${camera.height}`, gemeldeFps: camera.frameRate, kant: camera.facing } : null,
      meting: {
        model: stats.variant,
        modelModus: stats.mode,
        rekenkern: stats.delegate,
        cameraFps: r(stats.cameraFps),
        detectieFps: r(stats.detectionFps),
        rekentijdMs: r(stats.inferenceMs),
        modelLaadtijdMs: stats.modelLoadMs === null ? null : Math.round(stats.modelLoadMs),
        fullAfgekeurd: stats.fullRejected,
        zichtbareLichaamspunten: `${stats.visibleBodyPoints}/9`,
        laatsteFout: stats.lastError,
      },
    },
    null,
    2,
  );
}
