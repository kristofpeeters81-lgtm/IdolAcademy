import { ageLabel } from '../../games/scoring';
import type { GameInfo, GameResult } from '../../games/types';
import { CoachLumi } from '../CoachLumi';
import { praise } from './useGameAudio';

const ZONES = ['rustig', 'matig', 'intens', 'explosief'];

/** Resultaat na een game: sterren, % van het leeftijdsdoel (#30), Power-zones (#26). */
export function ResultScreen({ game, result, onAgain, onExit }: { game: GameInfo; result: GameResult; onAgain: () => void; onExit: () => void }) {
  const total = result.zoneSeconds.reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="result">
      <div className="result-card">
        <p className="eyebrow">{game.name}</p>
        <div className="stars" aria-label={`${result.stars} van 3 sterren`}>
          {[1, 2, 3].map((s) => (
            <span key={s} className={s <= result.stars ? 'on' : ''}>
              ★
            </span>
          ))}
        </div>
        <div className="result-main">
          <b>{result.count}</b> {result.unit}
          <span className="result-pct">{result.percent}% van je doel</span>
          <small>
            doel voor {ageLabel(result.age)} jaar: {result.goal}
          </small>
        </div>

        <div className="zones" aria-label="Tijd per Power-zone">
          {result.zoneSeconds.map((s, z) =>
            s > 0 ? <i key={z} style={{ flexGrow: s / total, background: `var(--z${z + 1})` }} title={`${ZONES[z]}: ${s.toFixed(1)} s`} /> : null,
          )}
        </div>
        <div className="zones-legend">
          {ZONES.map((name, z) => (
            <span key={name}>
              <i style={{ background: `var(--z${z + 1})` }} />
              {name} {Math.round(result.zoneSeconds[z])} s
            </span>
          ))}
        </div>

        <dl className="result-details">
          {result.details.map((d) => (
            <div key={d.label}>
              <dt>{d.label}</dt>
              <dd>{d.value}</dd>
            </div>
          ))}
        </dl>

        <div className="result-coach">
          <CoachLumi />
          <p className="bubble">{praise(result.stars)}</p>
        </div>

        <div className="row">
          <button type="button" className="secondary" onClick={onExit}>
            Menu
          </button>
          <button type="button" className="big" onClick={onAgain}>
            Nog eens!
          </button>
        </div>
      </div>
    </div>
  );
}
