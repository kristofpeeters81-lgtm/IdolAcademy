/**
 * Meetinstrumenten voor de prestaties (#21): beelden per seconde en gemiddelde rekentijd.
 * Alles werkt met een glijdend venster, zodat de cijfers snel reageren maar niet springen.
 */

/** Telt gebeurtenissen per seconde over de laatste `windowMs`. */
export class RateMeter {
  private readonly times: number[] = [];

  constructor(private readonly windowMs = 1000) {}

  tick(now: number): void {
    this.times.push(now);
    this.trim(now);
  }

  /** Gebeurtenissen per seconde op tijdstip `now`. */
  rate(now: number): number {
    this.trim(now);
    if (this.times.length < 2) return 0;
    // n tikken = n - 1 intervallen. Stopt de stroom, dan vallen de oude tikken uit het venster en zakt dit naar 0.
    const span = this.times[this.times.length - 1] - this.times[0];
    return span > 0 ? ((this.times.length - 1) / span) * 1000 : 0;
  }

  reset(): void {
    this.times.length = 0;
  }

  private trim(now: number): void {
    while (this.times.length > 0 && now - this.times[0] > this.windowMs) this.times.shift();
  }
}

/** Gemiddelde van de laatste `size` waarden. */
export class RollingAverage {
  private readonly values: number[] = [];

  constructor(private readonly size = 30) {}

  push(value: number): void {
    this.values.push(value);
    if (this.values.length > this.size) this.values.shift();
  }

  get average(): number {
    if (this.values.length === 0) return 0;
    return this.values.reduce((a, b) => a + b, 0) / this.values.length;
  }

  get count(): number {
    return this.values.length;
  }

  reset(): void {
    this.values.length = 0;
  }
}
