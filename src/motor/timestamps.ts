/**
 * MediaPipe eist strikt stijgende tijdstempels en rekent ze intern om naar héle microseconden.
 * Daarom gehele milliseconden die altijd minstens 1 ms stijgen (een stap van 0,001 ms werd
 * soms weggerond → "Packet timestamp mismatch" en een vastgelopen detectie).
 */
export function nextTimestamp(now: number, last: number): number {
  return Math.max(Math.round(now), last + 1);
}
