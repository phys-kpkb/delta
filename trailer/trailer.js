// Трейлер «Ордену Дельти»: кадри малює сам рушій гри, а титри й картки
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

// ---------- кімнати з рушія ----------
const L = LEVELS[0];
const P = [
  { t: 8, v: 15, s: 120 },
  { kmh: 72, ms: 20, ex: [36, 10] },
  { v0: 2, t: 4, a: 3, v: 14 },
  { v0: 2, v1: 10, t: 6, s: 36, ask: 'down', order: ['up', 'flat', 'down', 'zero'] },
  { a: 4, t: 6, v: 24, s: 72, ci: 0, order: [0, 1, 2, 3] },
];
const K = 7; // 16 px × 7 = 112 px на клітинку
function mkGame(ri, cls, gender, start) {
  const c = makeCanvas(1, 1);
  const g = new Game(c, { interact: (o) => { g.arrived = o; }, exit: () => { g.exited = true; }, toast() {} });
  g.k = K; c.width = 144 * K; c.height = 208 * K;
  g.setHero(cls, gender);
  g.setSpeed(2);
  const room = L.rooms[ri];
  const objs = room.objects(P[ri]).map((o) => {
    const x = { ...o };
    if (x.kind === 'door') { x.sprite = DOOR_TYPES[x.door].sprite; x.open = false; }
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

// намалювати кімнату: центр (cx, cy) і масштаб s
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
function tapRipple(x, y, t) {
  if (t < 0 || t > 0.7) return;
  const a = 1 - t / 0.7;
  ctx.save();
  ctx.strokeStyle = `rgba(246,222,143,${a})`; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.arc(x, y, 30 + t * 120, 0, 7); ctx.stroke();
  ctx.fillStyle = `rgba(255,255,255,${a * 0.85})`;
  ctx.beginPath(); ctx.arc(x, y, 28 * (1 - t * 0.6), 0, 7); ctx.fill();
  ctx.restore();
}

// ---------- сцени ----------
const scenes = [];
const scene = (dur, init, draw) => scenes.push({ dur, init, draw });

// 1. Інтро: Δ малюється, назва
scene(3, null, (t) => {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  glowBg(W / 2, 760, 700, 0.18 * eOut(t / 1.2));
  drawMotes(t, eOut(t));
  const pulse = t > 1.2 ? 1 + 0.03 * Math.sin((t - 1.2) * 6) : 1;
  ctx.save(); ctx.translate(W / 2, 760); ctx.scale(pulse, pulse); ctx.translate(-W / 2, -760);
  deltaMark(W / 2, 760, 420, eInOut(t / 1.1), 22);
  ctx.restore();
  const a = eOut(seg(t, 1.0, 1.6));
  txt('ОРДЕН', W / 2, 1150 + (1 - a) * 60, { size: 128, font: UNB, weight: 800, align: 'center', alpha: a, shadow: 40, ls: 6 });
  const b = eOut(seg(t, 1.25, 1.85));
  txt('ДЕЛЬТИ', W / 2, 1290 + (1 - b) * 60, { size: 128, font: UNB, weight: 800, align: 'center', alpha: b, shadow: 40, color: COL.hi, ls: 6 });
  const c = eOut(seg(t, 1.9, 2.4));
  txt('ФІЗИЧНИЙ РОГЛАЙК', W / 2, 1400, { size: 36, weight: 800, align: 'center', alpha: c, color: COL.gold, ls: 14 });
  vignette(0.6);
});

// 2. Замок паладинів: облет кімнати
let g2;
scene(3, () => { g2 = mkGame(0, 'carpenter', 'm', [4, 7]); g2.player.dir = 1; }, (t, T) => {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  g2.update(1 / FPS);
  const s = lerp(1.9, 1.0, eInOut(t / 2.6));
  const cy = lerp(1500, 1030, eInOut(t / 2.6));
  drawRoom(g2, T * 1000, 540, cy, s);
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, 300);
  caption('ЗАМОК ПАЛАДИНІВ', ['ДЕ ВСЕ', 'РУХАЄТЬСЯ'], t, 60, { size: 70 });
  const a = eOut(seg(t, 0.8, 1.2));
  txt('за законами механіки', W / 2, 1850, { size: 44, weight: 700, color: COL.hi, align: 'center', alpha: a });
  flash(0.6 - t / 0.2);
  vignette(0.5);
});

// 3. Геймплей: підказка → двері → відповідь
let g3, st3;
scene(7.5, () => {
  g3 = mkGame(0, 'painter', 'f', [4, 9]);
  st3 = { phase: 0, cardT: -1, doorT: -1, tap: [] };
}, (t, T) => {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (st3.phase === 0 && t >= 0.3) { tapObj(g3, 'scroll'); st3.tap.push([t, 2, 3]); st3.phase = 1; }
  if (st3.phase === 1 && g3.arrived) { st3.cardT = t; st3.phase = 2; }
  if (st3.phase === 2 && t >= 3.5) { st3.cardT = -1; tapObj(g3, 'door'); st3.tap.push([t, 4, 1]); st3.phase = 3; }
  if (st3.phase === 3 && g3.arrived) { st3.doorT = t; st3.phase = 4; }
  if (st3.phase === 4 && t >= 6.0) { obj(g3, 'door').open = true; st3.openT = t; st3.phase = 5; }
  if (st3.phase === 5 && t >= 6.35) { g3.walkIntoDoor(); st3.phase = 6; }
  if (!g3.exited) g3.update(1 / FPS);

  const shake = st3.openT ? Math.max(0, 1 - (t - st3.openT) / 0.4) * 14 : 0;
  const zoomIn = st3.phase >= 5 ? eInOut(seg(t, 6.3, 7.5)) : 0;
  const s = lerp(1, 2.2, zoomIn);
  const cx = 540 + Math.sin(t * 60) * shake, cy = lerp(1030, 980 + 560 * s, zoomIn) + Math.cos(t * 50) * shake;
  drawRoom(g3, T * 1000, cx, cy, s);
  for (const [t0, tx, ty] of st3.tap) { const [x, y] = tileXY(tx, ty, cx, cy, s); tapRipple(x, y, t - t0); }

  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, W, 300);
  if (t < 1.4) caption('ГЕЙМПЛЕЙ', 'ХОДИ ДОТИКОМ', t, 70);
  else if (t < 3.6) caption('ПРЕДМЕТИ, ЩО БЛИЩАТЬ', 'ЧИТАЙ ПІДКАЗКИ', t - 1.4, 70);
  else caption('ПРАВИЛЬНА ВІДПОВІДЬ', 'ВІДЧИНЯЄ ДВЕРІ', t - 3.6, 70);

  if (st3.cardT >= 0) hintCard(t - st3.cardT);
  if (st3.doorT >= 0 && t < 6.0 + 0.3) doorCard(t - st3.doorT, t >= 6.0 ? (t - 6.0) / 0.3 : 0);
  if (st3.openT) flash(0.6 - (t - st3.openT) / 0.35);
  flash(0.8 * seg(t, 7.25, 7.5));
  vignette(0.45);
});

function sheet(p, h) {
  const y = H - h * eOut(p);
  ctx.fillStyle = `rgba(0,0,0,${0.45 * eOut(p)})`; ctx.fillRect(0, 0, W, H);
  panel(20, y, W - 40, h + 60, 48, { fill: 'grad', stroke: COL.lo, glow: 40 });
  ctx.fillStyle = COL.dk; rrect(W / 2 - 50, y + 22, 100, 8, 4); ctx.fill();
  return y;
}
function iconBox(img, x, y, size = 150) {
  panel(x, y, size, size, 28, { fill: '#000', stroke: COL.dk });
  const sc = Math.floor((size - 30) / Math.max(img.width, img.height));
  pix(img, x + (size - img.width * sc) / 2, y + (size - img.height * sc) / 2, sc);
}
function hintCard(tt) {
  const y = sheet(tt / 0.35, 760);
  iconBox(sprite('table_scroll'), 70, y + 70);
  txt('ПІДКАЗКА', 250, y + 125, { size: 28, weight: 800, color: COL.gold, ls: 6 });
  txt('Сувій варти:', 250, y + 180, { size: 48, font: UNB, weight: 700 });
  txt('Швидкість', 250, y + 236, { size: 48, font: UNB, weight: 700 });
  const lines = wrap('Швидкість показує, який шлях тіло проходить за одиницю часу.', W - 160, 40, MAN, 600);
  lines.forEach((l, i) => txt(l, 70, y + 330 + i * 54, { size: 40, weight: 600, color: '#e6dfcf' }));
  const fy = y + 330 + lines.length * 54 + 20;
  const a = eBack(seg(tt, 0.4, 0.8));
  ctx.save(); ctx.translate(W / 2, fy + 75); ctx.scale(a, a); ctx.translate(-W / 2, -(fy + 75));
  panel(70, fy, W - 140, 150, 26, { fill: '#000', stroke: COL.lo, glow: 30 });
  txt('v = s / t', W / 2, fy + 102, { size: 84, font: SERIF, weight: 400, italic: true, color: COL.hi, align: 'center' });
  ctx.restore();
}
function doorCard(tt, out) {
  const y = sheet((tt / 0.35) * (1 - out), 980);
  iconBox(sprite('door_oak'), 70, y + 70);
  txt('ДВЕРІ · ЗАЛ 1', 250, y + 125, { size: 28, weight: 800, color: COL.gold, ls: 6 });
  txt('Дубові двері', 250, y + 196, { size: 54, font: UNB, weight: 700 });
  panel(70, y + 250, W - 140, 74, 18, { fill: 'rgba(216,176,74,.07)', stroke: COL.dk });
  ctx.fillStyle = COL.gold; ctx.save(); ctx.translate(108, y + 287); ctx.rotate(Math.PI / 4); ctx.fillRect(-7, -7, 14, 14); ctx.restore();
  txt('Кожна помилка: +30 с до часу', 140, y + 299, { size: 34, weight: 600, color: '#d8cfbb' });
  const q = wrap('Гонець пробіг 120 м за 8 с. З якою швидкістю він біг?', W - 140, 46, MAN, 700);
  q.forEach((l, i) => txt(l, 70, y + 400 + i * 60, { size: 46, weight: 700 }));
  const iy = y + 400 + q.length * 60 + 10;
  const typed = tt < 0.6 ? '' : tt < 0.85 ? '1' : '15';
  const ok = tt >= 1.2;
  panel(70, iy, 520, 120, 26, { fill: '#000', stroke: ok ? COL.green : COL.gold, lw: 4 });
  txt(typed + (tt < 1.2 && Math.floor(tt * 3) % 2 ? '|' : ''), 330, iy + 82, { size: 64, font: UNB, weight: 700, align: 'center' });
  panel(610, iy, 170, 120, 26, { fill: '#000', stroke: COL.dk });
  txt('м/с', 695, iy + 78, { size: 44, weight: 800, color: COL.hi, align: 'center' });
  const press = tt > 1.05 && tt < 1.25 ? 0.94 : 1;
  ctx.save(); ctx.translate(890, iy + 60); ctx.scale(press, press); ctx.translate(-890, -(iy + 60));
  rrect(800, iy, 210, 120, 26);
  const gr = ctx.createLinearGradient(0, iy, 0, iy + 120); gr.addColorStop(0, COL.hi); gr.addColorStop(1, '#b98f2e');
  ctx.fillStyle = gr; ctx.fill();
  txt('OK', 905, iy + 80, { size: 50, font: UNB, weight: 800, color: '#120d02', align: 'center' });
  ctx.restore();
  if (ok) {
    const a = eBack(seg(tt, 1.2, 1.5));
    ctx.save(); ctx.translate(70, iy + 200); ctx.scale(a, a);
    txt('✓ Правильно! Двері відчиняються…', 0, 0, { size: 46, weight: 800, color: COL.green });
    ctx.restore();
  }
}

// 4. Бонуси
let snap4;
const BON = [
  ['key', 'Ключ', 'Відчиняє двері без відповіді'],
  ['shield', 'Щит паладина', 'Наступна помилка без штрафу'],
  ['scroll', 'Сувій мудреця', 'Показує, як рахувати'],
  ['hourglass', 'Пісочний годинник', '−20 секунд від часу'],
  ['boots', 'Чоботи-скороходи', 'Ходиш удвічі швидше'],
];
scene(4, () => {
  const g = mkGame(1, 'radio', 'm', [4, 8]);
  g.update(0.01);
  snap4 = g;
}, (t, T) => {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.filter = 'blur(14px) brightness(.45)'; drawRoom(snap4, T * 1000, 540, 1030, 1.15); ctx.restore();
  glowBg(W / 2, 1000, 800, 0.15);
  drawMotes(t, 0.8);
  caption('ЗА КОЖНІ ДВЕРІ', 'ОБИРАЙ БОНУС', t, 130);
  const sets = t < 2.3 ? [0, 1, 2] : [3, 4];
  const base = t < 2.3 ? 0 : 2.4;
  sets.forEach((bi, i) => {
    const t0 = base + 0.25 + i * 0.25;
    const a = eBack(seg(t, t0, t0 + 0.35));
    const out = t < 2.3 ? eIn(seg(t, 2.0, 2.3)) : 0;
    const picked = t < 2.3 && bi === 0 && t > 1.55;
    if (a <= 0) return;
    const y = (sets.length === 3 ? 640 : 775) + i * 270;
    const x = 60 + (1 - a) * 700 + out * -1200;
    ctx.save();
    ctx.globalAlpha = clamp(a) * (1 - (t < 2.3 && bi !== 0 ? seg(t, 1.55, 1.8) * 0.6 : 0));
    const pulse = picked ? 1 + 0.04 * Math.sin((t - 1.55) * 20) * (1 - seg(t, 1.55, 2.0)) : 1;
    ctx.translate(x + 480, y + 110); ctx.scale(pulse, pulse); ctx.translate(-(x + 480), -(y + 110));
    panel(x, y, 960, 220, 34, { fill: 'grad', stroke: picked ? COL.hi : COL.dk, lw: picked ? 6 : 3, glow: picked ? 60 : 0 });
    pix(icon(BON[bi][0]), x + 40, y + 46, 8);
    txt(BON[bi][1], x + 220, y + 98, { size: 50, font: UNB, weight: 700, color: COL.hi });
    txt(BON[bi][2], x + 220, y + 160, { size: 38, weight: 600, color: '#d6cdb8' });
    ctx.restore();
  });
  if (t > 1.55 && t < 2.3) txt('Обрано!', W / 2, 1560, { size: 50, font: UNB, weight: 800, color: COL.green, align: 'center', alpha: eOut(seg(t, 1.55, 1.8)) * (1 - seg(t, 2.0, 2.3)) });
  vignette(0.6);
  flash(0.5 - t / 0.15);
});

// 5. Класи
const ORDER = [
  ['carpenter', 'Починає забіг', 'з ключем'],
  ['radio', 'Ловить сигнал:', 'тепло чи холодно'],
  ['welder', 'Штрафи вдвічі менші', '+ ламає стіни зі скарбами'],
  ['painter', 'Відновлює фрески', 'з таємними підказками'],
];
function stageFloor(t, ox) {
  const tile = 120;
  for (let y = 0; y < H / tile + 1; y++) for (let x = -1; x < W / tile + 2; x++) {
    ctx.fillStyle = (x + y) % 2 ? '#1c170f' : '#120f09';
    ctx.fillRect(x * tile + (ox % (tile * 2)), y * tile, tile, tile);
  }
  const g = ctx.createRadialGradient(W / 2, 1180, 50, W / 2, 1180, 700);
  g.addColorStop(0, 'rgba(255,190,100,.32)'); g.addColorStop(1, 'rgba(255,190,100,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
scene(8, null, (t) => {
  const i = Math.min(3, Math.floor(t / 2)), lt = t - i * 2;
  const [cls, l1, l2] = ORDER[i];
  const C = CLASSES[cls];
  const slideIn = 1 - eOut(lt / 0.3), slideOut = eIn(seg(lt, 1.8, 2.0)) * (i < 3 ? 1 : 0);
  const ox = slideIn * W - slideOut * W;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  stageFloor(t, -t * 200);
  ctx.save(); ctx.translate(ox, 0);
  // герой
  const gender = lt < 1.0 ? 'm' : 'f';
  const frame = Math.floor(lt * 7) % 2 + 1;
  const img = heroSprite(cls, gender, 0, frame);
  const sc = 26, hx = W / 2 - 8 * sc, hy = 1430 - 24 * sc + (frame === 1 ? -6 : 0);
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.ellipse(W / 2, 1430, 190, 36, 0, 0, 7); ctx.fill();
  pix(img, hx, hy, sc);
  // назва
  const nameLines = C.name.includes('-') ? [C.name.split('-')[0] + '-', C.name.split('-')[1]] : [C.name];
  const sz = Math.min(110, ...nameLines.map((l) => 110 * 960 / measure(l.toUpperCase(), 110, UNB, 800)));
  txt('ОБЕРИ ГЕРОЯ · ' + (i + 1) + ' / 4', W / 2, 160, { size: 30, weight: 800, color: COL.gold, align: 'center', ls: 8 });
  nameLines.forEach((l, k) => txt(l.toUpperCase(), W / 2, 280 + k * sz * 1.05, { size: sz, font: UNB, weight: 800, align: 'center', shadow: 30 }));
  chip(C.perk, W / 2, 1500, { size: 38 });
  txt(l1, W / 2, 1660, { size: 46, weight: 700, align: 'center' });
  txt(l2, W / 2, 1722, { size: 46, weight: 700, align: 'center', color: COL.hi });
  // спалах при зміні статі
  if (lt > 0.95 && lt < 1.25) {
    const a = 1 - (lt - 0.95) / 0.3;
    for (let k = 0; k < 10; k++) {
      const ang = k / 10 * 6.283, r = 180 + (1 - a) * 220;
      ctx.fillStyle = `rgba(246,222,143,${a})`;
      ctx.fillRect(W / 2 + Math.cos(ang) * r - 10, 1100 + Math.sin(ang) * r - 10, 20, 20);
    }
  }
  txt(gender === 'm' ? 'він' : 'вона', W / 2, 1830, { size: 34, weight: 700, color: COL.muted, align: 'center' });
  ctx.restore();
  vignette(0.55);
  flash(0.3 - lt / 0.12);
});

// 6. Монтаж залів
const MONT = [
  [1, 'radio', 'f', 'ЗАЛ 2 · СТАЙНЯ', 'км/год → м/с', [4, 10], [5, 4]],
  [2, 'welder', 'm', 'ЗАЛ 3 · КУЗНЯ', 'a = (v − v₀) / t', [4, 10], [3, 5]],
  [3, 'carpenter', 'f', 'ЗАЛ 4 · БІБЛІОТЕКА', 'графіки v(t)', [4, 10], [4, 3]],
  [4, 'painter', 'm', 'ЗАЛ 5 · ТРОННА ЗАЛА', 's = a·t² / 2', [4, 11], [4, 3]],
];
let g6, g6i = -1;
scene(6, null, (t, T) => {
  const i = Math.min(3, Math.floor(t / 1.5)), lt = t - i * 1.5;
  const m = MONT[i];
  if (g6i !== i) { g6 = mkGame(m[0], m[1], m[2], m[5]); tapTile(g6, m[6][0], m[6][1]); g6i = i; }
  g6.update(1 / FPS);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const s = lerp(1.25, 1.0, eOut(lt / 1.4));
  drawRoom(g6, T * 1000, 540, 1060, s);
  ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(0, 0, W, 330);
  const a = eOut(lt / 0.25);
  txt(m[3].split(' · ')[0], W / 2, 120, { size: 32, weight: 800, color: COL.gold, align: 'center', ls: 10, alpha: a });
  txt(m[3].split(' · ')[1], W / 2, 230 + (1 - a) * 30, { size: 84, font: UNB, weight: 800, align: 'center', alpha: a, shadow: 30 });
  const b = eBack(seg(lt, 0.2, 0.55));
  ctx.save(); ctx.translate(W / 2, 1830); ctx.scale(b, b);
  panel(-330, -70, 660, 110, 30, { fill: '#000', stroke: COL.lo, glow: 30 });
  txt(m[4], 0, 6, { size: 56, font: SERIF, weight: 400, italic: true, color: COL.hi, align: 'center' });
  ctx.restore();
  flash(0.5 - lt / 0.1);
  vignette(0.45);
});

// 7. Типи дверей
const DOORS = [
  ['door_iron', 'Залізні ґрати', 'лише правильна', 'відповідь'],
  ['door_rune', 'Двері терпіння', '3 помилки,', 'і пропустять'],
  ['door_sage', 'Двері мудреця', 'вгадав одразу:', 'одне питання'],
  ['seal', 'Печать Паладина', 'фінал:', '3 випробування'],
];
scene(3, null, (t, T) => {
  ctx.fillStyle = '#060503'; ctx.fillRect(0, 0, W, H);
  glowBg(W / 2, 1000, 900, 0.12);
  drawMotes(T, 0.6);
  caption('КОЖНІ ДВЕРІ', ['МАЮТЬ СВОЇ', 'ПРАВИЛА'], t, 90, { size: 70 });
  DOORS.forEach(([sp, name, r1, r2], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 50 + col * 500, y = 480 + row * 680;
    const a = eBack(seg(t, 0.2 + i * 0.18, 0.55 + i * 0.18));
    if (a <= 0) return;
    ctx.save(); ctx.translate(x + 240, y + 300); ctx.scale(a, a); ctx.translate(-(x + 240), -(y + 300));
    panel(x, y, 480, 620, 34, { fill: 'grad', stroke: COL.dk });
    const img = sprite(sp, Math.floor(T * 4));
    const sc = img.width > 16 ? 8 : 18;
    ctx.fillStyle = '#000'; rrect(x + 40, y + 40, 400, 330, 24); ctx.fill();
    pix(img, x + 240 - img.width * sc / 2, y + 40 + 330 / 2 - img.height * sc / 2, sc);
    txt(name, x + 240, y + 450, { size: 38, font: UNB, weight: 700, align: 'center', color: COL.hi });
    txt(r1, x + 240, y + 515, { size: 36, weight: 700, align: 'center', color: '#d8cfbb' });
    txt(r2, x + 240, y + 565, { size: 36, weight: 700, align: 'center', color: '#d8cfbb' });
    ctx.restore();
  });
  vignette(0.5);
  flash(0.5 - t / 0.12);
});

// 8. Таймер і рейтинг
const ROWS = [
  ['Δ_паладин', 'гр. 203', '02:47.3'],
  ['Галілей_2.0', 'гр. 101', '03:05.9'],
  ['Швидкий_гонець', 'гр. 307', '03:18.4'],
  ['Кіт_Ньютон', 'гр. 104', '04:02.1'],
];
scene(4, null, (t, T) => {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  glowBg(W / 2, 330, 700, 0.18);
  drawMotes(T, 0.5);
  const up = eInOut(seg(t, 1.3, 1.8));
  const tv = 167.3 * eOut(seg(t, 0.1, 1.2));
  const mm = String(Math.floor(tv / 60)).padStart(2, '0'), ss = (tv % 60).toFixed(1).padStart(4, '0');
  txt('ТАЙМЕР НЕ ЗУПИНЯЄТЬСЯ', W / 2, lerp(560, 150, up), { size: 32, weight: 800, color: COL.gold, align: 'center', ls: 8 });
  txt(`${mm}:${ss}`, W / 2, lerp(800, 330, up), { size: lerp(200, 130, up), font: UNB, weight: 800, align: 'center', color: COL.hi, shadow: 50 });
  if (t > 1.5) txt('РЕЙТИНГ ГРУП', W / 2, 500, { size: 64, font: UNB, weight: 800, align: 'center', alpha: eOut(seg(t, 1.5, 1.8)) });
  const rows = [...ROWS, ['ТИ?', 'твоя група', '??:??.?']];
  rows.forEach(([n, g, tm], i) => {
    const a = eOut(seg(t, 1.6 + i * 0.16, 1.95 + i * 0.16));
    if (a <= 0) return;
    const y = 570 + i * 210, x = 60 + (1 - a) * 900;
    const me = i === 4;
    const pulse = me ? 1 + 0.025 * Math.sin(t * 10) : 1;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x + 480, y + 90); ctx.scale(pulse, pulse); ctx.translate(-(x + 480), -(y + 90));
    panel(x, y, 960, 180, 34, { fill: 'grad', stroke: me ? COL.gold : COL.dk, lw: me ? 6 : 3, glow: me ? 50 : 0 });
    const medal = ['#f6de8f', '#d6d2c6', '#c8834a'][i];
    ctx.fillStyle = medal || 'transparent';
    if (medal) { ctx.beginPath(); ctx.arc(x + 95, y + 90, 46, 0, 7); ctx.fill(); }
    txt(me ? '?' : String(i + 1), x + 95, y + 106, { size: 46, font: UNB, weight: 800, align: 'center', color: medal ? '#1d1503' : (me ? COL.hi : COL.muted) });
    txt(n, x + 180, y + 82, { size: 46, weight: 800, color: me ? COL.hi : COL.text });
    txt(g, x + 180, y + 138, { size: 34, weight: 600, color: COL.muted });
    txt(tm, x + 920, y + 108, { size: 48, font: UNB, weight: 700, align: 'right', color: COL.hi });
    ctx.restore();
  });
  if (t > 2.6) txt('Хто з групи перший зламає печать?', W / 2, 1720, { size: 46, weight: 800, align: 'center', alpha: eOut(seg(t, 2.6, 3.0)) });
  vignette(0.5);
  flash(0.45 - t / 0.12);
});

// 9. Фінал
const confetti = Array.from({ length: 110 }, () => ({ x: Math.random() * W, y: -Math.random() * H * 0.6, vx: (Math.random() - 0.5) * 120, vy: 300 + Math.random() * 500, r: Math.random() * 6, s: 10 + Math.random() * 18, c: ['#f6de8f', '#d8b04a', '#8c6b22', '#fff'][Math.floor(Math.random() * 4)] }));
scene(4.5, null, (t, T) => {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  glowBg(W / 2, 600, 800, 0.22);
  drawMotes(T, 0.7);
  for (const p of confetti) {
    const y = p.y + p.vy * t, x = p.x + p.vx * t;
    if (y > H + 40) continue;
    ctx.save(); ctx.translate(x, y); ctx.rotate(p.r + t * 4); ctx.fillStyle = p.c; ctx.globalAlpha = 0.9; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
  }
  deltaMark(W / 2, 520, 300, 1, 18);
  const a = eBack(seg(t, 0.1, 0.5));
  ctx.save(); ctx.translate(W / 2, 850); ctx.scale(a, a); ctx.translate(-W / 2, -850);
  txt('ОРДЕН ДЕЛЬТИ', W / 2, 860, { size: 92, font: UNB, weight: 800, align: 'center', shadow: 40 });
  ctx.restore();
  txt('Рівень I · Механіка', W / 2, 960, { size: 46, weight: 700, color: COL.hi, align: 'center', alpha: eOut(seg(t, 0.4, 0.8)) });
  txt('5 залів · 4 герої · свій час у рейтингу', W / 2, 1030, { size: 36, weight: 600, color: COL.muted, align: 'center', alpha: eOut(seg(t, 0.6, 1.0)) });
  const b = eBack(seg(t, 0.9, 1.3));
  ctx.save(); ctx.translate(W / 2, 1190); ctx.scale(b, b); ctx.translate(-W / 2, -1190);
  panel(70, 1120, W - 140, 150, 40, { fill: '#17110a', stroke: COL.gold, lw: 5, glow: 50 });
  txt('phys-kpkb.github.io/delta', W / 2, 1218, { size: 54, font: UNB, weight: 700, align: 'center', color: COL.hi });
  ctx.restore();
  txt('Грай з телефону. Таймер уже чекає.', W / 2, 1360, { size: 42, weight: 700, align: 'center', alpha: eOut(seg(t, 1.3, 1.7)) });
  // кіт Ньютон
  const cat = sprite('cat', Math.floor(T * 1.2));
  const ca = eOut(seg(t, 1.6, 2.0));
  pix(cat, W / 2 - 8 * 14, 1700 - 16 * 14 + (1 - ca) * 80, 14, { alpha: ca });
  for (let k = 0; k < 3; k++) {
    const zt = ((t * 0.8 + k * 0.33) % 1);
    if (t > 2.0) txt('z', W / 2 + 110 + zt * 60 + k * 10, 1500 - zt * 160, { size: 40 + k * 10, font: UNB, weight: 800, color: COL.hi, alpha: (1 - zt) * ca });
  }
  if (t > 2.2) txt('Кіт Ньютон теж чекає', W / 2, 1800, { size: 34, weight: 700, color: COL.muted, align: 'center', alpha: eOut(seg(t, 2.2, 2.6)) });
  vignette(0.5);
  flash(0.9 - t / 0.25);
  ctx.fillStyle = `rgba(0,0,0,${seg(t, 4.1, 4.5)})`; ctx.fillRect(0, 0, W, H);
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

  // музика: ре мінор, 120 BPM, такт = 2 с (Dm Bb F C)
  const ROOT = 50, PROG = [0, -4, 3, -2];
  const chordNotes = (deg) => {
    const scale = [0, 2, 3, 5, 7, 8, 10];
    const map = { 0: [0, 3, 7], '-4': [-4, 0, 3], 3: [3, 7, 10], '-2': [-2, 2, 5] };
    return map[deg].map((x) => ROOT + x);
  };
  const end = DURATION;
  const grooveStart = 3, grooveEnd = CUTS[7]; // до фіналу
  // інтро
  pad(ROOT - 12, 0, 3); pad(ROOT + 3, 0, 3, 0.03); pad(ROOT + 7, 0, 3, 0.03);
  boom(0.05); riser(1.2, 1.8); bell([587, 880], 1.0, 0.12, 0.08);
  for (let bar = 0; grooveStart + bar * 2 < grooveEnd; bar++) {
    const t0 = grooveStart + bar * 2;
    const ch = chordNotes(PROG[bar % 4]);
    pad(ch[0], t0, 2, 0.035); pad(ch[1], t0, 2, 0.03); pad(ch[2], t0, 2, 0.03);
    for (let b = 0; b < 4; b++) {
      const t = t0 + b * 0.5;
      if (t >= grooveEnd) break;
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
      if (rnd() < 0.85) pluck(ch[arp[k]] + 12 + (k === 6 ? 12 : 0), t, 0.07 + rnd() * 0.04);
    }
  }
  // фінал
  const F0 = CUTS[7];
  pad(ROOT - 12, F0, end - F0); pad(ROOT + 3, F0, end - F0, 0.035); pad(ROOT + 7, F0, end - F0, 0.035);
  boom(F0);
  bell([392, 523, 659, 784, 1047], F0 + 0.1, 0.11, 0.13);
  // мяу
  const mt = F0 + 1.8;
  { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(520, mt); o.frequency.linearRampToValueAtTime(820, mt + 0.12); o.frequency.linearRampToValueAtTime(430, mt + 0.45);
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 6; f.frequency.setValueAtTime(900, mt); f.frequency.linearRampToValueAtTime(1700, mt + 0.15); f.frequency.linearRampToValueAtTime(800, mt + 0.45);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, mt); g.gain.exponentialRampToValueAtTime(0.35, mt + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, mt + 0.5);
    o.connect(f); f.connect(g); g.connect(bus); o.start(mt); o.stop(mt + 0.6); }

  // звукові події, прив'язані до сцен
  const S3 = CUTS[1];
  tap(S3 + 0.3); noise(S3 + 1.4, 0.2, 3000, 0.8, 0.15); bell([1047, 1319], S3 + 1.7, 0.08, 0.05);
  tap(S3 + 3.5);
  tap(S3 + 4.55); tap(S3 + 4.8); tap(S3 + 5.1);
  bell([523, 659, 784, 1047], S3 + 5.25, 0.07, 0.14);
  boom(S3 + 6.0); noise(S3 + 6.0, 0.5, 220, 1.5, 0.4);
  riser(S3 + 6.4, 1.1);
  const S4 = CUTS[2];
  whoosh(S4); [0.25, 0.5, 0.75].forEach((d) => { noise(S4 + d, 0.12, 1500, 1, 0.25); osc('square', 1319, S4 + d, 0.12, 0.05); });
  bell([784, 988, 1175, 1568], S4 + 1.55, 0.05, 0.12);
  whoosh(S4 + 2.0, 0.35, 0.2); [2.65, 2.9].forEach((d) => { noise(S4 + d, 0.12, 1500, 1, 0.25); osc('square', 1319, S4 + d, 0.12, 0.05); });
  const S5 = CUTS[3];
  for (let i = 0; i < 4; i++) { whoosh(S5 + i * 2 - 0.05, 0.4, 0.3); bell([1568, 2093], S5 + i * 2 + 0.95, 0.05, 0.06); }
  const S6 = CUTS[4];
  for (let i = 0; i < 4; i++) { boom(S6 + i * 1.5); noise(S6 + i * 1.5, 0.3, 2500, 0.7, 0.2); }
  const S7 = CUTS[5];
  whoosh(S7); for (let i = 0; i < 4; i++) osc('triangle', 660 + i * 110, S7 + 0.25 + i * 0.18, 0.2, 0.12, { att: 0.003 });
  const S8 = CUTS[6];
  for (let i = 0; i < 12; i++) osc('square', 2000, S8 + 0.1 + i * 0.09, 0.03, 0.03, { att: 0.001 });
  for (let i = 0; i < 5; i++) noise(S8 + 1.6 + i * 0.16, 0.2, 1200, 1, 0.12, 'bandpass', 4000);

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
