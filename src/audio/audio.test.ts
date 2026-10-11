import { describe, expect, it } from 'vitest';
import { midiToHz, nextTempo, stepEvents, STEPS_PER_BAR, stepSeconds, tempoTarget, type Instrument } from './music';
import { pickVoice, SpeechGate, speakable, type VoiceLike } from './speech';

const instruments = (level: number): Set<Instrument> => {
  const s = new Set<Instrument>();
  for (let bar = 0; bar < 4; bar++) for (let step = 0; step < STEPS_PER_BAR; step++) for (const e of stepEvents(bar, step, level)) s.add(e.instrument);
  return s;
};

describe('beat', () => {
  it('bouwt lagen op per Power-zone', () => {
    expect([...instruments(0)].sort()).toEqual(['bass', 'kick']);
    expect([...instruments(1)].sort()).toEqual(['bass', 'clap', 'hat', 'kick']);
    expect(instruments(2).has('chord')).toBe(true);
    expect(instruments(3).has('arp')).toBe(true);
  });

  it('heeft een kick op elke tel (four-on-the-floor)', () => {
    const kicks = Array.from({ length: 16 }, (_, s) => stepEvents(0, s, 0).some((e) => e.instrument === 'kick'));
    expect(kicks.map((k, i) => (k ? i : -1)).filter((i) => i >= 0)).toEqual([0, 4, 8, 12]);
  });

  it('volgt de akkoorden Am–F–C–G', () => {
    const bassAt = (bar: number) => stepEvents(bar, 0, 0).find((e) => e.instrument === 'bass')!.midi[0];
    expect([0, 1, 2, 3, 4].map(bassAt)).toEqual([45, 41, 48, 43, 45]);
  });

  it('versnelt geleidelijk naar het tempo van de zone', () => {
    expect(tempoTarget(0)).toBe(108);
    expect(tempoTarget(3)).toBe(132);
    let bpm = 108;
    for (let i = 0; i < 3; i++) bpm = nextTempo(bpm, 3);
    expect(bpm).toBe(120);
    for (let i = 0; i < 10; i++) bpm = nextTempo(bpm, 3);
    expect(bpm).toBe(132);
  });

  it('rekent noten en stappen juist om', () => {
    expect(midiToHz(69)).toBeCloseTo(440);
    expect(midiToHz(57)).toBeCloseTo(220);
    expect(stepSeconds(120)).toBeCloseTo(0.125);
  });
});

describe('stem', () => {
  const v = (name: string, lang: string, localService: boolean): VoiceLike => ({ name, lang, localService });

  it('kiest een lokale Vlaamse stem boven een Nederlandse', () => {
    expect(pickVoice([v('NL', 'nl-NL', true), v('BE', 'nl-BE', true)])?.name).toBe('BE');
  });

  it('negeert online stemmen (privacy), ook als ze Nederlands zijn', () => {
    expect(pickVoice([v('Google Nederlands', 'nl-NL', false), v('English', 'en-US', true)])).toBeNull();
  });

  it('herkent ook de schrijfwijze nl_BE (Android)', () => {
    expect(pickVoice([v('x', 'nl_BE', true)])?.name).toBe('x');
  });

  it('doseert normale zinnen, maar laat belangrijke altijd door', () => {
    const g = new SpeechGate(2500);
    expect(g.allow('Hoger die knieën!', 'normaal', 0)).toBe(true);
    expect(g.allow('Goed bezig!', 'normaal', 1000)).toBe(false); // te snel
    expect(g.allow('Goed bezig!', 'normaal', 3000)).toBe(true);
    expect(g.allow('Goed bezig!', 'normaal', 9000)).toBe(false); // zelfde zin
    expect(g.allow('Spotlight aan!', 'hoog', 9100)).toBe(true);
  });

  it('maakt teksten uitspreekbaar', () => {
    expect(speakable('SPOTLIGHT ON!')).toBe('spotlight on!');
    expect(speakable('⏸ Pauze')).toBe('Pauze');
  });
});
