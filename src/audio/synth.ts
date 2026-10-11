import { midiToHz } from './music';

/**
 * Instrumenten en geluidseffecten, volledig gesynthetiseerd met Web Audio (#14, #17): geen
 * geluidsbestanden, niets te downloaden. Elk instrument speelt één noot op tijdstip `t`.
 */

let noiseBuffer: AudioBuffer | null = null;

function noise(ctx: BaseAudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

/** Omhullende: snel aan, exponentieel uit. */
function env(g: GainNode, t: number, peak: number, attack: number, decay: number): void {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

export function kick(ctx: BaseAudioContext, out: AudioNode, t: number, vel: number): void {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  env(g, t, 0.9 * vel, 0.002, 0.28);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.32);
}

export function clap(ctx: BaseAudioContext, out: AudioNode, t: number, vel: number): void {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 1500;
  f.Q.value = 0.8;
  const g = ctx.createGain();
  env(g, t, 0.55 * vel, 0.003, 0.16);
  src.connect(f).connect(g).connect(out);
  src.start(t);
  src.stop(t + 0.2);
}

export function hat(ctx: BaseAudioContext, out: AudioNode, t: number, vel: number): void {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 7000;
  const g = ctx.createGain();
  env(g, t, 0.28 * vel, 0.002, 0.05);
  src.connect(f).connect(g).connect(out);
  src.start(t);
  src.stop(t + 0.08);
}

export function bass(ctx: BaseAudioContext, out: AudioNode, t: number, midi: number, dur: number, vel: number): void {
  const o = ctx.createOscillator();
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.value = midiToHz(midi);
  f.type = 'lowpass';
  f.frequency.setValueAtTime(900, t);
  f.frequency.exponentialRampToValueAtTime(220, t + dur);
  env(g, t, 0.35 * vel, 0.005, dur);
  o.connect(f).connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
}

/** "Supersaw"-akkoordstoot: per noot twee licht ontstemde zaagtanden. */
export function chord(ctx: BaseAudioContext, out: AudioNode, t: number, midis: number[], dur: number, vel: number): void {
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 2800;
  const g = ctx.createGain();
  env(g, t, 0.12 * vel, 0.01, dur);
  f.connect(g).connect(out);
  for (const m of midis) {
    for (const detune of [-9, 9]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = midiToHz(m);
      o.detune.value = detune;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }
}

export function pluck(ctx: BaseAudioContext, out: AudioNode, t: number, midi: number, vel: number, type: OscillatorType = 'square'): void {
  const o = ctx.createOscillator();
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = midiToHz(midi);
  f.type = 'lowpass';
  f.frequency.setValueAtTime(4000, t);
  f.frequency.exponentialRampToValueAtTime(600, t + 0.15);
  env(g, t, 0.18 * vel, 0.003, 0.18);
  o.connect(f).connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.25);
}

/** Geluidseffecten van het spel. */
export type Sfx = 'klik' | 'stap' | 'tel' | 'go' | 'mijlpaal' | 'doel' | 'perfect' | 'haast' | 'pauze' | 'ster' | 'raak' | 'mis';

export function playSfx(ctx: BaseAudioContext, out: AudioNode, name: Sfx, t: number): void {
  switch (name) {
    case 'klik':
      pluck(ctx, out, t, 84, 0.6, 'triangle');
      break;
    case 'stap':
      pluck(ctx, out, t, 96, 0.35, 'triangle');
      break;
    case 'tel':
      pluck(ctx, out, t, 72, 1, 'square');
      break;
    case 'go':
      [84, 88, 91, 96].forEach((m, i) => pluck(ctx, out, t + i * 0.04, m, 1, 'square'));
      break;
    case 'mijlpaal':
      [76, 79, 83].forEach((m, i) => pluck(ctx, out, t + i * 0.07, m, 0.9, 'triangle'));
      break;
    case 'doel':
      [72, 76, 79, 84, 88, 91, 96].forEach((m, i) => pluck(ctx, out, t + i * 0.06, m, 1, i % 2 ? 'triangle' : 'square'));
      chord(ctx, out, t + 0.42, [72, 76, 79, 84], 0.9, 1.4);
      break;
    case 'perfect':
      [91, 96].forEach((m, i) => pluck(ctx, out, t + i * 0.06, m, 0.8, 'triangle'));
      break;
    case 'haast':
      [72, 72].forEach((m, i) => pluck(ctx, out, t + i * 0.12, m, 0.8, 'square'));
      break;
    case 'pauze':
      [79, 72].forEach((m, i) => pluck(ctx, out, t + i * 0.1, m, 0.7, 'triangle'));
      break;
    case 'raak':
      [84, 91].forEach((m, i) => pluck(ctx, out, t + i * 0.03, m, 0.8, 'square'));
      break;
    case 'mis':
      [52, 47].forEach((m, i) => pluck(ctx, out, t + i * 0.08, m, 0.7, 'sawtooth'));
      break;
    case 'ster':
      [88, 95].forEach((m, i) => pluck(ctx, out, t + i * 0.05, m, 1, 'triangle'));
      break;
  }
}
