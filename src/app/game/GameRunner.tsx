import { useEffect, useRef, useState } from 'react';
import type { GameEvent, GameInfo, GameResult, GameSession, GameView } from '../../games/types';
import { BodyTracker } from '../../motor/body';
import { PresenceTracker, type Presence } from '../../motor/presence';
import { SpaceCheck, type SpaceAdvice } from '../../motor/spaceCheck';
import { CoachLumi } from '../CoachLumi';
import type { StageContext } from '../Stage';
import { Coach, Popups, PowerMeter, TimerRing } from './Hud';
import { ResultScreen } from './ResultScreen';
import { SpotlightBeam } from './SpotlightBeam';
import { useGameAudio, type GamePhase } from './useGameAudio';
import { audio } from '../../audio/director';

/**
 * Het vaste verloop van elke game (#44):
 *   uitleg (Lumi) → ruimte-check → 3-2-1-GO → spelen → resultaat
 * Tijdens het spelen pauzeert alles als de speler uit beeld gaat (#18), en mag het model niet
 * wisselen (#39).
 */
type Phase = GamePhase;

const UI_INTERVAL_MS = 100;
const POPUP_MS = 1300;
const COUNTDOWN_MS = 3800; // 3 · 2 · 1 · GO

export function GameRunner({ engine, game, age, onExit }: StageContext & { game: GameInfo; age: number; onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>('uitleg');
  const [view, setView] = useState<GameView | null>(null);
  const [advice, setAdvice] = useState<SpaceAdvice>({ status: 'zoeken', message: 'Ga voor de camera staan', progress: 0 });
  const [presence, setPresence] = useState<Presence>('weg');
  const [popups, setPopups] = useState<GameEvent[]>([]);
  const [countdownEnd, setCountdownEnd] = useState(0);
  const [now, setNow] = useState(() => performance.now());
  const [result, setResult] = useState<GameResult | null>(null);
  const [round, setRound] = useState(0);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const [rt] = useState(() => ({
    tracker: new BodyTracker(),
    presence: new PresenceTracker(game.needs),
    space: new SpaceCheck(game.needs),
    session: null as GameSession | null,
    lastUi: 0,
  }));

  // Nieuwe ronde: nieuwe sessie (en opnieuw de ruimte-check).
  useEffect(() => {
    if (!game.create) return;
    rt.session = game.create(age);
    rt.space.reset();
    setResult(null);
    setView(rt.session.view());
  }, [game, age, round, rt]);

  useEffect(() => {
    const off = engine.onFrame((frame) => {
      const body = rt.tracker.update(frame);
      const pres = rt.presence.update(body);
      const ph = phaseRef.current;
      engine.setAutoSwitchAllowed(ph === 'uitleg' || ph === 'plaats');

      let adv: SpaceAdvice | null = null;
      if (ph === 'plaats') {
        adv = rt.space.update(body);
        if (adv.status === 'klaar') {
          // Meteen vastzetten: dit beeld mag de overgang maar één keer starten.
          phaseRef.current = 'aftellen';
          setCountdownEnd(performance.now() + COUNTDOWN_MS);
          setPhase('aftellen');
        }
      }
      const session = rt.session;
      if (session) session.update(body, ph === 'spelen' && pres !== 'weg');

      if (frame.timestamp - rt.lastUi >= UI_INTERVAL_MS && session) {
        rt.lastUi = frame.timestamp;
        const v = session.view();
        setView(v);
        setPresence(pres);
        if (adv) setAdvice(adv);
        if (v.events.length > 0) {
          setPopups((old) => [...old, ...v.events]);
          const ids = new Set(v.events.map((e) => e.id));
          window.setTimeout(() => setPopups((old) => old.filter((e) => !ids.has(e.id))), POPUP_MS);
        }
        if (ph === 'spelen' && v.finished) {
          phaseRef.current = 'resultaat';
          setResult(session.result());
          setPhase('resultaat');
        }
      }
    });
    return () => {
      off();
      engine.setAutoSwitchAllowed(true);
    };
  }, [engine, rt]);

  // Aftellen.
  useEffect(() => {
    if (phase !== 'aftellen') return;
    const timer = window.setInterval(() => {
      const t = performance.now();
      setNow(t);
      if (t >= countdownEnd) setPhase('spelen');
    }, 50);
    return () => window.clearInterval(timer);
  }, [phase, countdownEnd]);

  const countdown = Math.ceil((countdownEnd - now) / 1000);
  useGameAudio({ game, phase, view, advice, presence, countdown, popups, result });

  if (!game.create) return null;

  if (phase === 'uitleg') {
    return (
      <div className="game-intro">
        <div className="game-intro-card">
          <CoachLumi className="game-intro-coach" />
          <div>
            <p className="eyebrow">
              Training · {game.durationS} s · {game.needs === 'full' ? 'hele lichaam' : 'bovenlichaam'}
            </p>
            <h1 className="game-title" style={{ color: game.color }}>
              {game.name}
            </h1>
            <ul className="howto">
              {game.howTo.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="goal-line">
              Jouw doel: <b>{view?.goal}</b> {view?.unit}
            </p>
            <div className="row">
              <button type="button" className="secondary" onClick={onExit}>
                Terug
              </button>
              <button
                type="button"
                className="big"
                onClick={() => {
                  audio.unlock();
                  audio.sfx('klik');
                  setPhase('plaats');
                }}
              >
                Ik ben klaar!
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'resultaat' && result) {
    return (
      <ResultScreen
        game={game}
        result={result}
        onAgain={() => {
          setPhase('uitleg');
          setRound((r) => r + 1);
        }}
        onExit={onExit}
      />
    );
  }

  return (
    <>
      {view && phase === 'spelen' && <SpotlightBeam progress={view.progress} zone={view.zone} />}

      {phase === 'plaats' && (
        <div className="space-banner" role="status">
          <p>{advice.message}</p>
          <div className="space-progress">
            <div style={{ width: `${Math.round(advice.progress * 100)}%` }} />
          </div>
          <small>{game.needs === 'full' ? 'Je hele lichaam moet in beeld zijn' : 'Je bovenlichaam volstaat'}</small>
        </div>
      )}

      {phase === 'aftellen' && (
        <div className="countdown" aria-live="assertive">
          <span key={countdown}>{countdown > 0 ? countdown : 'GO!'}</span>
        </div>
      )}

      {view && (phase === 'spelen' || phase === 'aftellen') && (
        <div className="hud">
          <TimerRing remainingMs={view.remainingMs} durationMs={view.durationMs} />
          <div className="hud-title">
            {game.name.toUpperCase()}
            <small>
              doel {view.goal} {view.unit}
            </small>
          </div>
          <div className="hud-count">
            <b>{view.count}</b>
            <span>{view.unit}</span>
          </div>
          <PowerMeter zone={view.zone} />
          <Coach text={view.coach} />
          <Popups events={popups} />
        </div>
      )}

      {phase === 'spelen' && presence === 'weg' && (
        <div className="pause-banner" role="status">
          ⏸ Pauze — kom terug in beeld
        </div>
      )}
    </>
  );
}
