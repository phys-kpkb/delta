// Рендер трейлера у MP4 (1080×1920, 30 fps, H.264 + AAC).
// Потрібні: node, playwright (з Chromium) і ffmpeg у PATH.
//   node trailer/render.mjs [вихід.mp4] [--shots папка]
import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const out = path.resolve(args.find((a) => a.endsWith('.mp4')) || 'trailer.mp4');
const shotsDir = args.includes('--shots') ? path.resolve(args[args.indexOf('--shots') + 1]) : null;
if (shotsDir) fs.mkdirSync(shotsDir, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
page.on('pageerror', (e) => console.error('page error:', e));
await page.goto(`http://localhost:${port}/trailer/index.html`);
await page.waitForFunction(() => window.trailer);
await page.evaluate(async () => {
  await Promise.all([
    document.fonts.load('800 80px Unbounded', 'ОРДЕН'), document.fonts.load('700 80px Unbounded', 'ОРДЕН'),
    document.fonts.load('800 40px Manrope', 'Шлях'), document.fonts.load('700 40px Manrope', 'Шлях'), document.fonts.load('600 40px Manrope', 'Шлях'),
  ]);
});
const { DURATION, FPS } = await page.evaluate(() => ({ DURATION: window.trailer.DURATION, FPS: window.trailer.FPS }));
const N = Math.round(DURATION * FPS);
console.log(`кадрів: ${N}, тривалість ${DURATION} с`);

// звук
const wavB64 = await page.evaluate(async () => {
  const blob = await window.trailer.renderAudio();
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return btoa(s);
});
const wav = out.replace(/\.mp4$/, '.wav');
fs.writeFileSync(wav, Buffer.from(wavB64, 'base64'));

const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
  '-i', wav,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.1',
  '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '44100', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });

for (let i = 0; i < N; i++) {
  const b64 = await page.evaluate((i) => { window.trailer.renderFrame(i); return document.getElementById('c').toDataURL('image/png').split(',')[1]; }, i);
  const buf = Buffer.from(b64, 'base64');
  if (shotsDir && i % 15 === 0) fs.writeFileSync(path.join(shotsDir, `f${String(i).padStart(4, '0')}.png`), buf);
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % 150 === 0) console.log(`  кадр ${i}/${N}`);
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
fs.unlinkSync(wav);
await browser.close();
server.close();
console.log('готово:', out);
