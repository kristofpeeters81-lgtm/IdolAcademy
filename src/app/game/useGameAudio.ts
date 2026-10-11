import { useEffect, useRef } from 'react';
import { audio } from '../../audio/director';
import type { GameEvent, GameInfo, GameResult, GameView } from '../../games/types';
import type { Presence } from '../../motor/presence';
import type { SpaceAdvice } from '../../motor/spaceCheck';

export type GamePhase = 'uitleg' | 'plaats' | 'aftellen' | 'spelen' | 'resultaat';

/** Wat Lumi zegt bij het resultaat (ook getoond in de tekstballon). */
export function praise(stars: number): string {
  if (stars === 3) return 'Superster! Je haalde je doel!';
  if (stars === 2) return 'Bijna! Nog een beetje sneller en je hebt drie sterren.';
  if (stars === 1) return 'Goed begin! Probeer nog eens?';
  return 'Kom op, trainee: nog een keer!';
}

/**
 * Koppelt het spelverloop aan geluid en stem (#17). Reageert enkel op veranderingen in wat de
 * game al toont, zodat de spellogica zelf niets van geluid hoeft te weten.
 */
export function useGameAudio(p: {
  game: GameInfo;
  phase: GamePhase;
  view: GameView | null;
  advice: SpaceAdvice;
  presence: Presence;
  countdown: number;
  popups: GameEvent[];
  result: GameResult | null;
}): void {
  const { game, phase, view, advice, presence, countdown, popups, result } = p;
  const prev = useRef({ count: 0, coach: '', hurry: false, paused: false, seen: new Set<number>() });

  // Bij het verlaten van de game: alles stil.
  useEffect(() => () => audio.stopAll(), []);

  // Fasewissels.
  useEffect(() => {
    const r = prev.current;
    if (phase === 'uitleg') {
      audio.stopAll();
      r.count = 0;
      r.coach = '';
      r.hurry = false;
      r.paused = false;
      audio.say(`${game.name}! ${game.howTo.join(' ')}`, 'hoog');
    } else if (phase === 'aftellen') {
      audio.say('Daar gaan we!', 'hoog');
    } else if (phase === 'spelen') {
      audio.sfx('go');
      audio.startMusic(view?.zone ?? 0, view?.musicBpm ?? null);
    } else if (phase === 'resultaat') {
      audio.stopMusic();
      audio.setPaused(false);
    }
    // Bewust enkel bij een nieuwe fase (niet bij elke view-update).
  }, [phase]);

  // Resultaat: één "ding" per ster, dan Lumi's reactie.
  useEffect(() => {
    if (!result) return;
    const timers = Array.from({ length: result.stars }, (_, i) => window.setTimeout(() => audio.sfx('ster'), 300 + i * 350));
    timers.push(window.setTimeout(() => audio.say(praise(result.stars), 'hoog'), 400 + result.stars * 350));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [result]);

  // Ruimte-check: tips voorlezen (handig op 2–3 m van het scherm).
  useEffect(() => {
    if (phase === 'plaats' && advice.status !== 'klaar') audio.say(advice.message);
  }, [phase, advice.message, advice.status]);

  // Aftellen: piep per seconde.
  useEffect(() => {
    if (phase === 'aftellen' && countdown > 0 && countdown <= 3) audio.sfx('tel');
  }, [phase, countdown]);

  // Tijdens het spelen: stappen, tempo/lagen van de muziek, coach, laatste 5 s.
  useEffect(() => {
    if (phase !== 'spelen' || !view) return;
    const r = prev.current;
    // Tik per stap enkel bij Spotlight Sprint; de andere games hebben al een raak-geluid.
    if (view.count > r.count && game.id === 'spotlight') audio.sfx('stap');
    r.count = view.count;
    audio.setLevel(view.zone);
    if (view.coach !== r.coach) {
      r.coach = view.coach;
      audio.say(view.coach, view.coachUrgent ? 'hoog' : 'normaal');
    }
    if (!r.hurry && view.remainingMs <= 5000 && view.remainingMs > 0) {
      r.hurry = true;
      audio.sfx('haast');
    }
  }, [phase, view, game.id]);

  // Mijlpalen, doel, bonussen.
  useEffect(() => {
    const seen = prev.current.seen;
    for (const e of popups) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      if (e.kind === 'goal') {
        audio.sfx('doel');
        audio.say(`${e.text} Super gedaan!`, 'hoog');
      } else if (e.kind === 'milestone') {
        audio.sfx('mijlpaal');
        audio.say(e.text);
      } else if (e.kind === 'hit') {
        audio.sfx('raak');
      } else if (e.kind === 'miss') {
        audio.sfx('mis');
      } else {
        audio.sfx('perfect');
      }
    }
  }, [popups]);

  // Pauze bij uit beeld (#18).
  useEffect(() => {
    if (phase !== 'spelen') return;
    const r = prev.current;
    const paused = presence === 'weg';
    if (paused === r.paused) return;
    r.paused = paused;
    audio.setPaused(paused);
    if (paused) {
      audio.sfx('pauze');
      audio.say('Pauze. Kom terug in beeld.', 'hoog');
    } else {
      audio.say('Daar ben je weer!', 'hoog');
    }
  }, [phase, presence]);
}
