# Opnames als testdata (#31, #40)

Elke `.json` in deze map wordt bij `npm test` automatisch afgespeeld door de juiste detector
(`src/motor/fixtures.test.ts`). De test slaagt als de detector (bijna) evenveel telt als de
speler zelf opgaf: ±1, of ±10% bij grotere aantallen. Bij houdingen (seconden) is dat ±1,5 s.

## Zo kom je aan een opname
1. Open de app, kies een beweging in het testlab, kies een duur en tik **● Opnemen**.
2. Je krijgt 5 s om op je plek te gaan staan, daarna wordt er opgenomen.
3. Vul in hoeveel je er **echt** deed (zelf geteld), met een notitie (leeftijd, toestel staand of
   liggend…), en tik **Bewaar opname**. Het bestand komt in **Downloads** op het toestel.
4. Zet het bestand in deze map, bv. via e-mail, WhatsApp of een USB-kabel naar de pc.

Er staan enkel lichaamspunten in (33 punten × x/y/z/zichtbaarheid per beeld), nooit beelden.
Hoort een opname bij een kind? Vraag dan toestemming aan de ouder, want ook bewegingsdata kan
persoonlijk zijn. De repo is **publiek**: commit opnames van kinderen enkel met die
toestemming, of hou ze lokaal (zet ze dan in `test-fixtures/lokaal/`, die map staat in
`.gitignore`).
