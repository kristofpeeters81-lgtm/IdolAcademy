# Idol Academy — Beslissingen

Korte index van alle beslissingen. Elk nummer heeft een uitgebreide toelichting in
[`BESLISSINGEN-UITLEG.md`](BESLISSINGEN-UITLEG.md) onder dezelfde kop (`## <nr>.`).

**Statussen:** `beslist` (vast, enkel wijzigen met nieuwe beslissing) · `voorlopig` (voorstel van
Claude, nog niet expliciet bevestigd) · `open` (nog te beslissen) · `vervangen door #x`.

**Regels:** nummers worden nooit hergebruikt of hernummerd. Een gewijzigde beslissing krijgt een
nieuw nummer; de oude krijgt status `vervangen door #x` en blijft staan.

| # | Datum | Beslissing | Status |
|---|-------|------------|--------|
| 1 | 2026-10-11 | Doel: haalbaarheidstest van een Kinect-achtige webapp op gsm/tablet, later als minigame-module in B-world | beslist |
| 2 | 2026-10-11 | Doelgroep kinderen 6–12 jaar, maar met tiener-uitstraling | beslist |
| 3 | 2026-10-11 | Bewegingsdetectie via MediaPipe Pose Landmarker, zelf-gehost | beslist |
| 4 | 2026-10-11 | Privacy: alles op het toestel, CSP `connect-src 'self'`, geen beeldopslag | beslist |
| 5 | 2026-10-11 | Levering als PWA op GitHub Pages, publieke repo | beslist |
| 6 | 2026-10-11 | Naam "Idol Academy", nooit "Kinect" publiek | beslist |
| 7 | 2026-10-11 | Doeltoestellen: Android (Chrome) + laptop; iOS voorzien maar ongetest | beslist |
| 8 | 2026-10-11 | Opstelling: toestel rechtop én gecast naar groot scherm moeten beide werken | beslist |
| 9 | 2026-10-11 | Meerdere spelers om de beurt (estafette), nooit tegelijk in beeld | beslist |
| 10 | 2026-10-11 | Estafette: namen + leeftijd per speler, leeftijdsgeschaalde score, gedeeld scorebord | beslist |
| 11 | 2026-10-11 | Spelstructuur: minigame-carrousel, vrije sessieduur | beslist |
| 12 | 2026-10-11 | Acht minigames (4 cardio/explosief, 4 kracht), krab/beren-loop experimenteel | beslist |
| 13 | 2026-10-11 | Thema "Idol Academy" (K-pop-trainingskamp) | beslist |
| 14 | 2026-10-11 | Enkel eigen assets: zelfgetekende SVG-coach, zelf gesynthetiseerde beats | beslist |
| 15 | 2026-10-11 | Weergave: gespiegeld camerabeeld + effecten, schakelbaar naar avatar-modus | beslist |
| 16 | 2026-10-11 | Intensiteit, reps en fps zijn voor iedereen zichtbaar | beslist |
| 17 | 2026-10-11 | Audio: geluidseffecten + tempo-reactieve beat + Nederlandse spraakcoach | beslist |
| 18 | 2026-10-11 | Veiligheid: ruimte-check, opwarming, automatische rustpauze, pauze bij uit beeld | beslist |
| 19 | 2026-10-11 | Opslag lokaal op het toestel + export naar CSV/JSON | beslist |
| 20 | 2026-10-11 | Geen disclaimer over myokines/gezondheidsclaims (interne test) | beslist |
| 21 | 2026-10-11 | Testdoelen: detectie-nauwkeurigheid, fun, intensiteit, prestaties op toestel | beslist |
| 22 | 2026-10-11 | Werkwijze: kleine testbare blokken; visuele keuzes eerst voorleggen | beslist |
| 23 | 2026-10-11 | Documentatiestructuur: beslissingen, uitleg, planning, bouwlog, B-world-herbouwgids | beslist |
| 24 | 2026-10-11 | Stack: React + Vite + TypeScript + Vitest, games in Canvas2D | beslist |
| 25 | 2026-10-11 | Architectuur in 3 lagen (motor · games · app-schil) + embed-API | vervangen door #33 |
| 26 | 2026-10-11 | Intensiteitsmaat "Power-score" met 4 zones | beslist |
| 27 | 2026-10-11 | Idol-namen voor de acht minigames | beslist |
| 28 | 2026-10-11 | Taal: Nederlands (Vlaams) | beslist |
| 29 | 2026-10-11 | Speelduren per gametype en rustpauze-regel | beslist |
| 30 | 2026-10-11 | Estafette-details: 2–6 spelers, score als % van het leeftijdsdoel | beslist |
| 31 | 2026-10-11 | Opname-knop: bewegingen als JSON bewaren als testdata | beslist |
| 32 | 2026-10-11 | Thema-botsing met B-world oplossen via een verwisselbare "skin" | vervangen door #33 |
| 33 | 2026-10-11 | Geen embed-API en geen skin-systeem: B-world herbouwt de app indien goed bevonden. De motor blijft wel los van de UI | beslist |
| 34 | 2026-10-11 | MediaPipe Pose (code + model) mag gebruikt worden in een app die je commercieel verkoopt (Apache 2.0) | beslist |
| 35 | 2026-10-11 | MediaPipe vastgepind op 0.10.21: versies vanaf 1.0.0 sturen telemetrie naar Google | beslist |
| 36 | 2026-10-11 | Modellen in git, WASM bij elke build gekopieerd uit npm; licentietekst mee gepubliceerd | beslist |
| 37 | 2026-10-11 | Meten van voren: dijbeen-verkorting i.p.v. 2D-kniehoek; alle drempels in romplengtes | voorlopig |
| 38 | 2026-10-11 | Per detector "hele lichaam" of "bovenlichaam volstaat" (bovenlichaam-games ook dichterbij speelbaar) | voorlopig |
| 39 | 2026-10-11 | Automatische modelwissel enkel tijdens de ruimte-check, nooit tijdens het tellen/spelen | voorlopig |
| 40 | 2026-10-11 | Testlab met opname-knop; opnames in `test-fixtures/` worden automatisch tests (marge ±1/±10%, houdingen ±1,5 s); opnames van kinderen enkel publiek met toestemming | voorlopig |
| 41 | 2026-10-11 | Jumping jacks als extra detector voor de opwarming (#18) | voorlopig |
