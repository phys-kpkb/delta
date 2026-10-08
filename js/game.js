// Рушій кімнати: малює піксельну сцену, водить героя кліками (BFS),
// повідомляє застосунок про взаємодію з предметами.
import { T, C, SPR, sprite, heroSprite, makeCanvas, drawFloor, drawCarpet, drawRails, drawBricks, drawCap } from './art.js';
import { sfx } from './audio.js';

const COLS = 9, ROWS = 13;
const FPS = { torch: 8, door_rune: 3, door_sage: 1.5, seal: 3, candles: 5, furnace: 8, brazier: 8, cat: 0.8, horse: 0.6 };

const LIGHTS = {
  torch: { c: '255,166,77', r: 3.4, a: 0.30, dy: 0.4 },
  forge: { c: '255,120,40', r: 4.2, a: 0.42, dy: 0.2 },
  candle: { c: '255,205,130', r: 2.8, a: 0.28, dy: 0 },
  cool: { c: '110,160,255', r: 3.2, a: 0.14, dy: 1.6 },
};

export class Game {
  constructor(canvas, hooks) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.hooks = hooks;
    this.pix = makeCanvas(COLS * T, ROWS * T);
    this.pg = this.pix.getContext('2d');
    this.k = 4;
    this.player = { x: 4, y: 11, path: [], dir: 0, frame: 0, walkT: 0, stepT: 0 };
    this.speed = 4.2;
    this.objs = [];
    this.motes = [];
    this.marker = null;
    this.running = false;
    this.locked = false;
    this.t0 = performance.now();
    this.bound = (e) => this.onPointer(e);
    canvas.addEventListener('pointerdown', this.bound);
    this.loop = this.loop.bind(this);
  }

  setHero(cls, gender) { this.hero = { cls, gender }; }
  setSpeed(mult) { this.speed = 4.2 * mult; }

  loadRoom(room, objs, entry) {
    this.room = room;
    this.map = room.map;
    this.objs = objs.map((o) => ({ w: 1, ...o }));
    this.player.x = entry[0]; this.player.y = entry[1];
    this.player.path = []; this.player.dir = 1; this.pending = null;
    this.marker = null;
    this.buildStatic();
    this.motes = Array.from({ length: 26 }, () => this.newMote(true));
  }

  newMote(any) {
    return {
      x: 16 + Math.random() * (COLS - 2) * T,
      y: any ? 32 + Math.random() * (ROWS - 3) * T : (ROWS - 1) * T,
      vy: -(2 + Math.random() * 4), vx: (Math.random() - 0.5) * 2,
      ph: Math.random() * 6.28, s: Math.random() < 0.3 ? 2 : 1,
    };
  }

  isWall(x, y) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return true;
    return this.map[y][x] === '#';
  }

  buildStatic() {
    const c = makeCanvas(COLS * T, ROWS * T);
    const g = c.getContext('2d');
    const r = (col, x, y, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    const ch = (x, y) => (x < 0 || y < 0 || x >= COLS || y >= ROWS) ? '#' : this.map[y][x];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const k = ch(x, y), ox = x * T, oy = y * T;
        if (k === '#') {
          if (ch(x, y + 1) !== '#') drawBricks(r, ox, oy, x);
          else drawCap(r, ox, oy, { l: ch(x - 1, y) !== '#', r: ch(x + 1, y) !== '#', t: y > 0 && ch(x, y - 1) !== '#' });
        } else {
          drawFloor(r, this.room.floor, ox, oy, x, y);
          if (k === '=') drawCarpet(r, ox, oy, { l: ch(x - 1, y) === '=', r: ch(x + 1, y) === '=', t: ch(x, y - 1) === '=', b: ch(x, y + 1) === '=' });
          if (k === '_') drawRails(r, ox, oy);
          // тіні від стін
          if (ch(x, y - 1) === '#') { r('rgba(0,0,0,.45)', ox, oy, 16, 2); r('rgba(0,0,0,.25)', ox, oy + 2, 16, 2); }
          if (ch(x - 1, y) === '#') r('rgba(0,0,0,.3)', ox, oy, 2, 16);
          if (ch(x + 1, y) === '#') r('rgba(0,0,0,.2)', ox + 14, oy, 2, 16);
        }
      }
    }
    // вхідна арка внизу
    const ex = 4 * T, ey = (ROWS - 1) * T;
    r('#000', ex + 3, ey, 10, 6); r(C.goldLo, ex + 2, ey, 1, 6); r(C.goldLo, ex + 13, ey, 1, 6);
    this.staticLayer = c;
  }

  objAt(tx, ty) {
    for (const o of this.objs) {
      if (o.hidden || o.wall) continue;
      if (ty === o.y && tx >= o.x && tx < o.x + o.w) return o;
    }
    return null;
  }

  walkable(x, y) {
    if (this.isWall(x, y)) {
      // відчинені двері — прохід
      const d = this.objs.find((o) => o.kind === 'door' && o.open && y === o.y && x >= o.x && x < o.x + o.w);
      return !!d;
    }
    return !this.objAt(x, y);
  }

  bfs(targets) {
    const sx = Math.round(this.player.x), sy = Math.round(this.player.y);
    const key = (x, y) => y * COLS + x;
    const tset = new Set(targets.map(([x, y]) => key(x, y)));
    if (tset.has(key(sx, sy))) return [];
    const prev = new Map([[key(sx, sy), -1]]);
    const q = [[sx, sy]];
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        const nx = x + dx, ny = y + dy, nk = key(nx, ny);
        if (prev.has(nk) || !this.walkable(nx, ny)) continue;
        prev.set(nk, key(x, y));
        if (tset.has(nk)) {
          const path = [];
          let k = nk;
          while (k !== key(sx, sy)) { path.unshift([k % COLS, Math.floor(k / COLS)]); k = prev.get(k); }
          return path;
        }
        q.push([nx, ny]);
      }
    }
    return null;
  }

  approachTiles(o) {
    const out = [];
    for (let i = 0; i < o.w; i++) {
      const x = o.x + i;
      if (o.wall) out.push([x, o.y + 1]);
      else { out.push([x, o.y - 1], [x, o.y + 1]); }
    }
    if (!o.wall) out.push([o.x - 1, o.y], [o.x + o.w, o.y]);
    return out.filter(([x, y]) => this.walkable(x, y) && !this.isWall(x, y));
  }

  spriteName(o) {
    if (o.kind === 'door') return o.sprite + (o.open ? '_open' : '');
    if (o.kind === 'fresco') return o.restored ? 'fresco_on' : 'fresco';
    if (o.kind === 'crack') return o.broken ? 'crack_open' : 'crack';
    if (o.kind === 'cat') return 'cat';
    return o.sprite;
  }

  spriteBox(o) {
    const def = SPR[this.spriteName(o)];
    const w = def.w, h = def.h;
    const x = o.x * T + (o.w * T - w) / 2;
    const y = (o.y + 1) * T - h;
    return { x, y, w, h };
  }

  toWorld(e) {
    const rect = this.cv.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width * COLS * T,
      y: (e.clientY - rect.top) / rect.height * ROWS * T,
    };
  }

  onPointer(e) {
    if (this.locked || !this.room) return;
    e.preventDefault();
    const p = this.toWorld(e);
    const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
    // 1) предмет під пальцем (спершу за клітинкою, потім за силуетом спрайта)
    let hit = this.objs.find((o) => !o.hidden && ty === o.y && tx >= o.x && tx < o.x + o.w);
    if (!hit) {
      const cand = this.objs.filter((o) => !o.hidden && !o.wall).filter((o) => {
        const b = this.spriteBox(o);
        return p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h;
      }).sort((a, b) => b.y - a.y);
      hit = cand[0];
    }
    if (hit) {
      if (hit.kind === 'door' && hit.open) { this.goTo([[tx, hit.y]], null, true); return; }
      const tiles = this.approachTiles(hit);
      const path = this.bfs(tiles);
      if (path === null) { this.hooks.toast?.('Туди не пройти'); return; }
      this.marker = { x: hit.x + (hit.w - 1) / 2, y: hit.y, t: 0, obj: true };
      this.player.path = path;
      this.pending = hit;
      if (!path.length) this.arrive();
      sfx('tap');
      return;
    }
    if (this.isWall(tx, ty)) return;
    this.goTo([[tx, ty]]);
  }

  goTo(targets, obj = null, silent = false) {
    const path = this.bfs(targets);
    if (path === null) { this.hooks.toast?.('Туди не пройти'); return false; }
    this.player.path = path;
    this.pending = obj;
    const [mx, my] = targets[0];
    this.marker = { x: mx, y: my, t: 0 };
    if (!silent) sfx('tap');
    return true;
  }

  walkIntoDoor() {
    const d = this.objs.find((o) => o.kind === 'door');
    if (!d) return;
    const px = Math.round(this.player.x);
    const tx = Math.max(d.x, Math.min(d.x + d.w - 1, px));
    this.goTo([[tx, d.y]], null, true);
  }

  arrive() {
    const o = this.pending;
    this.pending = null;
    this.marker = null;
    if (!o) return;
    // повернутися обличчям до предмета
    const px = this.player.x, py = this.player.y;
    const cx = o.x + (o.w - 1) / 2;
    if (o.wall || o.y < py) this.player.dir = 1;
    else if (o.y > py) this.player.dir = 0;
    else this.player.dir = cx > px ? 2 : 3;
    this.hooks.interact(o);
  }

  update(dt) {
    const pl = this.player;
    if (pl.path.length) {
      const [nx, ny] = pl.path[0];
      const dx = nx - pl.x, dy = ny - pl.y;
      const dist = Math.hypot(dx, dy);
      const stepLen = this.speed * dt;
      if (Math.abs(dx) > Math.abs(dy)) pl.dir = dx > 0 ? 2 : 3; else pl.dir = dy > 0 ? 0 : 1;
      if (dist <= stepLen) {
        pl.x = nx; pl.y = ny; pl.path.shift();
        sfx('step');
        if (this.isWall(nx, ny)) { pl.path = []; this.hooks.exit(); return; }
        if (!pl.path.length) this.arrive();
      } else {
        pl.x += dx / dist * stepLen; pl.y += dy / dist * stepLen;
      }
      pl.walkT += dt;
      pl.frame = (Math.floor(pl.walkT * this.speed * 1.6) % 2) + 1;
    } else {
      pl.frame = 0; pl.walkT = 0;
    }
    for (const m of this.motes) {
      m.y += m.vy * dt; m.x += (m.vx + Math.sin(m.ph + m.y * 0.05) * 1.5) * dt;
      if (m.y < 24) Object.assign(m, this.newMote(false));
    }
    if (this.marker) this.marker.t += dt;
  }

  resize(cssW, cssH) {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const k = Math.max(1, Math.floor(Math.min(cssW * dpr / (COLS * T), cssH * dpr / (ROWS * T))));
    this.k = k;
    this.cv.width = COLS * T * k;
    this.cv.height = ROWS * T * k;
    this.cv.style.width = (COLS * T * k / dpr) + 'px';
    this.cv.style.height = (ROWS * T * k / dpr) + 'px';
  }

  draw(now) {
    const t = (now - this.t0) / 1000;
    const g = this.pg;
    g.clearRect(0, 0, this.pix.width, this.pix.height);
    g.drawImage(this.staticLayer, 0, 0);

    const list = [];
    for (const o of this.objs) {
      if (o.hidden) continue;
      list.push({ z: o.wall ? -1 : (o.y + 1) * T - 0.5, o });
    }
    const pl = this.player;
    list.push({ z: (pl.y + 1) * T, hero: true });
    list.sort((a, b) => a.z - b.z);

    for (const it of list) {
      if (it.hero) { this.drawHero(g, t); continue; }
      const o = it.o;
      const name = this.spriteName(o);
      const def = SPR[name];
      const fps = FPS[name.replace('_open', '')] || 0;
      const f = def.frames ? Math.floor(t * fps + (o.x * 7 + o.y * 3)) % def.frames : 0;
      const b = this.spriteBox(o);
      g.drawImage(sprite(name, f), Math.round(b.x), Math.round(b.y));
    }

    // іскорки на непрочитаних підказках
    for (const o of this.objs) {
      if (o.hidden) continue;
      const fresh = (o.kind === 'hint' && !o.read) || (o.kind === 'crack' && o.glint && !o.broken) || (o.kind === 'fresco' && o.glint && !o.restored);
      if (!fresh) continue;
      const ph = (t * 0.9 + (o.x * 0.37 + o.y * 0.61)) % 2.2;
      if (ph < 0.6) {
        const b = this.spriteBox(o);
        const fr = Math.min(2, Math.floor(ph / 0.2));
        g.drawImage(sprite('sparkle', fr), Math.round(b.x + b.w - 5), Math.round(b.y + 1));
      }
    }

    // масштабування в екран
    const ctx = this.ctx, k = this.k, W = this.cv.width, H = this.cv.height;
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(this.pix, 0, 0, W, H);

    // світло
    ctx.globalCompositeOperation = 'lighter';
    for (const o of this.objs) {
      if (!o.light || o.hidden) continue;
      const L = LIGHTS[o.light];
      const fl = o.light === 'cool' ? 1 : 0.85 + 0.15 * Math.sin(t * 9 + o.x * 3) * Math.sin(t * 5.3 + o.y);
      const cx = (o.x + o.w / 2) * T * k, cy = (o.y + 0.5 + L.dy) * T * k;
      const R = L.r * T * k * (0.95 + 0.05 * fl);
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      gr.addColorStop(0, `rgba(${L.c},${L.a * fl})`);
      gr.addColorStop(1, `rgba(${L.c},0)`);
      ctx.fillStyle = gr;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    }
    // відчинені двері світять золотом
    for (const o of this.objs) {
      if (o.kind !== 'door' || !o.open) continue;
      const cx = (o.x + o.w / 2) * T * k, cy = (o.y + 0.8) * T * k, R = 2.6 * T * k;
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      gr.addColorStop(0, `rgba(246,222,143,${0.28 + 0.06 * Math.sin(t * 3)})`);
      gr.addColorStop(1, 'rgba(246,222,143,0)');
      ctx.fillStyle = gr; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    }
    // ореол героя
    {
      const cx = (pl.x + 0.5) * T * k, cy = (pl.y + 0.3) * T * k, R = 2.2 * T * k;
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      gr.addColorStop(0, 'rgba(255,225,170,.10)'); gr.addColorStop(1, 'rgba(255,225,170,0)');
      ctx.fillStyle = gr; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    }
    // пилинки в повітрі
    for (const m of this.motes) {
      const a = 0.25 + 0.25 * Math.sin(t * 2 + m.ph);
      ctx.fillStyle = `rgba(246,222,143,${a})`;
      const s = Math.max(1, Math.round(k * 0.5 * m.s));
      ctx.fillRect(Math.round(m.x * k), Math.round(m.y * k), s, s);
    }
    ctx.globalCompositeOperation = 'source-over';
    // віньєтка
    const vg = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.3, W / 2, H * 0.55, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

    // маркер цілі
    if (this.marker && this.marker.t < 1.2) {
      const m = this.marker;
      const cx = (m.x + 0.5) * T * k, cy = (m.y + 0.5) * T * k;
      const s = (0.28 + 0.1 * Math.sin(m.t * 10)) * T * k;
      ctx.strokeStyle = `rgba(246,222,143,${0.9 - m.t * 0.6})`;
      ctx.lineWidth = Math.max(1, k * 0.6);
      ctx.beginPath(); ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s, cy); ctx.lineTo(cx, cy + s); ctx.lineTo(cx - s, cy); ctx.closePath(); ctx.stroke();
    }
    // стрілка над відчиненими дверима
    for (const o of this.objs) {
      if (o.kind !== 'door' || !o.open) continue;
      const cx = (o.x + o.w / 2) * T * k, cy = (o.y + 0.5) * T * k + Math.sin(t * 4) * k * 1.5;
      const s = 3 * k;
      ctx.fillStyle = '#f6de8f';
      ctx.beginPath(); ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s, cy + s * 0.4); ctx.lineTo(cx - s, cy + s * 0.4); ctx.closePath(); ctx.fill();
    }
  }

  drawHero(g, t) {
    const pl = this.player;
    const dir = pl.dir === 3 ? 2 : pl.dir;
    const img = heroSprite(this.hero.cls, this.hero.gender, dir, pl.frame);
    const bob = pl.frame ? 0 : (Math.sin(t * 2.4) > 0.6 ? 1 : 0);
    const x = Math.round(pl.x * T), y = Math.round((pl.y + 1) * T - 24);
    g.fillStyle = 'rgba(0,0,0,.4)';
    g.fillRect(x + 4, y + 22, 8, 2); g.fillRect(x + 3, y + 23, 10, 1);
    if (pl.dir === 3) {
      g.save(); g.translate(x + 16, y + bob); g.scale(-1, 1); g.drawImage(img, 0, 0); g.restore();
    } else g.drawImage(img, x, y + bob);
  }

  loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
    this.last = now;
    this.update(dt);
    if (this.room) this.draw(now);
    requestAnimationFrame(this.loop);
  }

  start() { if (this.running) return; this.running = true; this.last = 0; requestAnimationFrame(this.loop); }
  stop() { this.running = false; }
}
