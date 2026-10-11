import { useEffect, useRef, useState } from 'react';
import { BodyTracker } from '../../motor/body';
import { DETECTORS, type BodyNeeds, type Detector, type DetectorId, type DetectorReading } from '../../motor/detectors';
import { energyZone, EnergyMeter } from '../../motor/detectors/energy';
import { PresenceTracker, type Presence } from '../../motor/presence';
import { RecordingBuilder, recordingFileName } from '../../motor/recording';
import { SpaceCheck, type SpaceAdvice } from '../../motor/spaceCheck';
import { TargetPractice } from '../../motor/targetPractice';
import type { Target } from '../../motor/hit';
import type { StageContext } from '../Stage';
import { drawSparkline, type SignalPoint } from './Sparkline';

/**
 * Testlab (blok 2): kies een beweging, kijk of de teller klopt, en neem bewegingen op als
 * testdata (#31). Dit is een testscherm; de echte games volgen vanaf blok 4.
 */

const SPARK_WINDOW_MS = 6000;
const UI_INTERVAL_MS = 100;
const COUNTDOWN_S = 5;
const DURATIONS = [10, 20, 30, 60] as const;

/** Wat je in het testlab kan kiezen: alle detectoren + de raak-oefening (proef voor Lightstick Catch). */
type LabItemId = DetectorId | 'raken';

interface LabItem {
  id: LabItemId;
  label: string;
  game: string;
  howTo: string;
  needs: BodyNeeds;
  /** Opnemen kan enkel voor echte detectoren (die de fixture-test kan afspelen). */
  recordable: boolean;
  create: () => Detector;
}

function labItems(mirrored: boolean, aspect: number): LabItem[] {
  return [
    ...DETECTORS.map((d) => ({ ...d, recordable: true })),
    {
      id: 'raken' as const,
      label: 'Raken',
      game: 'Lightstick Catch',
      howTo: 'Tik het doel aan met je hand. Klopt links/rechts met wat je ziet?',
      needs: 'upper' as const,
      recordable: false,
      create: () => new TargetPractice(mirrored, aspect),
    },
  ];
}

type RecState =
  | { phase: 'idle' }
  | { phase: 'countdown'; endsAt: number; seconds: number }
  | { phase: 'recording'; endsAt: number; seconds: number }
  | { phase: 'save'; detected: number };

