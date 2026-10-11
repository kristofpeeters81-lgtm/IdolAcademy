// Eind-tot-eind-test in echte Chrome (headless) met een nep-camera.
//
// Gebruik:  npm run build && npm run e2e -- <video.y4m>
//   <video.y4m> = een filmpje van iemand die beweegt (640x480, y4m). Maken met ffmpeg:
//   ffmpeg -i in.mp4 -t 20 -vf "scale=640:480:force_original_aspect_ratio=decrease,pad=640:480:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p" uit.y4m
//
// Controleert op de gebouwde versie (dus mét de CSP, #4):
//   1. de app start, de camera en het model laden;
//   2. er wordt een lichaam gevonden (skelet);
//   3. wisselen naar full en terug naar lite lukt;
//   4. er gaat geen enkel verzoek naar een ander domein en er zijn geen CSP-schendingen.
// Screenshots en het meetrapport komen in e2e-output/.

import { preview } from 'vite';
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const video = process.argv[2];
if (!video || !fs.existsSync(video)) {
  console.error('Geef een .y4m-filmpje mee: npm run e2e -- pad/naar/filmpje.y4m');
  process.exit(2);
}
const OUT = path.resolve('e2e-output');
fs.mkdirSync(OUT, { recursive: true });
const CHROME =
  process.env.CHROME_PATH ??
  ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome'].find((p) =>
    fs.existsSync(p),
  );

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) failures++;
};

