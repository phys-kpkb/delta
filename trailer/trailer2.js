// Трейлер рівня II «Динаміка»: кадри малює рушій гри, а титри й картки
// домальовуються поверх. renderFrame(i) дає детермінований кадр,
// renderAudio() рендерить саундтрек офлайн. Збирає все render.mjs.
import { Game } from '../js/game.js';
import { LEVELS, DOOR_TYPES } from '../js/levels.js';
import { CLASSES, heroSprite, sprite, SPR, ICON, makeCanvas } from '../js/art.js';

export const W = 1080, H = 1920, FPS = 30;

// детермінований Math.random (пилинки, конфеті тощо)
let rs = 12345;
Math.random = () => { rs = (rs * 16807) % 2147483647; return (rs - 1) / 2147483646; };

const cv = document.getElementById('c');
cv.width = W; cv.height = H;
const ctx = cv.getContext('2d');

const COL = {
  gold: '#d8b04a', hi: '#f6de8f', lo: '#8c6b22', dk: '#3a301a',
  text: '#f3eee2', muted: '#a39880', red: '#e06a4e', green: '#7fcf8a', panel: '#120e07',
};
const UNB = 'Unbounded, "Arial Black", sans-serif';
const MAN = 'Manrope, "Segoe UI", sans-serif';
const SERIF = '"Cambria Math", "Times New Roman", serif';

