/**
 * Lumi's stem (#17) via de spraaksynthese van het toestel.
 *
 * Privacy (#4): enkel stemmen met `localService === true`. Online stemmen (bv. "Google
 * Nederlands" in Chrome op de pc) sturen de tekst naar een server, en dat houdt onze CSP niet
 * tegen. Is er geen lokale Nederlandse stem, dan zwijgt Lumi (alles blijft wel op het scherm).
 */

export interface VoiceLike {
  name: string;
  lang: string;
  localService: boolean;
  default?: boolean;
}

/** Voorkeur: Vlaams, dan Nederlands, dan eender welk "nl". Enkel lokale stemmen. */
export function pickVoice<V extends VoiceLike>(voices: readonly V[]): V | null {
  const local = voices.filter((v) => v.localService);
  const lang = (v: V) => v.lang.toLowerCase().replace('_', '-');
  return (
    local.find((v) => lang(v) === 'nl-be') ??
    local.find((v) => lang(v) === 'nl-nl') ??
    local.find((v) => lang(v).startsWith('nl')) ??
    null
  );
}

export type SpeechPriority = 'normaal' | 'hoog';

/**
 * Doseert wat Lumi zegt: niet twee keer hetzelfde na elkaar, en tussen normale zinnen minstens
 * `minGapMs`. "Hoog" (aftellen, doel gehaald, resultaat) onderbreekt wat er bezig is.
 */
export class SpeechGate {
  private lastText = '';
  private lastAt = -Infinity;

  constructor(private readonly minGapMs = 2500) {}

  /** Mag deze zin nu gezegd worden? (Registreert hem meteen als gezegd.) */
  allow(text: string, priority: SpeechPriority, now: number): boolean {
    if (!text.trim()) return false;
    if (priority === 'normaal') {
      if (text === this.lastText) return false;
      if (now - this.lastAt < this.minGapMs) return false;
    }
    this.lastText = text;
    this.lastAt = now;
    return true;
  }

  reset(): void {
    this.lastText = '';
    this.lastAt = -Infinity;
  }
}

/** Uitspraak: hoofdletters ("SPOTLIGHT ON!") en symbolen klinken beter in gewone tekst. */
export function speakable(text: string): string {
  return text
    .replace(/[★⏸]/g, '')
    .replace(/\b([A-Z]{2,}[A-Z !]*)\b/g, (m) => m.toLowerCase())
    .trim();
}
