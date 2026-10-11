/**
 * Samenvatting van de laatste minuut (#21). Een momentopname is misleidend: wie op
 * "Meetrapport" tikt, staat op dat moment vlak bij het toestel en dus half uit beeld.
 * Deze samenvatting kijkt terug over het hele venster.
 */

export interface FrameSample {
  /** Tijdstip (ms). */
  t: number;
  inferenceMs: number;
  /** Zichtbare kernpunten (0..9). */
  visible: number;
}

export interface SessionSummary {
  /** Lengte van het gemeten venster (s). */
  seconds: number;
  frames: number;
  /** Gemiddelde detecties per seconde over het venster. */
  avgFps: number;
  /** Traagste volledige seconde (detecties in die seconde). */
  minFps: number;
  avgInferenceMs: number;
  /** 95% van de beelden was sneller dan dit (ms). */
  p95InferenceMs: number;
  /** Aandeel beelden met het hele lichaam in beeld (9/9), 0..1. */
  fullBodyShare: number;
  /** Meest voorkomende aantal zichtbare punten (wat "normaal" was tijdens het spelen). */
  typicalVisible: number;
}

export function summarizeSession(samples: readonly FrameSample[], now: number, windowMs = 60_000): SessionSummary | null {
  const recent = samples.filter((s) => now - s.t <= windowMs);
  if (recent.length < 2) return null;
  const first = recent[0].t;
  const last = recent[recent.length - 1].t;
  const span = last - first;

  // Detecties per volledige seconde. Seconde 0 begint bij het eerste beeld en is dus volledig;
  // enkel de laatste (lopende) seconde telt niet mee.
  const buckets = new Map<number, number>();
  for (const s of recent) {
    const b = Math.floor((s.t - first) / 1000);
    buckets.set(b, (buckets.get(b) ?? 0) + 1);
  }
  const lastBucket = Math.floor(span / 1000);
  const full = [...buckets.entries()].filter(([b]) => b < lastBucket).map(([, n]) => n);

  const inference = recent.map((s) => s.inferenceMs).sort((a, b) => a - b);
  const counts = new Array<number>(10).fill(0);
  for (const s of recent) counts[Math.max(0, Math.min(9, s.visible))]++;

  return {
    seconds: span / 1000,
    frames: recent.length,
    avgFps: span > 0 ? ((recent.length - 1) / span) * 1000 : 0,
    minFps: full.length > 0 ? Math.min(...full) : 0,
    avgInferenceMs: inference.reduce((a, b) => a + b, 0) / inference.length,
    p95InferenceMs: inference[Math.min(inference.length - 1, Math.floor(inference.length * 0.95))],
    fullBodyShare: counts[9] / recent.length,
    typicalVisible: counts.indexOf(Math.max(...counts)),
  };
}

/** Bewaart de beelden van het laatste venster (begrensd, zodat het geheugen niet groeit). */
export class SessionRecorder {
  private readonly samples: FrameSample[] = [];

  constructor(private readonly windowMs = 60_000) {}

  push(sample: FrameSample): void {
    this.samples.push(sample);
    while (this.samples.length > 0 && sample.t - this.samples[0].t > this.windowMs) this.samples.shift();
  }

  summary(now: number): SessionSummary | null {
    return summarizeSession(this.samples, now, this.windowMs);
  }

  reset(): void {
    this.samples.length = 0;
  }
}
