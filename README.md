# Idol Academy

Test-app: bewegingsgames met de camera van een gsm of tablet, in de browser. Het camerabeeld
blijft op het toestel; er wordt niets opgeslagen of verstuurd.

**Live:** https://kristofpeeters81-lgtm.github.io/IdolAcademy/

## Documentatie
- [PLANNING.md](PLANNING.md): bouwblokken en status
- [BESLISSINGEN.md](BESLISSINGEN.md) + [BESLISSINGEN-UITLEG.md](BESLISSINGEN-UITLEG.md)
- [docs/BOUWLOG.md](docs/BOUWLOG.md): hoe de app gebouwd is
- [docs/HERBOUW-BWORLD.md](docs/HERBOUW-BWORLD.md): gids om dit in B-world te herbouwen

## Ontwikkelen
```bash
npm install
npm run dev        # http://localhost:5327 (camera werkt op localhost)
npm test           # unit tests
npm run build      # productieversie in dist/ (met CSP)
npm run e2e -- filmpje.y4m   # eind-tot-eind-test met nep-camera (zie scripts/e2e.mjs)
```
Testen op een gsm in hetzelfde netwerk werkt niet via `http://<ip>:5327`, omdat de camera
https vereist. Gebruik daarvoor de live link (elke push naar `main` publiceert automatisch).

## Licenties
MediaPipe (model + WASM) © Google, Apache License 2.0. Zie
[public/mediapipe/LICENSE.txt](public/mediapipe/LICENSE.txt).
