import { useState } from 'react';
import { Stage } from './Stage';

/**
 * Blok 1: enkel een startscherm en het camerabeeld met skelet + meetpaneel.
 * De echte Idol Academy-stijl volgt na goedkeuring van het stijlvoorbeeld (blok 3).
 */
export function App() {
  const [running, setRunning] = useState(false);

  if (running) return <Stage onExit={() => setRunning(false)} />;

  return (
    <main className="intro">
      <h1>Idol Academy</h1>
      <p className="sub">Test 1 · camera &amp; bewegingsdetectie</p>
      <ol>
        <li>Zet het toestel rechtop, liefst liggend (landscape).</li>
        <li>Ga 2 à 3 meter achteruit, zodat je hele lichaam in beeld is.</li>
        <li>Beweeg en kijk of het skelet je goed volgt.</li>
      </ol>
      <p className="note">Het camerabeeld blijft op dit toestel. Er wordt niets opgeslagen of verstuurd.</p>
      <button className="big" onClick={() => setRunning(true)}>Start camera</button>
      <p className="version">versie {__APP_VERSION__}</p>
    </main>
  );
}
