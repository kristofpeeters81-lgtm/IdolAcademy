import { useState } from 'react';
import { gameInfo } from '../games/catalog';
import type { Age } from '../games/scoring';
import type { GameId } from '../games/types';
import { GameRunner } from './game/GameRunner';
import { Home } from './Home';
import { Lab } from './lab/Lab';
import { Stage } from './Stage';
import { loadAge, saveAge } from './storage';

type Screen = { name: 'home' } | { name: 'lab' } | { name: 'game'; id: GameId };

/** Schermen: startmenu → (game | testlab). Camera en motor starten pas bij een game of het testlab. */
export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [age, setAge] = useState<Age | null>(() => loadAge());
  const home = () => setScreen({ name: 'home' });

  if (screen.name === 'lab') {
    return <Stage onExit={home}>{(ctx) => <Lab {...ctx} />}</Stage>;
  }

  if (screen.name === 'game') {
    const game = gameInfo(screen.id);
    if (game?.create && age) {
      return <Stage onExit={home}>{(ctx) => <GameRunner {...ctx} game={game} age={age} onExit={home} />}</Stage>;
    }
  }

  return (
    <Home
      age={age}
      onAge={(a) => {
        setAge(a);
        saveAge(a);
      }}
      onPlay={(id) => setScreen({ name: 'game', id })}
      onLab={() => setScreen({ name: 'lab' })}
    />
  );
}
