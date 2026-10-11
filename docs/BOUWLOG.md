# Idol Academy — Bouwlog

Logboek per bouwblok, nieuwste onderaan. Dit is de bron voor "hoe is de app gebouwd". Elk
blok gebruikt het sjabloon hieronder. Verwijs naar beslissingen met hun nummer (bv. #25).

## Sjabloon

```markdown
## Blok N — <titel>  (datum start → datum afgetekend)

**Doel:** wat dit blok moest opleveren.
**Gebouwd:** wat er effectief staat, in gewone taal.
**Hoe het werkt:** de technische aanpak, inclusief de kern-algoritmes en drempelwaarden.
**Bestanden:** nieuw/gewijzigd, met één regel uitleg per bestand.
**Beslissingen:** nieuwe of gewijzigde beslissingen (#...).
**Getest:** automatische tests + resultaten van Kristofs test op het toestel (toestel, fps, bevindingen).
**Problemen en oplossingen:** wat misliep en hoe het opgelost is.
**Les voor B-world:** wat je bij de import moet weten of overnemen.
```

---

## Blok 1 — Fundament  (2026-10-11 → wacht op test door Kristof)

**Doel:** bewijzen dat de basis werkt: camera in de browser, MediaPipe volledig zelf-gehost
onder een strenge CSP, een skelet dat het lichaam volgt, en meetbare prestaties op echte
toestellen. Dit is het go/no-go-moment voor het hele project.

**Gebouwd:**
- Een startscherm met uitleg en een knop "Start camera". De knop is nodig, omdat browsers (zeker
  iOS) camera en geluid pas na een tik toelaten.
- Een camerabeeld (gespiegeld bij de frontcamera) met het skelet erover.
- Een hint "Ga zo staan dat je helemaal in beeld bent (x/9)" zolang niet alle 9 kernpunten
  zichtbaar zijn.
- Een **meetpaneel** (inklapbaar tot een fps-bolletje) met:
  - detectie-fps, camera-fps, rekentijd per beeld;
  - model, rekenkern (GPU/CPU), laadtijd, resolutie en zichtbare lichaamspunten;
  - knoppen: model `auto/lite/full`, `480p/720p`, camera `voor/achter`, skelet aan/uit;
  - **Meetrapport**: een JSON met de toestelgegevens en metingen, om te kopiëren en door te
    sturen.
- PWA: manifest, offline service worker, en het scherm blijft aan (Wake Lock).
- Publicatie via GitHub Actions naar GitHub Pages, met veiligheidscontroles.

**Hoe het werkt:**
- *Lagen (#25/#33):* `src/motor/` is puur TypeScript zonder React. `src/app/` is de React-schil.
  Alleen `poseTracker.ts` kent MediaPipe. De rest werkt met eigen types (`Landmark`, `PoseFrame`).
- *Lus:* `PoseEngine` draait op `requestAnimationFrame`. Enkel als het videobeeld veranderd is
  (`video.currentTime`) wordt er gedetecteerd. Detectie gebeurt synchroon op de hoofdthread
  met `detectForVideo` (VIDEO-modus, `numPoses: 1`, alle drempels 0,5). Het resultaat gaat naar
  listeners. Het skelet wordt buiten React om getekend, en React ververst enkel het meetpaneel
  (4×/s).
- *Tijdstempels:* MediaPipe vereist strikt stijgende tijdstempels in hele microseconden. Daarom
  gebruiken we gehele ms die altijd ≥ 1 ms stijgen (`timestamps.ts`).
- *GPU → CPU:* `PoseTracker.create` probeert eerst de GPU-delegate en valt bij een fout terug op
  CPU.
- *Opwarmbeeld:* na het laden van een model wordt meteen één beeld verwerkt. Op de GPU duurt dat
  eerste beeld 0,5–1 s (shaders compileren). Zo valt die hapering tijdens het laden en niet
  tijdens het spel, en telt ze niet mee in de cijfers.
- *Auto-modelkeuze (`modelChoice.ts`):* het model start op lite. Na ≥ 4 s meten gebeurt het
  volgende:
  - als lite ≥ 24 fps haalt én ≤ 15 ms rekentijd heeft, wordt opgewaardeerd naar full;
  - als full onder 15 fps zakt, gaat het terug naar lite, en daarna wordt full nooit meer
    geprobeerd (geen heen-en-weer).
  - Een modelwissel blokkeert ~0,5–1 s. In latere blokken moet de keuze dus vallen tijdens de
    ruimte-check of opwarming, niet midden in een game (genoteerd voor blok 2/8).
- *Meten:* `RateMeter` telt gebeurtenissen per seconde over een glijdend venster van 1 s.
  `RollingAverage` middelt de rekentijd over de laatste 30 beelden.
- *Uitlijning:* video en canvas zitten in hetzelfde `.frame` met `aspect-ratio` = de
  camera-verhouding. Het canvas krijgt de pixelgrootte van de camera, en de spiegeling gebeurt
  met CSS op het frame. Het tekenen gebruikt dus gewoon `x * breedte`.
- *Privacy (#4):* de CSP in de build is `connect-src 'self'` + `script-src 'self'
  'wasm-unsafe-eval'`. Alle MediaPipe-bestanden komen van de eigen site.

**Bestanden:**
| Bestand | Wat |
|---|---|
| `src/motor/types.ts` | `Landmark`, `PoseFrame`, `ModelVariant`, `Delegate` |
| `src/motor/landmarks.ts` | indexen van de 33 punten, skeletlijnen, "hele lichaam zichtbaar"-telling |
| `src/motor/camera.ts` | camera starten/stoppen, fouten vertaald naar codes, iOS-attributen |
| `src/motor/poseTracker.ts` | het enige MediaPipe-bestand: laden (GPU→CPU) en detecteren |
| `src/motor/timestamps.ts` | strikt stijgende tijdstempels |
| `src/motor/poseEngine.ts` | detectielus, listeners, metingen, auto-modelkeuze, opwarmbeeld |
| `src/motor/modelChoice.ts` | pure beslisregel lite/full |
| `src/motor/stats.ts` | `RateMeter`, `RollingAverage` |
| `src/motor/motor.test.ts` | 25 unit tests |
| `src/app/App.tsx` | startscherm |
| `src/app/Stage.tsx` | camerabeeld + skelet + levenscyclus camera/motor + Wake Lock |
| `src/app/DebugPanel.tsx` | meetpaneel en meetrapport |
| `src/app/drawSkeleton.ts`, `report.ts`, `messages.ts`, `styles.css` | tekenen, rapport, foutteksten, voorlopige stijl |
| `vite.config.ts` | CSP-plugin, service-worker-plugin, versienummer |
| `scripts/copy-mediapipe.mjs` | WASM uit npm naar `public/` (vóór dev/build) |
| `scripts/e2e.mjs` | eind-tot-eind-test in headless Chrome met nep-camera |
| `public/mediapipe/` | modellen + licentietekst (#36) |
| `.github/workflows/pages.yml` | tests → build → veiligheidscontroles → publicatie |

**Beslissingen:** #35 (MediaPipe vastgepind op 0.10.21), #36 (hoe de MediaPipe-bestanden in de
app komen). Beide nog voorlopig.

**Getest:**
- 25 unit tests groen. De build is typecheck-schoon.
- E2E (`npm run e2e`): headless Chrome met als nep-camera een filmpje van een 3D-figuur die
  jumping jacks doet (Wikimedia Commons, CC BY-SA, enkel lokaal gebruikt, niet in de repo). Alle
  controles slagen:
  - de CSP staat in de pagina en er zijn geen CSP-schendingen;
  - er gaat geen enkel verzoek naar een ander domein en er zijn geen consolefouten;
  - er wordt een lichaam gevonden na ~6 s (9/9 punten);
  - wisselen naar full en terug naar lite lukt;
  - het meetrapport wordt opgebouwd.
- Laptop (headless, GPU via SwiftShader/ANGLE): lite en full ~13 ms rekentijd, beperkt door de
  nep-camera.
- Gepubliceerd: versie `0.1.0-6632e3a` staat live op https://kristofpeeters81-lgtm.github.io/IdolAcademy/.
  Alle CI-controles zijn groen, de CSP staat in de live pagina, en de modellen, WASM en licentie
  geven allemaal HTTP 200 met de juiste grootte.
- **Nog te doen door Kristof:** recente Android-gsm, oude Android-tablet, laptop met echte
  webcam. Per toestel het meetrapport kopiëren en doorsturen.

**Problemen en oplossingen:**
1. **Telemetrie in MediaPipe 1.1.0** → vastgepind op 0.10.21. De CSP blokkeerde het al. Zie #35.
2. **"Packet timestamp mismatch"**: MediaPipe liep vast nadat het opwarmbeeld een tijdstempel
   gebruikte die later lag dan het volgende `requestAnimationFrame`-tijdstip. Mijn stap van
   +0,001 ms werd intern weggerond. Opgelost met gehele ms die altijd +1 stijgen, met een
   regressietest.
3. **Vertekende rekentijd na een modelwissel** (eerste beeld ~750 ms) → opgelost met het
   opwarmbeeld.
4. Op één beeld klapte het full-model het skelet van de *gezichtsloze* 3D-pop in elkaar (lite
   deed het goed). Waarschijnlijk komt dat door het testfilmpje: het model leunt deels op het
   gezicht. **Controleren met echte kinderen.**

**Les voor B-world:**
- Neem `src/motor/` letterlijk over. Er zit geen React in.
- Pin MediaPipe exact vast en voer de telemetrie-grep uit vóór elke upgrade (#35).
- De CSP heeft `'wasm-unsafe-eval'` nodig, en `connect-src 'self'` volstaat.
- Precache in de service worker de SIMD-WASM + het lite-model (~19 MB). Het full-model en de
  no-SIMD-WASM worden pas bewaard bij het eerste gebruik.
- Laat een modelwissel nooit midden in een game gebeuren (hapering van ~0,5–1 s).
