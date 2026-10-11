import { useEffect, useRef, useState } from 'react';
import { CameraError, startCamera, stopCamera, type CameraInfo, type Facing, type Resolution } from '../motor/camera';
import { PoseEngine, type EngineStats, type ModelMode } from '../motor/poseEngine';
import { DebugPanel } from './DebugPanel';
import { drawSkeleton } from './drawSkeleton';
import { CAMERA_ERROR_TEXT } from './messages';

type Status = 'camera' | 'model' | 'ready' | 'error';

/** Camerabeeld + skelet + debugpaneel. Hier komen later de minigames bovenop. */
export function Stage({ onExit }: { onExit: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PoseEngine | null>(null);
  const showSkeletonRef = useRef(true);

  const [status, setStatus] = useState<Status>('camera');
  const [error, setError] = useState<string | null>(null);
  const [camera, setCamera] = useState<CameraInfo | null>(null);
  const [facing, setFacing] = useState<Facing>('user');
  const [resolution, setResolution] = useState<Resolution>('480p');
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [stats, setStats] = useState<EngineStats | null>(null);
  const [retry, setRetry] = useState(0);

  showSkeletonRef.current = showSkeleton;

  // De motor: één per scherm. Elk resultaat tekent meteen het skelet (buiten React om, voor snelheid).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const engine = new PoseEngine(video, import.meta.env.BASE_URL);
    engineRef.current = engine;
    const off = engine.onFrame((frame) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) drawSkeleton(ctx, showSkeletonRef.current ? frame.landmarks : null);
    });
    const timer = window.setInterval(() => setStats(engine.getStats()), 250);
    return () => {
      window.clearInterval(timer);
      off();
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Camera (her)starten bij een andere camerakant of resolutie; model laden bij de eerste keer.
  useEffect(() => {
    const video = videoRef.current;
    const engine = engineRef.current;
    if (!video || !engine) return;
    let cancelled = false;
    (async () => {
      try {
        setStatus('camera');
        setError(null);
        const info = await startCamera(video, facing, resolution);
        if (cancelled) return;
        setCamera(info);
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = info.width;
          canvas.height = info.height;
        }
        if (!engine.getStats().variant) {
          setStatus('model');
          await engine.setMode('auto');
        }
        if (cancelled) return;
        engine.start();
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof CameraError
            ? CAMERA_ERROR_TEXT[err.code]
            : `Het bewegingsmodel kon niet starten. ${err instanceof Error ? err.message : ''}`.trim(),
        );
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
      engine.stop();
      stopCamera(video);
    };
  }, [facing, resolution, retry]);

  // Scherm niet laten uitgaan tijdens het spelen (indien ondersteund).
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = () => {
      navigator.wakeLock
        ?.request('screen')
        .then((l) => (lock = l))
        .catch(() => undefined);
    };
    request();
    const onVisible = () => document.visibilityState === 'visible' && request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, []);

  const ratio = camera ? camera.width / camera.height : 4 / 3;
  const changeMode = (mode: ModelMode) => {
    void engineRef.current?.setMode(mode).catch(() => undefined);
  };

  return (
    <div className="stage">
      <div
        className={`frame${facing === 'user' ? ' mirrored' : ''}`}
        style={{ aspectRatio: String(ratio), width: `min(100vw, calc(100dvh * ${ratio}))` }}
      >
        <video ref={videoRef} playsInline muted />
        <canvas ref={canvasRef} />
      </div>

      {status !== 'ready' && (
        <div className="overlay">
          {status === 'camera' && <p>Camera starten…</p>}
          {status === 'model' && <p>Bewegingsmodel laden…<br /><small>De eerste keer duurt dit wat langer (± 19 MB).</small></p>}
          {status === 'error' && (
            <div className="error">
              <p>{error}</p>
              <button onClick={() => setRetry((n) => n + 1)}>Opnieuw proberen</button>
              <button className="secondary" onClick={onExit}>Terug</button>
            </div>
          )}
        </div>
      )}

      {status === 'ready' && stats && stats.visibleBodyPoints < 9 && (
        <div className="hint">Ga zo staan dat je helemaal in beeld bent ({stats.visibleBodyPoints}/9)</div>
      )}

      {stats && (
        <DebugPanel
          stats={stats}
          camera={camera}
          facing={facing}
          resolution={resolution}
          showSkeleton={showSkeleton}
          onFacing={setFacing}
          onResolution={setResolution}
          onMode={changeMode}
          onSkeleton={setShowSkeleton}
          onExit={onExit}
        />
      )}
    </div>
  );
}
