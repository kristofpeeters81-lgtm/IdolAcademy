import { allVisible, hipMid, shoulderMid, type BodyPose } from '../body';
import { LM } from '../landmarks';
import { fmt, type Detector, type DetectorReading } from './common';

/**
 * Ontwijken (Laser Stage): in welke "zone" staat de speler nu? Het spel controleert dit op het
 * moment dat een laserwand aankomt.
 *
 * - bukken: schouders ≥ 0,45 romp lager dan rechtop;
 * - springen: beide enkels ≥ 0,12 romp boven de vloer;
 * - links/rechts: heupen ≥ 0,6 romp opzij van het middelpunt (links/rechts van de spéler);
 * - midden: geen van de vorige.
 *
 * Referentie ("rechtop in het midden") wordt traag bijgewerkt zolang de speler in het midden
 * rechtop staat, zodat een kind dat langzaam verschuift niet vastloopt.
 */
export const DODGE = {
  duck: 0.45,
  jump: 0.12,
  side: 0.6,
  /** Hoe snel de referentie meeschuift (0..1 per beeld). */
  follow: 0.02,
};

export type DodgeZone = 'midden' | 'bukken' | 'springen' | 'links' | 'rechts';

const NEEDED = [LM.leftShoulder, LM.rightShoulder, LM.leftHip, LM.rightHip];

export class DodgeDetector implements Detector {
  private ref: { shoulderY: number; hipX: number; ankleY: number | null } | null = null;
  private zone: DodgeZone | null = null;
  private dodges = 0;
  private readonly perZone: Record<DodgeZone, number> = { midden: 0, bukken: 0, springen: 0, links: 0, rechts: 0 };
  private offset = { side: 0, down: 0, up: 0 };

  /** Huidige zone (voor het spel). */
  current(): DodgeZone | null {
    return this.zone;
  }

  update(b: BodyPose): void {
    if (!b.present || b.torso <= 0 || !allVisible(b, NEEDED)) {
      this.zone = null;
      return;
    }
    const sh = shoulderMid(b);
    const hip = hipMid(b);
    const anklesVisible = allVisible(b, [LM.leftAnkle, LM.rightAnkle]);
    const ankleY = anklesVisible ? (b.pts[LM.leftAnkle].y + b.pts[LM.rightAnkle].y) / 2 : null;
    if (!this.ref) this.ref = { shoulderY: sh.y, hipX: hip.x, ankleY };

    const T = b.torso;
    this.offset = {
      // x groter = linkerkant van de speler.
      side: (hip.x - this.ref.hipX) / T,
      down: (sh.y - this.ref.shoulderY) / T,
      up: ankleY !== null && this.ref.ankleY !== null ? (this.ref.ankleY - ankleY) / T : 0,
    };
    let zone: DodgeZone = 'midden';
    if (this.offset.up >= DODGE.jump) zone = 'springen';
    else if (this.offset.down >= DODGE.duck) zone = 'bukken';
    else if (this.offset.side >= DODGE.side) zone = 'links';
    else if (this.offset.side <= -DODGE.side) zone = 'rechts';

    if (zone !== this.zone) {
      if (zone !== 'midden' && (this.zone === 'midden' || this.zone === null)) this.dodges++;
      if (zone !== 'midden') this.perZone[zone]++;
      this.zone = zone;
    }
    if (zone === 'midden') {
      const f = DODGE.follow;
      this.ref.shoulderY += (sh.y - this.ref.shoulderY) * f;
      this.ref.hipX += (hip.x - this.ref.hipX) * f;
      // Vloer = laagste enkelpositie (grootste y): lager → meteen overnemen, hoger → traag volgen.
      if (ankleY !== null) {
        const floor = this.ref.ankleY;
        this.ref.ankleY = floor === null || ankleY > floor ? ankleY : floor + (ankleY - floor) * f;
      }
    }
  }

  reading(): DetectorReading {
    const z = this.perZone;
    return {
      count: this.dodges,
      unit: 'ontwijkingen',
      signal: this.zone === null ? null : Math.max(this.offset.down / DODGE.duck, this.offset.up / DODGE.jump, Math.abs(this.offset.side) / DODGE.side),
      thresholds: [1],
      state: this.zone ?? 'romp niet zichtbaar',
      detail: `bukken ${z.bukken} · springen ${z.springen} · links ${z.links} · rechts ${z.rechts} · opzij ${fmt(this.offset.side)}`,
    };
  }

  reset(): void {
    this.ref = null;
    this.zone = null;
    this.dodges = 0;
    for (const k of Object.keys(this.perZone) as DodgeZone[]) this.perZone[k] = 0;
  }
}
