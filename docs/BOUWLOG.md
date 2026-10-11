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

### Blok 1 — toesteltest 1 + bijsturing (2026-10-11)

**Toestel:** Android-gsm met Qualcomm Adreno 660 (Snapdragon 888-klasse, high-end uit 2021),
4 GB RAM, Chrome 154. Chrome toont in de userAgent bewust geen exact model ("Android 10; K"),
dus merk en model zijn onbekend. Camera: frontcamera, **480×640 = gsm staand** (niet liggend
zoals de uitleg aanraadt).

| Meting | Waarde | Betekenis |
|---|---|---|
| Detectie-fps | 33,7 (= camera-fps) | elk camerabeeld wordt verwerkt, ruim speelbaar |
| Rekentijd lite (GPU) | 28–29 ms | marge tot ~35 fps; het toestel is dus niet "ruim" |
| Auto-modelkeuze | bleef op lite | correct: 28 ms > drempel 15 ms voor full |
| Laadtijd model | 3,5 s | eerste keer, inclusief WASM-start |
| Zichtbare punten | 6/9 en 3/9 | momentopname bij het tikken op de knop (zie hieronder) |

**Bevinding van Kristof:** "dit lijkt vlot te werken". Dichter bij het toestel worden minder punten
gedetecteerd, omdat het lichaam niet meer volledig in beeld is. Op 2–3 m is het OK.

**Analyse:**
- 6/9 en 3/9 is géén detectieprobleem. Wie op "Meetrapport" tikt, staat noodzakelijk vlak bij het
  toestel. De momentopname meet dus altijd het slechtste moment.
- Dichterbij = minder punten is de fysica van één camera. Dat wordt in blok 2 opgevangen:
  1. de ruimte-check leidt het kind naar de juiste afstand;
  2. elke detector/game declareert welke punten hij nodig heeft. Games die enkel het
     bovenlichaam gebruiken (bv. Beat Punch, Lightstick Catch met handen) kunnen dan ook op
     ~1,5 m gespeeld worden, en enkel games met benen/sprongen vragen 9/9.
- Een staande gsm toont meer hoogte en dus sneller het hele lichaam op korte afstand. Liggend is
  breder (zijstappen, Laser Stage). Dit wordt een keuze per game, te bekijken in blok 2.

**Aangepast na deze test:**
1. **Meetrapport en meetpaneel tonen nu ook de laatste minuut** (`src/motor/sessionStats.ts`):
   - gemiddelde fps en de traagste volledige seconde;
   - gemiddelde en p95-rekentijd;
   - % beelden met het hele lichaam in beeld, en het "meestal zichtbare" aantal punten.
   Plus de schermstand (staand/liggend) bij de camera. Zo vertekent het tikken op de knop de
   meting niet meer.
2. **Bug gevonden dankzij die samenvatting:** tijdens het laden van een ander model (bv. de
   auto-opwaardering naar full) stopte de detectie volledig. Nu blijft het huidige model
   detecteren tot het nieuwe klaar en opgewarmd is. Traagste seconde bij full in de e2e: van
   3 naar 23 fps.
3. In de samenvatting telde de eerste seconde eerst niet mee voor "traagste seconde", waardoor
   het gemiddelde lager kon liggen dan het minimum. Rechtgezet, met een regressietest. De tests
   gaan van 25 naar 32.

**Nog open (→ blok 2):** een model *aanmaken* blokkeert de hoofdthread kort (shaders, graaf).
De auto-modelkeuze moet dus gebeuren tijdens de ruimte-check/opwarming, nooit tijdens een game.
Als dat niet volstaat, is MediaPipe in een Web Worker de volgende stap.

**Nog te testen:** de oude Android-tablet (de echte ondergrens, go/no-go) en een laptop met
echte webcam.

---

## Blok 2 — Bewegingsmotor + testlab  (2026-10-11 → wacht op test door Kristof)

