// Весь піксель-арт гри малюється кодом: кожен спрайт — функція, що
// заповнює маленьке полотно (16 px на клітинку), яке потім масштабується.

export const T = 16; // пікселів на клітинку

export const C = {
  ink: '#0a0806', cap: '#0c0a07', capEdge: '#4a3b1c',
  stoneA: '#231d14', stoneB: '#18140e', stoneLine: '#100d09', stoneHi: '#2c251a',
  brick: '#30281b', brick2: '#3a3021', brick3: '#2a2318', mortar: '#17120b',
  gold: '#d8b04a', goldHi: '#f6de8f', goldLo: '#8c6b22', goldDk: '#5a4618',
  wood: '#6b4a2b', woodHi: '#8a6239', woodLo: '#4a3220', woodDk: '#2e1d12',
  iron: '#5b5e66', ironHi: '#8d9099', ironLo: '#34363c', ironDk: '#1f2024',
  red: '#6e1d16', redHi: '#8f2a1f', redLo: '#46120d',
  parch: '#eadfbf', parchLo: '#c4b286', parchDk: '#8f7d55', inkTxt: '#4a3b26',
  skin: '#eab48c', skinLo: '#c98f66', blush: '#e48d7c',
  glass: '#2f5684', glassHi: '#6f9fd2', glassDk: '#1c3354',
  leaf: '#4f7a3a', leafHi: '#77a356', leafLo: '#34522a',
  hay: '#c9a54a', hayHi: '#e2c46a', hayLo: '#8f7430',
  fire1: '#fff1a8', fire2: '#ffc340', fire3: '#ff7a1f', fire4: '#c4381a',
  stone: '#8a8478', stoneLt: '#aaa498', stoneDk: '#5e5a52',
  white: '#f3eee2', black: '#000',
  shadow: 'rgba(0,0,0,.38)',
};

