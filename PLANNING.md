# Idol Academy — Planning

Laatst bijgewerkt: 2026-10-11

**Statussen:** ⏳ gepland · 🔨 bezig · 🧪 gebouwd, wacht op test door Kristof · ✅ afgetekend · ⛔ geblokkeerd

**Werkwijze (#22):** één blok tegelijk. Elk blok eindigt met een live link om op het toestel te
testen, en pas na Kristofs akkoord begint het volgende blok. Een blok is pas af als
`docs/BOUWLOG.md` en `docs/HERBOUW-BWORLD.md` bijgewerkt zijn (#23).

## Huidige stand

- ✅ Interview (6 vraagrondes) afgerond
- ✅ Documentatiestructuur opgezet
- ✅ Plan en alle beslissingen #1–#32 bevestigd door Kristof (2026-10-11)
- ✅ Embed-API en skin-systeem geschrapt, de app wordt herbouwd in B-world (#33); MediaPipe-licentie gecontroleerd (#34)
- 🧪 **Blok 1 (Fundament)**: getest op 1 toestel (high-end Android-gsm: 34 fps, vlot). Bijgestuurd: meetrapport
  over de laatste minuut + doordetecteren tijdens het laden van een model. **Nog te testen: oude tablet (go/no-go) + laptop.**
- ✅ #35 en #36 bevestigd door Kristof

## Bouwblokken

| Blok | Inhoud | Testmoment voor Kristof | Status |
|---|---|---|---|
| 1 | **Fundament**: projectopzet, git + publieke repo, camera, MediaPipe (zelf-gehost, lite/full), skelet-overlay, fps-meter, debugpaneel, CSP, GitHub Pages | Link openen op gsm, oude tablet en laptop. Is de fps speelbaar? **Go/no-go** | 🧪 |
| 2 | **Bewegingsmotor**: normalisatie, detectoren (reps, houding, raken, ontwijken, uit beeld), ruimte-check, opname-knop (#31) + unit tests | Squats en knieheffen doen, kloppen de tellers? Enkele opnames maken | ⏳ |
| 3 | **Stijlvoorbeeld**: kleuren, idol-coach (SVG), HUD, Power-meter, als voorbeeldblad | Stijl goedkeuren of bijsturen (**geen code vóór "ja"**) | ⏳ |
| 4 | **Eerste game end-to-end**: Spotlight Sprint met HUD, Power-score (#26) en scorescherm | Volledige game spelen | ⏳ |
| 5 | **Audio**: tempo-reactieve beat, geluidseffecten, NL-spraakcoach | Beluisteren op toestel en bij casten | ⏳ |
| 6 | **Games A**: Lightstick Catch, Beat Punch, Laser Stage | Elke game spelen | ⏳ |
| 7 | **Games B**: Jump Squad, Freeze Pose, Sky Climb, Floor Crawl 🧪 | Elke game spelen | ⏳ |
| 8 | **Spelverloop**: opwarming, rustpauzes, carrousel, estafette met leeftijdsschaling, scorebord | Estafette met 2+ kinderen | ⏳ |
| 9 | **Opslag en extra's**: highscores, CSV/JSON-export, avatar-modus, iOS-workarounds (ongetest), licentiescherm (#34) | Export openen in Excel, avatar-modus testen | ⏳ |
| 10 | **Herbouwgids B-world** (#33): `docs/HERBOUW-BWORLD.md` afwerken (wat je letterlijk overneemt en wat je opnieuw bouwt), eindevaluatie van de testdoelen (#21) | Gids nalezen, go/no-go voor B-world | ⏳ |

## Open vragen / afhankelijkheden

- Welke exacte toestellen (merk/model) Kristof gebruikt. Die worden in de testresultaten van
  blok 1 genoteerd.
- iOS kan niet getest worden (#7). Mogelijk later iemand met een iPhone vragen.

## Risico's

| Risico | Impact | Maatregel |
|---|---|---|
| Te lage fps op een oude tablet | Games voelen traag aan | Lite-model, lagere camera-resolutie; go/no-go in blok 1 |
| Floor Crawl niet detecteerbaar | 1 game minder | Gemarkeerd als experimenteel (#12) |
| Spraakcoach klinkt slecht op sommige toestellen | Minder fun | Coach is aanvullend, alle info ook visueel |
| Vertraging bij casten naar tv | Raak-games voelen oneerlijk | Geen reacties < ~150 ms vereist (#8) |
