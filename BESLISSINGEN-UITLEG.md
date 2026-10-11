# Idol Academy — Beslissingen: uitgebreide uitleg

Bij elk nummer uit [`BESLISSINGEN.md`](BESLISSINGEN.md) staat hier de context: wat er beslist
is, welke alternatieven bekeken zijn, en waarom. Opzoeken: zoek naar `## <nr>.`

Structuur per entry: **Beslissing** · **Alternatieven** · **Waarom** · **Gevolgen** (voor de bouw
en/of voor een latere import in B-world).

---

## 1. Doel: haalbaarheidstest van een Kinect-achtige webapp

**Beslissing:** De app is in de eerste plaats een test: kunnen we op een gewone gsm of tablet,
in de browser, een ervaring bouwen die voelt als Kinect? Het inhoudelijke doel van de games is
myokines activeren: korte explosieve inspanningen, kracht in spelvorm, en cardio gecombineerd
met weerstand. Als de test goed bevonden wordt, komen de games als minigame-module in B-world.

**Alternatieven:** een volwaardige losse app; een native app.

**Waarom:** De grootste onzekerheid is technisch (fps op goedkope toestellen, betrouwbaarheid
van de detectie, of het leuk aanvoelt). Een test lost die eerst op, voordat er in B-world
geïnvesteerd wordt.