// детермінований «шум» для варіацій плитки
export function hh(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function painter(g) {
  return (col, x, y, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
}

// ---------- тайли підлоги та стін ----------

export function drawFloor(r, kind, ox, oy, tx, ty) {
  if (kind === 'wood') {
    r('#33251a', ox, oy, 16, 16);
    for (let j = 0; j < 4; j++) {
      const y = oy + j * 4;
      const shade = ['#3b2a1b', '#412f1e', '#37281a', '#3e2c1c'][Math.floor(hh(tx, ty, j) * 4)];
      r(shade, ox, y, 16, 3);
      r('#22170e', ox, y + 3, 16, 1);
      const jx = Math.floor(((tx * 16 + j * 7 + ty * 5) % 16));
      r('#22170e', ox + jx, y, 1, 3);
      if (hh(tx, ty, j + 9) > 0.6) r('#4a3622', ox + ((jx + 5) % 15), y + 1, 2, 1);
    }
    return;
  }
  if (kind === 'straw') {
    r('#261f15', ox, oy, 16, 16);
    for (let i = 0; i < 9; i++) {
      const px = Math.floor(hh(tx, ty, i) * 14), py = Math.floor(hh(ty, tx, i + 3) * 15);
      r(i % 3 ? '#5a4824' : '#7a6331', ox + px, oy + py, 2 + (i % 2), 1);
    }
    r('#1c160e', ox, oy + 15, 16, 1);
    return;
  }
  // камінь «шахівниця»
  const dark = (tx + ty) & 1;
  r(dark ? C.stoneB : C.stoneA, ox, oy, 16, 16);
  r(C.stoneLine, ox, oy + 15, 16, 1);
  r(C.stoneLine, ox + 15, oy, 1, 16);
  r(dark ? '#1e1912' : C.stoneHi, ox, oy, 15, 1);
  for (let i = 0; i < 4; i++) {
    const px = 1 + Math.floor(hh(tx, ty, i) * 13), py = 1 + Math.floor(hh(ty, tx, i + 7) * 13);
    r(i % 2 ? (dark ? '#201b13' : '#2f281c') : C.stoneLine, ox + px, oy + py);
  }
}

export function drawCarpet(r, ox, oy, nb) {
  r(C.red, ox, oy, 16, 16);
  // візерунок-ромбики
  r(C.redHi, ox + 7, oy + 5, 2, 1); r(C.redHi, ox + 6, oy + 6, 4, 4); r(C.redHi, ox + 7, oy + 10, 2, 1);
  r(C.redLo, ox + 7, oy + 7, 2, 2);
  r(C.redLo, ox, oy, 1, 1); r(C.redLo, ox + 15, oy + 15, 1, 1);
  if (!nb.l) { r(C.redLo, ox, oy, 1, 16); r(C.goldLo, ox + 1, oy, 1, 16); r(C.gold, ox + 2, oy, 1, 16); }
  if (!nb.r) { r(C.redLo, ox + 15, oy, 1, 16); r(C.goldLo, ox + 14, oy, 1, 16); r(C.gold, ox + 13, oy, 1, 16); }
  if (!nb.t) { r(C.redLo, ox, oy, 16, 1); r(C.goldLo, ox, oy + 1, 16, 1); r(C.gold, ox + (nb.l ? 0 : 2), oy + 2, 16 - (nb.l ? 0 : 2) - (nb.r ? 0 : 2), 1); }
  if (!nb.b) { r(C.redLo, ox, oy + 15, 16, 1); r(C.goldLo, ox, oy + 14, 16, 1); r(C.gold, ox + (nb.l ? 0 : 2), oy + 13, 16 - (nb.l ? 0 : 2) - (nb.r ? 0 : 2), 1); }
}

export function drawRails(r, ox, oy) {
  for (let i = 0; i < 4; i++) r(C.woodLo, ox + 1 + i * 4, oy + 3, 2, 10);
  r(C.ironHi, ox, oy + 4, 16, 1); r(C.iron, ox, oy + 5, 16, 1);
  r(C.ironHi, ox, oy + 10, 16, 1); r(C.iron, ox, oy + 11, 16, 1);
}

export function drawBricks(r, ox, oy, tx) {
  r(C.goldDk, ox, oy, 16, 1);
  r('#221b10', ox, oy + 1, 16, 1);
  for (let k = 0; k < 3; k++) {
    const yb = oy + 2 + k * 4;
    const off = ((k % 2) * 4 + (tx % 2) * 8) % 16;
    for (let n = -1; n < 3; n++) {
      const bx = off - 8 + n * 8;
      const col = [C.brick, C.brick2, C.brick3][Math.floor(hh(tx * 3 + n + 1, k, 5) * 3)];
      const x0 = Math.max(0, bx), x1 = Math.min(16, bx + 8);
      if (x1 > x0) r(col, ox + x0, yb, x1 - x0, 3);
      if (bx + 8 >= 0 && bx + 8 < 16) r(C.mortar, ox + bx + 7, yb, 1, 3);
      if (x1 > x0) r('#463a26', ox + x0, yb, Math.min(2, x1 - x0), 1);
    }
    r(C.mortar, ox, yb + 3, 16, 1);
  }
  r('#120e09', ox, oy + 14, 16, 1);
  r(C.ink, ox, oy + 15, 16, 1);
}

export function drawCap(r, ox, oy, edges) {
  r(C.cap, ox, oy, 16, 16);
  if (edges.b) { r(C.capEdge, ox, oy + 15, 16, 1); }
  if (edges.t) { r(C.capEdge, ox, oy, 16, 1); }
  if (edges.l) { r(C.capEdge, ox, oy, 1, 16); }
  if (edges.r) { r(C.capEdge, ox + 15, oy, 1, 16); }
}

// ---------- спрайти ----------
// кожен: { w, h, frames?, draw(r, f, g) }

const shadowRow = (r, x, y, w) => { r(C.shadow, x + 1, y, w - 2, 1); r(C.shadow, x, y - 1, w, 1); };

function flame(r, cx, top, f, big = false) {
  const k = [0, 1, 0, -1][f % 4];
  if (big) {
    r(C.fire4, cx - 3, top + 4, 7, 4);
    r(C.fire3, cx - 2 + (k > 0 ? 1 : 0), top + 2, 5, 5);
    r(C.fire2, cx - 1, top + 1 + Math.abs(k), 3, 5);
    r(C.fire1, cx, top + 3 + (k < 0 ? 1 : 0), 1, 3);
    r(C.fire2, cx + k, top - 1 + Math.abs(k), 1, 2);
    return;
  }
  r(C.fire3, cx - 1, top + 2, 3, 3);
  r(C.fire2, cx - 1 + (k > 0 ? 1 : 0), top + 1, 2, 3);
  r(C.fire1, cx, top + 2 + (k < 0 ? 1 : 0), 1, 2);
  r(C.fire2, cx + k, top, 1, 1);
}

function deltaGlyph(r, x, y, col) {
  // маленький знак Δ 6×5
  r(col, x + 2, y, 2, 1);
  r(col, x + 1, y + 1, 1, 2); r(col, x + 4, y + 1, 1, 2);
  r(col, x, y + 3, 1, 1); r(col, x + 5, y + 3, 1, 1);
  r(col, x, y + 4, 6, 1);
}

export const SPR = {
  torch: { w: 16, h: 16, frames: 4, draw(r, f) {
    r(C.ironLo, 6, 10, 4, 1); r(C.iron, 7, 9, 2, 4); r(C.ironDk, 7, 13, 2, 1);
    r(C.woodLo, 7, 6, 2, 4); r(C.woodHi, 7, 6, 1, 3);
    flame(r, 7, 1, f);
  } },
  banner: { w: 16, h: 16, draw(r) {
    r(C.goldLo, 2, 1, 12, 1); r(C.gold, 3, 1, 10, 1); r(C.goldHi, 2, 1, 1, 1); r(C.goldHi, 13, 1, 1, 1);
    r(C.redLo, 4, 2, 8, 11); r(C.red, 5, 2, 6, 11); r(C.redHi, 5, 2, 1, 10);
    r(C.redLo, 4, 13, 3, 1); r(C.redLo, 9, 13, 3, 1); r(C.red, 5, 13, 1, 1); r(C.red, 10, 13, 1, 1);
    r(C.redLo, 5, 14, 1, 1); r(C.redLo, 10, 14, 1, 1);
    deltaGlyph(r, 5, 5, C.gold);
    r(C.goldLo, 4, 11, 8, 1);
  } },
  window: { w: 16, h: 16, draw(r) {
    r(C.stoneDk, 3, 2, 10, 12); r(C.stone, 4, 2, 8, 1); r(C.stone, 3, 3, 1, 10);
    r(C.glassDk, 4, 4, 8, 9); r(C.glass, 5, 3, 6, 1); r(C.glass, 4, 4, 8, 8);
    r(C.glassHi, 5, 4, 2, 1); r(C.glassHi, 5, 5, 1, 2);
    r(C.ironDk, 7, 3, 2, 10); r(C.ironDk, 4, 8, 8, 1);
    r(C.stoneLt, 3, 13, 10, 1); r(C.stoneDk, 2, 14, 12, 1);
  } },
  stained: { w: 16, h: 16, draw(r) {
    r(C.stoneDk, 3, 1, 10, 13); r(C.stone, 4, 1, 8, 1);
    const cols = ['#a8322a', '#2f5fa8', '#d8b04a', '#3f8a52', '#7a3fa0'];
    for (let y = 2; y < 13; y++) for (let x = 4; x < 12; x++) r(cols[(Math.floor(x / 2) + Math.floor(y / 3)) % 5], x, y);
    r(C.ironDk, 7, 2, 2, 11); r(C.ironDk, 4, 7, 8, 1);
    r(C.goldHi, 7, 4, 2, 2);
    r(C.stoneLt, 3, 13, 10, 1);
  } },
  noticeboard: { w: 16, h: 16, draw(r) {
    r(C.woodDk, 1, 2, 14, 12); r(C.wood, 2, 3, 12, 10); r(C.woodHi, 2, 3, 12, 1);
    r(C.parch, 3, 4, 5, 6); r(C.parchLo, 3, 9, 5, 1);
    r(C.inkTxt, 4, 5, 3, 1); r(C.inkTxt, 4, 7, 2, 1);
    r(C.parch, 9, 5, 4, 7); r(C.parchLo, 9, 11, 4, 1);
    r(C.inkTxt, 10, 6, 2, 1); r(C.inkTxt, 10, 8, 2, 1); r(C.inkTxt, 10, 9, 1, 1);
    r('#c0261a', 5, 4, 1, 1); r('#c0261a', 11, 5, 1, 1);
  } },
  fresco: { w: 16, h: 16, draw(r) {
    r('#3b3326', 2, 3, 12, 10); r('#463d2e', 3, 4, 10, 8);
    r('#524735', 4, 5, 3, 2); r('#524735', 8, 8, 4, 2); r('#3b3326', 6, 7, 2, 3);
    r('#2f281e', 11, 4, 1, 3); r('#2f281e', 3, 10, 3, 1);
  } },
  fresco_on: { w: 16, h: 16, draw(r) {
    r(C.goldLo, 2, 3, 12, 10); r('#e8dcc0', 3, 4, 10, 8);
    r('#2f5fa8', 3, 4, 10, 3); // небо
    r(C.gold, 10, 5, 2, 2); // сонце
    r('#3f8a52', 3, 10, 10, 2); // земля
    r('#a8322a', 5, 7, 2, 3); r(C.skin, 5, 6, 2, 1); // бігун
    r(C.inkTxt, 4, 10, 1, 1); r(C.inkTxt, 7, 10, 1, 1);
    r(C.goldDk, 8, 8, 4, 1); r(C.goldDk, 11, 7, 1, 3); // стрілка
  } },
  crack: { w: 16, h: 16, draw(r) {
    drawBricks(r, 0, 0, 1);
    r(C.ink, 7, 2, 1, 2); r(C.ink, 8, 4, 1, 2); r(C.ink, 7, 6, 1, 2); r(C.ink, 6, 8, 1, 2);
    r(C.ink, 7, 10, 1, 2); r(C.ink, 8, 12, 1, 2); r(C.ink, 9, 6, 2, 1); r(C.ink, 5, 9, 1, 1);
    r('#4a3f2b', 8, 2, 1, 2); r('#4a3f2b', 9, 4, 1, 2);
  } },
  crack_open: { w: 16, h: 16, draw(r) {
    drawBricks(r, 0, 0, 1);
    r(C.ink, 3, 3, 10, 12); r('#120d08', 4, 4, 8, 10);
    r(C.brick2, 2, 5, 2, 2); r(C.brick, 12, 8, 2, 2);
    // відкрита скриня
    r(C.woodDk, 4, 9, 8, 5); r(C.wood, 5, 10, 6, 3); r(C.gold, 4, 9, 8, 1);
    r(C.goldHi, 7, 8, 2, 1); r(C.woodLo, 4, 6, 8, 2);
  } },
  door_oak: { w: 16, h: 16, draw(r) {
    r(C.stoneDk, 2, 1, 12, 15); r(C.stone, 3, 1, 10, 1); r(C.stone, 2, 2, 1, 13); r(C.stone, 13, 2, 1, 13);
    r(C.woodDk, 3, 2, 10, 14); r(C.wood, 4, 3, 8, 13);
    r(C.woodLo, 6, 3, 1, 13); r(C.woodLo, 9, 3, 1, 13); r(C.woodHi, 4, 3, 1, 13);
    r(C.ironLo, 3, 5, 10, 1); r(C.ironLo, 3, 12, 10, 1);
    r(C.iron, 4, 5, 1, 1); r(C.iron, 11, 12, 1, 1);
    r(C.gold, 10, 8, 2, 2); r(C.goldLo, 10, 10, 2, 1);
  } },
  door_oak_open: { w: 16, h: 16, draw(r) {
    r(C.stoneDk, 2, 1, 12, 15); r(C.stone, 3, 1, 10, 1);
    r(C.ink, 3, 2, 10, 14); r('#1a1309', 4, 3, 8, 13);
    r(C.woodDk, 3, 2, 2, 14); r(C.wood, 3, 3, 1, 12);
  } },
  door_iron: { w: 16, h: 16, draw(r) {
    r(C.stoneDk, 2, 1, 12, 15); r(C.stone, 3, 1, 10, 1); r(C.stone, 2, 2, 1, 13); r(C.stone, 13, 2, 1, 13);
    r('#0d0c0b', 3, 2, 10, 14);
    for (let x = 4; x < 13; x += 2) { r(C.iron, x, 2, 1, 14); r(C.ironHi, x, 2, 1, 1); }
    r(C.ironLo, 3, 5, 10, 1); r(C.ironLo, 3, 10, 10, 1);
    for (let x = 4; x < 13; x += 2) r(C.ironHi, x, 15, 1, 1);
  } },
  door_iron_open: { w: 16, h: 16, draw(r) {
    r(C.stoneDk, 2, 1, 12, 15); r(C.stone, 3, 1, 10, 1);
    r(C.ink, 3, 2, 10, 14); r('#1a1309', 4, 4, 8, 12);
    for (let x = 4; x < 13; x += 2) r(C.iron, x, 2, 1, 2);
    r(C.ironLo, 3, 3, 10, 1);
  } },
  door_rune: { w: 16, h: 16, frames: 4, draw(r, f) {
    r(C.stoneDk, 2, 1, 12, 15); r(C.stone, 3, 1, 10, 1);
    r('#4b4740', 3, 2, 10, 14); r('#5a554c', 4, 3, 8, 13); r('#3c3832', 7, 3, 2, 13);
    const glow = [C.goldLo, C.gold, C.goldHi, C.gold][f];
    r(glow, 5, 5, 1, 1); r(glow, 10, 5, 1, 1); r(glow, 5, 12, 1, 1); r(glow, 10, 12, 1, 1);
    r(glow, 6, 8, 4, 1); r(glow, 7, 7, 2, 3);
    r(C.goldLo, 4, 3, 1, 1);
  } },
  door_rune_open: { w: 16, h: 16, draw(r) {
    r(C.stoneDk, 2, 1, 12, 15); r(C.stone, 3, 1, 10, 1);
    r(C.ink, 3, 2, 10, 14); r('#1a1309', 4, 3, 8, 13);
    r('#4b4740', 3, 2, 1, 14); r('#4b4740', 12, 2, 1, 14);
  } },
  door_sage: { w: 16, h: 16, frames: 4, draw(r, f) {
    r(C.stoneDk, 2, 1, 12, 15); r(C.stone, 3, 1, 10, 1);
    r('#2a2236', 3, 2, 10, 14); r('#3a2f4a', 4, 3, 8, 13);
    r(C.goldLo, 3, 2, 10, 1); r(C.goldLo, 7, 3, 2, 13);
    // око
    r(C.parch, 5, 7, 6, 3); r(C.parchLo, 6, 6, 4, 1); r(C.parchLo, 6, 10, 4, 1);
    const look = [0, 1, 0, -1][f];
    r('#4a7fd0', 7 + (look > 0 ? 1 : 0) - (look < 0 ? 1 : 0), 7, 2, 3); r(C.ink, 7 + (look > 0 ? 1 : 0) - (look < 0 ? 1 : 0), 8, 2, 1);
    r(C.gold, 10, 12, 1, 1);
  } },
  door_sage_open: { w: 16, h: 16, draw(r) {
    r(C.stoneDk, 2, 1, 12, 15); r(C.stone, 3, 1, 10, 1);
    r(C.ink, 3, 2, 10, 14); r('#120f1a', 4, 3, 8, 13);
    r(C.goldLo, 3, 2, 10, 1);
  } },
  seal: { w: 48, h: 16, frames: 4, draw(r, f) {
    r(C.stoneDk, 1, 0, 46, 16); r(C.stone, 2, 0, 44, 1);
    r(C.goldLo, 3, 1, 42, 15); r('#2b2210', 4, 2, 40, 14);
    r(C.goldDk, 23, 2, 2, 14);
    for (let x = 6; x < 44; x += 6) { r(C.goldLo, x, 3, 1, 12); }
    // печать
    const g = [C.gold, C.goldHi, C.gold, C.goldLo][f];
    r(C.goldLo, 18, 4, 12, 9); r(g, 19, 5, 10, 7); r(C.redLo, 20, 6, 8, 5);
    deltaGlyph(r, 21, 6, g);
    r(C.gold, 4, 2, 40, 1);
  } },
  seal_open: { w: 48, h: 16, draw(r) {
    r(C.stoneDk, 1, 0, 46, 16); r(C.stone, 2, 0, 44, 1);
    r(C.goldLo, 3, 1, 42, 1);
    r('#2a1f08', 3, 2, 42, 14); r('#5a4410', 6, 4, 36, 12); r('#a8822a', 10, 6, 28, 10); r('#f6de8f', 16, 8, 16, 8);
    r(C.goldLo, 3, 2, 3, 14); r(C.goldLo, 42, 2, 3, 14);
  } },
  table_scroll: { w: 16, h: 16, draw(r) {
    shadowRow(r, 1, 15, 14);
    r(C.woodLo, 2, 11, 2, 4); r(C.woodLo, 12, 11, 2, 4);
    r(C.woodDk, 1, 10, 14, 2); r(C.wood, 1, 6, 14, 4); r(C.woodHi, 1, 6, 14, 1);
    r(C.parch, 4, 5, 8, 3); r(C.parchLo, 4, 7, 8, 1);
    r(C.parchDk, 3, 4, 2, 4); r(C.parch, 3, 4, 1, 3); r(C.parchDk, 11, 4, 2, 4); r(C.parch, 12, 4, 1, 3);
    r('#c0261a', 7, 5, 2, 2);
  } },
  hourglass: { w: 16, h: 16, draw(r) {
    shadowRow(r, 3, 15, 10);
    r(C.woodDk, 3, 13, 10, 2); r(C.wood, 4, 12, 8, 1);
    r(C.goldLo, 4, 2, 8, 1); r(C.gold, 4, 1, 8, 1); r(C.goldLo, 4, 11, 8, 1);
    r(C.goldLo, 4, 2, 1, 10); r(C.goldLo, 11, 2, 1, 10);
    r('#9fc0d8', 5, 3, 6, 1); r('#9fc0d8', 6, 4, 4, 2); r('#9fc0d8', 7, 6, 2, 1); r('#9fc0d8', 6, 7, 4, 2); r('#9fc0d8', 5, 9, 6, 2);
    r(C.hay, 6, 4, 4, 1); r(C.hay, 7, 5, 2, 1); r(C.hay, 7, 7, 1, 2); r(C.hay, 5, 10, 6, 1); r(C.hayHi, 6, 9, 4, 1);
  } },
  rack: { w: 16, h: 16, draw(r) {
    shadowRow(r, 1, 15, 14);
    r(C.woodDk, 1, 13, 14, 2); r(C.woodLo, 2, 4, 1, 10); r(C.woodLo, 13, 4, 1, 10); r(C.wood, 1, 5, 14, 1);
    for (let i = 0; i < 3; i++) { const x = 4 + i * 3; r(C.woodHi, x, 3, 1, 10); r(C.ironHi, x, 1, 1, 2); r(C.iron, x - 1, 2, 3, 1); }
  } },
  armor: { w: 16, h: 26, draw(r) {
    shadowRow(r, 3, 25, 10);
    r(C.woodDk, 4, 23, 8, 2); r(C.woodLo, 7, 19, 2, 4);
    r(C.iron, 5, 2, 6, 6); r(C.ironHi, 5, 2, 6, 1); r(C.ironDk, 6, 4, 4, 1); r(C.gold, 7, 1, 2, 1);
    r(C.iron, 3, 8, 10, 2); r(C.ironHi, 3, 8, 10, 1);
    r(C.ironLo, 4, 10, 8, 8); r(C.iron, 5, 10, 6, 7); r(C.ironHi, 5, 10, 1, 6);
    deltaGlyph(r, 5, 11, C.gold);
    r(C.ironLo, 5, 18, 6, 1);
  } },
  barrel: { w: 16, h: 16, draw(r) {
    shadowRow(r, 3, 15, 10);
    r(C.woodDk, 3, 2, 10, 13); r(C.wood, 4, 2, 8, 13); r(C.woodHi, 5, 3, 1, 11);
    r(C.woodLo, 3, 1, 10, 2); r('#2a1c10', 4, 1, 8, 1);
    r(C.ironLo, 3, 4, 10, 1); r(C.ironLo, 3, 11, 10, 1); r(C.iron, 4, 4, 2, 1); r(C.iron, 4, 11, 2, 1);
  } },
  crate: { w: 16, h: 16, draw(r) {
    shadowRow(r, 2, 15, 12);
    r(C.woodDk, 2, 3, 12, 12); r(C.wood, 3, 4, 10, 10); r(C.woodHi, 3, 4, 10, 1);
    r(C.woodLo, 3, 8, 10, 1); r(C.woodLo, 7, 4, 2, 10);
    r(C.woodLo, 4, 5, 1, 1); r(C.woodLo, 11, 12, 1, 1);
  } },
  hay: { w: 16, h: 16, draw(r) {
    shadowRow(r, 1, 15, 14);
    r(C.hayLo, 1, 4, 14, 11); r(C.hay, 2, 4, 12, 10); r(C.hayHi, 2, 4, 12, 1);
    for (let i = 0; i < 6; i++) r(C.hayLo, 3 + i * 2, 6 + (i % 2) * 3, 1, 3);
    r(C.woodLo, 1, 7, 14, 1); r(C.woodLo, 1, 11, 14, 1);
  } },
  plant: { w: 16, h: 16, draw(r) {
    shadowRow(r, 4, 15, 8);
    r('#7a3f22', 5, 10, 6, 5); r('#9a5530', 5, 10, 6, 1);
    r(C.leafLo, 4, 4, 8, 6); r(C.leaf, 5, 3, 6, 6); r(C.leafHi, 6, 3, 2, 2); r(C.leafHi, 9, 5, 2, 1);
    r(C.leaf, 3, 6, 2, 2); r(C.leaf, 11, 5, 2, 2);
  } },
  cat: { w: 16, h: 16, frames: 2, draw(r, f) {
    shadowRow(r, 2, 15, 12);
    const b = f ? 1 : 0;
    r('#2a2420', 3, 9 - b, 10, 6 + b); r('#3a322b', 4, 9 - b, 8, 2);
    r('#2a2420', 10, 6, 5, 5); r('#2a2420', 10, 5, 1, 1); r('#2a2420', 14, 5, 1, 1);
    r(C.gold, 11, 8, 1, 1); r(C.gold, 13, 8, 1, 1); // заплющені очі-рисочки
    r('#2a2420', 1, 12, 3, 2); r('#2a2420', 1, 11, 1, 1);
    r(C.blush, 12, 9, 1, 1);
  } },
  table_book: { w: 16, h: 16, draw(r) {
    shadowRow(r, 1, 15, 14);
    r(C.woodLo, 2, 11, 2, 4); r(C.woodLo, 12, 11, 2, 4);
    r(C.woodDk, 1, 10, 14, 2); r(C.wood, 1, 6, 14, 4); r(C.woodHi, 1, 6, 14, 1);
    r('#2f5fa8', 3, 3, 4, 4); r('#244a84', 3, 6, 4, 1);
    r(C.parch, 8, 4, 6, 3); r(C.parchLo, 11, 4, 1, 3); r(C.inkTxt, 9, 5, 1, 1); r(C.inkTxt, 12, 5, 1, 1);
  } },
  lectern: { w: 16, h: 18, draw(r) {
    shadowRow(r, 3, 17, 10);
    r(C.woodDk, 4, 15, 8, 2); r(C.woodLo, 7, 8, 2, 7);
    r(C.woodDk, 2, 5, 12, 4); r(C.wood, 3, 5, 10, 3);
    r(C.parch, 3, 3, 5, 3); r(C.parch, 8, 3, 5, 3); r(C.parchLo, 7, 3, 2, 3);
    r(C.inkTxt, 4, 4, 2, 1); r(C.inkTxt, 9, 4, 3, 1);
    r('#c0261a', 8, 6, 1, 3);
  } },
  chalkboard: { w: 32, h: 16, draw(r) {
    r(C.woodDk, 1, 2, 30, 13); r(C.wood, 2, 2, 28, 1);
    r('#1d2a21', 2, 3, 28, 11); r('#22312a', 3, 4, 26, 9);
    r('#cfd8cc', 5, 4, 1, 9); r('#cfd8cc', 5, 12, 22, 1); // осі
    r('#f3eee2', 6, 10, 2, 1); r('#f3eee2', 8, 9, 3, 1); r('#f3eee2', 11, 8, 3, 1); r('#f3eee2', 14, 7, 3, 1); r('#f3eee2', 17, 6, 3, 1); r('#f3eee2', 20, 5, 3, 1);
    r(C.gold, 23, 5, 1, 7); r(C.gold, 4, 5, 1, 1);
    r(C.parch, 26, 13, 3, 1);
  } },
  bookshelf: { w: 16, h: 28, draw(r) {
    shadowRow(r, 1, 27, 14);
    r(C.woodDk, 1, 1, 14, 26); r(C.wood, 2, 1, 12, 1);
    const cols = ['#7a2219', '#2f5fa8', '#3f8a52', C.gold, '#6b3f8a', '#a86a2a'];
    for (let s = 0; s < 3; s++) {
      const y = 3 + s * 8;
      r('#1a110a', 2, y, 12, 6);
      let x = 2;
      for (let b = 0; x < 13; b++) {
        const w = 1 + Math.floor(hh(b, s, 3) * 2), h = 4 + Math.floor(hh(s, b, 4) * 2);
        r(cols[(b + s * 2) % cols.length], x, y + 6 - h, w, h);
        x += w + (hh(b, s, 8) > 0.8 ? 1 : 0);
      }
      r(C.woodLo, 2, y + 6, 12, 2); r(C.woodHi, 2, y + 6, 12, 1);
    }
  } },
  candles: { w: 16, h: 16, frames: 4, draw(r, f) {
    shadowRow(r, 3, 15, 10);
    r(C.goldLo, 4, 14, 8, 1); r(C.gold, 7, 8, 2, 6); r(C.goldLo, 3, 8, 10, 1);
    r(C.gold, 3, 6, 1, 2); r(C.gold, 12, 6, 1, 2);
    r(C.white, 3, 4, 1, 2); r(C.white, 12, 4, 1, 2); r(C.white, 7, 3, 2, 5);
    const k = f % 2;
    r(C.fire2, 3, 2 + k, 1, 2); r(C.fire2, 12, 3 - k, 1, 1 + k); r(C.fire2, 7 + k, 1, 1, 2); r(C.fire1, 3, 3, 1, 1);
  } },
  globe: { w: 16, h: 16, draw(r) {
    shadowRow(r, 4, 15, 8);
    r(C.woodDk, 5, 14, 6, 1); r(C.woodLo, 7, 11, 2, 3);
    r(C.goldLo, 3, 2, 1, 9); r(C.goldLo, 4, 1, 6, 1);
    r('#2f5fa8', 4, 3, 8, 7); r('#2f5fa8', 5, 2, 6, 9);
    r('#3f8a52', 5, 4, 3, 2); r('#3f8a52', 8, 7, 3, 2); r('#3f8a52', 6, 8, 1, 1);
    r(C.glassHi, 5, 3, 1, 1);
  } },
  telescope: { w: 16, h: 16, draw(r) {
    shadowRow(r, 3, 15, 10);
    r(C.woodLo, 5, 9, 1, 6); r(C.woodLo, 10, 9, 1, 6); r(C.woodLo, 7, 9, 2, 5);
    r(C.goldLo, 3, 7, 4, 3); r(C.gold, 6, 5, 4, 3); r(C.goldHi, 9, 3, 4, 3); r(C.goldDk, 12, 3, 1, 3);
    r(C.goldHi, 6, 5, 4, 1);
  } },
  anvil: { w: 16, h: 16, draw(r) {
    shadowRow(r, 2, 15, 12);
    r(C.woodDk, 4, 11, 8, 4); r(C.woodLo, 4, 11, 8, 1);
    r(C.ironDk, 6, 8, 4, 3);
    r(C.ironLo, 2, 5, 12, 3); r(C.iron, 3, 5, 10, 1); r(C.ironHi, 3, 5, 6, 1);
    r(C.ironLo, 1, 5, 2, 1);
  } },
  furnace: { w: 32, h: 26, frames: 4, draw(r, f) {
    shadowRow(r, 1, 25, 30);
    r(C.stoneDk, 2, 2, 28, 23); r(C.stone, 3, 2, 26, 1);
    for (let y = 4; y < 24; y += 4) for (let x = 3 + ((y / 4) % 2) * 3; x < 29; x += 6) r('#4c4842', x, y, 5, 3);
    r(C.ink, 8, 10, 16, 12); r('#3a1208', 9, 11, 14, 11);
    flame(r, 13, 13, f, true); flame(r, 19, 14, f + 2, true);
    r(C.fire4, 9, 20, 14, 2); r(C.fire3, 10, 21, 12, 1);
    r(C.ironLo, 6, 9, 20, 1); r(C.ironLo, 13, 0, 6, 2);
  } },
  bucket: { w: 16, h: 16, draw(r) {
    shadowRow(r, 4, 15, 8);
    r(C.woodDk, 4, 7, 8, 8); r(C.wood, 5, 7, 6, 7); r(C.ironLo, 4, 9, 8, 1); r(C.ironLo, 4, 13, 8, 1);
    r(C.glass, 5, 7, 6, 1); r(C.glassHi, 6, 7, 2, 1);
    r(C.ironHi, 4, 4, 1, 3); r(C.ironHi, 11, 4, 1, 3); r(C.ironHi, 5, 3, 6, 1);
  } },
  trough: { w: 16, h: 16, draw(r) {
    shadowRow(r, 1, 15, 14);
    r(C.woodDk, 1, 7, 14, 7); r(C.wood, 2, 8, 12, 5); r(C.glass, 2, 8, 12, 2); r(C.glassHi, 4, 8, 3, 1);
    r(C.woodLo, 2, 13, 2, 2); r(C.woodLo, 12, 13, 2, 2);
  } },
  saddle: { w: 16, h: 16, draw(r) {
    r(C.woodLo, 2, 6, 12, 2);
    r('#5a2f1a', 3, 4, 10, 4); r('#7a4426', 4, 4, 8, 2); r('#5a2f1a', 3, 8, 3, 4); r('#5a2f1a', 10, 8, 3, 4);
    r(C.gold, 7, 4, 2, 1); r(C.iron, 4, 12, 1, 2); r(C.iron, 11, 12, 1, 2);
  } },
  horseshoe: { w: 16, h: 16, draw(r) {
    r(C.ironLo, 5, 4, 6, 1); r(C.ironHi, 4, 5, 2, 6); r(C.ironHi, 10, 5, 2, 6); r(C.iron, 4, 11, 2, 1); r(C.iron, 10, 11, 2, 1);
    r(C.ironDk, 5, 6, 1, 1); r(C.ironDk, 10, 6, 1, 1);
  } },
  fence: { w: 16, h: 16, draw(r) {
    shadowRow(r, 0, 15, 16);
    r(C.woodLo, 2, 4, 2, 11); r(C.woodLo, 12, 4, 2, 11);
    r(C.wood, 0, 6, 16, 2); r(C.wood, 0, 10, 16, 2); r(C.woodHi, 0, 6, 16, 1); r(C.woodHi, 0, 10, 16, 1);
  } },
  horse: { w: 32, h: 24, frames: 2, draw(r, f) {
    shadowRow(r, 4, 23, 24);
    const B = '#7a4a2a', L = '#9a6438', D = '#4e2e19', M = '#2a1a10';
    r(B, 7, 8, 16, 8); r(L, 8, 8, 14, 2);
    r(B, 22, 4, 4, 8); r(B, 24, 2, 6, 4); r(L, 25, 2, 4, 1); r(D, 29, 4, 1, 2); r(M, 26, 3, 1, 1);
    r(M, 21, 2, 3, 7); r(M, 22, 1, 2, 1);
    r(D, 8, 16, 2, 6); r(D, 11, 16, 2, 6); r(D, 18, 16, 2, 6); r(D, 21, 16, 2, 6);
    r(M, 8, 21, 2, 1); r(M, 11, 21, 2, 1); r(M, 18, 21, 2, 1); r(M, 21, 21, 2, 1);
    r(M, 5 - f, 8, 2, 2); r(M, 4 - f, 10, 2, 5); r(M, 4, 15, 1, 2);
    r('#c0261a', 13, 8, 5, 3); r(C.gold, 13, 11, 5, 1);
  } },
  speedometer: { w: 16, h: 16, draw(r) {
    shadowRow(r, 3, 15, 10);
    r(C.stoneDk, 5, 11, 6, 4); r(C.stone, 5, 11, 6, 1);
    r(C.ironDk, 3, 2, 10, 9); r(C.ironDk, 4, 1, 8, 11);
    r('#111', 4, 3, 8, 7); r('#111', 5, 2, 6, 9);
    r(C.gold, 4, 7, 1, 1); r(C.gold, 5, 4, 1, 1); r(C.gold, 7, 3, 2, 1); r(C.gold, 10, 4, 1, 1); r(C.gold, 11, 7, 1, 1);
    r('#e2412f', 8, 5, 1, 1); r('#e2412f', 9, 4, 1, 1); r('#e2412f', 7, 6, 1, 1); r(C.white, 7, 7, 2, 1);
    r('#3fd06a', 6, 9, 4, 1);
  } },
  minecart: { w: 16, h: 16, draw(r) {
    shadowRow(r, 1, 15, 14);
    r(C.ironLo, 2, 5, 12, 7); r(C.iron, 3, 6, 10, 5); r(C.ironHi, 2, 5, 12, 1);
    r(C.ironDk, 2, 8, 12, 1);
    r('#3a3530', 4, 3, 3, 3); r('#4a443c', 7, 2, 3, 4); r(C.gold, 8, 3, 1, 1); r('#3a3530', 10, 4, 2, 2);
    r(C.ink, 3, 12, 3, 3); r(C.ink, 10, 12, 3, 3); r(C.ironHi, 4, 13, 1, 1); r(C.ironHi, 11, 13, 1, 1);
  } },
  tools: { w: 16, h: 16, draw(r) {
    r(C.woodLo, 1, 3, 14, 2);
    r(C.woodHi, 3, 5, 1, 7); r(C.iron, 2, 11, 3, 2); // молот
    r(C.woodHi, 7, 5, 1, 8); r(C.ironHi, 6, 5, 3, 1); // кліщі
    r(C.ironHi, 6, 12, 1, 2); r(C.ironHi, 8, 12, 1, 2);
    r(C.woodHi, 11, 5, 1, 5); r(C.iron, 10, 10, 3, 3); r(C.ironHi, 10, 10, 1, 1);
  } },
  coal: { w: 16, h: 16, draw(r) {
    r('#1a1714', 2, 10, 12, 5); r('#26221d', 4, 8, 8, 3); r('#26221d', 6, 6, 4, 2);
    r('#3a342c', 5, 9, 1, 1); r('#3a342c', 9, 7, 1, 1); r(C.fire3, 10, 11, 1, 1);
  } },
  pillar: { w: 16, h: 28, draw(r) {
    shadowRow(r, 2, 27, 12);
    r(C.stoneDk, 2, 24, 12, 3); r(C.stone, 3, 24, 10, 1);
    r(C.stoneDk, 4, 4, 8, 20); r(C.stone, 5, 4, 5, 20); r(C.stoneLt, 6, 4, 1, 20);
    r(C.stoneDk, 2, 1, 12, 3); r(C.stoneLt, 3, 1, 10, 1); r(C.goldLo, 4, 3, 8, 1);
  } },
  brazier: { w: 16, h: 18, frames: 4, draw(r, f) {
    shadowRow(r, 3, 17, 10);
    r(C.goldDk, 7, 10, 2, 6); r(C.goldLo, 4, 15, 8, 1);
    r(C.goldLo, 3, 7, 10, 3); r(C.gold, 4, 7, 8, 1);
    flame(r, 8, 1, f, true);
  } },
  statue: { w: 16, h: 32, draw(r) {
    shadowRow(r, 1, 31, 14);
    r(C.stoneDk, 1, 24, 14, 7); r(C.stone, 2, 24, 12, 1);
    r(C.goldLo, 4, 26, 8, 3); r(C.gold, 5, 27, 6, 1);
    const S = C.stone, L = C.stoneLt, D = C.stoneDk;
    r(S, 6, 3, 5, 5); r(L, 6, 3, 2, 2); r(D, 7, 6, 3, 1); // голова-шолом
    r(D, 5, 8, 7, 2); r(S, 4, 10, 8, 9); r(L, 5, 10, 2, 8);
    r(S, 5, 19, 3, 5); r(S, 9, 19, 3, 5);
    r(D, 1, 10, 5, 8); r(S, 2, 11, 3, 6); deltaGlyph(r, 1, 11, C.goldLo); // щит
    r(L, 13, 2, 1, 14); r(D, 12, 14, 3, 1); r(S, 12, 15, 2, 3); // меч
  } },
  chronicle: { w: 16, h: 18, draw(r) {
    shadowRow(r, 3, 17, 10);
    r(C.stoneDk, 4, 10, 8, 7); r(C.stone, 4, 10, 8, 1);
    r(C.redLo, 3, 5, 10, 5); r(C.red, 4, 5, 8, 4); r(C.gold, 3, 5, 10, 1);
    r(C.parch, 4, 6, 3, 2); r(C.parch, 9, 6, 3, 2); r(C.goldLo, 7, 5, 2, 5);
    deltaGlyph(r, 5, 0, C.gold);
  } },
  incline: { w: 16, h: 16, draw(r) {
    shadowRow(r, 0, 15, 16);
    for (let x = 0; x < 15; x++) { const h = Math.floor(x * 0.7) + 1; r(C.wood, x, 14 - h, 1, h); r(C.woodHi, x, 14 - h, 1, 1); }
    r(C.woodDk, 0, 14, 15, 1);
    r('#c9c3b2', 9, 4, 3, 3); r(C.white, 9, 4, 1, 1);
    r(C.gold, 2, 12, 1, 1); r(C.gold, 5, 10, 1, 1); r(C.gold, 9, 8, 1, 1);
  } },
  sparkle: { w: 5, h: 5, frames: 3, draw(r, f) {
    const c = [C.goldHi, C.white, C.gold][f];
    r(c, 2, 0, 1, 5); r(c, 0, 2, 5, 1);
    if (f === 1) { r(C.white, 2, 2, 1, 1); }
  } },
};

// ---------- іконки інвентаря / бонусів (16×16) ----------
export const ICON = {
  key: (r) => { r(C.goldLo, 3, 5, 5, 5); r(C.gold, 4, 4, 3, 1); r(C.ink, 5, 6, 1, 2); r(C.gold, 4, 5, 3, 4); r(C.ink, 5, 6, 1, 2); r(C.gold, 8, 7, 6, 2); r(C.gold, 12, 9, 1, 2); r(C.gold, 10, 9, 1, 2); r(C.goldHi, 8, 7, 5, 1); },
  shield: (r) => { r(C.goldLo, 3, 2, 10, 8); r(C.goldLo, 4, 10, 8, 2); r(C.goldLo, 6, 12, 4, 2); r(C.red, 4, 3, 8, 7); r(C.red, 5, 10, 6, 2); r(C.red, 7, 12, 2, 1); deltaGlyph(r, 5, 5, C.gold); },
  scroll: (r) => { r(C.parch, 4, 4, 8, 8); r(C.parchLo, 4, 11, 8, 1); r(C.parchDk, 3, 3, 2, 10); r(C.parchDk, 11, 3, 2, 10); r(C.inkTxt, 6, 6, 4, 1); r(C.inkTxt, 6, 8, 3, 1); r('#c0261a', 7, 10, 2, 2); },
  hourglass: (r) => { r(C.gold, 4, 2, 8, 1); r(C.gold, 4, 13, 8, 1); r('#9fc0d8', 5, 3, 6, 2); r('#9fc0d8', 6, 5, 4, 2); r('#9fc0d8', 7, 7, 2, 1); r('#9fc0d8', 6, 8, 4, 2); r('#9fc0d8', 5, 10, 6, 3); r(C.hay, 6, 4, 4, 1); r(C.hay, 7, 6, 2, 1); r(C.hay, 5, 11, 6, 2); r(C.goldLo, 4, 3, 1, 10); r(C.goldLo, 11, 3, 1, 10); },
  boots: (r) => { r('#5a2f1a', 4, 3, 4, 8); r('#7a4426', 5, 3, 2, 7); r('#5a2f1a', 4, 10, 8, 3); r('#3a1e10', 4, 13, 9, 1); r(C.gold, 4, 5, 4, 1); r(C.goldHi, 1, 8, 3, 1); r(C.goldHi, 0, 10, 3, 1); r(C.goldHi, 2, 12, 2, 1); },
  timer: (r) => { r(C.goldLo, 3, 3, 10, 10); r(C.goldLo, 2, 4, 12, 8); r('#1a160f', 4, 4, 8, 8); r('#1a160f', 3, 5, 10, 6); r(C.gold, 7, 1, 2, 2); r(C.goldHi, 7, 5, 2, 4); r(C.goldHi, 9, 7, 2, 2); },
  chest: (r) => { r(C.woodDk, 2, 5, 12, 9); r(C.wood, 3, 6, 10, 7); r(C.gold, 2, 8, 12, 1); r(C.goldHi, 7, 7, 2, 3); r(C.woodLo, 3, 4, 10, 2); },
  crown: (r) => { r(C.gold, 2, 7, 12, 5); r(C.gold, 2, 4, 2, 3); r(C.gold, 7, 3, 2, 4); r(C.gold, 12, 4, 2, 3); r(C.goldHi, 3, 8, 10, 1); r('#c0261a', 7, 9, 2, 2); r(C.goldLo, 2, 12, 12, 1); },
};

export function iconURL(name, scale = 4) {
  const draw = ICON[name];
  const c = makeCanvas(16, 16);
  draw(painter(c.getContext('2d')));
  return upscale(c, scale).toDataURL();
}

export function spriteURL(name, scale = 4, frame = 0) {
  return upscale(sprite(name, frame), scale).toDataURL();
}

export function upscale(src, k) {
  const c = makeCanvas(src.width * k, src.height * k);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

const cache = new Map();
export function sprite(name, frame = 0) {
  const def = SPR[name];
  if (!def) return null;
  const f = def.frames ? frame % def.frames : 0;
  const key = name + ':' + f;
  let c = cache.get(key);
  if (!c) {
    c = makeCanvas(def.w, def.h);
    const g = c.getContext('2d');
    def.draw(painter(g), f, g);
    cache.set(key, c);
  }
  return c;
}

// ---------- персонажі ----------

export const CLASSES = {
  carpenter: {
    name: 'Столяр', icon: '🪚',
    perk: 'Запасний ключ',
    perkText: 'Сам вистругав ключ: починає забіг з одним ключем від дубових дверей.',
    shirt: '#a8432c', shirtLo: '#7d2f1f', shirtHi: '#c4573c', pants: '#3b4a6b', pantsLo: '#2a3550',
    hairM: '#5a3a22', hairF: '#6b4226',
  },
  radio: {
    name: 'Радіоелектронік', icon: '📡',
    perk: 'Сигнал',
    perkText: 'Ловить сигнал: у питаннях з вибором одна хибна відповідь гасне одразу, а на числових після помилки видно «тепло / холодно».',
    shirt: '#2f6f73', shirtLo: '#1f4d50', shirtHi: '#3f8a8e', pants: '#2b2b33', pantsLo: '#1c1c22',
    hairM: '#1d1a17', hairF: '#2a1d18',
  },
  welder: {
    name: 'Зварювальник-Муляр', icon: '🧱',
    perk: 'Міцна кладка',
    perkText: 'Штрафи за помилки вдвічі менші. А ще розбирає тріснуті стіни, за якими сховані скрині з бонусами.',
    shirt: '#c8662a', shirtLo: '#9a4a1c', shirtHi: '#e07f3c', pants: '#c8662a', pantsLo: '#9a4a1c',
    hairM: '#8a3f1d', hairF: '#9a4a22',
  },
  painter: {
    name: 'Маляр-Штукатур', icon: '🎨',
    perk: 'Реставратор',
    perkText: 'Бачить вицвілі фрески: відновлює їх, а на фресках є додаткові підказки до дверей кімнати.',
    shirt: '#e6e1d3', shirtLo: '#bdb6a3', shirtHi: '#ffffff', pants: '#e6e1d3', pantsLo: '#bdb6a3',
    hairM: '#c9a24a', hairF: '#d9b45a',
  },
};

// dir: 0 вниз, 1 вгору, 2 вбік (праворуч); frame: 0 стоїть, 1/2 крок
function drawHero(r, cls, gender, dir, frame) {
  const K = CLASSES[cls];
  const fem = gender === 'f';
  const hair = fem ? K.hairF : K.hairM;
  const side = dir === 2, back = dir === 1;
  // ноги
  const lUp = frame === 1 ? 1 : 0, rUp = frame === 2 ? 1 : 0;
  const shoe = '#1a1410';
  if (side) {
    const a = frame === 1 ? -1 : frame === 2 ? 1 : 0;
    r(K.pantsLo, 6 - a, 19, 2, 3); r(K.pants, 8 + a, 19, 2, 3);
    r(shoe, 6 - a, 22, 3, 1); r(shoe, 8 + a, 22, 3, 1);
  } else {
    r(K.pants, 5, 19, 2, 3 - lUp); r(K.pants, 9, 19, 2, 3 - rUp);
    r(K.pantsLo, 6, 19, 1, 3 - lUp); r(K.pantsLo, 10, 19, 1, 3 - rUp);
    r(shoe, 4, 22 - lUp, 3, 1); r(shoe, 9, 22 - rUp, 3, 1);
  }
  // тулуб
  const bx = side ? 5 : 4, bw = side ? 7 : 8;
  r(K.shirtLo, bx, 12, bw, 7); r(K.shirt, bx, 12, bw - 1, 6); r(K.shirtHi, bx, 12, bw - 1, 1);
  // руки
  if (side) {
    const sw = frame === 1 ? 1 : frame === 2 ? -1 : 0;
    r(K.shirtLo, 7 + sw, 13, 2, 4); r(C.skin, 7 + sw, 17, 2, 1);
  } else {
    r(K.shirtLo, 3, 13, 1, 4); r(K.shirtLo, 12, 13, 1, 4);
    r(C.skin, 3, 17, 1, 1); r(C.skin, 12, 17, 1, 1);
  }
  // деталі класу на тулубі
  if (cls === 'carpenter') {
    if (!back) { r('#8a6239', bx + 1, 14, bw - 2, 6); r('#6b4a2b', bx + 1, 19, bw - 2, 1); r('#6b4a2b', bx + 2, 16, 3, 1); }
    else { r('#6b4a2b', bx, 15, bw, 1); }
    r(K.shirtLo, bx + 3, 12, 1, 2);
  } else if (cls === 'radio') {
    if (!back) { r('#f3eee2', bx + 3, 12, 2, 1); r(C.gold, bx + 1, 14, 1, 1); r('#173638', bx + 1, 15, 2, 1); }
  } else if (cls === 'welder') {
    r('#3a2a1a', bx + 1, 12, 1, 3); r('#3a2a1a', bx + bw - 3, 12, 1, 3);
    if (!back) { r(K.shirtLo, bx + 2, 15, bw - 4, 2); r(C.ironHi, bx + 2, 15, 1, 1); }
    r('#c9a46b', side ? 7 : 3, 16, side ? 2 : 1, 2); if (!side) r('#c9a46b', 12, 16, 1, 2);
  } else if (cls === 'painter') {
    r(C.gold, bx + 1, 14, 1, 1); r('#2f5fa8', bx + 5, 16, 1, 1); r('#c0261a', bx + 2, 17, 1, 1); r('#3f8a52', bx + 4, 13, 1, 1);
    r('#bdb6a3', bx + 1, 12, 1, 2); r('#bdb6a3', bx + bw - 3, 12, 1, 2);
  }
  // голова
  const hx = side ? 5 : 4;
  r(C.skin, hx, 4, 8, 8); r(C.skinLo, hx + 7, 5, 1, 7); r(C.skinLo, hx, 11, 8, 1);
  // волосся
  if (back) {
    r(hair, hx, 3, 8, 8); r(hair, hx + 1, 2, 6, 1);
    if (fem) { r(hair, hx, 11, 8, 2); r(hair, hx + 1, 13, 6, 1); }
  } else if (side) {
    r(hair, hx, 3, 8, 3); r(hair, hx + 1, 2, 6, 1); r(hair, hx, 6, 3, 3);
    if (fem) { r(hair, hx - 1, 5, 3, 8); r(hair, hx, 13, 2, 1); }
    r(C.ink, hx + 6, 7, 1, 2);
    if (fem) r(C.blush, hx + 5, 10, 1, 1);
  } else {
    r(hair, hx, 3, 8, 3); r(hair, hx + 1, 2, 6, 1); r(hair, hx, 6, 1, 2); r(hair, hx + 7, 6, 1, 2);
    r(hair, hx + 2, 6, 2, 1);
    if (fem) { r(hair, hx - 1, 5, 2, 8); r(hair, hx + 7, 5, 2, 8); r(hair, hx - 1, 13, 1, 1); r(hair, hx + 8, 13, 1, 1); }
    r(C.ink, hx + 2, 7, 1, 2); r(C.ink, hx + 5, 7, 1, 2);
    if (fem) { r(C.blush, hx + 1, 10, 1, 1); r(C.blush, hx + 6, 10, 1, 1); }
  }
  // головні убори
  if (cls === 'radio') {
    const dk = '#2a2a30';
    r(dk, hx, 2, 8, 1); r(dk, hx - 1, 3, 1, 3); r(dk, hx + 8, 3, 1, 3);
    if (side) { r(dk, hx + 2, 6, 3, 3); r(C.gold, hx + 3, 7, 1, 1); }
    else { r(dk, hx - 1, 6, 2, 4); r(dk, hx + 7, 6, 2, 4); r(C.gold, hx - 1, 7, 1, 1); r(C.gold, hx + 8, 7, 1, 1); }
    if (!back && !side) { r('#c9c3b2', hx + 1, 7, 2, 1); r('#c9c3b2', hx + 5, 7, 2, 1); r('#c9c3b2', hx + 3, 7, 2, 1); r(C.ink, hx + 2, 8, 1, 1); r(C.ink, hx + 5, 8, 1, 1); }
  } else if (cls === 'welder') {
    const M = '#3c3f45', ML = '#5a5e66';
    r(M, hx - 1, 0, 10, 4); r(ML, hx, 0, 8, 1);
    if (!back) { r('#2f5a3a', hx + 1, 1, 6, 2); r('#58a06e', hx + 2, 1, 2, 1); }
    r(M, hx - 1, 4, 1, 2); r(M, hx + 8, 4, 1, 2);
    if (fem && !back) { r(hair, hx + 7, 8, 2, 3); }
  } else if (cls === 'painter') {
    const P = '#f3eee2', PL = '#c9c3b2';
    r(P, hx - 1, 2, 10, 2); r(P, hx + 1, 1, 6, 1); r(P, hx + 3, 0, 2, 1);
    r(PL, hx, 3, 8, 1); r('#8f8a7c', hx + 2, 2, 3, 1);
  } else if (cls === 'carpenter') {
    if (!back && !side) { r(C.hay, hx + 7, 4, 1, 3); r('#c0261a', hx + 7, 4, 1, 1); } // олівець за вухом
  }
  // інструмент у руці
  const tx = side ? 9 : 12;
  if (back) return;
  if (cls === 'carpenter') { r(C.woodHi, tx + 1, 14, 1, 5); r(C.ironHi, tx, 13, 3, 2); }
  else if (cls === 'radio') { r('#e0b52b', tx, 15, 3, 4); r('#173638', tx + 1, 16, 1, 1); r('#c0261a', tx + 1, 18, 1, 2); }
  else if (cls === 'welder') { r(C.woodHi, tx + 1, 15, 1, 2); r(C.ironHi, tx, 17, 3, 2); r(C.iron, tx + 1, 19, 1, 1); }
  else if (cls === 'painter') { r(C.woodHi, tx + 1, 13, 1, 6); r(C.gold, tx - 1, 11, 4, 2); r(C.goldHi, tx - 1, 11, 4, 1); }
}

export function heroSprite(cls, gender, dir, frame) {
  const key = `hero:${cls}:${gender}:${dir}:${frame}`;
  let c = cache.get(key);
  if (!c) {
    c = makeCanvas(16, 24);
    drawHero(painter(c.getContext('2d')), cls, gender, dir, frame);
    cache.set(key, c);
  }
  return c;
}

export function heroURL(cls, gender, scale = 6) {
  return upscale(heroSprite(cls, gender, 0, 0), scale).toDataURL();
}
