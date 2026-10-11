import { nextTempo, STEPS_PER_BAR, stepEvents, stepSeconds, tempoTarget } from './music';
import { pickVoice, SpeechGate, speakable, type SpeechPriority } from './speech';
import { bass, chord, clap, hat, kick, playSfx, pluck, type Sfx } from './synth';

/**
 * Regisseur van al het geluid (#17): muziek, effecten en Lumi's stem. Eén exemplaar voor de hele
 * app (`audio`). Werkt pas na een tik van de gebruiker (browserregel), via `unlock()`.
 *
 * - Muziek: een planner die telkens ~120 ms vooruit noten inplant (betrouwbaar, ook als de
 *   hoofdthread even bezig is met de detectie).
 * - Terwijl Lumi spreekt, gaat de muziek zachter ("ducking").
 */

const LOOKAHEAD_S = 0.12;
const TICK_MS = 25;
const MUSIC_VOLUME = 0.7;
const DUCKED_VOLUME = 0.18;

export interface AudioStatus {
  /** Geluid (muziek + effecten) aan? */
  sound: boolean;
  /** Lumi's stem aan? */
  voice: boolean;
  /** Is er een lokale Nederlandse stem op dit toestel? */
  voiceAvailable: boolean;
  voiceName: string | null;
}

class AudioDirector {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private timer = 0;
  private playing = false;
  private nextStepTime = 0;
  private step = 0;
  private bar = 0;
  private bpm = tempoTarget(0);
  private level = 0;
  private soundOn = true;
  private voiceOn = true;
  private voice: SpeechSynthesisVoice | null = null;
  private readonly gate = new SpeechGate(2500);
  /** Muziek zacht omdat het spel gepauzeerd is / omdat Lumi spreekt. */
  private quietPaused = false;
  private quietSpeaking = false;
  private readonly listeners = new Set<() => void>();

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const load = () => {
        this.voice = pickVoice(window.speechSynthesis.getVoices());
        this.emit();
      };
      load();
      window.speechSynthesis.addEventListener?.('voiceschanged', load);
    }
  }

  status(): AudioStatus {
    return { sound: this.soundOn, voice: this.voiceOn, voiceAvailable: this.voice !== null, voiceName: this.voice?.name ?? null };
  }

  onChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  setSound(on: boolean): void {
    this.soundOn = on;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.05);
    this.emit();
  }

  setVoice(on: boolean): void {
    this.voiceOn = on;
    if (!on) this.stopSpeech();
    this.emit();
  }

  /** Moet vanuit een tik/klik aangeroepen worden (anders blijft de browser stil). */
  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        this.ctx = new Ctx();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.soundOn ? 1 : 0;
        // Zachte begrenzer: voorkomt oversturing als alles tegelijk klinkt.
        const limiter = this.ctx.createDynamicsCompressor();
        limiter.threshold.value = -10;
        limiter.ratio.value = 8;
        this.master.connect(limiter).connect(this.ctx.destination);
        this.musicBus = this.ctx.createGain();
        this.musicBus.gain.value = MUSIC_VOLUME;
        this.musicBus.connect(this.master);
        this.sfxBus = this.ctx.createGain();
        this.sfxBus.gain.value = 0.8;
        this.sfxBus.connect(this.master);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      // iOS/Safari: spraak "ontgrendelen" met een lege zin binnen de tik (ongetest, #7).
      if (this.voiceOn && this.voice && 'speechSynthesis' in window && !window.speechSynthesis.speaking) {
        const u = new SpeechSynthesisUtterance('');
        u.voice = this.voice;
        window.speechSynthesis.speak(u);
      }
    } catch {
      // Geen geluid mogelijk: het spel werkt gewoon verder zonder.
    }
  }

  get contextState(): AudioContextState | 'geen' {
    return this.ctx?.state ?? 'geen';
  }

  sfx(name: Sfx): void {
    if (!this.ctx || !this.sfxBus || !this.soundOn) return;
    playSfx(this.ctx, this.sfxBus, name, this.ctx.currentTime + 0.01);
  }

  /** Muziek starten (of doorlopen). Niveau = Power-zone 0..3. */
  startMusic(level = 0): void {
    if (!this.ctx || this.playing) return;
    this.playing = true;
    this.level = level;
    this.bpm = tempoTarget(level);
    this.step = 0;
    this.bar = 0;
    this.nextStepTime = this.ctx.currentTime + 0.05;
    this.timer = window.setInterval(() => this.schedule(), TICK_MS);
  }

  stopMusic(): void {
    this.playing = false;
    window.clearInterval(this.timer);
  }

  setLevel(level: number): void {
    this.level = Math.max(0, Math.min(3, level));
  }

  /** Muziek zacht zolang het spel gepauzeerd is. */
  setPaused(paused: boolean): void {
    this.quietPaused = paused;
    this.applyMusicVolume();
  }

  private setSpeaking(speaking: boolean): void {
    this.quietSpeaking = speaking;
    this.applyMusicVolume();
  }

  private applyMusicVolume(): void {
    const quiet = this.quietPaused || this.quietSpeaking;
    if (this.musicBus && this.ctx) this.musicBus.gain.setTargetAtTime(quiet ? DUCKED_VOLUME : MUSIC_VOLUME, this.ctx.currentTime, 0.15);
  }

  /** Lumi zegt iets (gedoseerd, zie SpeechGate). */
  say(text: string, priority: SpeechPriority = 'normaal'): void {
    if (!this.voiceOn || !this.voice || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    // Normale zinnen wachten niet in de rij: als Lumi nog praat, is het moment voorbij.
    if (priority === 'normaal' && synth.speaking) return;
    if (!this.gate.allow(text, priority, performance.now())) return;
    if (priority === 'hoog') synth.cancel();
    const u = new SpeechSynthesisUtterance(speakable(text));
    u.voice = this.voice;
    u.lang = this.voice.lang;
    u.rate = 1.05;
    u.pitch = 1.25;
    u.onstart = () => this.setSpeaking(true);
    u.onend = u.onerror = () => this.setSpeaking(false);
    synth.speak(u);
  }

  stopSpeech(): void {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    this.gate.reset();
    this.setSpeaking(false);
  }

  /** Alles stil (bij het verlaten van een game). */
  stopAll(): void {
    this.stopMusic();
    this.stopSpeech();
    this.setPaused(false);
  }

  private schedule(): void {
    const ctx = this.ctx;
    const bus = this.musicBus;
    if (!ctx || !bus || !this.playing) return;
    while (this.nextStepTime < ctx.currentTime + LOOKAHEAD_S) {
      const t = this.nextStepTime;
      const len = stepSeconds(this.bpm);
      for (const e of stepEvents(this.bar, this.step, this.level)) {
        switch (e.instrument) {
          case 'kick':
            kick(ctx, bus, t, e.velocity);
            break;
          case 'clap':
            clap(ctx, bus, t, e.velocity);
            break;
          case 'hat':
            hat(ctx, bus, t, e.velocity);
            break;
          case 'bass':
            bass(ctx, bus, t, e.midi[0], len * e.steps, e.velocity);
            break;
          case 'chord':
            chord(ctx, bus, t, e.midi, len * e.steps, e.velocity);
            break;
          case 'arp':
            pluck(ctx, bus, t, e.midi[0], e.velocity);
            break;
        }
      }
      this.nextStepTime += len;
      this.step++;
      if (this.step >= STEPS_PER_BAR) {
        this.step = 0;
        this.bar++;
        this.bpm = nextTempo(this.bpm, this.level);
      }
    }
  }

  private emit(): void {
    for (const cb of this.listeners) cb();
  }
}

/** Het ene geluidssysteem van de app. */
export const audio = new AudioDirector();
