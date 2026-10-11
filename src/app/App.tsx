import { useState } from 'react';
import { Lab } from './lab/Lab';
import { Stage } from './Stage';

/**
 * Blok 2: startscherm → camerabeeld met het testlab (bewegingen tellen + opnemen).
 * De echte Idol Academy-stijl volgt na goedkeuring van het stijlvoorbeeld (blok 3).
 */
export function App() {
  const [running, setRunning] = useState(false);

  if (running) return <Stage onExit={() => setRunning(false)}>{(ctx) => <Lab {...ctx} />}</Stage>;

  return (
    <main className="intro">
      <h1>Idol Academy</h1>
      <p className="sub">Test 2 · bewegingen herkennen &amp; tellen</p>
      <ol>
        <li>Zet het toestel rechtop (staand of liggend) en ga 2 à 3 meter achteruit.</li>
        <li>Volg de tips tot je goed in beeld staat.</li>
        <li>Kies een beweging en kijk of de teller klopt.</li>
        <li>Met <strong>● Opnemen</strong> bewaar je een beweging als testbestand (enkel lichaamspunten, geen beeld).</li>
      </ol>
      <p className="note">Het camerabeeld blijft op dit toestel. Er wordt niets verstuurd.</p>
      <button className="big" onClick={() => setRunning(true)}>
        Start camera
      </button>
      <p className="version">versie {__APP_VERSION__}</p>
    </main>
  );
}
