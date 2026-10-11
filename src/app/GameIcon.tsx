import type { ReactElement } from 'react';
import type { GameId } from '../games/types';

/** Pictogram per game (24×24, lijn), zelfde als in het stijlvoorbeeld. */
const PATHS: Record<GameId, ReactElement> = {
  spotlight: (
    <>
      <path d="M9 3h6l-1 5h-4z" />
      <path d="M10 8 4 21h16L14 8" />
      <path d="M9 15h6" />
    </>
  ),
  lightstick: (
    <>
      <circle cx="15" cy="7" r="4" />
      <path d="m12 10-7 9" />
      <path d="M19 2.5 20 1M21.5 6H23M18 12l1 1.5" />
    </>
  ),
  laser: (
    <>
      <path d="M2 6h20M2 12h7m6 0h7M2 18h20" />
      <circle cx="12" cy="12" r="1.5" />
    </>
  ),
  punch: (
    <>
      <path d="M14 4 16 9l5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1z" />
      <path d="M2 12h3M3 7l2 1.5M3 17l2-1.5" />
    </>
  ),
  jumpsquad: (
    <>
      <path d="m6 11 6-6 6 6" />
      <path d="m6 18 6-6 6 6" />
    </>
  ),
  freeze: (
    <>
      <path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7" />
      <path d="m9 4 3 2 3-2M9 20l3-2 3 2" />
    </>
  ),
  climb: (
    <>
      <path d="M7 22V8M17 22V8M7 18h10M7 13h10" />
      <path d="M5 7a3 3 0 0 1 3-4 4 4 0 0 1 7 0 3 3 0 0 1 4 4z" />
    </>
  ),
  crawl: (
    <>
      <circle cx="12" cy="15" r="4" />
      <circle cx="5.5" cy="9" r="2" />
      <circle cx="10" cy="5.5" r="2" />
      <circle cx="14" cy="5.5" r="2" />
      <circle cx="18.5" cy="9" r="2" />
    </>
  ),
};

export function GameIcon({ id }: { id: GameId }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[id]}
    </svg>
  );
}
