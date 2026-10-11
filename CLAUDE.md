# Idol Academy (map `Kinect`)

Kinect-achtige webapp (camera + pose-detectie) met minigames die myokines activeren bij
kinderen van 6–12. Het is een haalbaarheidstest. Als die goed bevonden wordt, komt de module in
B-world. Publieke naam: **Idol Academy**. Gebruik "Kinect" nooit publiek (merknaam).

## Eerst lezen
1. `PLANNING.md`: waar staan we, wat is het volgende blok
2. `BESLISSINGEN.md`: korte index; uitleg per nummer in `BESLISSINGEN-UITLEG.md`
3. `docs/BOUWLOG.md`: wat al gebouwd is en hoe

## Documentatieregels (verplicht, #23)
- **Nieuwe of gewijzigde beslissing** → een regel in `BESLISSINGEN.md` + een entry `## <nr>.` in
  `BESLISSINGEN-UITLEG.md`. Nummers nooit hergebruiken. Bij een wijziging krijgt de oude
  beslissing status `vervangen door #x`.
- **Na elk blok** → `PLANNING.md` (status), `docs/BOUWLOG.md` (sjabloon volgen) en
  `docs/HERBOUW-BWORLD.md` (de relevante sectie) bijwerken. Een blok is niet af zolang de
  documentatie achterloopt.
- Voorstellen van Claude krijgen status `voorlopig` tot Kristof ze bevestigt.

## Werkwijze (#22)
- Eén blok tegelijk; na elk blok een live link om op het toestel te testen; wacht op akkoord.
- Visuele keuzes eerst als voorbeeld voorleggen, pas na "ja" inbouwen.
- Taal: Nederlands (Vlaams) in de UI en de documentatie.

## Harde eisen
- Geen camerabeelden opslaan of versturen; CSP `connect-src 'self'` (#4).
- MediaPipe zelf-gehost, geen CDN (#3). `@mediapipe/tasks-vision` exact op 0.10.21; nooit
  opwaarderen zonder de telemetrie-grep uit #35.
- Testen: `npm test` + `npm run build` + `npm run e2e -- <filmpje.y4m>` (zie scripts/e2e.mjs)
  vóór elke push. Push naar `main` = meteen live.
- Enkel eigen assets, geen echte idols, groepen of liedjes (#14).
- TypeScript strict, geen `any`.
