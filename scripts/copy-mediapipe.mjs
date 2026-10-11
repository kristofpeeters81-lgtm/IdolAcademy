// Kopieert de MediaPipe-WASM-bestanden uit node_modules naar public/, zodat de app ze zelf
// serveert (#3): geen enkel bestand komt van Google's servers. Draait automatisch vóór dev/build.
// De modellen (.task) staan wél in git (public/mediapipe/models), zie docs/BOUWLOG.md blok 1.

import fs from 'node:fs';
import path from 'node:path';

const src = path.resolve('node_modules/@mediapipe/tasks-vision/wasm');
const dest = path.resolve('public/mediapipe/wasm');

if (!fs.existsSync(src)) {
  console.error('MediaPipe niet gevonden in node_modules — eerst `npm install` uitvoeren.');
  process.exit(1);
}
fs.mkdirSync(dest, { recursive: true });
for (const file of fs.readdirSync(src)) {
  // De "module"-variant gebruiken we niet (we laden de klassieke loader).
  if (file.includes('_module_')) continue;
  fs.copyFileSync(path.join(src, file), path.join(dest, file));
}
console.log(`MediaPipe-WASM gekopieerd naar ${path.relative(process.cwd(), dest)}`);
