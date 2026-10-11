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