**Gevolgen:** Alles wordt modulair gebouwd (zie #25), en tijdens de bouw wordt documentatie
bijgehouden voor de import (zie #23).

## 2. Doelgroep 6–12 jaar, tiener-uitstraling

**Beslissing:** Spelers zijn 6 tot 12 jaar. De look is niet kinderachtig maar eerder "tiener".

**Alternatieven:** gezin, volwassenen, enkel tieners; een cartoon-look of een sobere look.

**Waarom:** Volgens Kristof vinden jongere kinderen een tiener-look vaak cool, terwijl oudere
kinderen een kinderachtige look afwijzen.

**Gevolgen:** Teksten blijven kort en eenvoudig (6-jarigen lezen nog beperkt, dus de
spraakcoach en iconen dragen de uitleg). Doelen worden geschaald per leeftijd (#10).

## 3. MediaPipe Pose Landmarker, zelf-gehost

**Beslissing:** Bewegingen worden gevolgd met Google MediaPipe Pose Landmarker: 33
lichaamspunten, dat draait in de browser via WebAssembly/GPU. Het model en de WASM-bestanden
worden mee in de app geleverd en dus niet van Google's servers gehaald.

**Alternatieven:** TensorFlow.js MoveNet (17 punten, iets sneller maar minder punten voor
handen en voeten); geen AI-model (dan is een Kinect-ervaring niet haalbaar).

**Waarom:** Het is gratis (Apache 2.0, ook commercieel bruikbaar), wordt actief onderhouden,
heeft een *lite*-model voor trage toestellen en een *full*-model voor betere toestellen, en
draait volledig lokaal. Kristof stelde als voorwaarde "gratis en betrouwbaar qua privacy en
veiligheid". Aan die voorwaarde is voldaan door zelf te hosten (#4).

**Gevolgen:** De app wordt ongeveer 6–10 MB groter. Een host-app (B-world) heeft een CSP met
`'wasm-unsafe-eval'` nodig. Bij een trage start wordt automatisch het lite-model gekozen.

## 4. Privacy: alles op het toestel

**Beslissing:** Camerabeelden worden alleen in het geheugen verwerkt en nooit opgeslagen of
verstuurd. Dat wordt afgedwongen met een Content-Security-Policy `connect-src 'self'`, zoals bij
SingApp.

**Alternatieven:** verwerking op een server (sneller op trage toestellen, maar
onaanvaardbaar voor kinderbeelden).

**Waarom:** Het gaat om camerabeelden van minderjarigen. Een technisch afgedwongen garantie is
sterker dan een belofte.

**Gevolgen:** Er is geen analytics of cloudopslag. Meetdata gaat enkel naar buiten via een
bewuste export (#19).

## 5. PWA op GitHub Pages, publieke repo

**Beslissing:** De app wordt gepubliceerd als installeerbare, offline werkende PWA op GitHub
Pages, in een publieke repo onder Kristofs account. Elke push naar main betekent automatisch
een nieuwe live versie.

**Alternatieven:** enkel lokaal testen; een native APK/iOS-app; een private repo met Cloudflare
Pages.

**Waarom:** De camera vereist HTTPS, en GitHub Pages levert dat gratis. Testen gaat via een link
op elk toestel. Deze aanpak is al bewezen bij SingApp.

**Gevolgen:** Er komen geen geheimen in de repo (die zijn er ook niet nodig).

## 6. Naam "Idol Academy"

**Beslissing:** De app en de repo heten "Idol Academy" (`IdolAcademy`). De lokale map mag
`Kinect` heten, maar "Kinect" verschijnt nergens publiek.

**Alternatieven:** MoveStar, MyoMoves.

**Waarom:** Kinect is een merknaam van Microsoft. "Idol Academy" sluit aan bij het thema (#13).

## 7. Doeltoestellen

**Beslissing:** De app moet zeker werken op Android (Chrome), op een recente gsm én op een
oudere, goedkope tablet, en op een laptop met webcam. iPhone/iPad (Safari) wordt in de code
voorzien, maar kan niet getest worden.

**Waarom:** Kristof heeft geen iPhone ter beschikking. Dat zijn de toestellen waarop getest
wordt.

**Gevolgen:** iOS-specifieke workarounds komen er wel (audio pas na een tik, camera-attributen
`playsinline`), maar staan gemarkeerd als *ongetest*. Een goedkope tablet is de ondergrens voor
performance en het go/no-go-criterium in blok 1.

## 8. Opstelling: klein en groot scherm

**Beslissing:** De app moet werken met het toestel rechtop tegen iets (speler op 2–3 m) én
gecast naar een tv.

**Gevolgen:** De UI schaalt mee met het scherm en is leesbaar van op 2–3 m: grote cijfers en
weinig tekst. Bij casten loopt het beeld iets achter, dus games mogen niet afhangen van
reactietijden onder ~150 ms.

## 9. Meerdere spelers om de beurt

**Beslissing:** Er staat altijd één speler voor de camera. Meerdere spelers spelen om de beurt.

**Alternatieven:** 1 speler; 2 spelers tegelijk.

**Waarom:** Twee personen tegelijk detecteren is op gsm minder stabiel en vraagt een grote
ruimte. Om de beurt spelen behoudt het sociale element.

## 10. Estafette met leeftijdsschaling

**Beslissing:** Vooraf geef je per speler een naam en een leeftijd in. Iedereen speelt dezelfde
minigame. De score wordt geschaald op leeftijd, zodat een 6-jarige eerlijk kan winnen van een
12-jarige. Na afloop volgt een gedeeld scorebord.

**Alternatieven:** teams; coöperatief; moeilijkheid zelf kiezen; ruwe scores.

**Details:** zie #30.

## 11. Minigame-carrousel, vrije duur

**Beslissing:** De app bestaat uit losse minigames die je vrij kiest. Er is geen vaste
sessieduur.

**Alternatieven:** avontuur/verhaal; vaste interval-workout.

**Waarom:** Losse games maken het mogelijk per oefening te testen hoe goed de detectie werkt,
en een losse game laat zich later makkelijk als minigame in B-world inbouwen.

**Gevolgen:** De veiligheidsregels (#18) moeten werken zonder vaste sessie: de rustpauze wordt
geteld over opeenvolgende games.

## 12. Acht minigames

**Beslissing:**
- **Cardio en explosief:** Raketsprint (knieën hoog), Sterrenregen (doelen raken), Lavamuur
  (bukken/zijstap/springen), Bokszak (stoten).
- **Kracht:** Kikkersprong (squats), Standbeeld (houding vasthouden), Apenklim
  (klimbeweging), Krab/beren-loop.

**Waarom:** Ze dekken de vier myokine-categorieën uit de opdracht: korte explosieve
inspanning, kracht in spelvorm, cardio, en combinaties daarvan.

**Gevolgen:** Krab/beren-loop is **experimenteel**. Op handen en voeten nabij de grond is het
lichaam moeilijk te detecteren met een camera die rechtop staat. De game krijgt een tip om de
camera laag en zijwaarts te zetten.

## 13. Thema "Idol Academy"

**Beslissing:** Het kind is een trainee in een K-pop-idoltrainingskamp. Elke minigame is een
"training". Je verdient stars/fans. De stijl gebruikt neon, holo, stage-lichten en lightsticks.

**Alternatieven:** enkel een K-pop-look; een sportief neutraal thema; cartoon/jungle.

**Waarom:** Het sluit aan bij de tiener-uitstraling (#2), en Kristof stelde zelf een K-pop-thema
voor.

**Gevolgen:** Het botst met het agententhema van B-world, dus het wordt opgelost via een skin
(#32).

## 14. Enkel eigen assets

**Beslissing:** De coach-personage(s) zijn zelfgetekende SVG's in K-pop-stijl. De muziek en
geluidseffecten worden zelf gesynthetiseerd met de Web Audio API. Er komen nooit echte idols,
groepen, logo's of liedjes in.

**Waarom:** Zo is er geen copyrightrisico, en de app werkt zonder externe bestanden.

## 15. Camerabeeld of avatar

**Beslissing:** Standaard ziet de speler zichzelf gespiegeld, met game-effecten erover
(AR-stijl). Een knop schakelt naar avatar-modus, waarin een getekend figuur de bewegingen volgt
en het camerabeeld verborgen blijft.

**Waarom:** Het camerabeeld is het meest intuïtief en het meest Kinect-achtig. De avatar-modus is
privacyvriendelijker (bv. bij casten of screenshots) en bruikbaar in B-world.

## 16. Alle cijfers zichtbaar

**Beslissing:** De intensiteit (#26), reps, tempo en fps zijn voor iedereen zichtbaar in het spel.

**Alternatieven:** een eenvoudige balk voor het kind met details enkel voor de ouder; cijfers
enkel in de debugmodus.

**Waarom:** Dit is een test. Zichtbare cijfers maken het meteen duidelijk wanneer de detectie
fout loopt.

**Gevolgen:** Voor een B-world-versie herbekijken we dit: misschien enkel een balk voor het kind.

## 17. Audio

**Beslissing:** Er zijn geluidseffecten, een achtergrondbeat waarvan het tempo stijgt met de
intensiteit, en een gesproken Nederlandse coach via de spraaksynthese van de browser.

**Gevolgen:** De stemkwaliteit van de coach verschilt per toestel. Audio start pas na een tik
(een browserregel). De spraak moet boven de beat hoorbaar blijven, dus de muziek gaat zachter
terwijl de coach spreekt.

## 18. Veiligheid

**Beslissing:** De app bevat:
- een ruimte-check bij de start (het hele lichaam moet zichtbaar zijn);
- een korte opwarming vóór de eerste explosieve game;
- een automatische, verplichte rustpauze na enkele intensieve games;
- een automatische pauze wanneer de speler uit beeld gaat.

**Waarom:** Het gaat om kinderen die explosief bewegen in een woonkamer.

**Details:** de concrete parameters staan in #29.

## 19. Lokale opslag + export

**Beslissing:** Highscores, spelers en meetlogs worden bewaard in de browser (IndexedDB/
localStorage). Een knop exporteert de meetdata als CSV/JSON.

**Waarom:** Zo kan de testdata (reps, intensiteit, fps per toestel) geanalyseerd worden zonder
dat er iets automatisch het toestel verlaat (#4).

## 20. Geen disclaimer

**Beslissing:** De app toont geen disclaimer dat de intensiteitsscore geen medische meting van
myokines is.

**Waarom:** Volgens Kristof is dat niet nodig voor een interne test.

**Gevolgen:** Bij een publieke versie of in B-world opnieuw bekijken. Teksten in de app maken
hoe dan ook geen harde gezondheidsclaims.

## 21. Testdoelen

**Beslissing:** De test moet vier dingen aantonen:
1. de detectie is nauwkeurig: tellen de reps correct?
2. kinderen vinden het leuk en blijven spelen;
3. de intensiteit kan zinvol geschat worden;
4. de prestaties op de toestellen zijn voldoende.

Daarboven staat de vraag of dit een goede Kinect-ervaring geeft die als minigame in een groter
geheel kan.

**Gevolgen:** Er komt een debugpaneel met het skelet, de meetwaarden en de fps, plus de export
(#19) en de opname-knop (#31).

## 22. Werkwijze

**Beslissing:** Er wordt gebouwd in kleine blokken. Elk blok wordt afzonderlijk getest op het
toestel via de live link, en pas na Kristofs akkoord volgt het volgende blok. Visuele keuzes
(stijl, personages, schermontwerp) worden **eerst als voorbeeld voorgelegd** en pas na een "ja"
ingebouwd.

**Waarom:** Kristof werkt zo bij al zijn projecten. Fouten blijven zo makkelijk te lokaliseren,
en er gaat geen werk verloren aan verkeerde visuele aannames.

## 23. Documentatiestructuur

**Beslissing:** De volgende documenten worden bijgehouden:

| Bestand | Inhoud |
|---|---|
| `BESLISSINGEN.md` | korte geïndexeerde lijst van beslissingen |
| `BESLISSINGEN-UITLEG.md` | dit bestand: de uitleg per index |
| `PLANNING.md` | bouwblokken, status, open vragen |
| `docs/BOUWLOG.md` | per blok: wat gebouwd, hoe, welke bestanden, wat getest, lessen |
| `docs/HERBOUW-BWORLD.md` | gids om de app in B-world te herbouwen (groeit mee, wordt afgewerkt in het laatste blok; heette eerst `IMPORT-BWORLD.md`, zie #33) |
| `CLAUDE.md` | instructies voor Claude om dit alles bij te werken |

**Waarom:** Kristof wil dat beslissingen kort en vindbaar zijn, met uitleg apart. Na afloop
moet duidelijk zijn hoe de app gebouwd is, zodat B-world (gebouwd op een ander toestel) de
aanpak kan overnemen.

**Gevolgen:** Een blok is pas af als de bouwlog en de herbouwgids bijgewerkt zijn.

## 24. Stack

**Beslissing:** React + Vite + TypeScript (strict) + Vitest. De games tekenen op een Canvas2D.

**Alternatieven:** vanilla TypeScript zonder framework; een game-engine (Phaser, PixiJS);
WebGL/Three.js.

**Waarom:** B-world draait op React + Vite + PWA, dus dezelfde stack maakt de herbouw eenvoudig.
SingApp gebruikt al Vite + TS + Vitest. Canvas2D volstaat voor 2D-effecten over een
camerabeeld en voegt geen zware engine toe. De motor en de games blijven wel los van React
(#25), zodat React enkel de schil is.

## 25. Architectuur in 3 lagen — *vervangen door #33*

> De drie lagen blijven bestaan. De embed-API vervalt (zie #33).

**Beslissing:**
1. **Bewegingsmotor**, puur TypeScript zonder React: camera, pose, normalisatie op
   lichaamsgrootte, en detectoren voor reps, houdingen, raken, ontwijken en uit beeld.
2. **Minigames**: plug-ins met één vaste interface (`start → per frame updaten → resultaat`).
3. **App-schil** in React: menu's, estafette, scorebord, opslag, export.

Daarnaast komt een **embed-API**: een host-app kan één game starten en krijgt een resultaat
terug (`{score, reps, intensiteit, duur}`), als module-import of via iframe + `postMessage`.

**Waarom:** Zo kan B-world de motor en de games hergebruiken zonder de Idol Academy-schil.

## 26. Power-score

**Beslissing:** Een intensiteitsscore die drie dingen combineert:
- de bewegingssnelheid van de grote gewrichten (heupen, knieën, polsen, enkels), genormaliseerd
  op lichaamsgrootte, zodat afstand tot de camera en lengte van het kind geen invloed hebben;
- het aantal reps per minuut;
- de tijd onder spanning (bij houdingen).

Getoond in 4 zones: 🟢 rustig · 🟡 matig · 🟠 intens · 🔴 explosief.

**Waarom:** Myokines zijn niet rechtstreeks meetbaar. Inspanningsintensiteit is de best haalbare
proxy met enkel een camera. De drempels per zone worden afgesteld op basis van opgenomen
testdata (#31).

## 27. Idol-namen voor de minigames

| Oorspronkelijk idee | Idol-naam |
|---|---|
| Raketsprint | Spotlight Sprint |
| Sterrenregen | Lightstick Catch |
| Lavamuur | Laser Stage |
| Bokszak/ninja | Beat Punch |
| Kikkersprong | Jump Squad |
| Standbeeld | Freeze Pose |
| Apenklim | Sky Climb |
| Krab/beren-loop | Floor Crawl (experimenteel) |

## 28. Taal

**Beslissing:** De UI en de spraakcoach zijn in het Nederlands (Vlaams), zoals B-world. De
gamenamen zijn Engels, als onderdeel van de K-pop-sfeer.

## 29. Speelduren en rustpauze

**Beslissing:**
- Sprints (Spotlight Sprint, Beat Punch) duren 15–20 s, overeenkomstig "korte explosieve
  inspanningen van 10–20 s".
- Freeze Pose duurt 10–20 s volgens leeftijd.
- De overige games duren 30–45 s.
- Na 3 intensieve games volgt een verplichte rustpauze van 25 s met een ademhalingsanimatie.
- De opwarming duurt 30–60 s.

## 30. Estafette-details

**Beslissing:** 2 tot 6 spelers. Elke game heeft een doel per leeftijd. De score is "% van je
leeftijdsdoel", zodat spelers eerlijk vergelijkbaar zijn. Tussen twee spelers verschijnt een
scherm "Klaar voor {naam}?" met ruimte-check.

## 31. Opname-knop voor testdata

**Beslissing:** In de debugmodus kun je een reeks lichaamspunten (geen beeld!) opnemen als JSON.
Die opnames worden automatische tests: "deze opname van 10 squats moet 10 reps geven".

**Waarom:** Detectie-nauwkeurigheid (#21) wordt zo reproduceerbaar getest, in plaats van op
gevoel. Er worden geen beelden bewaard, dus #4 blijft gerespecteerd.

## 32. Skin tegen thema-botsing — *vervangen door #33*

**Beslissing:** Kleuren, teksten, personages en namen van de games zitten in een
verwisselbare "skin". Idol Academy is de eerste skin. Voor B-world komt er later een
agenten-skin, zonder de motor of de spellogica te wijzigen.

## 33. Geen embed-API en geen skin-systeem: herbouw in B-world

**Beslissing:** Als de test goed bevonden wordt, wordt de app in B-world **herbouwd**. B-world
importeert geen module van hier. Daarom komen er in deze test geen embed-API (#25) en geen
skin-systeem (#32).

**Wat blijft:** de scheiding in 3 lagen (#25). De bewegingsmotor (pose, normalisatie,
detectoren, Power-score) blijft puur TypeScript, los van React. Dat kost niets extra en maakt de
herbouw veel eenvoudiger: dat deel kan B-world bijna letterlijk overnemen, inclusief de tests met
opgenomen bewegingen (#31). Alleen de schil en de visuals worden opnieuw gemaakt in de
B-world-stijl.

**Alternatieven:** embed-API (iframe/`postMessage`) of een npm-module; een skin-systeem voor
een agenten-thema.

**Waarom:** Kristof: "De embed-optie hoeft op dit moment niet, we herbouwen de app in B-world
indien goed bevonden." Een skin-systeem dient enkel om dezelfde code met een ander thema te
draaien. Bij een herbouw is dat overbodig, omdat B-world zijn eigen visuals maakt. Het
skin-systeem laten vallen is een afgeleide keuze van Claude, niet letterlijk door Kristof
gevraagd.

**Gevolgen:**
- `docs/IMPORT-BWORLD.md` heet nu `docs/HERBOUW-BWORLD.md` en wordt een herbouwgids: wat je
  letterlijk overneemt (motor + tests) en wat je opnieuw bouwt (schil, games-visuals, audio), met
  de lessen per blok.
- Blok 10 wordt "Herbouwgids B-world afwerken" in plaats van "Embed-API".

## 34. MediaPipe commercieel bruikbaar

**Vraag van Kristof:** Mag de lokale AI gebruikt worden in een app die je zelf commercieel
verkoopt?

**Bevinding (gecontroleerd op 2026-10-11 in de officiële bronnen):**
- **Code** (MediaPipe-bibliotheek, `@mediapipe/tasks-vision`): Apache License 2.0
  ([LICENSE](https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE)).
- **Model** (Pose Landmarker lite/full/heavy, alle drie dezelfde model card "BlazePose GHUM 3D"):
  "LICENSED UNDER Apache License, Version 2.0"
  ([model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20BlazePose%20GHUM%203D.pdf)).
- Apache 2.0 laat commercieel gebruik, verkoop en aanpassen toe, zonder licentiekosten en
  zonder dat je je eigen code moet vrijgeven.

**Voorwaarden (Apache 2.0):** de licentietekst en eventuele `NOTICE`-bestanden meeleveren
(bv. een pagina "Licenties" in de app), aangepaste bestanden als gewijzigd markeren, en Google's
merknamen niet gebruiken om de app te promoten (geen "powered by Google"-logo als
aanbeveling).

**Wat de model card verder zegt (relevant, niet bindend als licentie):**
- Bedoeld gebruik: AR, gebaren en poses, **"Fitness and repetition counting"**. De primaire
  toepassing is entertainment. Dat is exact dit project.
- Buiten de scope: meerdere personen in beeld, personen verder dan ~4 m, hoofd niet zichtbaar,
  surveillance/identificatie. Dat bevestigt #9 (één speler tegelijk) en #8 (afstand 2–3 m).
- Niet bedoeld voor beslissingen over leven of gezondheid. De Power-score blijft dus een
  spelscore en geen medische meting.
- De model card vermeldt geen specifieke evaluatie op kinderen. Dat moet de detectietest
  (blok 1–2) dus zelf uitwijzen.

**Gevolgen:** Er komt een `LICENSES`-/"Licenties"-scherm met de Apache 2.0-tekst in de app
(blok 9). Dit is een technische licentie-inschatting en geen juridisch advies. Bij een echte
commerciële lancering hoort een korte check door een jurist erbij, ook voor andere
afhankelijkheden (React, Vite, enz., die allemaal MIT zijn).

## 35. MediaPipe vastgepind op 0.10.21 (geen telemetrie)

**Aanleiding:** Tijdens de eind-tot-eind-test van blok 1 (met de nieuwste versie 1.1.0) probeerde
MediaPipe gegevens te sturen naar `https://odml.pa.googleapis.com/v1/log`. Dat is een
logserver van Google. De CSP (#4) heeft dat **geblokkeerd**, dus het vangnet werkte. Het blijft
wel ongewenst gedrag in een kinderapp.

**Onderzoek:**
- In de code van 1.1.0 zit een logger die bij elk model automatisch wordt aangemaakt en elke
  60 s statistieken verstuurt (welk soort taak, prestaties). Er is geen gedocumenteerde of
  publieke optie om dat uit te zetten.
- Per versie het npm-pakket doorzocht: **0.10.21 en 0.10.22-rc bevatten geen enkele externe
  URL**, 1.0.0 en 1.0.1 wel (de telemetrie kwam in 1.0.0, juli 2026).
- Anderen melden hetzelfde gedrag bij de Python-versie
  ([GitHub-issue #6291](https://github.com/google-ai-edge/mediapipe/issues/6291)).

**Beslissing:** `@mediapipe/tasks-vision` exact vastgepind op **0.10.21** (februari 2025),
zonder `^`, zodat een `npm install` nooit stilletjes opwaardeert. De pose-modellen zijn dezelfde
(het modelbestand staat los van de bibliotheekversie), en de API die wij gebruiken is identiek.

**Alternatieven:**
- 1.1.0 houden en vertrouwen op de CSP-blokkade. Dat werkt, maar geeft foutmeldingen in de
  console en hangt af van één regel.
- De telemetriecode wegpatchen in de build. Dat is broos bij elke update.

**Gevolgen / vangnetten:**
1. De CSP `connect-src 'self'` blijft (#4).
2. De e2e-test faalt bij elke CSP-schending of elk verzoek naar een ander domein.
3. De publicatie-workflow faalt als de build een `https://…googleapis.com`-adres, `odml.pa.` of
   `clearcut` bevat. (`type.googleapis.com/…` komt wel voor, maar dat zijn protobuf-typenamen
   zonder `https://`, geen netwerkadressen.)

**Bevestigd door Kristof (2026-10-11):** "als dit nodig is om niks door te sturen, is dit OK".

**Voor B-world:** gebruik dezelfde vaste versie (of controleer een nieuwere versie eerst met
dezelfde grep). Zie `docs/HERBOUW-BWORLD.md` §2.

## 36. Hoe de MediaPipe-bestanden in de app komen

**Beslissing:**
- **Modellen** (`pose_landmarker_lite.task` 5,8 MB, `pose_landmarker_full.task` 9,4 MB) staan
  in git onder `public/mediapipe/models/`. Ze zijn eenmalig gedownload op 2026-10-11 van
  `storage.googleapis.com/mediapipe-models/pose_landmarker/…/float16/latest/`. SHA-256:
  - lite: `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`
  - full: `4eaa5eb7a98365221087693fcc286334cf0858e2eb6e15b506aa4a7ecdcec4ad`
- **WASM** (~13 MB) wordt bij elke `dev`/`build` gekopieerd uit het npm-pakket
  (`scripts/copy-mediapipe.mjs`) en staat niet in git. Zo hoort de WASM altijd exact bij de
  JS-versie van het pakket.
- **Licentietekst** (Apache 2.0) staat naast de bestanden in `public/mediapipe/LICENSE.txt` en
  wordt mee gepubliceerd. Dat is al nodig vanaf de eerste publicatie (#34). Het
  "Licenties"-scherm in de app volgt in blok 9.

**Bevestigd door Kristof (2026-10-11).**

**Waarom de modellen in git:** de URL "latest" kan veranderen. Met een vaste kopie test iedereen
hetzelfde model, en de build hangt niet af van Google's servers.

## 37. Meten van voren: dijbeen-verkorting en romplengtes

**Probleem:** De camera kijkt recht van voren. Bij een squat of een knieheffing beweegt de knie
vooral naar de camera toe, dus in de diepte. Een kniehoek (heup–knie–enkel) gemeten op het platte
beeld blijft dan bijna 180° en is onbruikbaar. De z-waarde van MediaPipe is te ruw om op te
steunen.

**Beslissing:** Detectoren meten wat van voren wél zichtbaar is:
- **Squatdiepte** = hoe "kort" het dijbeen in beeld wordt t.o.v. rechtop staan:
  `1 − (knie.y − heup.y) / rechtop`. Dat geeft 0 rechtop en ~0,75 bij een volle squat.
- **Knieheffing** = hetzelfde per been, maar t.o.v. de eigen heup. Daardoor telt meespringen
  niet mee.
- Alle afstanden en drempels staan in **romplengtes** (schouders ↔ heupen). Zo maken de afstand
  tot de camera en de lengte van het kind niet uit.
- "Rechtop" is het maximum van de laatste 10 s, zodat het zich aanpast als het kind verschuift.
- De romplengte zelf is het 80e percentiel van de laatste ~3 s. Bij voorover buigen lijkt de
  romp korter, en dat mag de schaal niet verstoren.

**Alternatieven:** een 2D-kniehoek (onbruikbaar van voren); 3D-"world landmarks" van MediaPipe
(diepte is een schatting en ruisgevoelig); de camera zijwaarts zetten (onpraktisch en slechter
voor andere games).

**Te controleren:** de drempels zijn mild gekozen voor kinderen (squat telt vanaf 35% diepte).
De echte opnames (#40) moeten uitwijzen of dat klopt.

## 38. Hele lichaam of bovenlichaam per detector

**Aanleiding:** Kristofs test: dichter bij het toestel worden minder punten gezien.

**Beslissing:** Elke detector geeft aan wat hij nodig heeft:
- `full`: hele lichaam, hoofd tot enkels. Dat geldt voor squats, knieën, jumping jacks,
  houdingen en ontwijken.
- `upper`: bovenlichaam (hoofd, schouders, ellebogen, polsen, heupen). Dat geldt voor stoten,
  klimmen en energie.

De ruimte-check en de pauze bij uit beeld gebruiken die lijst. Bij `upper` mag het kind dus
dichterbij staan (hoofd→heupen 20–60% van de beeldhoogte). De gewone afstand, met het hele
lichaam in beeld, is óók goed: dichterbij *mag*, maar moet niet. Dat bleek uit de e2e-test.

## 39. Modelwissel enkel tijdens de ruimte-check

**Beslissing:** De automatische lite→full-keuze (#3) mag alleen gebeuren zolang de ruimte-check
loopt (`engine.setAutoSwitchAllowed`). Een model aanmaken laat de detectie ~0,5–1 s haperen
(bouwlog blok 1). Tijdens het tellen of spelen zou dat een gemiste herhaling of een oneerlijke
game opleveren.

## 40. Testlab, opnames en fixture-tests

**Beslissing:**
- Het testlab is het scherm van blok 2: je kiest een beweging en ziet de teller, de toestand,
  een grafiek van het meetsignaal met de drempels, en de energie.
- **● Opnemen:** eerst 5 s aftellen (tijd om op je plek te gaan staan), dan 10/20/30/60 s
  opnemen. Daarna vraagt de app "hoeveel deed je er echt?" plus een notitie, en downloadt een
  JSON-bestand naar Downloads. Er zitten enkel lichaamspunten in, nooit beelden (#4). Dat is
  ~30 KB per seconde, met een maximum van 90 s.
- Elke opname in `test-fixtures/` wordt bij `npm test` automatisch afgespeeld
  (`src/motor/fixtures.test.ts`). De marge is ±1, of ±10% bij grotere aantallen; bij houdingen
  ±1,5 s.
- **Privacy:** de repo is publiek. Opnames van kinderen gaan er enkel in met toestemming van de
  ouder. Anders komen ze in `test-fixtures/lokaal/` (staat in `.gitignore`, draait lokaal wel mee).

**Waarom:** zo wordt "telt het juist?" (#21) meetbaar en herhaalbaar, en elke aanpassing aan een
drempel wordt meteen getoetst aan echte bewegingen van echte kinderen.

## 41. Jumping jacks voor de opwarming

**Beslissing:** Er komt een extra detector voor jumping jacks: openheid = 60% armen + 40% benen.
Hij staat niet in de lijst van acht games (#12), maar hoort bij de korte opwarming (#18).

## 42. Visuele stijl — *vervangen door #43*

**Status:** open. Wacht op Kristofs keuze. Het voorbeeldblad staat live op
`https://kristofpeeters81-lgtm.github.io/IdolAcademy/stijl/` (bron: `public/stijl/index.html`).

**Opties:**
- **A · Neon Stage:** donker podium (#0B0720) met neon roze, cyaan, violet en lime. Letters:
  Unbounded (titels, cijfers) + Outfit (tekst). Gloed rond knoppen en cijfers, zoals een
  concertzaal.
- **B · Holo Pop:** licht holografisch pastelverloop, inkt-violet tekst, hot pink, periwinkle,
  mint en zon. Letters: Poppins. Kaarten met een holografische rand en "sticker"-cijfers met
  offset-schaduw.
- **Mix:** per onderdeel (kleuren, letters, kaarten, HUD).

Beide tonen hetzelfde:
- de coach **Lumi**: eigen SVG-ontwerp in K-pop-stijl, met kleuren via CSS-variabelen, zodat één
  tekening in beide stijlen werkt;
- kleuren, letters, knoppen, en de gamekaarten met een eigen pictogram per game;
- de HUD tijdens een training: timer-ring, teller, Power-meter met de 4 zones uit #26,
  "PERFECT!"-popup en coach-ballon;
- een estafette-scorebord met "% van het leeftijdsdoel" (#30).

**Vragen aan Kristof:** A, B of mix? Lumi goed, of anders (meerdere coaches, ander uiterlijk)? Is
de HUD te druk van op 2–3 m? Gamenamen Engels of Nederlands (#27/#28)?

**Na de keuze:** de gekozen stijl wordt een nieuwe beslissing, en pas dan wordt ze in de app
ingebouwd (blok 4), zoals afgesproken in #22.

## 43. Stijl A "Neon Stage"

**Beslissing (Kristof, 2026-10-11):** "bouw maar verder met stijl A". Stijl A uit het
stijlvoorbeeld (#42) wordt de stijl van de app:
- een donker podium met neon roze, cyaan, violet, lime en amber;
- letters: Unbounded (titels, cijfers, knoppen) + Outfit (tekst);
- gloed rond knoppen en cijfers.

**Aangenomen zonder aparte bevestiging** (Kristof antwoordde enkel op de stijlvraag):
- coach Lumi blijft zoals ze is;
- de gamenamen blijven Engels (#27);
- de HUD blijft zoals in het voorbeeld.
Dat kan nog wijzigen zonder veel werk.

**Gevolgen:**
- De tokens staan als CSS-variabelen in `src/app/styles.css` (`:root`), dezelfde waarden als in
  `public/stijl/`.
- De lettertypes zitten in de bundel (`src/app/fonts/`, met de OFL-licentie erbij) en worden
  offline mee bewaard.
- Lumi is een React-component (`CoachLumi.tsx`).

## 44. Vast verloop per game

**Voorstel:** elke game volgt dezelfde stappen (`src/app/game/GameRunner.tsx`):
1. **Uitleg:** Lumi en 2–3 korte zinnen, plus "jouw doel" (#30). Een volwassene tikt
   "Ik ben klaar!", en het kind gaat op zijn plek staan.
2. **Ruimte-check** (#18, #38): tips tot de speler goed staat, met de nodige punten per game.
3. **3-2-1-GO**.
4. **Spelen:** de tijd loopt enkel als de speler in beeld is. Uit beeld = pauze (#18). Het
   model wisselt niet (#39).
5. **Resultaat:** sterren, % van het leeftijdsdoel, tijd per Power-zone, extra's, en de knoppen
   "Nog eens!" en "Menu".

**Waarom:** de kinderen leren het één keer, en elke nieuwe game (blok 6/7) hoeft enkel zijn eigen
spelregels en HUD-element te leveren. Voor de opwarming en de rustpauzes (blok 8) komt er later
een stap vóór of na een game bij.

## 45. Spotlight Sprint: regels, doelen, sterren

**Voorstel:**
- **20 s** knieën hoog ter plaatse (#29: kort en explosief). Een stap = één knie omhoog en terug
  (detector `knieen`, #37).
- **Leeftijdsdoel** in stappen (beide benen samen) in 20 s:

  | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13+ |
  |---|---|---|---|---|---|---|---|
  | 35 | 38 | 41 | 44 | 47 | 50 | 53 | 55 |

  Dat is ±1,75 stappen/s voor een 6-jarige tot ±2,75/s vanaf 13 jaar. Het is een **inschatting**:
  af te stellen met opnames van echte kinderen (#40).
- **Sterren:** ≥ 50% ★ · ≥ 80% ★★ · ≥ 100% ★★★ (`STAR_THRESHOLDS`, voor alle games).
- **Spotlight:** elke stap vult een meter en maakt de lichtbundel breder en feller (kleur = de
  huidige Power-zone). Bij 25/50/75% verschijnen "GOED ZO!", "HALFWEG!" en "BIJNA!". Bij het doel
  komt "SPOTLIGHT ON!" en pulseert de bundel. Daarna volgt elke 10 stappen een "PERFECT!".
- Lumi moedigt aan met teksten die afhangen van de tijd en het tempo. Gesproken versie: blok 5.

## 46. Leeftijd kiezen en onthouden

**Voorstel:** op het startscherm kies je 6–12 of 13+. De games blijven grijs tot er een
leeftijd gekozen is. De keuze wordt in de browser onthouden (`localStorage`). Lukt dat niet
(privévenster), dan kies je ze gewoon opnieuw. In de estafette (blok 8) krijgt elke speler zijn
eigen leeftijd (#10).
