import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BodyTracker } from './body';
import { DETECTORS, type DetectorId } from './detectors';
import { parseRecording, recordingToFrames } from './recording';

/**
 * Echte opnames als tests (#31). Leg een opname (via "Opnemen" in het testlab) in
 * `test-fixtures/` en ze wordt hier automatisch afgespeeld: de detector moet (bijna) hetzelfde
 * aantal tellen als wat de speler zelf telde.
 *
 * Marge: ±1, of ±10% bij grotere aantallen. Houdingen (seconden) krijgen ±1,5 s.
 */
const DIR = path.resolve('test-fixtures');
/** Ook `test-fixtures/lokaal/` (niet in git: opnames die niet publiek mogen). */
const files = ['', 'lokaal']
  .map((sub) => path.join(DIR, sub))
  .filter((dir) => fs.existsSync(dir))
  .flatMap((dir) => fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => path.relative(DIR, path.join(dir, f))));

describe('opnames in test-fixtures/', () => {
  if (files.length === 0) {
    it('nog geen opnames — dit is geen fout', () => expect(files).toEqual([]));
    return;
  }
  for (const file of files) {
    it(file, () => {
      const rec = parseRecording(fs.readFileSync(path.join(DIR, file), 'utf8'));
      const info = DETECTORS.find((d) => d.id === (rec.detector as DetectorId));
      expect(info, `onbekende detector "${rec.detector}"`).toBeDefined();
      const detector = info!.create();
      const tracker = new BodyTracker();
      for (const frame of recordingToFrames(rec)) detector.update(tracker.update(frame));
      const counted = detector.reading().count;
      const isHold = ['stoel', 'ster', 'vliegtuig'].includes(rec.detector);
      const margin = isHold ? 1.5 : Math.max(1, Math.round(rec.expected * 0.1));
      expect(Math.abs(counted - rec.expected), `geteld ${counted}, verwacht ${rec.expected} (±${margin})`).toBeLessThanOrEqual(margin);
    });
  }
});