// ---------- математика руху ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const eOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const eIn = (t) => Math.pow(clamp(t), 3);
const eInOut = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const eBack = (t) => { t = clamp(t); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const seg = (t, a, b) => clamp((t - a) / (b - a));

// ---------- текст і фігури ----------
function txt(s, x, y, { size = 40, font = MAN, weight = 700, color = COL.text, align = 'left', base = 'alphabetic', ls = 0, alpha = 1, shadow = 0, italic = false } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${font}`;
  ctx.textAlign = align; ctx.textBaseline = base;
  ctx.letterSpacing = ls + 'px';
  if (shadow) { ctx.shadowColor = 'rgba(216,176,74,.55)'; ctx.shadowBlur = shadow; }
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
  ctx.restore();
}
function measure(s, size, font = MAN, weight = 700, ls = 0) {
  ctx.save(); ctx.font = `${weight} ${size}px ${font}`; ctx.letterSpacing = ls + 'px';
  const w = ctx.measureText(s).width; ctx.restore(); return w;
}
function wrap(s, maxW, size, font = MAN, weight = 700) {
  const words = s.split(' '), lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (measure(t, size, font, weight) > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}
function rrect(x, y, w, h, r) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
}
function panel(x, y, w, h, r = 36, { fill = 'rgba(14,11,6,.94)', stroke = COL.dk, lw = 3, glow = 0 } = {}) {
  ctx.save();
  if (glow) { ctx.shadowColor = 'rgba(216,176,74,.5)'; ctx.shadowBlur = glow; }
  rrect(x, y, w, h, r);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#1b150b'); g.addColorStop(1, '#0a0805');
  ctx.fillStyle = fill === 'grad' ? g : fill; ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke();
  ctx.restore();
}
function pix(img, x, y, scale, { alpha = 1, flip = false } = {}) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha *= alpha;
  if (flip) { ctx.translate(x + img.width * scale, y); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, img.width * scale, img.height * scale); }
  else ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
  ctx.restore();
}
const iconCache = {};
function icon(name) {
  if (!iconCache[name]) {
    const c = makeCanvas(16, 16), g = c.getContext('2d');
    ICON[name]((col, x, y, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(x, y, w, h); });
    iconCache[name] = c;
  }
  return iconCache[name];
}
function vignette(a = 0.7) {
  const g = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.25, W / 2, H * 0.5, H * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function glowBg(cx, cy, r, a = 0.2) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, `rgba(216,176,74,${a})`); g.addColorStop(1, 'rgba(216,176,74,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function flash(a, col = '246,222,143') {
  if (a <= 0) return;
  ctx.fillStyle = `rgba(${col},${clamp(a)})`; ctx.fillRect(0, 0, W, H);
}
function deltaMark(cx, cy, size, prog, lw = 18, alpha = 1) {
  // трикутник Δ, що «малюється» за prog 0..1
  const pts = [[cx, cy - size * 0.58], [cx + size * 0.5, cy + size * 0.29], [cx - size * 0.5, cy + size * 0.29]];
  const total = 3;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = COL.gold; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(216,176,74,.8)'; ctx.shadowBlur = 40;
  ctx.beginPath(); ctx.moveTo(...pts[0]);
  let left = prog * total;
  for (let i = 0; i < 3 && left > 0; i++) {
    const a = pts[i], b = pts[(i + 1) % 3], k = Math.min(1, left);
    ctx.lineTo(lerp(a[0], b[0], k), lerp(a[1], b[1], k));
    left -= 1;
  }
  ctx.stroke();
  if (prog >= 1) {
    ctx.fillStyle = COL.hi; ctx.beginPath(); ctx.arc(cx, cy + size * 0.05, lw * 0.75, 0, 7); ctx.fill();
  }
  ctx.restore();
}
function chip(s, x, y, { size = 30, color = COL.hi, border = COL.lo, fill = 'rgba(216,176,74,.10)', align = 'center' } = {}) {
  const w = measure(s, size, MAN, 800) + size * 1.3, h = size * 1.9;
  const x0 = align === 'center' ? x - w / 2 : x;
  ctx.save(); rrect(x0, y, w, h, h / 2); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = border; ctx.stroke(); ctx.restore();
  txt(s, x0 + w / 2, y + h / 2 + size * 0.36, { size, weight: 800, color, align: 'center' });
  return w;
}
function caption(kicker, title, t, y = 120, { size = 76 } = {}) {
  const a = eOut(t / 0.35);
  const dy = (1 - a) * 40;
  if (kicker) txt(kicker, W / 2, y + dy, { size: 30, weight: 800, color: COL.gold, align: 'center', ls: 8, alpha: a });
  const lines = Array.isArray(title) ? title : [title];
  lines.forEach((l, i) => txt(l, W / 2, y + 92 + i * size * 1.08 + dy * (1 + i * 0.5), { size, font: UNB, weight: 800, align: 'center', alpha: a, shadow: 30 }));
}

// ---------- пилинки фону ----------
const motes = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 2 + Math.random() * 5, v: 20 + Math.random() * 60, p: Math.random() * 6 }));
function drawMotes(t, a = 1) {
  for (const m of motes) {
    const y = ((m.y - t * m.v) % H + H) % H;
    const x = m.x + Math.sin(t + m.p) * 14;
    ctx.fillStyle = `rgba(246,222,143,${a * (0.25 + 0.35 * Math.sin(t * 2 + m.p) ** 2)})`;
    ctx.fillRect(x, y, m.s, m.s);
  }
}


// ---------- рівень II: кімнати з рушія ----------
const L2 = LEVELS[1];
const P2 = [
  { m: 12, Fg: 120 },
  { m: 400, a: 1.5, F: 600 },
  { F1: 800, F2: 650, R: 150 },
  { m: 40, mu: 0.2, a: 1, Ftr: 80, Fm: 120, order: [0, 1, 2, 3] },
  { m: 200, mu: 0.1, a: 1.5, Fg: 2000, Ftr: 200, F: 500 },
];
const K = 7;
const MY = '#a259ff', MYHI = '#d6b0ff', OR = '#ff8a1f', RARE = '#f2c94c';
function mkGame(ri, cls, gender, start, mythicState) {
  const c = makeCanvas(1, 1);
  const g = new Game(c, { interact: (o) => { g.arrived = o; }, exit: () => { g.exited = true; }, toast() {} });
  g.k = K; c.width = 144 * K; c.height = 208 * K;
  g.setHero(cls, gender);
  g.setSpeed(2);
  const room = L2.rooms[ri];
  const objs = room.objects(P2[ri]).map((o) => {
    const x = { ...o };
    if (x.kind === 'door') { x.sprite = DOOR_TYPES[x.door].sprite; x.open = false; }
    if (x.kind === 'mythic') x.state = mythicState || null;
    return x;
  });
  const cs = room.catSpots[0];
  objs.push({ id: 'cat', kind: 'cat', x: cs[0], y: cs[1] });
  g.loadRoom(room, objs, start || room.entry);
  g.t0 = 0;
  return g;
}
function obj(g, id) { return g.objs.find((o) => o.id === id); }
function tapObj(g, id) {
  const o = obj(g, id);
  const path = g.bfs(g.approachTiles(o));
  g.player.path = path || []; g.pending = o; g.arrived = null;
  g.marker = { x: o.x + (o.w - 1) / 2, y: o.y, t: 0 };
  return o;
}
function tapTile(g, x, y) { g.goTo([[x, y]], null, true); }
function drawRoom(g, tms, cx = 540, cy = 1030, s = 1, alpha = 1) {
  g.draw(tms);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  const w = g.cv.width * s, h = g.cv.height * s;
  ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 60;
  ctx.drawImage(g.cv, cx - w / 2, cy - h / 2, w, h);
  ctx.restore();
}
function tileXY(tx, ty, cx = 540, cy = 1030, s = 1) {
  return [cx + ((tx + 0.5) * 16 * K - 504) * s, cy + ((ty + 0.5) * 16 * K - 728) * s];
}
function tapRipple(x, y, t, col = '246,222,143') {
  if (t < 0 || t > 0.7) return;
  const a = 1 - t / 0.7;
  ctx.save();
  ctx.strokeStyle = `rgba(${col},${a})`; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.arc(x, y, 30 + t * 120, 0, 7); ctx.stroke();
  ctx.fillStyle = `rgba(255,255,255,${a * 0.85})`;
  ctx.beginPath(); ctx.arc(x, y, 28 * (1 - t * 0.6), 0, 7); ctx.fill();
  ctx.restore();
}
function glowCol(cx, cy, r, rgb, a) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function sheet(p, h, purple = false) {
  const y = H - h * eOut(p);
  ctx.fillStyle = `rgba(0,0,0,${0.45 * eOut(p)})`; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.shadowColor = purple ? 'rgba(162,89,255,.55)' : 'rgba(216,176,74,.5)'; ctx.shadowBlur = 40;
  rrect(20, y, W - 40, h + 60, 48);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, purple ? '#241040' : '#1b150b'); g.addColorStop(1, purple ? '#0b0712' : '#0a0805');
  ctx.fillStyle = g; ctx.fill(); ctx.shadowBlur = 0;
  ctx.lineWidth = 3; ctx.strokeStyle = purple ? '#5b2f99' : COL.lo; ctx.stroke();
  ctx.restore();
  ctx.fillStyle = purple ? '#4b2a7a' : COL.dk; rrect(W / 2 - 50, y + 22, 100, 8, 4); ctx.fill();
  return y;
}
function iconBox(img, x, y, size = 150, purple = false) {
  panel(x, y, size, size, 28, { fill: '#000', stroke: purple ? '#5b2f99' : COL.dk });
  const sc = Math.floor((size - 30) / Math.max(img.width, img.height));
  pix(img, x + (size - img.width * sc) / 2, y + (size - img.height * sc) / 2, sc);
}
function givenChips(items, x, y, w) {
  // items: [text, found?]
  panel(x, y, w, 64 + Math.ceil(items.length / 3) * 84, 24, { fill: '#000', stroke: COL.dk });
  txt('ДАНО' + (items.some((i) => i[1]) ? ' І ЗНАЙДЕНО' : ''), x + 28, y + 46, { size: 26, weight: 800, color: COL.gold, ls: 6 });
  let cx = x + 28, cy = y + 70;
  for (const [s, found] of items) {
    const tw = measure(s, 40, SERIF, 400) + 40; // прямий шрифт: курсивна «т» схожа на «m»
    if (cx + tw > x + w - 20) { cx = x + 28; cy += 84; }
    ctx.save(); rrect(cx, cy, tw, 66, 14);
    ctx.fillStyle = found ? 'rgba(127,207,138,.12)' : 'rgba(216,176,74,.10)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = found ? 'rgba(127,207,138,.6)' : COL.dk; ctx.stroke(); ctx.restore();
    txt(s, cx + 20, cy + 46, { size: 40, font: SERIF, weight: 400, color: found ? COL.green : COL.hi });
    cx += tw + 14;
  }
  return cy + 66;
}
function okButton(x, y, pressT, purple = false) {
  const press = pressT > 0 && pressT < 0.2 ? 0.93 : 1;
  ctx.save(); ctx.translate(x + 105, y + 60); ctx.scale(press, press); ctx.translate(-(x + 105), -(y + 60));
  rrect(x, y, 210, 120, 26);
  const gr = ctx.createLinearGradient(0, y, 0, y + 120);
  if (purple) { gr.addColorStop(0, MYHI); gr.addColorStop(1, '#7c3fd0'); } else { gr.addColorStop(0, COL.hi); gr.addColorStop(1, '#b98f2e'); }
  ctx.fillStyle = gr; ctx.fill();
  txt('OK', x + 105, y + 80, { size: 50, font: UNB, weight: 800, color: purple ? '#14051f' : '#120d02', align: 'center' });
  ctx.restore();
}
function answerRow(x, y, typed, unit, okT, ok, purple) {
  panel(x, y, 520, 120, 26, { fill: '#000', stroke: ok ? COL.green : (purple ? MY : COL.gold), lw: 4 });
  txt(typed, x + 260, y + 82, { size: 64, font: UNB, weight: 700, align: 'center' });
  panel(x + 540, y, 170, 120, 26, { fill: '#000', stroke: COL.dk });
  txt(unit, x + 625, y + 80, { size: 44, weight: 800, color: COL.hi, align: 'center' });
  okButton(x + 730, y, okT, purple);
}
const TIERC = { rare: [RARE, 'РІДКІСНИЙ'], legendary: [OR, 'ЛЕГЕНДАРНИЙ'], mythic: [MYHI, 'МІФІЧНИЙ'] };
function bonusCard(x, y, w, ic, name, text, tier, glow = 0) {
  const [c, label] = TIERC[tier];
  ctx.save();
  if (glow) { ctx.shadowColor = c; ctx.shadowBlur = glow; }
  rrect(x, y, w, 230, 34);
  const g = ctx.createLinearGradient(0, y, 0, y + 230);
  g.addColorStop(0, tier === 'mythic' ? 'rgba(162,89,255,.30)' : tier === 'legendary' ? 'rgba(255,138,31,.22)' : '#15110a'); g.addColorStop(1, '#000');
  ctx.fillStyle = g; ctx.fill(); ctx.shadowBlur = 0;
  ctx.lineWidth = tier === 'rare' ? 3 : 5; ctx.strokeStyle = c; ctx.stroke();
  ctx.restore();
  pix(icon(ic), x + 36, y + 60, 7);
  const lw = measure(label, 24, MAN, 800, 4) + 34;
  ctx.save(); rrect(x + 200, y + 34, lw, 44, 22); ctx.lineWidth = 2; ctx.strokeStyle = c; ctx.stroke(); ctx.restore();
  txt(label, x + 217, y + 64, { size: 24, weight: 800, color: c, ls: 4 });
  txt(name, x + 200, y + 136, { size: 46, font: UNB, weight: 700, color: tier === 'rare' ? COL.hi : c });
  txt(text, x + 200, y + 192, { size: 34, weight: 600, color: '#d6cdb8' });
}

// ---------- сцени ----------
const scenes = [];
const scene = (dur, init, draw) => scenes.push({ dur, init, draw });

// 1. Інтро
scene(3, null, (t) => {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  glowBg(W / 2, 700, 700, 0.18 * eOut(t / 1.2));
  drawMotes(t, eOut(t));
  deltaMark(W / 2, 640, 300, eInOut(t / 0.9), 20);
  const a = eOut(seg(t, 0.5, 1.0));
  txt('ОРДЕН ДЕЛЬТИ', W / 2, 960 - (1 - a) * 30, { size: 34, weight: 800, color: COL.gold, align: 'center', ls: 14, alpha: a });
  const b = eBack(seg(t, 0.8, 1.3));
  ctx.save(); ctx.translate(W / 2, 1100); ctx.scale(b, b); ctx.translate(-W / 2, -1100);
  txt('РІВЕНЬ II', W / 2, 1130, { size: 120, font: UNB, weight: 800, align: 'center', shadow: 40 });
  ctx.restore();
  const c = eOut(seg(t, 1.3, 1.8));
  txt('ДИНАМІКА', W / 2, 1290 + (1 - c) * 50, { size: 120, font: UNB, weight: 800, align: 'center', color: COL.hi, shadow: 50, alpha: c });
  const d = eOut(seg(t, 1.9, 2.4));
  txt('Сила · Маса · Закони Ньютона', W / 2, 1400, { size: 44, weight: 700, color: COL.text, align: 'center', alpha: d });
  vignette(0.6);
});

// 2. Нові зали неправильної форми
const SHAPES = [
  [0, 'Арсенал', 'Г', 'carpenter', 'm', [6, 11], [2, 4]],
  [1, 'Двір тарана', 'П', 'radio', 'f', [2, 11], [6, 3]],
  [2, 'Зал канату', 'Г', 'welder', 'm', [6, 11], [2, 3]],
  [3, 'Крижаний двір', 'Ш', 'painter', 'f', [4, 11], [2, 4]],
];
let g2, g2i = -1;
scene(4.8, null, (t, T) => {
  const i = Math.min(3, Math.floor(t / 1.2)), lt = t - i * 1.2;
  const m = SHAPES[i];
  if (g2i !== i) { g2 = mkGame(m[0], m[3], m[4], m[5]); tapTile(g2, m[6][0], m[6][1]); g2i = i; }
  g2.update(1 / FPS);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  drawRoom(g2, T * 1000, 540, 1040, lerp(1.18, 1.0, eOut(lt / 1.1)));
  ctx.fillStyle = 'rgba(0,0,0,.66)'; ctx.fillRect(0, 0, W, 300);
  caption('НОВІ ЗАЛИ', 'НЕ ЛИШЕ ПРЯМОКУТНИКИ', t, 70, { size: 60 });
  const b = eBack(seg(lt, 0.1, 0.4));
  ctx.save(); ctx.translate(W / 2, 1830); ctx.scale(b, b);
  panel(-300, -66, 600, 104, 30, { fill: '#000', stroke: COL.lo, glow: 30 });
  txt(m[1], 0, 6, { size: 46, font: UNB, weight: 700, color: COL.hi, align: 'center' });
  ctx.restore();
  flash(0.45 - lt / 0.1);
  vignette(0.45);
});

// 3. Формули й яблуко Ньютона
scene(3.2, null, (t, T) => {
  ctx.fillStyle = '#050403'; ctx.fillRect(0, 0, W, H);
  glowBg(W / 2, 760, 800, 0.16);
  drawMotes(T, 0.6);
  pix(sprite('newton'), 90, 900, 18, { alpha: eOut(t / 0.4) });
  pix(sprite('apple_tree', 0), 690, 1040, 20, { alpha: eOut(t / 0.4) });
  // яблуко падає рівноприскорено
  const ft = seg(t, 1.4, 2.1);
  if (t > 1.4) {
    const y0 = 1180, y1 = 1520, yy = y0 + (y1 - y0) * ft * ft;
    const bounce = t > 2.1 ? Math.abs(Math.sin((t - 2.1) * 9)) * 60 * Math.max(0, 1 - (t - 2.1) * 1.4) : 0;
    ctx.fillStyle = '#c0261a'; ctx.fillRect(900, yy - bounce, 44, 44); ctx.fillStyle = '#ff6b5a'; ctx.fillRect(900, yy - bounce, 14, 14);
    ctx.fillStyle = '#4f7a3a'; ctx.fillRect(920, yy - bounce - 14, 8, 14);
  }
  const a = eBack(seg(t, 0.15, 0.5));
  ctx.save(); ctx.translate(W / 2, 430); ctx.scale(a, a);
  txt('F = m·a', 0, 0, { size: 190, font: SERIF, weight: 400, italic: true, color: COL.hi, align: 'center', shadow: 50 });
  ctx.restore();
  const b = eOut(seg(t, 0.7, 1.0)), c = eOut(seg(t, 1.0, 1.3));
  txt('F = m·g', W / 2, 620, { size: 84, font: SERIF, weight: 400, color: COL.text, align: 'center', alpha: b });
  txt('Fтр = μ·m·g', W / 2, 750, { size: 84, font: SERIF, weight: 400, color: COL.text, align: 'center', alpha: c });
  txt('ТРИ ЗАКОНИ НЬЮТОНА', W / 2, 150, { size: 34, weight: 800, color: COL.gold, align: 'center', ls: 10, alpha: eOut(t / 0.3) });
  vignette(0.55);
  flash(0.5 - t / 0.12);
});

// 4. Геймплей у Арсеналі
let g4, st4;
scene(6.5, () => { g4 = mkGame(0, 'radio', 'f', [5, 9]); st4 = { ph: 0, tap: [] }; }, (t, T) => {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (st4.ph === 0 && t >= 0.2) { tapObj(g4, 'shield'); st4.tap.push([t, 6, 8]); st4.ph = 1; }
  if (st4.ph === 1 && g4.arrived) { st4.cardT = t; st4.ph = 2; }
  if (st4.ph === 2 && t >= 2.6) { st4.cardT = null; tapObj(g4, 'door'); st4.tap.push([t, 2, 1]); st4.ph = 3; }
  if (st4.ph === 3 && g4.arrived) { st4.doorT = t; st4.ph = 4; }
  if (st4.ph === 4 && t >= 5.6) { obj(g4, 'door').open = true; st4.openT = t; st4.ph = 5; }
  g4.update(1 / FPS);
  const shake = st4.openT ? Math.max(0, 1 - (t - st4.openT) / 0.4) * 14 : 0;
  drawRoom(g4, T * 1000, 540 + Math.sin(t * 60) * shake, 1030, 1);
  for (const [t0, tx, ty] of st4.tap) { const [x, y] = tileXY(tx, ty); tapRipple(x, y, t - t0); }
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, W, 300);
  if (t < 2.6) caption('ГЕЙМПЛЕЙ', 'ЗНАЙДИ ДАНІ', t, 70);
  else if (t < 5.6) caption('СИЛА ТЯЖІННЯ', 'F = m·g = 120 Н', t - 2.6, 70);
  else caption('ПРАВИЛЬНО', 'ДВЕРІ ВІДЧИНЕНО', t - 5.6, 70);
  if (st4.cardT != null) {
    const tt = t - st4.cardT;
    const y = sheet(tt / 0.3, 560);
    iconBox(sprite('shield_stand'), 70, y + 70);
    txt('ПІДКАЗКА', 250, y + 125, { size: 28, weight: 800, color: COL.gold, ls: 6 });
    txt('Бойовий щит', 250, y + 196, { size: 54, font: UNB, weight: 700 });
    txt('Табличка: «Щит Ордену Дельти.', 70, y + 320, { size: 42, weight: 600, color: '#e6dfcf' });
    txt('Маса 12 кг.', 70, y + 380, { size: 42, weight: 800, color: COL.hi });
    txt('Не впускати на ногу.»', 70, y + 440, { size: 42, weight: 600, color: '#e6dfcf' });
  }
  if (st4.doorT != null && t < 5.9) {
    const tt = t - st4.doorT, out = t >= 5.6 ? (t - 5.6) / 0.3 : 0;
    const y = sheet((tt / 0.3) * (1 - out), 820);
    iconBox(sprite('door_oak'), 70, y + 70);
    txt('ДВЕРІ · ЗАЛ 1', 250, y + 125, { size: 28, weight: 800, color: COL.gold, ls: 6 });
    txt('Дубові двері', 250, y + 196, { size: 54, font: UNB, weight: 700 });
    const q = wrap('З якою силою тяжіння Земля притягує бойовий щит?', W - 140, 46, MAN, 700);
    q.forEach((l, i) => txt(l, 70, y + 300 + i * 60, { size: 46, weight: 700 }));
    const typed = tt < 0.5 ? '' : tt < 0.7 ? '1' : tt < 0.9 ? '12' : '120';
    const ok = tt > 1.3;
    answerRow(70, y + 300 + q.length * 60 + 20, typed, 'Н', tt - 1.15, ok, false);
    if (ok) txt('✓ Правильно!', 70, y + 300 + q.length * 60 + 220, { size: 50, weight: 800, color: COL.green, alpha: eOut(seg(tt, 1.3, 1.5)) });
  }
  if (st4.openT) flash(0.55 - (t - st4.openT) / 0.35);
  vignette(0.45);
});

// 5. Рідкісність бонусів
scene(4.2, null, (t, T) => {
  ctx.fillStyle = '#050403'; ctx.fillRect(0, 0, W, H);
  glowBg(W / 2, 1000, 900, 0.12);
  drawMotes(T, 0.6);
  caption('НОВЕ', ['БОНУСИ МАЮТЬ', 'РІДКІСТЬ'], t, 90, { size: 70 });
  const cards = [
    ['hourglass', 'Пісочний годинник', '−20 с від часу', 'rare'],
    ['chronos', 'Годинник Хроноса', '−45 с від часу', 'legendary'],
    ['eternity', 'Пісок вічності', '−60 с від часу', 'mythic'],
  ];
  cards.forEach(([ic, n, d, tier], i) => {
    const t0 = 0.35 + i * 0.45;
    const a = eBack(seg(t, t0, t0 + 0.4));
    if (a <= 0) return;
    const y = 520 + i * 290;
    const glow = tier === 'rare' ? 0 : (tier === 'legendary' ? 40 : 60 + 25 * Math.sin(t * 6));
    ctx.save(); ctx.translate(540, y + 115); ctx.scale(a, a); ctx.translate(-540, -(y + 115));
    bonusCard(60, y, 960, ic, n, d, tier, glow);
    ctx.restore();
  });
  const k = eOut(seg(t, 2.2, 2.6));
  ctx.save(); ctx.globalAlpha = k;
  panel(60, 1450, 960, 200, 30, { fill: 'rgba(255,138,31,.08)', stroke: OR });
  pix(icon('key'), 100, 1494, 7);
  txt('Ключ тепер легендарний', 260, 1530, { size: 44, font: UNB, weight: 700, color: OR });
  txt('рідкісний, але за міфічні двері — завжди', 260, 1590, { size: 32, weight: 600, color: '#d6cdb8' });
  ctx.restore();
  vignette(0.55);
  flash(0.45 - t / 0.12);
});

// 6. Міфічні двері
let g6, st6;
scene(8.4, () => { g6 = mkGame(3, 'painter', 'f', [6, 7]); tapObj(g6, 'mythic'); st6 = {}; }, (t, T) => {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (t >= 5.7 && !st6.won) { obj(g6, 'mythic').state = 'won'; st6.won = true; }
  g6.update(1 / FPS);
  const z = eInOut(seg(t, 0, 1.6));
  const s = lerp(1, 1.9, z);
  const [dx, dy] = tileXY(6, 1, 540, 1030, 1);
  const cx = lerp(540, 540 + (540 - dx) * 0.9, z), cy = lerp(1030, 1030 + (1000 - dy) * 0.9, z);
  drawRoom(g6, T * 1000, cx, cy, s);
  glowCol(W / 2, 760, 700, '162,89,255', 0.18 + 0.08 * Math.sin(t * 4));
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, 300);
  if (t < 1.8) {
    const a = eOut(t / 0.4);
    txt('НЕОБОВ’ЯЗКОВЕ ВИПРОБУВАННЯ', W / 2, 120, { size: 30, weight: 800, color: MYHI, align: 'center', ls: 8, alpha: a });
    txt('МІФІЧНІ ДВЕРІ', W / 2, 230, { size: 84, font: UNB, weight: 800, align: 'center', color: MYHI, alpha: a, shadow: 40 });
  }
  // попередження
  if (t >= 1.8 && t < 3.6) {
    const tt = t - 1.8, out = t > 3.3 ? (t - 3.3) / 0.3 : 0;
    const y = sheet((tt / 0.3) * (1 - out), 900, true);
    iconBox(sprite('door_mythic', Math.floor(T * 5)), 70, y + 70, 150, true);
    txt('НЕОБОВ’ЯЗКОВЕ ВИПРОБУВАННЯ', 250, y + 125, { size: 26, weight: 800, color: MYHI, ls: 4 });
    txt('Міфічні двері', 250, y + 196, { size: 54, font: UNB, weight: 700 });
    ctx.save(); rrect(70, y + 270, W - 140, 200, 24); ctx.fillStyle = 'rgba(162,89,255,.14)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = MY; ctx.stroke(); ctx.restore();
    txt('Увага: лише одна спроба.', 110, y + 350, { size: 46, weight: 800, color: MYHI });
    txt('Помилишся, і двері розсиплються.', 110, y + 420, { size: 40, weight: 600, color: '#efe4ff' });
    const pr = tt > 1.15 && tt < 1.35 ? 0.95 : 1;
    ctx.save(); ctx.translate(W / 2, y + 590); ctx.scale(pr, pr); ctx.translate(-W / 2, -(y + 590));
    rrect(70, y + 530, W - 140, 120, 28);
    const gr = ctx.createLinearGradient(0, y + 530, 0, y + 650); gr.addColorStop(0, MYHI); gr.addColorStop(1, '#7c3fd0');
    ctx.fillStyle = gr; ctx.fill();
    txt('Ризикнути', W / 2, y + 608, { size: 50, font: UNB, weight: 800, color: '#14051f', align: 'center' });
    ctx.restore();
    if (tt > 1.1) tapRipple(W / 2, y + 590, tt - 1.15, '214,176,255');
  }
  // задача
  if (t >= 3.6 && t < 5.9) {
    const tt = t - 3.6, out = t > 5.6 ? (t - 5.6) / 0.3 : 0;
    const y = sheet((tt / 0.25) * (1 - out), 1060, true);
    txt('ОДНА СПРОБА', 70, y + 100, { size: 28, weight: 800, color: MYHI, ls: 6 });
    const gy = givenChips([['m = 40 кг'], ['μ = 0,2'], ['a = 1 м/с²'], ['g = 10 Н/кг']], 70, y + 130, W - 140);
    const q = wrap('Яку силу треба прикласти до санок, щоб вони їхали з прискоренням 1 м/с²?', W - 140, 44, MAN, 700);
    q.forEach((l, i) => txt(l, 70, gy + 70 + i * 58, { size: 44, weight: 700 }));
    const typed = tt < 0.7 ? '' : tt < 0.9 ? '1' : tt < 1.1 ? '12' : '120';
    answerRow(70, gy + 70 + q.length * 58, typed, 'Н', tt - 1.4, tt > 1.55, true);
  }
  // нагорода і бейдж
  if (t >= 5.9) {
    const tt = t - 5.9;
    ctx.fillStyle = `rgba(10,4,20,${0.82 * eOut(tt / 0.3)})`; ctx.fillRect(0, 0, W, H);
    glowCol(W / 2, 640, 700, '162,89,255', 0.45 * eOut(tt / 0.3));
    for (let k = 0; k < 18; k++) {
      const ang = k / 18 * 6.283, r = 160 + eOut(tt / 0.6) * 420;
      ctx.fillStyle = k % 3 ? MY : MYHI; ctx.globalAlpha = Math.max(0, 1 - tt / 1.6);
      ctx.fillRect(W / 2 + Math.cos(ang) * r - 12, 640 + Math.sin(ang) * r - 12, 24, 24);
    }
    ctx.globalAlpha = 1;
    const b = eBack(seg(tt, 0.05, 0.5));
    ctx.save(); ctx.translate(W / 2, 640); ctx.scale(b, b); pix(icon('badge_mythic'), -176, -176, 22); ctx.restore();
    txt('БЕЙДЖ', W / 2, 960, { size: 34, weight: 800, color: MYHI, align: 'center', ls: 12, alpha: eOut(seg(tt, 0.3, 0.6)) });
    txt('«МІФІЧНИЙ»', W / 2, 1070, { size: 92, font: UNB, weight: 800, color: '#fff', align: 'center', shadow: 40, alpha: eOut(seg(tt, 0.35, 0.7)) });
    const c1 = eBack(seg(tt, 0.8, 1.2)), c2 = eBack(seg(tt, 1.05, 1.45));
    ctx.save(); ctx.globalAlpha = Math.min(1, c1); ctx.translate(0, (1 - c1) * 200); bonusCard(60, 1180, 960, 'key', 'Ключ', 'відчиняє двері без відповіді', 'legendary', 30); ctx.restore();
    ctx.save(); ctx.globalAlpha = Math.min(1, c2); ctx.translate(0, (1 - c2) * 200); bonusCard(60, 1440, 960, 'eternity', 'Пісок вічності', '−60 с від часу', 'mythic', 50); ctx.restore();
    flash(0.7 - tt / 0.25, '214,176,255');
  }
  vignette(0.45);
});

// 7. «Дано і знайдено»
scene(3.2, null, (t, T) => {
  ctx.fillStyle = '#050403'; ctx.fillRect(0, 0, W, H);
  glowBg(W / 2, 500, 800, 0.14);
  drawMotes(T, 0.5);
  caption('НЕ ТРЕБА ЗАПАМ’ЯТОВУВАТИ', ['ДАНІ ЗАВЖДИ', 'ПЕРЕД ОЧИМА'], t, 90, { size: 70 });
  const y = sheet(t / 0.35, 1280);
  iconBox(sprite('seal'), 70, y + 70);
  txt('ФІНАЛ · КРОК 3/3', 250, y + 125, { size: 28, weight: 800, color: COL.gold, ls: 6 });
  txt('Печать Ньютона', 250, y + 196, { size: 54, font: UNB, weight: 700 });
  for (let i = 0; i < 3; i++) { ctx.fillStyle = i < 2 ? COL.gold : COL.hi; rrect(70 + i * 320, y + 250, 300, 10, 5); ctx.fill(); }
  const items = [['m = 200 кг'], ['F = 500 Н'], ['μ = 0,1'], ['g = 10 Н/кг']];
  if (t > 0.8) items.push(['Fт = 2000 Н', true]);
  if (t > 1.3) items.push(['Fтр = 200 Н', true]);
  const gy = givenChips(items, 70, y + 290, W - 140);
  const q = wrap('Коні тягнуть віз із силою 500 Н. З яким прискоренням він рушить?', W - 140, 44, MAN, 700);
  q.forEach((l, i) => txt(l, 70, gy + 70 + i * 58, { size: 44, weight: 700 }));
  const typed = t < 1.9 ? '' : t < 2.1 ? '1' : t < 2.3 ? '1,' : '1,5';
  answerRow(70, gy + 70 + q.length * 58, typed, 'м/с²', t - 2.55, t > 2.7, false);
  flash(0.4 - t / 0.12);
});

// 8. Бейджі
scene(3.6, null, (t, T) => {
  ctx.fillStyle = '#050403'; ctx.fillRect(0, 0, W, H);
  glowBg(300, 900, 600, 0.16); glowCol(780, 900, 600, '162,89,255', 0.16);
  drawMotes(T, 0.6);
  caption('НОВЕ', 'ЗБИРАЙ БЕЙДЖІ', t, 110, { size: 80 });
  const B = [
    ['badge_both', 'Магістр', 'Ордену', 'пройди обидва рівні', COL.hi, 290],
    ['badge_mythic', 'Міфічний', '', 'відчини міфічні двері', MYHI, 790],
  ];
  B.forEach(([ic, n1, n2, d, c, x], i) => {
    const a = eBack(seg(t, 0.3 + i * 0.4, 0.7 + i * 0.4));
    if (a <= 0) return;
    ctx.save(); ctx.translate(x, 860); ctx.scale(a, a);
    const bob = Math.sin(t * 3 + i) * 10;
    pix(icon(ic), -160, -260 + bob, 20);
    txt(n1, 0, 160, { size: 58, font: UNB, weight: 800, color: c, align: 'center', shadow: 30 });
    if (n2) txt(n2, 0, 230, { size: 58, font: UNB, weight: 800, color: c, align: 'center', shadow: 30 });
    ctx.restore();
    txt(d, x, 1210, { size: 38, weight: 700, color: COL.text, align: 'center', alpha: eOut(seg(t, 0.7 + i * 0.4, 1.0 + i * 0.4)) });
  });
  const k = eOut(seg(t, 1.8, 2.2));
  txt('видно всім у рейтингу поруч із ніком', W / 2, 1460, { size: 42, weight: 700, color: COL.muted, align: 'center', alpha: k });
  vignette(0.5);
  flash(0.45 - t / 0.12);
});

// 9. Рейтинг з бейджами
const ROWS2 = [
  ['Δ_паладин', 'гр. 203', '04:12.6', ['badge_both', 'badge_mythic']],
  ['Галілей_2.0', 'гр. 101', '04:40.1', ['badge_both']],
  ['Сила_тяжіння', 'гр. 307', '05:03.9', ['badge_mythic']],
  ['Кіт_Ньютон', 'гр. 104', '06:21.0', []],
];
scene(3.6, null, (t, T) => {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  glowBg(W / 2, 300, 700, 0.18);
  drawMotes(T, 0.5);
  txt('РЕЙТИНГ · РІВЕНЬ II', W / 2, 200, { size: 34, weight: 800, color: COL.gold, align: 'center', ls: 10, alpha: eOut(t / 0.3) });
  txt('Хто перший?', W / 2, 330, { size: 84, font: UNB, weight: 800, align: 'center', shadow: 30, alpha: eOut(t / 0.3) });
  const rows = [...ROWS2, ['ТИ?', 'твоя група', '??:??.?', []]];
  rows.forEach(([n, g, tm, bs], i) => {
    const a = eOut(seg(t, 0.25 + i * 0.16, 0.6 + i * 0.16));
    if (a <= 0) return;
    const y = 450 + i * 210, x = 60 + (1 - a) * 900;
    const me = i === 4;
    const pulse = me ? 1 + 0.025 * Math.sin(t * 10) : 1;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x + 480, y + 90); ctx.scale(pulse, pulse); ctx.translate(-(x + 480), -(y + 90));
    panel(x, y, 960, 180, 34, { fill: 'grad', stroke: me ? COL.gold : COL.dk, lw: me ? 6 : 3, glow: me ? 50 : 0 });
    const medal = ['#f6de8f', '#d6d2c6', '#c8834a'][i];
    if (medal) { ctx.fillStyle = medal; ctx.beginPath(); ctx.arc(x + 95, y + 90, 46, 0, 7); ctx.fill(); }
    txt(me ? '?' : String(i + 1), x + 95, y + 106, { size: 46, font: UNB, weight: 800, align: 'center', color: medal ? '#1d1503' : (me ? COL.hi : COL.muted) });
    txt(n, x + 180, y + 82, { size: 46, weight: 800, color: me ? COL.hi : COL.text });
    const nw = measure(n, 46, MAN, 800);
    bs.forEach((b, k) => pix(icon(b), x + 196 + nw + k * 60, y + 40, 3.2));
    txt(g, x + 180, y + 138, { size: 34, weight: 600, color: COL.muted });
    txt(tm, x + 920, y + 108, { size: 48, font: UNB, weight: 700, align: 'right', color: COL.hi });
    ctx.restore();
  });
  vignette(0.5);
  flash(0.45 - t / 0.12);
});

// 10. Фінал
const confetti = Array.from({ length: 120 }, () => ({ x: Math.random() * W, y: -Math.random() * H * 0.6, vx: (Math.random() - 0.5) * 120, vy: 300 + Math.random() * 500, r: Math.random() * 6, s: 10 + Math.random() * 18, c: ['#f6de8f', '#d8b04a', '#a259ff', '#d6b0ff', '#fff'][Math.floor(Math.random() * 5)] }));
scene(4.6, null, (t, T) => {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  glowBg(W / 2, 600, 800, 0.22);
  drawMotes(T, 0.7);
  for (const p of confetti) {
    const y = p.y + p.vy * t, x = p.x + p.vx * t;
    if (y > H + 40) continue;
    ctx.save(); ctx.translate(x, y); ctx.rotate(p.r + t * 4); ctx.fillStyle = p.c; ctx.globalAlpha = 0.85; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
  }
  deltaMark(W / 2, 470, 260, 1, 16);
  const a = eBack(seg(t, 0.1, 0.5));
  ctx.save(); ctx.translate(W / 2, 800); ctx.scale(a, a); ctx.translate(-W / 2, -800);
  txt('РІВЕНЬ II', W / 2, 760, { size: 96, font: UNB, weight: 800, align: 'center', shadow: 40 });
  txt('ДИНАМІКА', W / 2, 870, { size: 96, font: UNB, weight: 800, align: 'center', color: COL.hi, shadow: 40 });
  ctx.restore();
  txt('вже відкрито', W / 2, 950, { size: 44, weight: 700, color: COL.text, align: 'center', alpha: eOut(seg(t, 0.4, 0.8)) });
  const b = eBack(seg(t, 0.8, 1.2));
  ctx.save(); ctx.translate(W / 2, 1110); ctx.scale(b, b); ctx.translate(-W / 2, -1110);
  panel(70, 1040, W - 140, 150, 40, { fill: '#17110a', stroke: COL.gold, lw: 5, glow: 50 });
  txt('phys-kpkb.github.io/delta', W / 2, 1138, { size: 54, font: UNB, weight: 700, align: 'center', color: COL.hi });
  ctx.restore();
  txt('Міфічні двері чекають найсміливіших.', W / 2, 1280, { size: 40, weight: 700, align: 'center', alpha: eOut(seg(t, 1.2, 1.6)) });
  // кіт і яблуко
  const ca = eOut(seg(t, 1.4, 1.8));
  const catY = 1700 - 16 * 14;
  pix(sprite('cat', Math.floor(T * 1.2)), W / 2 - 8 * 14, catY + (1 - ca) * 80, 14, { alpha: ca });
  const ft = seg(t, 2.2, 2.75);
  if (t > 2.2) {
    const yy = 1290 + (catY + 70 - 1290) * ft * ft;
    const bounce = t > 2.75 ? Math.abs(Math.sin((t - 2.75) * 8)) * 70 * Math.max(0, 1 - (t - 2.75) * 1.3) : 0;
    const ax = W / 2 + 40 + (t > 2.75 ? (t - 2.75) * 160 : 0);
    ctx.fillStyle = '#c0261a'; ctx.fillRect(ax, yy - bounce, 40, 40); ctx.fillStyle = '#ff6b5a'; ctx.fillRect(ax, yy - bounce, 12, 12); ctx.fillStyle = '#4f7a3a'; ctx.fillRect(ax + 16, yy - bounce - 12, 8, 12);
  }
  if (t > 2.8) txt('Ньютон щойно перевірив гравітацію', W / 2, 1810, { size: 34, weight: 700, color: COL.muted, align: 'center', alpha: eOut(seg(t, 2.8, 3.2)) });
  vignette(0.5);
  flash(0.6 - t / 0.25);
  ctx.fillStyle = `rgba(0,0,0,${seg(t, 4.2, 4.6)})`; ctx.fillRect(0, 0, W, H);
});

export const DURATION = scenes.reduce((a, s) => a + s.dur, 0);
export const CUTS = scenes.reduce((acc, s) => { acc.push((acc[acc.length - 1] || 0) + s.dur); return acc; }, []);

let curScene = -1;
export function renderFrame(i) {
  const T = i / FPS;
  let acc = 0, si = 0;
  while (si < scenes.length - 1 && T >= acc + scenes[si].dur) { acc += scenes[si].dur; si++; }
  const sc = scenes[si];
  if (si !== curScene) { curScene = si; sc.init && sc.init(); }
  ctx.save();
  sc.draw(T - acc, T);
  ctx.restore();
}

// ---------- саундтрек (офлайн) ----------
export async function renderAudio() {
  const SR = 44100, dur = DURATION + 0.5;
  const ac = new OfflineAudioContext(2, Math.ceil(SR * dur), SR);
  let ar = 777; const rnd = () => { ar = (ar * 16807) % 2147483647; return (ar - 1) / 2147483646; };
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
  const master = ac.createGain(); master.gain.value = 0.9;
  comp.connect(master); master.connect(ac.destination);
  const rev = ac.createConvolver();
  const len = SR * 2.6, buf = ac.createBuffer(2, len, SR);
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / len, 2.5); }
  rev.buffer = buf;
  const wet = ac.createGain(); wet.gain.value = 0.35; rev.connect(wet); wet.connect(comp);
  const bus = ac.createGain(); bus.gain.value = 1; bus.connect(comp); bus.connect(rev);
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  const osc = (type, f, t, d, v, { to = bus, att = 0.01, f2 = null, lp = null } = {}) => {
    const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    let n = o;
    if (lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); n = f; }
    n.connect(g); g.connect(to); o.start(t); o.stop(t + d + 0.05);
  };
  const noise = (t, d, freq, q, v, type = 'bandpass', f2 = null) => {
    const n = Math.ceil(SR * d), b = ac.createBuffer(1, n, SR), dd = b.getChannelData(0);
    for (let i = 0; i < n; i++) dd[i] = rnd() * 2 - 1;
    const s = ac.createBufferSource(); s.buffer = b;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + d);
    const g = ac.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t);
  };
  const pad = (n, t, d, v = 0.05) => {
    for (const det of [-7, 6]) {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midi(n); o.detune.value = det;
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1100;
      const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.3); g.gain.setValueAtTime(v, t + d - 0.2); g.gain.linearRampToValueAtTime(0, t + d + 0.3);
      o.connect(f); f.connect(g); g.connect(bus); o.start(t); o.stop(t + d + 0.4);
    }
  };
  const pluck = (n, t, v = 0.1, d = 0.9) => {
    osc('triangle', midi(n), t, d, v, { att: 0.004, lp: 3500 });
    osc('sine', midi(n) * 2, t, d * 0.6, v * 0.35, { att: 0.004 });
  };
  const kick = (t, v = 0.9) => osc('sine', 150, t, 0.35, v, { att: 0.002, f2: 40 });
  const snare = (t, v = 0.35) => { noise(t, 0.18, 1800, 0.8, v); osc('triangle', 220, t, 0.1, v * 0.4, { att: 0.002, f2: 120 }); };
  const hat = (t, v = 0.08) => noise(t, 0.05, 8000, 1, v, 'highpass');
  const boom = (t) => { osc('sine', 90, t, 1.6, 0.9, { att: 0.005, f2: 30 }); noise(t, 0.6, 300, 0.6, 0.4, 'lowpass', 80); };
  const whoosh = (t, d = 0.45, v = 0.25) => noise(t, d, 600, 1.2, v, 'bandpass', 5000);
  const riser = (t, d) => { const n = Math.ceil(SR * d), b = ac.createBuffer(1, n, SR), dd = b.getChannelData(0); for (let i = 0; i < n; i++) dd[i] = (rnd() * 2 - 1) * (i / n); const s = ac.createBufferSource(); s.buffer = b; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(7000, t + d); const g = ac.createGain(); g.gain.value = 0.35; s.connect(f); f.connect(g); g.connect(bus); s.start(t); };
  const bell = (fs, t, step = 0.07, v = 0.12) => fs.forEach((f, i) => osc('triangle', f, t + i * step, 0.7, v, { att: 0.005 }));
  const tap = (t) => osc('triangle', 1200, t, 0.08, 0.15, { att: 0.002 });

  // музика: мі мінор, 120 BPM, такт = 2 с
  const ROOT = 52, PROG = [0, -4, 3, -2];
  const chordNotes = (deg) => {
    const map = { 0: [0, 3, 7], '-4': [-4, 0, 3], 3: [3, 7, 10], '-2': [-2, 2, 5] };
    return map[deg].map((x) => ROOT + x);
  };
  const end = DURATION;
  const grooveStart = 3, grooveEnd = CUTS[8];
  const tenseA = CUTS[4], tenseB = CUTS[4] + 5.9; // міфічні двері: замість ударних серцебиття
  pad(ROOT - 12, 0, 3); pad(ROOT + 3, 0, 3, 0.03); pad(ROOT + 7, 0, 3, 0.03);
  boom(0.05); riser(1.0, 2.0); bell([659, 988], 0.8, 0.12, 0.08); boom(1.3);
  for (let bar = 0; grooveStart + bar * 2 < grooveEnd; bar++) {
    const t0 = grooveStart + bar * 2;
    const ch = chordNotes(PROG[bar % 4]);
    pad(ch[0], t0, 2, 0.035); pad(ch[1], t0, 2, 0.03); pad(ch[2], t0, 2, 0.03);
    for (let b = 0; b < 4; b++) {
      const t = t0 + b * 0.5;
      if (t >= grooveEnd) break;
      if (t >= tenseA && t < tenseB) { if (b % 2 === 0) { kick(t, 0.7); kick(t + 0.22, 0.45); } continue; }
      kick(t, b === 0 ? 0.95 : 0.75);
      if (b % 2 === 1) snare(t);
      hat(t + 0.25); hat(t, 0.04);
      osc('sawtooth', midi(ch[0] - 24), t, 0.22, 0.12, { att: 0.005, lp: 400 });
      osc('sawtooth', midi(ch[0] - 24), t + 0.25, 0.2, 0.09, { att: 0.005, lp: 400 });
    }
    const arp = [0, 1, 2, 1, 0, 2, 1, 2];
    for (let k = 0; k < 8; k++) {
      const t = t0 + k * 0.25;
      if (t >= grooveEnd) break;
      if (rnd() < (t >= tenseA && t < tenseB ? 0.35 : 0.85)) pluck(ch[arp[k]] + 12 + (k === 6 ? 12 : 0), t, 0.07 + rnd() * 0.04);
    }
  }
  const shimmer = (t, v = 0.09) => [659, 831, 988, 1319, 1661].forEach((f, i) => { osc('sine', f, t + i * 0.06, 1.3, v); osc('triangle', f * 1.5, t + i * 0.06 + 0.03, 0.9, v * 0.35); });
  const bonk = (t) => { osc('sine', 320, t, 0.25, 0.35, { att: 0.002, f2: 110 }); noise(t, 0.12, 900, 1, 0.15); };
  const whistle = (t, d) => osc('sine', 1800, t, d, 0.06, { att: 0.02, f2: 500 });
  const meow = (mt) => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(520, mt); o.frequency.linearRampToValueAtTime(860, mt + 0.12); o.frequency.linearRampToValueAtTime(420, mt + 0.5);
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 6; f.frequency.setValueAtTime(900, mt); f.frequency.linearRampToValueAtTime(1700, mt + 0.15); f.frequency.linearRampToValueAtTime(800, mt + 0.5);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, mt); g.gain.exponentialRampToValueAtTime(0.35, mt + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, mt + 0.55);
    o.connect(f); f.connect(g); g.connect(bus); o.start(mt); o.stop(mt + 0.6); };

  // фінал
  const F0 = CUTS[8];
  pad(ROOT - 12, F0, end - F0); pad(ROOT + 3, F0, end - F0, 0.035); pad(ROOT + 7, F0, end - F0, 0.035);
  boom(F0); bell([440, 587, 740, 880, 1175], F0 + 0.1, 0.11, 0.13);
  whistle(F0 + 2.2, 0.55); bonk(F0 + 2.75); meow(F0 + 2.95);

  // події
  const S2 = CUTS[0]; for (let i = 0; i < 4; i++) { whoosh(S2 + i * 1.2 - 0.05, 0.4, 0.25); boom(S2 + i * 1.2); }
  const S3 = CUTS[1]; boom(S3 + 0.15); bell([988, 1319], S3 + 0.7, 0.05, 0.06); bell([1175, 1568], S3 + 1.0, 0.05, 0.06); whistle(S3 + 1.4, 0.7); bonk(S3 + 2.1);
  const S4 = CUTS[2]; tap(S4 + 0.2); noise(S4 + 0.9, 0.2, 3000, 0.8, 0.15); tap(S4 + 2.6);
  [4.1, 4.3, 4.5, 4.75].forEach((d) => tap(S4 + d)); bell([523, 659, 784, 1047], S4 + 4.9, 0.07, 0.14); boom(S4 + 5.6); noise(S4 + 5.6, 0.5, 220, 1.5, 0.4);
  const S5 = CUTS[3]; whoosh(S5); osc('triangle', 880, S5 + 0.35, 0.4, 0.14); bell([988, 1319, 1568], S5 + 0.8, 0.05, 0.1); shimmer(S5 + 1.25); bell([1319, 1760], S5 + 2.2, 0.08, 0.08);
  const S6 = CUTS[4]; shimmer(S6 + 0.2, 0.07); riser(S6 + 0.3, 1.5); whoosh(S6 + 1.8, 0.4, 0.2); tap(S6 + 2.95);
  [4.3, 4.5, 4.7, 5.0].forEach((d) => tap(S6 + d)); riser(S6 + 4.6, 1.3); boom(S6 + 5.9); shimmer(S6 + 5.9, 0.12); shimmer(S6 + 6.3, 0.08); bell([1319, 1661, 1976], S6 + 6.7, 0.07, 0.08);
  const S7 = CUTS[5]; whoosh(S7); bell([1047], S7 + 0.8, 0, 0.08); bell([1319], S7 + 1.3, 0, 0.08); [1.9, 2.1, 2.3, 2.55].forEach((d) => tap(S7 + d)); bell([523, 659, 784, 1047], S7 + 2.7, 0.06, 0.12);
  const S8 = CUTS[6]; whoosh(S8); bell([784, 988, 1175], S8 + 0.3, 0.06, 0.12); shimmer(S8 + 0.7, 0.09);
  const S9 = CUTS[7]; for (let i = 0; i < 5; i++) noise(S9 + 0.25 + i * 0.16, 0.2, 1200, 1, 0.12, 'bandpass', 4000);

  const out = await ac.startRendering();
  // WAV 16-bit
  const ch0 = out.getChannelData(0), ch1 = out.getChannelData(1), n = out.length;
  const ab = new ArrayBuffer(44 + n * 4), dv = new DataView(ab);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); dv.setUint32(4, 36 + n * 4, true); ws(8, 'WAVE'); ws(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true); dv.setUint32(24, SR, true);
  dv.setUint32(28, SR * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true); ws(36, 'data'); dv.setUint32(40, n * 4, true);
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(ch0[i]), Math.abs(ch1[i]));
  const norm = peak > 0 ? 0.89 / peak : 1;
  for (let i = 0; i < n; i++) {
    dv.setInt16(44 + i * 4, clamp(ch0[i] * norm, -1, 1) * 32767, true);
    dv.setInt16(46 + i * 4, clamp(ch1[i] * norm, -1, 1) * 32767, true);
  }
  return new Blob([ab], { type: 'audio/wav' });
}

// ---------- перегляд у браузері ----------
window.trailer = { renderFrame, renderAudio, DURATION, FPS, W, H };
let playing = false;
document.getElementById('play')?.addEventListener('click', async () => {
  if (playing) return; playing = true;
  const blob = await renderAudio();
  const audio = new Audio(URL.createObjectURL(blob));
  await audio.play();
  const tick = () => {
    const i = Math.floor(audio.currentTime * FPS);
    if (i < DURATION * FPS) { renderFrame(i); requestAnimationFrame(tick); } else playing = false;
  };
  tick();
});
document.fonts.ready.then(() => renderFrame(0));
