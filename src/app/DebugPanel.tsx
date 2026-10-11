import { useState } from 'react';
import type { CameraInfo, Facing, Resolution } from '../motor/camera';
import type { EngineStats, ModelMode } from '../motor/poseEngine';
import { buildReport } from './report';

interface Props {
  stats: EngineStats;
  camera: CameraInfo | null;
  facing: Facing;
  resolution: Resolution;
  showSkeleton: boolean;
  onFacing: (f: Facing) => void;
  onResolution: (r: Resolution) => void;
  onMode: (m: ModelMode) => void;
  onSkeleton: (on: boolean) => void;
  onExit: () => void;
}

/** Kleur van een fps-waarde: groen = vlot speelbaar, oranje = net, rood = te traag. */
function fpsClass(fps: number): string {
  if (fps >= 20) return 'good';
  if (fps >= 12) return 'ok';
  return 'bad';
}

/** Debugpaneel (#16, #21): alle meetwaarden zichtbaar + knoppen om te vergelijken. */
export function DebugPanel(p: Props) {
  const [open, setOpen] = useState(true);
  const [report, setReport] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const s = p.stats;

  if (!open) {
    return (
      <button className="debug-toggle" onClick={() => setOpen(true)} aria-label="Meetpaneel openen">
        <span className={fpsClass(s.detectionFps)}>{Math.round(s.detectionFps)} fps</span>
      </button>
    );
  }

  const showReport = () => {
    setCopied(false);
    setReport(buildReport(s, p.camera, __APP_VERSION__));
  };
  const copy = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <aside className="debug">
      <div className="debug-head">
        <strong>Meetpaneel</strong>
        <button className="icon" onClick={() => setOpen(false)} aria-label="Meetpaneel verbergen">–</button>
      </div>

      <dl>
        <dt>Detectie</dt>
        <dd className={fpsClass(s.detectionFps)}>{s.detectionFps.toFixed(1)} fps</dd>
        <dt>Camera</dt>
        <dd>{s.cameraFps.toFixed(1)} fps</dd>
        <dt>Rekentijd</dt>
        <dd>{s.inferenceMs.toFixed(1)} ms</dd>
        <dt>Model</dt>
        <dd>
          {s.loading ? 'laden…' : (s.variant ?? '–')} · {s.delegate ?? '–'}
          {s.mode === 'auto' && ' (auto)'}
        </dd>
        <dt>Laadtijd</dt>
        <dd>{s.modelLoadMs === null ? '–' : `${(s.modelLoadMs / 1000).toFixed(1)} s`}</dd>
        <dt>Beeld</dt>
        <dd>{p.camera ? `${p.camera.width}×${p.camera.height}` : '–'}</dd>
        <dt>Lichaam</dt>
        <dd className={s.visibleBodyPoints === 9 ? 'good' : 'ok'}>{s.visibleBodyPoints}/9 zichtbaar</dd>
        {s.session && (
          <>
            <dt>Laatste min</dt>
            <dd>
              {s.session.avgFps.toFixed(0)} fps (min {s.session.minFps}) · lichaam {Math.round(s.session.fullBodyShare * 100)}%
            </dd>
          </>
        )}
      </dl>
      {s.lastError && <p className="debug-error">{s.lastError}</p>}

      <div className="seg" role="group" aria-label="Model">
        {(['auto', 'lite', 'full'] as const).map((m) => (
          <button key={m} className={s.mode === m ? 'on' : ''} disabled={s.loading} onClick={() => p.onMode(m)}>
            {m}
          </button>
        ))}
      </div>
      <div className="seg" role="group" aria-label="Resolutie">
        {(['480p', '720p'] as const).map((r) => (
          <button key={r} className={p.resolution === r ? 'on' : ''} onClick={() => p.onResolution(r)}>
            {r}
          </button>
        ))}
      </div>
      <div className="seg" role="group" aria-label="Camera">
        <button className={p.facing === 'user' ? 'on' : ''} onClick={() => p.onFacing('user')}>voor</button>
        <button className={p.facing === 'environment' ? 'on' : ''} onClick={() => p.onFacing('environment')}>achter</button>
        <button className={p.showSkeleton ? 'on' : ''} onClick={() => p.onSkeleton(!p.showSkeleton)}>skelet</button>
      </div>
      <div className="row">
        <button onClick={showReport}>Meetrapport</button>
        <button className="secondary" onClick={p.onExit}>Stop</button>
      </div>

      {report && (
        <div className="report">
          <textarea readOnly value={report} rows={8} onFocus={(e) => e.currentTarget.select()} />
          <div className="row">
            <button onClick={() => void copy()}>{copied ? 'Gekopieerd ✓' : 'Kopiëren'}</button>
            <button className="secondary" onClick={() => setReport(null)}>Sluiten</button>
          </div>
        </div>
      )}
    </aside>
  );
}
