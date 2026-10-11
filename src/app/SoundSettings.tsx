import { useEffect, useState } from 'react';
import { audio, type AudioStatus } from '../audio/director';
import { saveSoundPrefs } from './storage';

/** Geluid en stem aan/uit (onthouden per toestel), met uitleg als er geen lokale stem is. */
export function SoundSettings() {
  const [s, setS] = useState<AudioStatus>(() => audio.status());
  useEffect(() => audio.onChange(() => setS(audio.status())), []);

  const update = (sound: boolean, voice: boolean) => {
    audio.setSound(sound);
    audio.setVoice(voice);
    saveSoundPrefs({ sound, voice });
    audio.unlock();
    if (sound) audio.sfx('klik');
  };

  return (
    <div className="sound-settings">
      <button type="button" className={`toggle${s.sound ? ' on' : ''}`} aria-pressed={s.sound} onClick={() => update(!s.sound, s.voice)}>
        {s.sound ? '🔊' : '🔇'} Muziek &amp; geluid
      </button>
      <button
        type="button"
        className={`toggle${s.voice && s.voiceAvailable ? ' on' : ''}`}
        aria-pressed={s.voice}
        disabled={!s.voiceAvailable}
        onClick={() => update(s.sound, !s.voice)}
      >
        {s.voice && s.voiceAvailable ? '🗣️' : '🤐'} Stem van Lumi
      </button>
      {!s.voiceAvailable && (
        <p className="hint-text">Geen Nederlandse stem op dit toestel gevonden: Lumi praat niet, maar alles staat op het scherm.</p>
      )}
    </div>
  );
}