export function Lab({ engine, camera, mirrored }: StageContext) {
  const [items] = useState(() => labItems(mirrored, camera.width / camera.height));
  const [detectorId, setDetectorId] = useState<LabItemId>('squat');
  const [target, setTarget] = useState<Target | null>(null);
  const [reading, setReading] = useState<DetectorReading | null>(null);
  const [energy, setEnergy] = useState(0);
  const [advice, setAdvice] = useState<SpaceAdvice>({ status: 'zoeken', message: 'Ga voor de camera staan', progress: 0 });
  const [presence, setPresence] = useState<Presence>('weg');
  const [rec, setRec] = useState<RecState>({ phase: 'idle' });
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>(20);
  const [now, setNow] = useState(() => performance.now());

  const info = items.find((i) => i.id === detectorId) ?? items[0];
  const sparkRef = useRef<HTMLCanvasElement>(null);
  const recRef = useRef(rec);
  recRef.current = rec;

  // Alles wat per beeld verandert, zit buiten React-state (geen render per beeld). Eenmalig aangemaakt.
  const [lab] = useState(() => ({
    tracker: new BodyTracker(),
    detector: info.create(),
    energy: new EnergyMeter(),
    presence: new PresenceTracker(info.needs),
    space: new SpaceCheck(info.needs),
    builder: null as RecordingBuilder | null,
    history: [] as SignalPoint[],
    lastUi: 0,
  }));

  // Andere detector gekozen: nieuwe teller; ruimte-check enkel opnieuw als de nodige punten veranderen.
  const needsRef = useRef(info.needs);
  useEffect(() => {
    const s = lab;
    const item = items.find((i) => i.id === detectorId) ?? items[0];
    s.detector = item.create();
    s.history = [];
    const needs = item.needs;
    if (needs !== needsRef.current) {
      needsRef.current = needs;
      s.presence.setNeeds(needs);
      s.space.setNeeds(needs);
    }
  }, [detectorId, lab, items]);

  useEffect(() => {
    const off = engine.onFrame((frame) => {
      const s = lab;
      const body = s.tracker.update(frame);
      const pres = s.presence.update(body);
      const adv = s.space.update(body);
      // Modelwissel enkel tijdens de ruimte-check (zie bouwlog blok 1).
      engine.setAutoSwitchAllowed(adv.status !== 'klaar');
      const playing = adv.status === 'klaar' && pres !== 'weg';
      if (playing) {
        s.detector.update(body);
        s.energy.update(body);
      }
      if (recRef.current.phase === 'recording') s.builder?.push(frame);

      const r = s.detector.reading();
      s.history.push({ t: frame.timestamp, v: playing ? r.signal : null });
      while (s.history.length > 0 && frame.timestamp - s.history[0].t > SPARK_WINDOW_MS) s.history.shift();
      if (sparkRef.current) drawSparkline(sparkRef.current, s.history, r.thresholds, SPARK_WINDOW_MS);

      if (frame.timestamp - s.lastUi >= UI_INTERVAL_MS) {
        s.lastUi = frame.timestamp;
        setReading(r);
        setEnergy(s.energy.energy);
        setAdvice(adv);
        setPresence(pres);
        setTarget(s.detector instanceof TargetPractice ? s.detector.target() : null);
      }
    });
    return () => {
      off();
      engine.setAutoSwitchAllowed(true);
    };
  }, [engine, lab]);

  // Klok voor aftellen/opnemen.
  useEffect(() => {
    if (rec.phase !== 'countdown' && rec.phase !== 'recording') return;
    const timer = window.setInterval(() => {
      const t = performance.now();
      setNow(t);
      const r = recRef.current;
      if (r.phase === 'countdown' && t >= r.endsAt) {
        const s = lab;
        s.detector.reset();
        s.energy.reset();
        s.builder = new RecordingBuilder();
        setRec({ phase: 'recording', endsAt: t + r.seconds * 1000, seconds: r.seconds });
      } else if (r.phase === 'recording' && t >= r.endsAt) {
        setRec({ phase: 'save', detected: lab.detector.reading().count });
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [rec.phase, lab]);

  const resetCounter = () => {
    lab.detector.reset();
    lab.energy.reset();
    lab.history = [];
  };

  const startRecording = () => setRec({ phase: 'countdown', endsAt: performance.now() + COUNTDOWN_S * 1000, seconds: duration });

  const r = reading;
  const paused = advice.status === 'klaar' && presence === 'weg';

  return (
    <>
      {advice.status !== 'klaar' && (
        <div className="space-banner" role="status">
          <p>{advice.message}</p>
          <div className="space-progress">
            <div style={{ width: `${Math.round(advice.progress * 100)}%` }} />
          </div>
          <small>{info.needs === 'full' ? 'Je hele lichaam moet in beeld zijn' : 'Je bovenlichaam volstaat'}</small>
        </div>
      )}

      {paused && rec.phase !== 'save' && (
        <div className="pause-banner" role="status">
          ⏸ Pauze — kom terug in beeld
        </div>
      )}

      {(rec.phase === 'countdown' || rec.phase === 'recording') && (
        <div className={`rec-overlay ${rec.phase}`}>
          {rec.phase === 'countdown' ? (
            <>
              <span className="rec-big">{Math.max(1, Math.ceil((rec.endsAt - now) / 1000))}</span>
              <span>Ga op je plek staan: {info.label.toLowerCase()}</span>
            </>
          ) : (
            <>
              <span className="rec-dot">● OPNAME</span>
              <span className="rec-big">{Math.max(0, Math.ceil((rec.endsAt - now) / 1000))}</span>
            </>
          )}
        </div>
      )}

      <section className="lab">
        <div className="lab-head">
          <select value={detectorId} onChange={(e) => setDetectorId(e.target.value as LabItemId)} disabled={rec.phase !== 'idle'} aria-label="Beweging">
            {items.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label} — {d.game}
              </option>
            ))}
          </select>
        </div>
        <p className="lab-howto">{info.howTo}</p>
        <div className="lab-count">
          <span className="num">{r ? r.count : 0}</span>
          <span className="unit">{r?.unit ?? ''}</span>
        </div>
        <p className="lab-state">{r?.state ?? '…'}</p>
        <canvas ref={sparkRef} className="spark" aria-hidden="true" />
        <p className="lab-detail">{r?.detail}</p>
        <p className="lab-detail">
          energie {energy.toFixed(2).replace('.', ',')} · {energyZone(energy)}
        </p>
        <div className="row">
          <button className="secondary" onClick={resetCounter} disabled={rec.phase !== 'idle'}>
            Reset
          </button>
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value) as (typeof DURATIONS)[number])} disabled={rec.phase !== 'idle'} aria-label="Opnameduur">
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d} s
              </option>
            ))}
          </select>
          <button onClick={startRecording} disabled={rec.phase !== 'idle' || !info.recordable} title={info.recordable ? undefined : 'Opnemen kan niet bij deze oefening'}>
            ● Opnemen
          </button>
        </div>
      </section>

      {target && advice.status === 'klaar' && <TargetMarker target={target} />}

      {rec.phase === 'save' && (
        <SaveDialog
          detector={detectorId}
          detected={rec.detected}
          builder={lab.builder}
          onDone={() => {
            lab.builder = null;
            setRec({ phase: 'idle' });
          }}
        />
      )}
    </>
  );
}

