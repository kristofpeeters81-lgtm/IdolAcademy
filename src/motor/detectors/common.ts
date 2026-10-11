import type { BodyPose } from '../body';

/** Wat elke detector teruggeeft aan het spel en aan het testlab. */
export interface DetectorReading {
  /** Herhalingen, stappen, stoten… of seconden vastgehouden (zie `unit`). */
  count: number;
  unit: string;
  /** Het belangrijkste meetsignaal (voor de grafiek in het testlab), null = niet meetbaar. */
  signal: number | null;
  /** Drempels op dat signaal (lijnen in de grafiek). */
  thresholds: number[];
  /** Korte toestand in gewone taal ("omlaag", "klaar", "uit beeld"…). */
  state: string;
  /** Extra info (bv. tempo, sprongen, diepste squat). */
  detail?: string;
}

export interface Detector {
  update(body: BodyPose): void;
  reading(): DetectorReading;
  reset(): void;
}

export const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v));

/**
 * Teller met hysterese: een herhaling telt pas als het signaal boven `enter` komt én daarna
 * terug onder `exit` zakt. Zo telt trillen rond één drempel nooit dubbel.
 */
export class RepCounter {
  count = 0;
  active = false;
  /** Hoogste waarde tijdens de lopende/laatste herhaling. */
  peak = 0;
  lastPeak = 0;
  private enteredAt = 0;
  private lastRepAt = -Infinity;

  constructor(
    readonly enter: number,
    readonly exit: number,
    /** Minimale duur van één herhaling (ms) — filtert schokjes. */
    private readonly minRepMs = 0,
    /** Minimale tijd tussen twee herhalingen (ms). */
    private readonly minGapMs = 0,
  ) {}

  /** Geeft true terug op het moment dat een herhaling voltooid is. */
  update(value: number, t: number): boolean {
    if (!this.active) {
      if (value >= this.enter && t - this.lastRepAt >= this.minGapMs) {
        this.active = true;
        this.enteredAt = t;
        this.peak = value;
      }
      return false;
    }
    this.peak = Math.max(this.peak, value);
    if (value <= this.exit) {
      this.active = false;
      if (t - this.enteredAt >= this.minRepMs) {
        this.count++;
        this.lastRepAt = t;
        this.lastPeak = this.peak;
        return true;
      }
    }
    return false;
  }

  reset(): void {
    this.count = 0;
    this.active = false;
    this.peak = 0;
    this.lastPeak = 0;
    this.lastRepAt = -Infinity;
  }
}

/** Maximum over een tijdsvenster (voor "rechtop staan"-referenties die zich aanpassen). */
export class WindowMax {
  private readonly items: { t: number; v: number }[] = [];

  constructor(private readonly windowMs: number) {}

  push(v: number, t: number): void {
    // Monotone deque: waarden die nooit meer het maximum kunnen worden, vallen weg.
    while (this.items.length > 0 && this.items[this.items.length - 1].v <= v) this.items.pop();
    this.items.push({ t, v });
    while (this.items.length > 0 && t - this.items[0].t > this.windowMs) this.items.shift();
  }

  get value(): number | null {
    return this.items.length > 0 ? this.items[0].v : null;
  }

  reset(): void {
    this.items.length = 0;
  }
}

/** Telt gebeurtenissen in de laatste `windowMs` en zet dat om naar "per minuut". */
export class CadenceMeter {
  private readonly times: number[] = [];

  constructor(private readonly windowMs = 5000) {}

  hit(t: number): void {
    this.times.push(t);
  }

  perMinute(t: number): number {
    while (this.times.length > 0 && t - this.times[0] > this.windowMs) this.times.shift();
    return (this.times.length * 60_000) / this.windowMs;
  }

  reset(): void {
    this.times.length = 0;
  }
}

export const fmt = (n: number, digits = 2): string => n.toFixed(digits).replace('.', ',');