**Doel:** de bewegingen uit de acht games herkennen en tellen, met een ruimte-check en een pauze
bij uit beeld, en dat meetbaar maken met opnames van echte bewegingen (#21, #31).

**Gebouwd:**
- **Normalisatie** (`body.ts`): punten in beeldhoogte-eenheden, en een stabiele romplengte als
  schaal.
- **Detectoren** (`src/motor/detectors/`):

  | Detector | Game | Meet | Telt |
  |---|---|---|---|
  | `squat` | Jump Squad | dijbeen-verkorting (diepte) + enkels van de vloer | squats, sprongsquats als bonus |
  | `knieen` | Spotlight Sprint | knieheffing per been t.o.v. de heup | stappen, tempo/min, links/rechts |
  | `jumpingjack` | opwarming | 60% armen + 40% voetspreiding | jumping jacks |
  | `stoot` | Beat Punch | reikwijdte schouder↔pols, snel gestrekt | stoten links/rechts/omhoog |
  | `klim` | Sky Climb | hand boven het hoofd, afwisselend | klimstappen, knie mee als bonus |
  | `stoel`/`ster`/`vliegtuig` | Freeze Pose | voorwaarden per houding | seconden vastgehouden, langste reeks |
  | `ontwijk` | Laser Stage | schouders omlaag / enkels omhoog / heupen opzij | zone + aantal ontwijkingen |
  | `energie` | Power-score | gemiddelde gewrichtssnelheid (romp/s) | werk; zone rustig→explosief |

- **Aanwezigheid** (`presence.ts`): in / deels / weg. Pas na 0,8 s weg volgt een pauze, zodat één
  gemist beeld niets doet.
- **Ruimte-check** (`spaceCheck.ts`): één tip tegelijk (achteruit, dichterbij, naar het midden,
  voeten in beeld…) en "klaar" na 1,5 s aan één stuk goed staan. Afhankelijk van
  `full`/`upper` (#38).
- **Opnames** (`recording.ts`) + **fixture-runner** (`fixtures.test.ts`) (#40).
- **Raken** (`hit.ts`, `targetPractice.ts`): handen en voeten in *schermcoördinaten* (rekening
  houdend met spiegelen) + "raakt een doel?". In het testlab: de oefening "Raken", telkens één
  doel om aan te tikken. Dat is een proef voor Lightstick Catch, en meteen de controle dat
  links/rechts klopt met wat het kind ziet. Opnemen is daar uitgeschakeld, omdat doelen
  willekeurig zijn en dus niet af te spelen.
- **Testlab** (`src/app/lab/`): bewegingskeuze, grote teller, toestand, signaalgrafiek met
  drempels, energie, reset, en opnemen met 5 s aftellen en een bewaardialoog.
- Motor: `setAutoSwitchAllowed`, zodat een modelwissel enkel tijdens de ruimte-check gebeurt
  (#39). `PoseFrame` heeft nu `aspect`.
- `Stage` toont nu een scherm bovenop het camerabeeld (render-prop `children`), en het meetpaneel
  staat standaard ingeklapt.

**Hoe het werkt (kern):**
- *Hysterese* (`RepCounter`): een herhaling telt pas als het signaal boven `enter` komt én
  daarna terug onder `exit` zakt, met een minimale duur. Trillen rond één drempel telt dus nooit
  dubbel.
- *Rechtop-referentie* (`WindowMax`): het maximum over 10 s via een monotone deque.
- *Van voren meten* (#37): diepte en heffing via dijbeen-verkorting, niet via een 2D-kniehoek.
- *Stoten:* van voren is een stoot recht naar de camera onzichtbaar. Daarom telt een snelle
  strekking (< 0,7 → > 0,95 romp binnen 0,5 s) met de hand boven heuphoogte en niet naar
  beneden. Armen laten hangen of traag strekken telt niet.
- *Ontwijken:* de referentie "rechtop in het midden" schuift traag mee zolang je in het midden
  staat.
- Alle drempels staan als constanten bovenaan elk bestand (`SQUAT`, `HIGH_KNEES`, `PUNCH`,
  `CLIMB`, `HOLD`, `DODGE`, `ENERGY`, `SPACE`, `PRESENCE`), zodat ze makkelijk af te stellen
  zijn met de opnames.

**Bestanden:**
| Bestand | Wat |
|---|---|
| `src/motor/body.ts` | `BodyTracker`, `BodyPose`, meetkunde-hulpjes |
| `src/motor/detectors/common.ts` | `Detector`-interface, `RepCounter`, `WindowMax`, `CadenceMeter` |
| `src/motor/detectors/{squat,highKnees,jumpingJack,punch,climb,hold,dodge,energy}.ts` | de detectoren |
| `src/motor/detectors/index.ts` | register met label, game, uitleg en `needs` |
| `src/motor/presence.ts`, `spaceCheck.ts` | aanwezigheid, ruimte-check |
| `src/motor/recording.ts` | opnameformaat, opbouwen, teruglezen, bestandsnaam |
| `src/motor/testing/synthPose.ts` | synthetisch poppetje (2D-projectie van voren) voor tests |
| `src/motor/detectors/detectors.test.ts`, `guidance.test.ts`, `fixtures.test.ts` | tests |
| `src/app/lab/Lab.tsx`, `Sparkline.ts` | testlab |
| `test-fixtures/README.md` | hoe opnames daar komen, privacy |

**Beslissingen:** #37–#41 (voorlopig).

**Getest:**
- **81 unit tests.** Elke detector krijgt nagebootste bewegingen met een bekend aantal, plus
  "valstrikken" die níet mogen tellen:
  - knikje, springen bij knieheffen, enkel armen bij jumping jacks;
  - armen laten hangen of traag strekken bij stoten;
  - steeds dezelfde hand bij klimmen;
  - ster met de armen omlaag.
  Ook de ruimte-check-tips, de pauzevertraging en het opname-formaat zitten erin.
- **E2E** (headless Chrome met het jumping-jack-testfilmpje):
  - de ruimte-check wordt klaar;
  - het testlab telt **3 jumping jacks in ~9 s, en dat klopt**: het filmpje bevat ~3 echte
    jumping jacks per lus van 8 s, en daarna zwaait de figuur met één arm, wat terecht níet
    telt;
  - opnemen (10 s) → dialoog → download → geldig bestand (540 beelden, 538 KB bij ~54 fps
    headless);
  - geen CSP-schendingen, geen externe verzoeken, geen consolefouten;
  - opmaak gecontroleerd op laptop en op gsm-formaat (staand).
- **Toesteltest Kristof (2026-10-11):** "de jump squads leken alvast ok" (squat-detector in het
  testlab). De andere bewegingen zijn nog niet getest, en er zijn nog geen opnames.
- **Nog te doen door Kristof:** de andere bewegingen testen en per beweging minstens één opname
  met het echte aantal maken (zie `test-fixtures/README.md`).

**Problemen en oplossingen:**
1. *Ontwerp:* de 2D-kniehoek bleek van voren onbruikbaar, dus gekozen voor dijbeen-verkorting
   (#37). Dat werd al vóór de bouw gezien, niet pas achteraf.
2. *Test:* één knieheffingstest faalde (19 i.p.v. 20). Oorzaak: de nagebootste reeks stopte
   midden in de laatste stap. Dat was een fout in de test, niet in de detector; de test is
   aangepast.
3. *E2E:* naar "mobiel" omschakelen in Puppeteer herlaadt de pagina. Daarom wordt enkel de
   schermgrootte aangepast.
4. *Ruimte-check bovenlichaam (gevonden door de e2e):* bij "Raken" vroeg de check "kom
   dichterbij" aan iemand op de gewone afstand. "Bovenlichaam volstaat" moet betekenen dat
   dichterbij *mag*, niet dat het *moet*. De ondergrens is verlaagd (0,3 → 0,2 van de
   beeldhoogte voor hoofd→heupen), met een test die de gewone afstand voor beide soorten goed
   keurt.
5. *Energie hing af van de beeldsnelheid (gezien op een screenshot):* de energie berekende
   snelheid van beeld tot beeld. Het normale trillen van de punten, gedeeld door een heel klein
   tijdsverschil, gaf schijnbaar veel energie: "explosief" (7,5) bij rustig armzwaaien in de
   e2e op ~56 fps. Nu wordt de verplaatsing gemeten over ~100 ms. Twee nieuwe tests:
   - stilstaan met realistisch trillen blijft "rustig" op 15, 30 én 60 fps;
   - dezelfde beweging geeft op 15 en 60 fps hetzelfde (±25%).
   Gecontroleerd dat de oude code voor die test zakt (0,72 op 30 fps).

**Open punten:**
- De drempels zijn een eerste inschatting. Ze worden afgesteld met echte opnames van kinderen.
- De zones van de bewegingsenergie zijn voorlopig. In de e2e piekte de energie tot ~6,9
  ("explosief") bij een 3D-figuur die schokkerig beweegt; afstellen in blok 4 (#26).
- Floor Crawl (krab/beren-loop, experimenteel) heeft nog geen detector → blok 7.

**Les voor B-world:**
- Neem `src/motor/` (incl. `detectors/`, `testing/` en de tests) letterlijk over. Er zit geen React
  in.
- Neem `test-fixtures/` mee: dat zijn de echte bewegingen waarop de drempels afgesteld zijn.
- Meet van voren nooit met 2D-hoeken voor bewegingen in de diepte (#37).

---

## Blok 3 — Stijlvoorbeeld  (2026-10-11 → ✅ stijl A gekozen, #43)

**Doel:** de visuele stijl laten kiezen *vóór* er iets in de app ingebouwd wordt (#22).

**Gebouwd:** één los voorbeeldblad, `public/stijl/index.html` (live onder `/stijl/`), dat niet aan
de app gekoppeld is. Het toont twee stijlrichtingen naast elkaar (A Neon Stage, B Holo Pop, zie
#42). Op gsm staan ze onder elkaar.

**Hoe het werkt:**
- *Eén HTML-bestand:* alle CSS inline, met een eigen CSP (`connect-src 'none'`). De
  lettertypes zitten mee in `public/stijl/fonts/` (Unbounded, Outfit en Poppins, latin, ~130 KB,
  OFL 1.1 met licentietekst). Er is dus geen verbinding met Google Fonts (#4).
- *Thema's als CSS-variabelen* (`.theme-a`, `.theme-b`): dezelfde HTML-structuur krijgt een
  andere look. Daardoor wordt het inbouwen later eenvoudig: één set tokens kiezen.
- *De coach Lumi* is één SVG-`<symbol>`. Haar, huid, outfit en accenten komen uit
  CSS-variabelen, die via `<use>` doorerven, zodat dezelfde tekening in beide thema's past.
- *De HUD-mockup* schaalt met container query units (`cqw`), zodat de verhoudingen gelijk blijven
  van gsm tot tv.
- `scripts/screenshot.mjs`: maakt een screenshot van een pagina uit `dist/`. Dat is gebruikt om
  het blad op desktop (1280 px) en gsm (360/400 px) na te kijken.

**Getest/nagekeken:**
- Screenshots op desktop en gsm bekeken.
- Gevonden en opgelost: het woordmerk "ACADEMY" viel op een smalle gsm buiten het kader
  (kleiner gemaakt), er stond een dubbel SVG-attribuut, en een 404 op het tabblad-icoon.
- Geen consolefouten en geen externe verzoeken.
- **Service-worker-bug gevonden en opgelost:** de offline-worker beantwoordde *elke*
  paginanavigatie met de opgeslagen app. Op een toestel waar de app al eens open was, toonde
  `/stijl/` dus de app. Nu gaan andere pagina's eerst naar het netwerk, en enkel offline volgt de
  terugval op de app. Er is een e2e-controle bijgekomen: app openen, service worker actief,
  `/stijl/` toont het stijlvoorbeeld.

**Volgende stap:** Kristof kiest (#42). Daarna wordt de stijl als tokens + componenten in de app
gebouwd, samen met de eerste echte game (blok 4).

**Les voor B-world:** B-world heeft een eigen stijl (agenten), dus dit blad is vooral een
voorbeeld van de *aanpak*. Thema-tokens als CSS-variabelen, en één SVG-personage waarvan de
kleuren via variabelen wisselen, zijn in B-world even bruikbaar.

---

## Blok 4 — Eerste game: Spotlight Sprint  (2026-10-11 → wacht op test door Kristof)

**Doel:** één game volledig van begin tot eind, in stijl A (#43), als sjabloon voor de andere
zeven.

**Gebouwd:**
- **Stijl A in de app:** tokens, lettertypes (gebundeld) en knoppen. De lab-, debug- en
  dialoogknoppen gebruiken bewust het gewone lettertype (compacter).
- **Startscherm** (`Home.tsx`): Lumi, het woordmerk, leeftijdskeuze 6–13+ (#46), de 8
  gamekaarten (enkel Spotlight Sprint speelbaar, de rest "Binnenkort") en een knop naar het
  testlab.
- **Spellogica** (`src/games/`, zonder React):
  - `types.ts`: `GameSession` (update/view/result), `GameView`, `GameResult`, `GameInfo`;
  - `scoring.ts`: leeftijden, `goalFor`, `percentOf`, `starsFor`, `ZoneTimer`;
  - `spotlightSprint.ts`: spelregels, mijlpalen, Lumi-teksten (#45);
  - `catalog.ts`: de acht games.
- **Spelverloop** (`GameRunner.tsx`, #44): uitleg → ruimte-check → aftellen → spelen (pauze bij
  uit beeld) → resultaat.
- **HUD** (`Hud.tsx`): timer-ring (rood in de laatste 5 s), grote teller, Power-meter met 4
  zones, Lumi met tekstballon, en popups ("PERFECT!").
- **Spotlight** (`SpotlightBeam.tsx`): lichtbundel + vulmeter.
- **Resultaat** (`ResultScreen.tsx`): sterren, aantal, % van het doel, een balk met de tijd per
  Power-zone, beste tempo, % intens/explosief, links/rechts, en Lumi's reactie.
- Knieheffingsdetector: `steps`, `tempo` en `perLeg` als getallen (geen tekst meer ontleden).
- Het fps-bolletje van het meetpaneel staat in een game onderaan in het midden (rechtsboven
  staat de teller), en in het testlab rechtsboven.

**Hoe het werkt:**
- De game krijgt per beeld `update(body, playing)`. `playing` is enkel waar in de fase
  "spelen" en als de speler niet `weg` is. De tijd loopt met de tijdstempels van de beelden,
  met max. 200 ms per stap, zodat een hapering de klok niet laat verspringen.
- De React-schil vraagt 10×/s `view()` op. Gebeurtenissen (popups) worden daarbij één keer
  afgegeven en na 1,3 s weer weggehaald.
- Faseovergangen gebeuren vanuit de beeld-callback. De fase wordt meteen in een ref vastgezet,
  zodat het volgende beeld dezelfde overgang niet opnieuw start.

**Bestanden:** `src/games/{types,scoring,spotlightSprint,catalog}.ts` + `games.test.ts`;
`src/app/{Home,CoachLumi,GameIcon,storage}.tsx|ts`;
`src/app/game/{GameRunner,Hud,SpotlightBeam,ResultScreen}.tsx`; `src/app/fonts/`; `styles.css`
(stijl A).

**Beslissingen:** #43 (beslist), #44–#46 (voorlopig).

**Getest:**
- **89 unit tests** (+8). Spotlight Sprint met nagebootst knieheffen:
  - telt ~80 stappen in 20 s bij 4 stappen/s, en stopt exact na 20 s;
  - de mijlpalen komen in de juiste volgorde;
  - 5 s pauze laat de klok stilstaan;
  - stilstaan levert 0 sterren op.
  Daarnaast de scoreregels en de catalogus.
- **E2E**: een volledige ronde op het startscherm (leeftijd kiezen → kaart → uitleg → "Ik ben
  klaar!" → ruimte-check → aftellen → HUD → resultaat na 20 s), naast alle eerdere controles.
  Het testfilmpje (jumping jacks) haalt **0 stappen**, en dat is juist: jumping jacks zijn geen
  knieheffingen. **Echte knieheffingen in de game moeten nog getest worden.**
- Screenshots van het startscherm, de uitleg, het spelen en het resultaat bekeken. Het
  fps-bolletje viel over de teller en is verplaatst.

**Open punten:**
- De leeftijdsdoelen (#45) en de Power-zones (#26) zijn inschattingen. Afstellen met opnames.
- Geluid en de gesproken Lumi volgen in blok 5.

**Les voor B-world:** neem `src/games/` over (spelregels, scores, sessie-interface). De React-schil
(`src/app/game/`) toont hoe je het verloop opbouwt, maar de visuals worden in B-world opnieuw
gemaakt.

---

## Blok 5 — Geluid: beat, effecten en Lumi's stem  (2026-10-11 → wacht op test door Kristof)

**Doel:** de games laten klinken als een dansgame, met een coach die je hoort van op 2–3 m (#17).

**Gebouwd (`src/audio/`, zonder React):**
- `music.ts` (puur): akkoorden, ritmepatronen per laag, tempo per zone (#47).
- `synth.ts`: instrumenten (kick, clap, hihat, bas, supersaw-akkoord, pluck) en 10
  geluidseffecten, alles met oscillatoren en ruis.
- `speech.ts` (puur): stemkeuze enkel lokaal (#48), `SpeechGate` (dosering), uitspreekbare tekst.
- `director.ts`: één `audio`-object met `unlock`, `sfx`, `startMusic`/`stopMusic`, `setLevel`,
  `setPaused`, `say`, en `setSound`/`setVoice`. Een planner met 120 ms vooruitkijken, een
  begrenzer op de uitgang, en ducking.

**In de app:**
- `src/app/game/useGameAudio.ts` koppelt het spelverloop aan geluid en stem (#49). Het luistert
  enkel naar wat de game al toont (fase, teller, zone, popups, aanwezigheid), dus de spellogica
  weet niets van geluid.
- `SoundSettings.tsx`: knoppen "Muziek & geluid" en "Stem van Lumi" op het startscherm,
  onthouden per toestel, met een melding als er geen lokale stem is.

**Getest:**
- **99 unit tests** (+10): lagen per zone, four-on-the-floor, akkoordvolgorde, geleidelijk tempo,
  noot/tijd-omrekening, stemkeuze (lokaal voor online, nl-BE voor nl-NL, `nl_BE`), dosering en
  uitspraak.
- **E2E:** tijdens het spelen draait de AudioContext (*running*) en komen er +33 klanken bij in
  2 s, dus de muziek loopt. De headless browser vond lokaal "Microsoft Frank - Dutch".
- **Beat gerenderd** (`scripts/render-beat.mjs` → `e2e-output/beat.wav`): geen oversturing,
  lagen zichtbaar in het spectrogram. Het muziekvolume is daarna verhoogd.
- **Nog niet beluisterd door een mens**, en de stem is niet op Android getest.

**Problemen en oplossingen (tijdens het bouwen):**
1. Een normale zin werd als "gezegd" geregistreerd, ook als hij werd overgeslagen omdat Lumi nog
   praatte. De volgorde van de controles is omgedraaid.
2. Het einde van een zin zette de muziek terug luid, ook tijdens een pauze. Er zijn nu aparte
   redenen voor "zacht".
3. De e2e-drempel "> 50 klanken" was te hoog voor de rustigste zone. Nu wordt gemeten of er
   klanken *bij komen*.

**Les voor B-world:** `src/audio/music.ts` en `speech.ts` zijn puur en direct herbruikbaar. Hou de
regel "enkel lokale stemmen" aan, zeker zodra er namen uitgesproken worden.

---

## Blok 6 — Lightstick Catch, Beat Punch, Laser Stage  (2026-10-11 → wacht op test door Kristof)

**Doel:** de drie cardio-games die nog ontbraken (#12), op het sjabloon van blok 4.

**Gebouwd:**
- `src/games/core.ts`: **GameCore**, de gedeelde spelkern (#51.5). Spotlight Sprint is erop
  omgebouwd.
- `src/games/lightstickCatch.ts`, `beatPunch.ts`, `laserStage.ts`: de spelregels (#50).
- `GameContext` (spiegeling, verhouding, toeval) bij het aanmaken van een game. `GameScene`:
  wat er over het beeld getekend wordt, per game een type.
- `PunchDetector.takePunches()`: stoten met tijd en richting, voor games op timing.
- App:
  - `Scenes.tsx`: lightsticks met een "levensring", stootdoelen met een krimpende ring en
    RAAK/PERFECT/MIS, laserwanden met instructie en ONTWEKEN!/AU!;
  - `useFrameRect.ts`: positie van het camerabeeld in pixels.
- Geluid: nieuwe effecten "raak" en "mis"; vast tempo voor Beat Punch; dringende
  coach-instructies worden meteen uitgesproken (`coachUrgent`); de stap-tik klinkt enkel nog bij
  Spotlight Sprint.

**Getest:**
- **108 unit tests** (+9). Per game speelt een nagebootste speler perfect:
  - een hand op elke lightstick;
  - een stoot op de tel naar de juiste kant, ook zonder spiegeling;
  - de juiste houding op het juiste moment.
  Daarnaast valstrikken (stilstaan, verkeerde kant) en de planning (vier soorten wanden,
  steeds sneller, nooit 3× dezelfde).
- Extra test: de lasers liggen op hoofd- en enkelhoogte van de speler.
- **E2E:** elke game start, en zijn scène verschijnt (`.stick`, `.pad`, `.laser`). Screenshots
  bekeken: een doel rechts op het scherm geeft "Rechts!" (spiegeling klopt).

**Problemen en oplossingen:**
1. *Gratis lightsticks* (gevonden door een valstrik-test) → sticks verschijnen niet meer binnen
   bereik van een hand (#51.2).
2. *Hoge laser boven het hoofd* (gezien op een screenshot) → lasers liggen op de hoogte van de
   speler (#51.3).
3. *Dubbel geluid*: de stap-tik + het raak-geluid klonken samen → de tik enkel nog bij
   Spotlight Sprint.

**Open punten:** echt spelen door kinderen. Vooral de timing van Beat Punch (±350 ms) en de
houdingen van Laser Stage (springen herkend vanaf 0,12 romp) moeten in de praktijk blijken.

**Les voor B-world:** een game = `GameCore` + één detector + een scène-beschrijving. Hou
schermcoördinaten en spiegeling expliciet (`GameContext`); dat is de meest verraderlijke bron
van "links is rechts"-fouten.
