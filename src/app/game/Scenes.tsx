import type { CSSProperties } from 'react';
import type { GameScene, GameView } from '../../games/types';
import { SpotlightBeam } from './SpotlightBeam';
import { useFrameRect } from './useFrameRect';

/** Kiest per game de tekening bovenop het camerabeeld. */
export function GameSceneView({ view }: { view: GameView }) {
  const scene = view.scene;
  switch (scene.type) {
    case 'spotlight':
      return <SpotlightBeam progress={view.progress} zone={view.zone} />;
    case 'lightsticks':
      return <LightstickScene scene={scene} />;
    case 'punch':
      return <PunchScene scene={scene} />;
    case 'laser':
      return <LaserScene scene={scene} />;
  }
}

/** Positie (px) van een punt in schermcoördinaten 0..1 van het camerabeeld. */
function place(rect: DOMRect, x: number, y: number, radius: number): CSSProperties {
  const size = radius * 2 * rect.height;
  return { left: rect.left + x * rect.width - size / 2, top: rect.top + y * rect.height - size / 2, width: size, height: size };
}

function LightstickScene({ scene }: { scene: Extract<GameScene, { type: 'lightsticks' }> }) {
  const rect = useFrameRect();
  if (!rect) return null;
  return (
    <div className="scene" aria-hidden="true">
      {scene.targets.map((t) => (
        <div key={t.id} className={`stick${t.gold ? ' gold' : ''}`} style={{ ...place(rect, t.x, t.y, t.radius), ['--life' as string]: String(t.life) }}>
          <svg viewBox="0 0 40 40">
            <circle className="stick-life" cx="20" cy="20" r="18" pathLength="1" style={{ strokeDasharray: `${t.life} 1` }} />
            <path className="stick-body" d="M14 30 L25 13" />
            <circle className="stick-tip" cx="26.5" cy="11" r="6" />
          </svg>
        </div>
      ))}
    </div>
  );
}

function PunchScene({ scene }: { scene: Extract<GameScene, { type: 'punch' }> }) {
  const rect = useFrameRect();
  if (!rect) return null;
  return (
    <div className="scene" aria-hidden="true" style={{ ['--beat' as string]: String(scene.beat) }}>
      {scene.cues.map((c) => (
        <div key={c.id} className={`pad ${c.state} ${c.side}`} style={place(rect, c.x, c.y, c.radius)}>
          {/* De ring krimpt van 2,4× naar 1× de grootte van het doel: sluit op de tel. */}
          {c.state === 'komt' && <div className="pad-ring" style={{ transform: `scale(${2.4 - 1.4 * c.approach})` }} />}
          <span>{c.state === 'perfect' ? 'PERFECT' : c.state === 'raak' ? 'RAAK' : c.state === 'mis' ? 'MIS' : c.side === 'omhoog' ? '▲' : c.side === 'links' ? '◀' : '▶'}</span>
        </div>
      ))}
    </div>
  );
}

const LASER_TEXT = { hoog: 'BUKKEN', laag: 'SPRINGEN', links: '◀ LINKS', rechts: 'RECHTS ▶' } as const;

function LaserScene({ scene }: { scene: Extract<GameScene, { type: 'laser' }> }) {
  const rect = useFrameRect();
  if (!rect) return null;
  const box: CSSProperties = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  return (
    <div className="scene" aria-hidden="true">
      {scene.walls.map((w) => (
        <div key={w.id} className={`laser ${w.kind} ${w.state}`} style={{ ...box, ['--a' as string]: String(w.approach), ['--y' as string]: String(w.y) }}>
          <div className="laser-beam" />
          <span className="laser-label">{w.state === 'ontweken' ? 'ONTWEKEN!' : w.state === 'geraakt' ? 'AU!' : LASER_TEXT[w.kind]}</span>
        </div>
      ))}
    </div>
  );
}