const server = await preview({ preview: { port: 4327, strictPort: true } });
const url = 'http://localhost:4327/';
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    `--use-file-for-fake-video-capture=${path.resolve(video)}`,
    '--enable-unsafe-swiftshader',
    '--window-size=1280,800',
  ],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const external = [];
  const consoleErrors = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (!['localhost', '127.0.0.1'].includes(u.hostname) && !u.protocol.startsWith('data') && !u.protocol.startsWith('blob')) external.push(r.url());
  });
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  await page.evaluateOnNewDocument(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });

  await page.goto(url, { waitUntil: 'networkidle0' });
  const csp = await page.$eval('meta[http-equiv="Content-Security-Policy"]', (m) => m.content).catch(() => '');
  check(csp.includes("connect-src 'self'"), 'CSP aanwezig met connect-src self');
  await page.screenshot({ path: path.join(OUT, '1-start.png') });

  await page.click('button.big');
  // Meetpaneel staat standaard ingeklapt (vanaf blok 2): openklikken.
  await page.waitForSelector('.debug-toggle', { timeout: 60000 });
  await page.click('.debug-toggle');
  // Wachten tot het model geladen is en er een lichaam gevonden wordt.
  const t0 = Date.now();
  const found = await page
    .waitForFunction(() => /([1-9])\/9 zichtbaar/.test(document.querySelector('.debug')?.textContent ?? ''), { timeout: 60000 })
    .then(() => true)
    .catch(() => false);
  check(found, `lichaam gevonden (na ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  await new Promise((r) => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(OUT, '2-skelet-lite.png') });

  const panel = () => page.$eval('.debug dl', (d) => d.textContent ?? '');
  console.log('  meetpaneel (lite):', (await panel()).replace(/\s+/g, ' '));

  // Wisselen naar full.
  await page.evaluate(() => [...document.querySelectorAll('.debug .seg button')].find((b) => b.textContent === 'full')?.click());
  const full = await page
    .waitForFunction(() => /Model\s*full/.test(document.querySelector('.debug dl')?.textContent ?? ''), { timeout: 60000 })
    .then(() => true)
    .catch(() => false);
  check(full, 'wisselen naar full-model');
  await new Promise((r) => setTimeout(r, 3000));
  console.log('  meetpaneel (full):', (await panel()).replace(/\s+/g, ' '));
  await page.screenshot({ path: path.join(OUT, '3-skelet-full.png') });

  // Meetrapport.
  await page.evaluate(() => [...document.querySelectorAll('.debug button')].find((b) => b.textContent === 'Meetrapport')?.click());
  const report = await page.$eval('.report textarea', (t) => t.value).catch(() => '');
  check(report.includes('"detectieFps"'), 'meetrapport wordt opgebouwd');
  fs.writeFileSync(path.join(OUT, 'meetrapport.json'), report);

  // Terug naar lite.
  await page.evaluate(() => [...document.querySelectorAll('.debug .seg button')].find((b) => b.textContent === 'lite')?.click());
  const lite = await page
    .waitForFunction(() => /Model\s*lite/.test(document.querySelector('.debug dl')?.textContent ?? ''), { timeout: 30000 })
    .then(() => true)
    .catch(() => false);
  check(lite, 'terug naar lite-model');

  // --- Testlab (blok 2) ---
  const spaceOk = await page
    .waitForFunction(() => !document.querySelector('.space-banner'), { timeout: 30000 })
    .then(() => true)
    .catch(() => false);
  const banner = await page.$eval('.space-banner p', (p) => p.textContent).catch(() => null);
  check(spaceOk, `ruimte-check wordt klaar${banner ? ' (laatste tip: ' + banner + ')' : ''}`);
  await page.select('.lab-head select', 'jumpingjack');
  await new Promise((r) => setTimeout(r, 9000));
  const jj = await page.$eval('.lab-count .num', (n) => Number(n.textContent));
  console.log(`  jumping jacks geteld in ~9 s testfilmpje: ${jj}`);
  check(jj > 0, 'testlab telt jumping jacks');
  await page.screenshot({ path: path.join(OUT, '4-testlab.png') });

  // Opname van 10 s: aftellen 5 s + 10 s opnemen, daarna bewaren naar e2e-output/.
  const cdp = await page.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: OUT });
  for (const f of fs.readdirSync(OUT)) if (f.startsWith('opname-')) fs.unlinkSync(path.join(OUT, f));
  await page.select('.lab .row select', '10');
  await page.evaluate(() => [...document.querySelectorAll('.lab button')].find((b) => b.textContent.includes('Opnemen'))?.click());
  const dialog = await page.waitForSelector('.dialog', { timeout: 30000 }).then(() => true).catch(() => false);
  check(dialog, 'opname loopt af en vraagt het echte aantal');
  await page.screenshot({ path: path.join(OUT, '5-opname-bewaren.png') });
  await page.evaluate(() => [...document.querySelectorAll('.dialog button')].find((b) => b.textContent.includes('Bewaar'))?.click());
  let file = null;
  for (let i = 0; i < 50 && !file; i++) {
    await new Promise((r) => setTimeout(r, 200));
    file = fs.readdirSync(OUT).find((f) => f.startsWith('opname-jumpingjack') && f.endsWith('.json'));
  }
  let recOk = false;
  if (file) {
    const rec = JSON.parse(fs.readFileSync(path.join(OUT, file), 'utf8'));
    recOk = rec.format === 'idol-academy-opname' && rec.frames.length > 100 && rec.detector === 'jumpingjack';
    console.log(`  opname: ${file}, ${rec.frames.length} beelden, app telde ${rec.detected}, ${Math.round(fs.statSync(path.join(OUT, file)).size / 1024)} KB`);
  }
  check(recOk, 'opnamebestand gedownload en geldig');

  // Raak-oefening: er moet een doel over het beeld verschijnen; opnemen is hier uitgeschakeld.
  await page.select('.lab-head select', 'raken');
  // Raken vraagt enkel het bovenlichaam: de ruimte-check loopt dan opnieuw (1,5 s goed staan).
  const targetShown = await page
    .waitForSelector('.target', { timeout: 15000 })
    .then(() => true)
    .catch(async () => {
      console.log('  laatste tip:', await page.$eval('.space-banner p', (p) => p.textContent).catch(() => '(geen)'));
      return false;
    });
  const recDisabled = await page.evaluate(() => [...document.querySelectorAll('.lab button')].find((b) => b.textContent.includes('Opnemen'))?.disabled);
  check(targetShown && recDisabled === true, 'raak-oefening toont een doel (opnemen uitgeschakeld)');
  await page.screenshot({ path: path.join(OUT, '5b-raken.png') });

  // Gsm-formaat (staand) ter controle van de opmaak.
  await page.setViewport({ width: 412, height: 892, deviceScaleFactor: 2 }); // zonder isMobile: dat herlaadt de pagina
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT, '6-gsm-staand.png') });

  const violations = await page.evaluate(() => window.__csp);
  check(violations.length === 0, `geen CSP-schendingen${violations.length ? ': ' + violations.join(', ') : ''}`);
  check(external.length === 0, `geen verzoeken naar andere domeinen${external.length ? ': ' + external.join(', ') : ''}`);
  const relevantErrors = consoleErrors.filter((e) => !/favicon/i.test(e));
  check(relevantErrors.length === 0, `geen fouten in de console${relevantErrors.length ? ': ' + relevantErrors.join(' | ') : ''}`);
} finally {
  await browser.close();
  await new Promise((r) => server.httpServer.close(r));
}

console.log(failures ? `\n${failures} controle(s) mislukt` : '\nAlle controles geslaagd');
process.exit(failures ? 1 : 0);
