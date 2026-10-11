import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Content-Security-Policy (#4): de browser blokkeert elke verbinding naar een ander domein.
 * - `connect-src 'self'`: MediaPipe haalt zijn model en WASM met fetch op, maar enkel van onze eigen site.
 * - `'wasm-unsafe-eval'`: nodig om WebAssembly te mogen starten (géén gewone eval).
 * Enkel in de build: de ontwikkelserver heeft een websocket nodig.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob: mediastream:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'idol-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`);
    },
  };
}

/**
 * Service worker voor offline gebruik.
 * - Vooraf bewaard (precache): de app zelf, de SIMD-WASM en het lite-model (~19 MB, eenmalig).
 * - Bij eerste gebruik bewaard (runtime-cache): het full-model en de no-SIMD-WASM voor oude toestellen.
 * De cache-versie volgt automatisch uit de lijst bestanden + hun grootte.
 */
function serviceWorkerPlugin(): Plugin {
  return {
    name: 'idol-sw',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map'));
      const extra = [
        'manifest.webmanifest',
        'icon.svg',
        'mediapipe/wasm/vision_wasm_internal.js',
        'mediapipe/wasm/vision_wasm_internal.wasm',
        'mediapipe/models/pose_landmarker_lite.task',
      ];
      const all = ['./', ...files.map((f) => `./${f}`), ...extra.map((f) => `./${f}`)];
      const sizes = extra.map((f) => fs.statSync(path.resolve('public', f)).size).join(',');
      const version = createHash('sha256').update(all.join('|') + sizes).digest('hex').slice(0, 12);
      const sw = `// Idol Academy service worker — gegenereerd bij de build. Bewaart de app voor offline gebruik.
const CACHE = 'idol-${version}';
const FILES = ${JSON.stringify(all)};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('idol-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      // Andere pagina's (bv. /stijl/): eerst het netwerk; enkel offline terugvallen op de app.
      if (e.request.mode === 'navigate') return fetch(e.request).catch(() => caches.match('./'));
      return fetch(e.request).then((res) => {
        if (res.ok && /\\/mediapipe\\//.test(e.request.url)) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      });
    }),
  );
});
`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: sw });
    },
  };
}

/** Getoond in de app en het meetrapport: zo weet je welke versie een toestel getest heeft. */
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { version: string };
const APP_VERSION = `${pkg.version}-${process.env.GITHUB_SHA?.slice(0, 7) ?? 'lokaal'}`;

export default defineConfig({
  // Relatieve paden: werkt op GitHub Pages onder /IdolAcademy/.
  base: './',
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  plugins: [react(), cspPlugin(), serviceWorkerPlugin()],
  // Eigen vaste poorten, zodat een service worker van een ander project niet in de weg zit.
  server: { port: 5327, strictPort: true },
  preview: { port: 4327, strictPort: true },
  build: {
    target: 'es2020',
    // Geen polyfill die modules via fetch() laadt.
    modulePreload: { polyfill: false },
  },
});
