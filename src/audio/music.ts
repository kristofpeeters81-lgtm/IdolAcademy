/**
 * De beat (#17): een zelfgemaakte K-pop/dance-loop, volledig gesynthetiseerd (#14: geen echte
 * liedjes). Dit bestand is puur (geen Web Audio): welke noten op welke stap, en welk tempo bij
 * welke Power-zone. `synth.ts` maakt er geluid van.
 *
 * Opbouw per Power-zone (#26), zodat de muziek "meegroeit" met hoe hard je beweegt:
 *   0 rustig    kick + bas
 *   1 matig     + clap + offbeat-hihat
 *   2 intens    + akkoordstoten
 *   3 explosief + 16e-hihats + arpeggio
 */

export type Instrument = 'kick' | 'clap' | 'hat' | 'bass' | 'chord' | 'arp';

export interface NoteEvent {
  instrument: Instrument;
  /** MIDI-nootnummers (1 voor bas/arp, 3 voor een akkoord; leeg voor drums). */
  midi: number[];
  /** Luidheid 0..1. */
  velocity: number;
  /** Lengte in stappen (16e noten). */
  steps: number;
}

export const STEPS_PER_BAR = 16;

/** Am – F – C – G (vi–IV–I–V): de klassieke "pop-progressie", hier in a-klein. */
const PROGRESSION = [
  { bass: 45, chord: [57, 60, 64] }, // Am
  { bass: 41, chord: [53, 57, 60] }, // F
  { bass: 48, chord: [55, 60, 64] }, // C
  { bass: 43, chord: [55, 59, 62] }, // G
];

/** Tempo per zone (BPM). Het tempo schuift per maat geleidelijk naar het doel. */
export const TEMPO = { byZone: [108, 116, 124, 132], maxChangePerBar: 4 };

export function tempoTarget(zone: number): number {
  return TEMPO.byZone[Math.max(0, Math.min(3, zone))];
}

/** Eén maat verder: tempo zachtjes richting het doel (geen schokken in de muziek). */
export function nextTempo(current: number, zone: number): number {
  const target = tempoTarget(zone);
  const diff = Math.max(-TEMPO.maxChangePerBar, Math.min(TEMPO.maxChangePerBar, target - current));
  return current + diff;
}

export const midiToHz = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

/** Duur van één stap (16e noot) in seconden. */
export const stepSeconds = (bpm: number): number => 60 / bpm / 4;

const BASS_STEPS = [0, 3, 6, 8, 11, 14];

/** Alle noten die op stap `step` van maat `bar` klinken bij een bepaald niveau (0..3). */
export function stepEvents(bar: number, step: number, level: number): NoteEvent[] {
  const chord = PROGRESSION[bar % PROGRESSION.length];
  const out: NoteEvent[] = [];
  if (step % 4 === 0) out.push({ instrument: 'kick', midi: [], velocity: step === 0 ? 1 : 0.85, steps: 1 });
  if (BASS_STEPS.includes(step)) {
    const octaveUp = step === 6 || step === 14;
    out.push({ instrument: 'bass', midi: [chord.bass + (octaveUp ? 12 : 0)], velocity: 0.8, steps: 2 });
  }
  if (level >= 1) {
    if (step === 4 || step === 12) out.push({ instrument: 'clap', midi: [], velocity: 0.8, steps: 1 });
    if (step % 4 === 2) out.push({ instrument: 'hat', midi: [], velocity: 0.55, steps: 1 });
  }
  if (level >= 2 && (step === 0 || step === 6 || step === 10)) {
    out.push({ instrument: 'chord', midi: chord.chord, velocity: 0.45, steps: 2 });
  }
  if (level >= 3) {
    if (step % 4 !== 2) out.push({ instrument: 'hat', midi: [], velocity: 0.25, steps: 1 });
    if (step % 2 === 0) {
      const tones = chord.chord.map((n) => n + 12);
      out.push({ instrument: 'arp', midi: [tones[(step / 2) % tones.length]], velocity: 0.35, steps: 1 });
    }
  }
  return out;
}
