// Screenshot van een pagina uit de gebouwde app (dist/), bv. het stijlvoorbeeld.
// Gebruik: npm run build && node scripts/screenshot.mjs stijl/ uit.png [breedte] [hoogte]
import { preview } from 'vite';
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const [, , page = '', out = 'e2e-output/screenshot.png', w = '1280', h = '900'] = process.argv;
const CHROME =
  process.env.CHROME_PATH ??
  ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome'].find((p) => fs.existsSync(p));

const server = await preview({ preview: { port: 4328, strictPort: true } });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
try {
  const tab = await browser.newPage();
  await tab.setViewport({ width: Number(w), height: Number(h), deviceScaleFactor: 1 });
  const errors = [];
  tab.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  tab.on('requestfailed', (r) => errors.push(`mislukt: ${r.url()}`));
  tab.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()}: ${r.url()}`));
  await tab.goto(`http://localhost:4328/${page}`, { waitUntil: 'networkidle0' });
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: out, fullPage: true });
  console.log(errors.length ? `fouten:\n${errors.join('\n')}` : `ok → ${out}`);
} finally {
  await browser.close();
  await new Promise((r) => server.httpServer.close(r));
}
