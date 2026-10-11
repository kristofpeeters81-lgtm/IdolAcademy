import { isAge, type Age } from '../games/scoring';

/**
 * Kleine voorkeuren in de browser (leeftijd van de speler). Mag ontbreken of falen (privévenster,
 * geblokkeerde opslag): de app werkt dan gewoon, je kiest de leeftijd opnieuw.
 * De echte opslag van scores en meetlogs volgt in blok 9 (#19).
 */
const AGE_KEY = 'idolAcademy.age';

export function loadAge(): Age | null {
  try {
    const v = Number(localStorage.getItem(AGE_KEY));
    return isAge(v) ? v : null;
  } catch {
    return null;
  }
}

export function saveAge(age: Age): void {
  try {
    localStorage.setItem(AGE_KEY, String(age));
  } catch {
    // Niet erg: volgende keer opnieuw kiezen.
  }
}

const SOUND_KEY = 'idolAcademy.sound';
const VOICE_KEY = 'idolAcademy.voice';

export interface SoundPrefs {
  sound: boolean;
  voice: boolean;
}

/** Geluid en stem staan standaard aan. */
export function loadSoundPrefs(): SoundPrefs {
  try {
    return { sound: localStorage.getItem(SOUND_KEY) !== 'uit', voice: localStorage.getItem(VOICE_KEY) !== 'uit' };
  } catch {
    return { sound: true, voice: true };
  }
}

export function saveSoundPrefs(p: SoundPrefs): void {
  try {
    localStorage.setItem(SOUND_KEY, p.sound ? 'aan' : 'uit');
    localStorage.setItem(VOICE_KEY, p.voice ? 'aan' : 'uit');
  } catch {
    // Niet erg.
  }
}
