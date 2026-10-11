import type { CSSProperties } from 'react';
import { GAMES } from '../games/catalog';
import { AGES, ageLabel, type Age } from '../games/scoring';
import type { GameId } from '../games/types';
import { CoachLumi } from './CoachLumi';
import { GameIcon } from './GameIcon';
import { SoundSettings } from './SoundSettings';

const CATEGORY_LABEL = { cardio: 'Cardio', kracht: 'Kracht', test: 'Test' } as const;

/** Startscherm in stijl A (#43): Lumi, leeftijd, de acht trainingen, en het testlab. */
export function Home(p: { age: Age | null; onAge: (a: Age) => void; onPlay: (id: GameId) => void; onLab: () => void }) {
  return (
    <main className="home">
      <header className="home-hero">
        <CoachLumi className="home-coach" />
        <div>
          <h1 className="wordmark">
            IDOL
            <br />
            ACADEMY
          </h1>
          <p className="bubble">
            Hoi trainee! Ik ben <b>Lumi</b>. {p.age ? 'Kies een training!' : 'Hoe oud ben jij?'}
          </p>
        </div>
      </header>

      <section aria-labelledby="age-title">
        <h2 id="age-title" className="section-title">
          Leeftijd
        </h2>
        <div className="ages" role="radiogroup" aria-labelledby="age-title">
          {AGES.map((a) => (
            <button key={a} type="button" role="radio" aria-checked={p.age === a} className={p.age === a ? 'on' : ''} onClick={() => p.onAge(a)}>
              {ageLabel(a)}
            </button>
          ))}
        </div>
        <p className="hint-text">Elke speler speelt tegen zijn eigen leeftijdsdoel.</p>
      </section>

      <section aria-labelledby="games-title">
        <h2 id="games-title" className="section-title">
          Trainingen
        </h2>
        <div className="cards">
          {GAMES.map((g) => {
            const playable = Boolean(g.create);
            return (
              <button
                key={g.id}
                type="button"
                className={`card${playable ? '' : ' soon'}`}
                style={{ '--c': g.color } as CSSProperties}
                disabled={!playable || !p.age}
                onClick={() => p.onPlay(g.id)}
              >
                <span className="tag">{playable ? CATEGORY_LABEL[g.category] : 'Binnenkort'}</span>
                <span className="icon">
                  <GameIcon id={g.id} />
                </span>
                <strong>{g.name}</strong>
                <small>
                  {g.tagline} · {g.durationS} s
                </small>
              </button>
            );
          })}
        </div>
        {!p.age && <p className="hint-text">Kies eerst je leeftijd.</p>}
      </section>

      <section aria-labelledby="sound-title">
        <h2 id="sound-title" className="section-title">
          Geluid
        </h2>
        <SoundSettings />
      </section>

      <footer className="home-foot">
        <button type="button" className="secondary" onClick={p.onLab}>
          Testlab
        </button>
        <p>
          Het camerabeeld blijft op dit toestel. Er wordt niets verstuurd.
          <br />
          <span className="version">versie {__APP_VERSION__}</span>
        </p>
      </footer>
    </main>
  );
}
