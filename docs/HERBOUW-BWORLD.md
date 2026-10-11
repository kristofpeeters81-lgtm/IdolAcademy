# Idol Academy → B-world: herbouwgids

> **Status:** skelet. Wordt na elk blok aangevuld en in blok 10 afgewerkt.
> **Doel (#33):** als de test goed bevonden wordt, wordt de app in B-world **herbouwd**, niet
> geïmporteerd. Deze gids is geschreven voor wie (mens of AI-tool) dat doet, op een ander toestel
> en zonder toegang tot deze conversatie.

## 1. Overzicht: overnemen of opnieuw bouwen
*(Blok 10)* Een tabel per onderdeel:
- **Letterlijk overnemen:** de bewegingsmotor (pose, normalisatie, detectoren, Power-score) en
  de bijhorende tests met opgenomen bewegingen. Die is puur TypeScript zonder React (#25/#33).
- **Logica overnemen, visuals opnieuw:** de minigames (spelregels, timings en
  leeftijdsdoelen blijven, het uiterlijk wordt B-world-stijl).
- **Opnieuw bouwen:** de app-schil, de menu's, de estafette-UI en de audio-stijl.

## 2. Vereisten in B-world *(blok 1, ingevuld)*

**Afhankelijkheden**
- `@mediapipe/tasks-vision` **exact `0.10.21`** (zonder `^`). Versies ≥ 1.0.0 sturen telemetrie
  naar `odml.pa.googleapis.com` (#35). Wil je opwaarderen, controleer dan eerst:
  `grep -Eaq "https?://[a-z0-9.-]*googleapis\.com|odml\.pa\.|clearcut" node_modules/@mediapipe/tasks-vision/vision_bundle.mjs`
  Er mag geen treffer zijn.
- De motor heeft verder geen afhankelijkheden. De schil gebruikt React (B-world heeft dat al).

**MediaPipe-bestanden (#36)**
| Bestand | Grootte | Waar | Hoe |
|---|---|---|---|
| `pose_landmarker_lite.task` | 5,8 MB | `public/mediapipe/models/` | uit deze repo kopiëren (SHA-256 in #36) |
| `pose_landmarker_full.task` | 9,4 MB | idem | idem |
| `vision_wasm_internal.{js,wasm}` + `_nosimd_` | ~13 MB per set | `public/mediapipe/wasm/` | script `scripts/copy-mediapipe.mjs` vóór dev/build, niet in git |
| `LICENSE.txt` (Apache 2.0) | — | `public/mediapipe/` | mee publiceren (#34) |

**CSP (aanvullen in B-world's bestaande CSP)**
- `script-src` + `'wasm-unsafe-eval'` (vereist voor WebAssembly; dit is géén `unsafe-eval`).
- `connect-src` moet `'self'` toelaten (MediaPipe laadt model en WASM met `fetch`).
- `media-src` + `mediastream:` en `blob:` voor het camerabeeld.
- `worker-src 'self' blob:`.
- De camera heeft https nodig (localhost is ook ok). Wil je een `Permissions-Policy`-header, laat
  dan `camera=(self)` toe.

**PWA / offline**
- Vooraf in de cache (precache): SIMD-WASM (`vision_wasm_internal.*`) + lite-model, ~19 MB
  eenmalig.
- Bij eerste gebruik in de cache (runtime-cache): full-model + no-SIMD-WASM. Zie de
  service-worker-plugin in `vite.config.ts`. In B-world (vite-plugin-pwa/Workbox) zet je dit om
  naar `globPatterns` + een `runtimeCaching`-regel voor `/mediapipe/`, en verhoog je
  `maximumFileSizeToCacheInBytes` naar ≥ 15 MB.

## 3. Bewegingsmotor *(blok 2, ingevuld)*

**Gegevensstroom**
```
camera → PoseEngine (MediaPipe) → PoseFrame (33 punten, 0..1, + aspect)
       → BodyTracker → BodyPose (beeldhoogte-eenheden, romplengte als schaal)
       → PresenceTracker / SpaceCheck / Detector.update(body) → reading()
```

**Publieke API (wat een game gebruikt)**
- `new PoseEngine(video, baseUrl)`: `.setMode('auto'|'lite'|'full')`, `.start()`,
  `.onFrame(cb)`, `.getStats()`, `.setAutoSwitchAllowed(bool)`, `.dispose()`.
- `new BodyTracker().update(frame)` → `BodyPose`.
- `DETECTORS` (register): `{ id, label, game, howTo, needs: 'full'|'upper', create() }`.
- `Detector`: `update(body)`, `reading()` → `{ count, unit, signal, thresholds, state, detail }`,
  `reset()`.
  - `DodgeDetector.current()` geeft de zone op dit moment (voor het moment dat een laserwand
    aankomt).
  - `EnergyMeter.energy` geeft de huidige energie (Power-score-basis).
- `new SpaceCheck(needs).update(body)` → `{ status, message, progress }`;
  `new PresenceTracker(needs).update(body)` → `'in'|'deels'|'weg'`.

**Spelregels voor het gebruik**
- Roep `detector.update` alleen aan als de ruimte-check klaar is en de speler niet `weg` is
  (zie `src/app/lab/Lab.tsx`).
- `engine.setAutoSwitchAllowed(false)` zodra een game start (#39).

**Normalisatie en drempels:** zie #37. Alle drempels staan als constanten bovenaan elk
detectorbestand.

**Een nieuwe beweging toevoegen**
1. Maak `src/motor/detectors/<naam>.ts` met een klasse die `Detector` implementeert. Gebruik
   `RepCounter` voor herhalingen en drempels in romplengtes.
2. Voeg hem toe aan `DETECTORS` in `detectors/index.ts` met `needs`.
3. Schrijf tests met `synthSequence`/`wave` uit `testing/synthPose.ts`: een geval dat moet
   tellen en minstens één valstrik die níet mag tellen.
4. Neem echte bewegingen op in het testlab en leg ze in `test-fixtures/`.

**Testen**
- `src/motor/**/*.test.ts` draaien met Vitest, zonder browser of camera.
- `test-fixtures/*.json`: echte opnames die automatisch afgespeeld worden
  (`fixtures.test.ts`, marge ±1/±10%). Kopieer ze mee naar B-world.
- `scripts/e2e.mjs`: headless Chrome met een nep-camera (`.y4m`-filmpje). Dat controleert ook
  de CSP en dat er geen externe verzoeken gebeuren.

## 4. Minigames
*(Blok 4, 6, 7)* Per game: de spelregels, de detector die gebruikt wordt, de timings, de
leeftijdsdoelen en de scoreformule. Ook wat in de test goed of slecht werkte.

## 5. Spelverloop en veiligheid
*(Blok 8)* De opwarming, de rustpauzeregel, de ruimte-check, uit beeld, en de estafette met
leeftijdsschaling.

## 6. Audio
*(Blok 5)* De opbouw van de beat-synthese, de geluidseffecten en de spraakcoach, met de
valkuilen per toestel.

## 7. Koppeling met B-world-data
*(Blok 10)* Advies: een gespeelde game als event in B-world's append-only `events`-tabel
(eventtype, payload). Te bevestigen met de B-world-beslissingen.

## 8. Testresultaten en lessen
*(Blok 1+, groeit mee)* Per toestel: fps, nauwkeurigheid per detector, en wat kinderen leuk
vonden. Plus wat je in B-world anders zou doen.

| Toestel | Model | Fps | Rekentijd | Opmerking |
|---|---|---|---|---|
| Android-gsm, Adreno 660 (high-end 2021), Chrome 154 | lite (GPU) | 33,7 | 28 ms | vlot; op 2–3 m hele lichaam in beeld; full niet gekozen (te krap) |

**Lessen tot nu toe:**
- Meet over een periode, niet als momentopname. Wie de knop indrukt, staat te dicht bij.
- Een high-end gsm draait lite op ~28 ms. Full is dus geen standaardkeuze op mobiel; lite is de
  basis.
- Laat het huidige model doordetecteren terwijl een ander laadt.
- Een model aanmaken blokkeert kort de hoofdthread. Kies het model dus vóór de game begint.

## 9. Stappenplan voor de herbouw
*(Blok 10)* Een genummerde checklist.
