// Rendert de beat (2 maten per Power-zone, 0 → 3) naar e2e-output/beat.wav en meet het volume.
// Zo kan je de muziek beluisteren en controleren dat ze niet stil is en niet oversturt.
// Gebruik: node scripts/render-beat.mjs
import { createServer } from 'vite';
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME =
  process.env.CHROME_PATH ??
  ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome'].find((p) => fs.existsSync(p));
const OUT = path.resolve('e2e-output');
fs.mkdirSync(OUT, { recursive: true });

const server = await createServer({ server: { port: 5329, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
try {
  const page = await browser.newPage();
  await page.goto('http://localhost:5329/', { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(async () => {
    const music = await import('/src/audio/music.ts');
    const synth = await import('/src/audio/synth.ts');
    const sr = 44100;
    const barsPerLevel = 2;
    // Tempo per maat zoals in het spel (geleidelijk sneller).
    const plan = [];
    let bpm = music.tempoTarget(0);
    for (let level = 0; level < 4; level++) {
      for (let b = 0; b < barsPerLevel; b++) {
        plan.push({ level, bpm });
        bpm = music.nextTempo(bpm, level);
      }
    }
    const seconds = plan.reduce((s, p) => s + music.stepSeconds(p.bpm) * music.STEPS_PER_BAR, 0) + 1;
    const ctx = new OfflineAudioContext(1, Math.ceil(seconds * sr), sr);
    const bus = ctx.createGain();
    bus.gain.value = 0.7; // MUSIC_VOLUME (director.ts)
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.ratio.value = 8;
    bus.connect(limiter).connect(ctx.destination);
    let t = 0.05;
    plan.forEach((p, bar) => {
      const len = music.stepSeconds(p.bpm);
      for (let step = 0; step < music.STEPS_PER_BAR; step++) {
        for (const e of music.stepEvents(bar, step, p.level)) {
          if (e.instrument === 'kick') synth.kick(ctx, bus, t, e.velocity);
          if (e.instrument === 'clap') synth.clap(ctx, bus, t, e.velocity);
          if (e.instrument === 'hat') synth.hat(ctx, bus, t, e.velocity);
          if (e.instrument === 'bass') synth.bass(ctx, bus, t, e.midi[0], len * e.steps, e.velocity);
          if (e.instrument === 'chord') synth.chord(ctx, bus, t, e.midi, len * e.steps, e.velocity);
          if (e.instrument === 'arp') synth.pluck(ctx, bus, t, e.midi[0], e.velocity);
        }
        t += len;
      }
    });
    const buf = await ctx.startRendering();
    const data = buf.getChannelData(0);
    // Volume per zone-deel.
    const per = [];
    let start = 0.05;
    for (let level = 0; level < 4; level++) {
      const dur = plan.filter((p) => p.level === level).reduce((s, p) => s + music.stepSeconds(p.bpm) * 16, 0);
      let peak = 0;
      let sum = 0;
      const a = Math.floor(start * sr);
      const b = Math.floor((start + dur) * sr);
      for (let i = a; i < b; i++) {
        peak = Math.max(peak, Math.abs(data[i]));
        sum += data[i] * data[i];
      }
      per.push({ level, peak: +peak.toFixed(3), rms: +Math.sqrt(sum / (b - a)).toFixed(3), bpmStart: plan.find((p) => p.level === level).bpm });
      start += dur;
    }
    // WAV (16-bit mono).
    const pcm = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) pcm[i] = Math.max(-1, Math.min(1, data[i])) * 32767;
    return { per, seconds: +seconds.toFixed(1), pcm: Array.from(pcm), sr };
  });
  const pcm = Int16Array.from(result.pcm);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length * 2, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(result.sr, 24);
  header.writeUInt32LE(result.sr * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length * 2, 40);
  fs.writeFileSync(path.join(OUT, 'beat.wav'), Buffer.concat([header, Buffer.from(pcm.buffer)]));
  console.log(`beat.wav: ${result.seconds} s`);
  for (const z of result.per) console.log(`  zone ${z.level}: vanaf ${z.bpmStart} bpm · piek ${z.peak} · rms ${z.rms}`);
} finally {
  await browser.close();
  await server.close();
}
