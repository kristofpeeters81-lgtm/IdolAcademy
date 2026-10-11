import type { GameEvent } from '../../games/types';
import { CoachLumi } from '../CoachLumi';

/** HUD-onderdelen in stijl A (zoals in het stijlvoorbeeld): groot genoeg voor 2–3 m afstand. */

export function TimerRing({ remainingMs, durationMs }: { remainingMs: number; durationMs: number }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, remainingMs / durationMs));
  const secs = Math.ceil(remainingMs / 1000);
  return (
    <div className={`hud-timer${secs <= 5 ? ' urgent' : ''}`} aria-label={`nog ${secs} seconden`}>
      <svg viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={r} fill="rgba(11,7,32,.6)" stroke="rgba(255,255,255,.15)" strokeWidth="4" />
        <circle cx="20" cy="20" r={r} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${frac * c} ${c}`} />
      </svg>
      <span>{secs}</span>
    </div>
  );
}

const ZONE_LABELS = ['RUSTIG', 'MATIG', 'INTENS', 'EXPLOSIEF'];

export function PowerMeter({ zone }: { zone: number }) {
  return (
    <div className="hud-power" aria-label={`Power: ${ZONE_LABELS[zone].toLowerCase()}`}>
      <div className="hud-power-bars">
        {[0, 1, 2, 3].map((z) => (
          <i key={z} className={z <= zone ? 'on' : ''} style={{ ['--zc' as string]: `var(--z${z + 1})` }} />
        ))}
      </div>
      <div className="hud-power-label" style={{ color: `var(--z${zone + 1})` }}>
        {ZONE_LABELS[zone]}
        <small>Power</small>
      </div>
    </div>
  );
}

export function Coach({ text }: { text: string }) {
  return (
    <div className="hud-coach">
      <CoachLumi />
      <p className="bubble">{text}</p>
    </div>
  );
}

/** Grote meldingen ("PERFECT!") die even oplichten en verdwijnen. */
export function Popups({ events }: { events: GameEvent[] }) {
  return (
    <div className="hud-popups" aria-live="polite">
      {events.map((e) => (
        <div key={e.id} className={`hud-popup ${e.kind}`}>
          {e.text}
        </div>
      ))}
    </div>
  );
}