/** Tekent het doel over het camerabeeld (schermcoördinaten → positie van het .frame-element). */
function TargetMarker({ target }: { target: Target }) {
  const rect = document.querySelector('.frame')?.getBoundingClientRect();
  if (!rect) return null;
  const size = target.radius * 2 * rect.height;
  return (
    <div
      className="target"
      style={{ left: rect.left + target.x * rect.width - size / 2, top: rect.top + target.y * rect.height - size / 2, width: size, height: size }}
      aria-hidden="true"
    />
  );
}

function SaveDialog(p: { detector: LabItemId; detected: number; builder: RecordingBuilder | null; onDone: () => void }) {
  const [expected, setExpected] = useState(String(p.detected));
  const [note, setNote] = useState('');
  const isHold = ['stoel', 'ster', 'vliegtuig'].includes(p.detector);
  const value = Number(expected.replace(',', '.'));
  const valid = expected.trim() !== '' && Number.isFinite(value) && value >= 0;

  const save = () => {
    if (!p.builder || !valid) return;
    const rec = p.builder.build({ detector: p.detector, expected: value, detected: p.detected, note: note.trim(), app: __APP_VERSION__ });
    const blob = new Blob([JSON.stringify(rec)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = recordingFileName(p.detector);
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    p.onDone();
  };

  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="save-title">
        <h2 id="save-title">Opname klaar ({Math.round(p.builder?.seconds ?? 0)} s)</h2>
        <p>
          De app telde <strong>{p.detected}</strong>. {isHold ? 'Hoeveel seconden hield je de houding echt vast?' : 'Hoeveel deed je er echt?'}
        </p>
        <input type="number" inputMode="decimal" min={0} step={isHold ? 0.5 : 1} value={expected} onChange={(e) => setExpected(e.target.value)} aria-label="Echt aantal" />
        <input type="text" placeholder="Notitie (bv. kind 7 jaar, staand toestel)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Notitie" />
        <p className="dialog-small">Er worden enkel lichaamspunten bewaard, geen beelden. Het bestand komt in je Downloads.</p>
        <div className="row">
          <button className="secondary" onClick={p.onDone}>
            Weggooien
          </button>
          <button onClick={save} disabled={!valid}>
            Bewaar opname
          </button>
        </div>
      </div>
    </div>
  );
}
