import { loadGroups, submitResult, fetchRating, ratingEnabled } from './net.js';
import { LEVELS, DOOR_TYPES, BONUSES, graphSVG, boardGraphSVG } from './levels.js';
import { CLASSES, heroSprite, heroURL, iconURL, spriteURL } from './art.js';
import { initAudio, setMusic, setSfx, setMood, sfx } from './audio.js';
import { Game } from './game.js';

// ---------- утиліти ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const LS = {
  get(k, d = null) { try { const v = localStorage.getItem('delta.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('delta.' + k, JSON.stringify(v)); } catch (e) { /* приватний режим */ } },
};

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function fmtTime(sec, tenths = true) {
  sec = Math.max(0, sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
  const d = Math.floor((sec * 10) % 10);
  const mm = String(m).padStart(2, '0'), ss = String(s).padStart(2, '0');
  const base = h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  return tenths && !h ? `${base}.${d}` : base;
}
const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? b : c); };
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

// ---------- стан ----------
const S = {
  profile: LS.get('profile'),
  hero: LS.get('hero'),
  settings: LS.get('settings', { music: true, sfx: true }),
  device: LS.get('device'),
  groups: null,
  groupsState: 'loading',
  run: LS.get('run'),
  results: LS.get('results', []),
  pending: LS.get('pending', []),
  tab: 'levels',
  rtLevel: 1,
  rtGroup: 'all',
  rtCache: {},
  rtState: 'idle',
};
if (!S.device) { S.device = uid(); LS.set('device', S.device); }

const saveRun = () => LS.set('run', S.run);

let game = null;
let hudTimer = null;

// ---------- шит і тост ----------
let sheetState = {};
function openSheet(html, { cls = '', dismiss = true, onClose = null } = {}) {
  const wrap = $('#sheet'), sh = $('.sheet', wrap);
  if (sheetState.cleanup) sheetState.cleanup();
  sh.className = 'sheet ' + cls;
  sh.innerHTML = html;
  sh.scrollTop = 0;
  wrap.hidden = false;
  sheetState = { dismiss, onClose };
  if (game) game.locked = true;
  return sh;
}
function closeSheet() {
  const wrap = $('#sheet');
  if (wrap.hidden) return;
  wrap.hidden = true;
  $('.sheet', wrap).innerHTML = '';
  const st = sheetState; sheetState = {};
  if (st.cleanup) st.cleanup();
  if (game) game.locked = false;
  if (st.onClose) st.onClose();
}
$('#sheet .sheet-bg').addEventListener('click', () => { if (sheetState.dismiss) closeSheet(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheetState.dismiss) closeSheet(); });

let toastT = null;
function toast(msg, ms = 2000) {
  const t = $('#toast');
  t.innerHTML = msg; t.hidden = false;
  t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.hidden = true; }, ms);
}

function fade(fn) {
  const f = $('#fade');
  f.classList.add('on');
  setTimeout(() => { fn(); requestAnimationFrame(() => f.classList.remove('on')); }, 360);
}

// ---------- звук ----------
document.addEventListener('pointerdown', () => initAudio(), { capture: true });
setMusic(S.settings.music); setSfx(S.settings.sfx);
function renderSoundBtn() {
  const on = S.settings.music || S.settings.sfx;
  $('#btn-sound').innerHTML = on
    ? '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
    : '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  $('#btn-sound').setAttribute('aria-label', on ? 'Вимкнути звук' : 'Увімкнути звук');
}
$('#btn-sound').addEventListener('click', () => {
  const on = !(S.settings.music || S.settings.sfx);
  S.settings = { music: on, sfx: on };
  LS.set('settings', S.settings);
  initAudio(); setMusic(on); setSfx(on);
  renderSoundBtn();
});

// ---------- вкладки ----------
$$('.tabbar button').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
function showTab(tab) {
  S.tab = tab;
  $$('.tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  $('#tab-levels').hidden = tab !== 'levels';
  $('#tab-rating').hidden = tab !== 'rating';
  if (tab === 'levels') renderLevels(); else renderRating(true);
  window.scrollTo(0, 0);
}

function showScreen(id) {
  $('#scr-main').hidden = id !== 'main';
  $('#scr-game').hidden = id !== 'game';
}

// ---------- профіль ----------
function profileMeta(p = S.profile) {
  if (!p) return '';
  const parts = [];
  if (p.groupName) parts.push('гр. ' + p.groupName);
  if (p.studentName) parts.push(p.studentName);
  return parts.join(' · ') || 'без групи';
}

function openProfile(first = false) {
  const p = S.profile || {};
  let groupId = p.groupId || '';
  let studentId = p.studentId || '';

  const sh = openSheet(`
    <div class="s-kicker">${first ? 'Ласкаво просимо до Ордену' : 'Профіль'}</div>
    <div class="s-title">${first ? 'Хто ти, мандрівнику?' : 'Змінити дані'}</div>
    ${first ? `<p class="note" style="margin-top:8px">Δ означає зміну. Паладини Ордену Дельти стережуть замок, де все підкоряється законам руху. Пройди зали, відчини двері правильними відповідями і потрап у рейтинг.</p>` : ''}
    <div class="field">
      <div class="label">Група <i>бажано, для рейтингу</i></div>
      <div id="p-groups"></div>
    </div>
    <div class="field" id="p-st-field">
      <div class="label">Студент <i>бажано</i></div>
      <select class="select" id="p-st"></select>
    </div>
    <div class="field">
      <div class="label">Нік <i>обов'язково</i></div>
      <input class="input" id="p-nick" maxlength="20" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Напр. Ньютон_на_мінімалках" value="${esc(p.nick || '')}">
    </div>
    <div class="err" id="p-err"></div>
    <div class="s-actions"><button class="btn" id="p-save">${first ? 'Далі' : 'Зберегти'}</button></div>
  `, { dismiss: !first, cls: 'full' });

  const renderGroups = () => {
    const box = $('#p-groups', sh);
    if (S.groupsState === 'loading') { box.innerHTML = '<div class="note">Завантажую списки груп…</div>'; }
    else if (!S.groups) {
      box.innerHTML = `<div class="note">Не вдалося завантажити списки груп. Можна грати з ніком без групи.</div><button class="linkbtn" id="p-retry">Спробувати ще раз</button>`;
      $('#p-retry', sh).onclick = () => { S.groupsState = 'loading'; renderGroups(); fetchGroups().then(renderGroups); };
    } else {
      box.innerHTML = `<div class="groups">${S.groups.map((g) => `<button class="gchip ${g.id === groupId ? 'on' : ''}" data-id="${esc(g.id)}">${esc(g.name)}</button>`).join('')}
        <button class="gchip none ${!groupId ? 'on' : ''}" data-id="">Без групи</button></div>`;
      $$('.gchip', box).forEach((b) => b.onclick = () => {
        groupId = b.dataset.id;
        if (!S.groups.find((g) => g.id === groupId)?.students.some((s) => s.id === studentId)) studentId = '';
        renderGroups();
      });
    }
    const g = S.groups?.find((x) => x.id === groupId);
    $('#p-st-field', sh).hidden = !g;
    if (g) {
      const sel = $('#p-st', sh);
      sel.innerHTML = `<option value="">— не обирати —</option>` + g.students.map((s) => `<option value="${esc(s.id)}" ${s.id === studentId ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
      sel.onchange = () => { studentId = sel.value; };
    }
  };
  renderGroups();
  sheetState.rerender = renderGroups;

  $('#p-save', sh).onclick = () => {
    const nick = $('#p-nick', sh).value.trim().replace(/\s+/g, ' ');
    if (nick.length < 2) { $('#p-err', sh).textContent = 'Введи нік, хоча б 2 символи.'; $('#p-nick', sh).classList.add('shake'); setTimeout(() => $('#p-nick', sh)?.classList.remove('shake'), 400); return; }
    const g = S.groups?.find((x) => x.id === groupId);
    const st = g?.students.find((s) => s.id === studentId);
    S.profile = {
      nick,
      groupId: g ? g.id : (groupId && p.groupId === groupId ? p.groupId : ''),
      groupName: g ? g.name : (groupId && p.groupId === groupId ? p.groupName : ''),
      studentId: st ? st.id : '',
      studentName: st ? st.name : '',
    };
    LS.set('profile', S.profile);
    sfx('open');
    if (first || !S.hero) { openHeroPicker(true); } else { closeSheet(); renderLevels(); }
  };
}

async function fetchGroups() {
  S.groupsState = 'loading';
  S.groups = await loadGroups();
  S.groupsState = S.groups ? 'ok' : 'error';
  if (sheetState.rerender) sheetState.rerender();
  if (S.tab === 'rating') renderRating(false);
}

// ---------- вибір героя ----------
function openHeroPicker(first = false) {
  let cls = S.hero?.cls || 'carpenter';
  let gender = S.hero?.gender || 'm';
  const sh = openSheet(`
    <div class="s-kicker">${first ? 'Крок 2 / 2' : 'Герой'}</div>
    <div class="s-title">Обери свого героя</div>
    <p class="note" style="margin:6px 0 12px">Сучасні майстри в середньовічному замку. Кожен клас має свою перевагу.</p>
    <div class="hp-stage"><canvas id="hp-cv" width="16" height="24"></canvas></div>
    <div class="seg"><button data-g="m">Він</button><button data-g="f">Вона</button></div>
    <div class="classes" id="hp-classes"></div>
    <div class="cls-desc" id="hp-desc"></div>
    <div class="s-actions"><button class="btn" id="hp-ok">Обрати героя</button></div>
  `, { cls: 'full', dismiss: !first });

  const cv = $('#hp-cv', sh), g = cv.getContext('2d');
  let tick = 0;
  const anim = setInterval(() => {
    tick++;
    const phase = Math.floor(tick / 12) % 6;
    const dir = [0, 0, 2, 0, 1, 0][phase];
    const frame = phase === 1 || phase === 2 ? 1 + (tick % 2) : 0;
    g.clearRect(0, 0, 16, 24);
    g.drawImage(heroSprite(cls, gender, dir, frame), 0, 0);
  }, 160);
  sheetState.cleanup = () => clearInterval(anim);

  const render = () => {
    $$('.seg button', sh).forEach((b) => b.classList.toggle('on', b.dataset.g === gender));
    $('#hp-classes', sh).innerHTML = Object.entries(CLASSES).map(([k, c]) => `
      <button class="cls ${k === cls ? 'on' : ''}" data-c="${k}">
        <img src="${heroURL(k, gender, 3)}" alt="">
        <span class="cls-n">${c.name}</span>
        <span class="cls-p">${c.perk}</span>
      </button>`).join('');
    $$('.cls', sh).forEach((b) => b.onclick = () => { cls = b.dataset.c; sfx('tap'); render(); });
    $('#hp-desc', sh).innerHTML = `<b>${CLASSES[cls].perk}.</b> ${CLASSES[cls].perkText}`;
    g.clearRect(0, 0, 16, 24); g.drawImage(heroSprite(cls, gender, 0, 0), 0, 0);
  };
  $$('.seg button', sh).forEach((b) => b.onclick = () => { gender = b.dataset.g; sfx('tap'); render(); });
  render();
  $('#hp-ok', sh).onclick = () => {
    S.hero = { cls, gender };
    LS.set('hero', S.hero);
    sfx('bonus');
    closeSheet();
    showScreen('main');
    showTab('levels');
  };
}

// ---------- вкладка «Рівні» ----------
function bestLocal(level) {
  const mine = S.results.filter((r) => r.level === level);
  if (!mine.length) return null;
  return Math.min(...mine.map((r) => r.timeMs)) / 1000;
}

function renderLevels() {
  const box = $('#tab-levels');
  if (!S.profile || !S.hero) { box.innerHTML = ''; return; }
  const c = CLASSES[S.hero.cls];
  const run = S.run && !S.run.finished ? S.run : null;
  box.innerHTML = `
    <div class="card who">
      <div class="who-ava"><img src="${heroURL(S.hero.cls, S.hero.gender, 3)}" alt=""></div>
      <div class="who-main">
        <div class="who-nick">${esc(S.profile.nick)}</div>
        <div class="who-meta">${esc(profileMeta())}</div>
      </div>
      <button class="linkbtn" id="lv-prof">Змінити</button>
    </div>

    <div class="h2">Твій герой</div>
    <div class="card hero-card">
      <div class="hero-stage"><img src="${heroURL(S.hero.cls, S.hero.gender, 4)}" alt=""></div>
      <div>
        <div class="hero-name">${c.name}</div>
        <div class="perk">${c.perk}</div>
        <div class="perk-text">${c.perkText}</div>
        <button class="linkbtn" id="lv-hero">Змінити героя</button>
      </div>
    </div>

    <div class="h2">Рівні</div>
    ${LEVELS.map((L) => {
      if (L.locked) return `<div class="level locked"><div class="level-deco">0${L.id}</div><div class="level-n">Рівень ${ROMAN[L.id]}</div><div class="level-t">${L.title}</div><div class="level-s">${L.subtitle}</div></div>`;
      const best = bestLocal(L.id);
      const mine = run && run.level === L.id;
      return `<button class="level" data-level="${L.id}">
        <div class="level-deco">0${L.id}</div>
        <div class="level-n">Рівень ${ROMAN[L.id]}</div>
        <div class="level-t">${L.title}</div>
        <div class="level-s">${L.subtitle}</div>
        <div class="level-d">${L.desc}</div>
        <div class="level-row">
          <span class="chip">${L.rooms.length} кімнат</span>
          ${best != null ? `<span class="chip gold">Найкраще: ${fmtTime(best)}</span>` : ''}
          ${mine ? `<span class="chip gold">Кімната ${run.room + 1}/${L.rooms.length}</span>` : ''}
          <span class="level-go">${mine ? 'Продовжити' : 'Грати'}</span>
        </div>
      </button>
      ${mine ? `<button class="linkbtn" data-restart="${L.id}" style="margin:-4px 0 10px">Почати рівень заново</button>` : ''}`;
    }).join('')}

    <div class="h2">Як грати</div>
    <div class="card howto">${HOWTO}</div>
  `;
  $('#lv-prof').onclick = () => openProfile(false);
  $('#lv-hero').onclick = () => {
    if (S.run && !S.run.finished) toast('Новий герой буде в наступному забігу. Поточний забіг доходить старий.', 2800);
    openHeroPicker(false);
  };
  $$('.level[data-level]', box).forEach((b) => b.onclick = () => startLevel(+b.dataset.level));
  $$('[data-restart]', box).forEach((b) => b.onclick = () => confirmRestart(+b.dataset.restart));
}

const HOWTO = `<ol style="margin:0;padding-left:20px">
  <li>Торкнись клітинки, і герой піде туди. Торкнись предмета, і він підійде та роздивиться його.</li>
  <li>Предмети, що <b>поблискують</b>, це підказки: формули, означення і числа для задач.</li>
  <li>Двері просять відповідь. У кожних дверей свої правила, вони написані зверху.</li>
  <li>За кожні відчинені двері обираєш бонус: ключ, щит, сувій, годинник або чоботи.</li>
  <li>Таймер іде від входу в перший зал до печаті Паладина і <b>не зупиняється</b>. Помилки додають секунди.</li>
  <li>У кожного гравця свої числа в задачах, тож відповідь сусіда тобі не підійде.</li>
</ol>`;

function confirmRestart(level) {
  const sh = openSheet(`
    <div class="s-kicker">Почати заново?</div>
    <div class="s-title">Поточний забіг буде втрачено</div>
    <p class="s-body">Таймер обнулиться, бонуси зникнуть, а числа в задачах будуть нові.</p>
    <div class="s-actions btn-row"><button class="btn dark" id="cr-no">Ні</button><button class="btn" id="cr-yes">Так, заново</button></div>
  `);
  $('#cr-no', sh).onclick = closeSheet;
  $('#cr-yes', sh).onclick = () => { S.run = null; saveRun(); closeSheet(); if (!$('#scr-game').hidden) exitGame(); startLevel(level); };
}

// ---------- забіг ----------
function newRun(levelId) {
  const L = LEVELS.find((l) => l.id === levelId);
  const seed = (Math.random() * 2 ** 31) | 0;
  const params = L.rooms.map((room, i) => room.params(mulberry32(seed + i * 7919)));
  const crng = mulberry32(seed ^ 0x5bd1e995);
  const cats = L.rooms.map((room) => room.catSpots[Math.floor(crng() * room.catSpots.length)]);
  return {
    v: 1, id: uid(), level: levelId, seed, params, cats,
    hero: { ...S.hero },
    startedAt: Date.now(), roomStart: Date.now(),
    room: 0, penalty: 0, bonusTime: 0, mistakes: 0,
    inv: { key: S.hero.cls === 'carpenter' ? 1 : 0, shield: 0, scroll: 0, boots: false },
    rs: L.rooms.map(() => ({ read: [], open: false, qi: 0, fails: 0, failsQ: {}, restored: false, broken: false, scrolls: {} })),
    splits: [], catTaps: 0, catGift: false, finished: false,
  };
}

function curLevel() { return LEVELS.find((l) => l.id === S.run.level); }
function curRoom() { return curLevel().rooms[S.run.room]; }
function curRS() { return S.run.rs[S.run.room]; }
const elapsed = () => (Date.now() - S.run.startedAt) / 1000;
const score = () => Math.max(0, elapsed() + S.run.penalty - S.run.bonusTime);

function startLevel(levelId) {
  initAudio();
  if (!S.run || S.run.finished || S.run.level !== levelId) {
    S.run = newRun(levelId);
    saveRun();
  } else if (Date.now() - S.run.startedAt > 6 * 3600 * 1000) {
    toast('Цей забіг тривав понад 6 годин, тож починаємо новий.', 3000);
    S.run = newRun(levelId); saveRun();
  }
  fade(() => {
    showScreen('game');
    if (!game) {
      game = new Game($('#cv'), {
        interact: onInteract,
        exit: onExit,
        toast: (m) => toast(m, 1200),
      });
      window.addEventListener('resize', fitGame);
    }
    game.setHero(S.run.hero.cls, S.run.hero.gender);
    game.setSpeed(S.run.inv.boots ? 2 : 1);
    enterRoom(true);
    fitGame();
    game.start();
    clearInterval(hudTimer);
    hudTimer = setInterval(renderTimer, 100);
  });
}

function fitGame() {
  if (!game || $('#scr-game').hidden) return;
  const st = $('#stage');
  game.resize(st.clientWidth, st.clientHeight - 4);
}

function buildObjects(room, i) {
  const p = S.run.params[i];
  const rs = S.run.rs[i];
  const cls = S.run.hero.cls;
  const objs = room.objects(p).map((o) => {
    const x = { ...o };
    if (x.kind === 'door') { x.sprite = DOOR_TYPES[x.door].sprite; x.open = rs.open; }
    if (x.kind === 'hint') x.read = rs.read.includes(x.id);
    if (x.kind === 'fresco') { x.restored = rs.restored; x.glint = cls === 'painter'; x.title = 'Вицвіла фреска'; }
    if (x.kind === 'crack') { x.broken = rs.broken; x.glint = cls === 'welder'; x.title = 'Тріснута кладка'; }
    return x;
  });
  const [cx, cy] = S.run.cats[i];
  objs.push({ id: 'cat', kind: 'cat', x: cx, y: cy, title: 'Кіт Ньютон', text: room.cat });
  return objs;
}

function enterRoom(showIntro) {
  const L = curLevel(), room = curRoom(), i = S.run.room;
  game.loadRoom(room, buildObjects(room, i), room.entry);
  setMood(i === L.rooms.length - 1 ? 4 : i % 4);
  $('#hud-n').textContent = `Зал ${i + 1} / ${L.rooms.length}`;
  $('#hud-name').textContent = room.name;
  renderInv();
  renderTimer();
  if (showIntro) showBanner(`Зал ${i + 1} / ${L.rooms.length}`, room.name, room.intro);
}

let bannerT = null;
function showBanner(k, t, d) {
  const b = $('#banner');
  b.innerHTML = `<div class="banner-k">${k}</div><div class="banner-t">${esc(t)}</div><div class="banner-d">${d}</div>`;
  b.hidden = false; b.classList.remove('out');
  clearTimeout(bannerT);
  const hide = () => { b.classList.add('out'); setTimeout(() => { b.hidden = true; }, 380); };
  bannerT = setTimeout(hide, 5200);
  b.onclick = () => { clearTimeout(bannerT); hide(); };
}

function renderTimer() {
  if (!S.run) return;
  $('#hud-timer').textContent = fmtTime(score());
}
function bumpTimer() {
  const t = $('#hud-timer');
  t.classList.remove('pen'); void t.offsetWidth; t.classList.add('pen');
}

function renderInv(pop) {
  const inv = S.run.inv;
  const items = [];
  if (inv.key) items.push(['key', `×${inv.key}`, 'Ключ']);
  if (inv.shield) items.push(['shield', `×${inv.shield}`, 'Щит']);
  if (inv.scroll) items.push(['scroll', `×${inv.scroll}`, 'Сувій']);
  if (inv.boots) items.push(['boots', '×2', 'Чоботи']);
  $('#inv').innerHTML = items.length
    ? items.map(([ic, n, t]) => `<div class="inv-it ${pop === ic ? 'pop' : ''}" title="${t}"><img src="${iconURL(ic, 2)}" alt="${t}">${n}</div>`).join('')
    : `<div class="inv-hint">Бонуси з'являться після перших дверей</div>`;
}

function exitGame() {
  if (game) game.stop();
  clearInterval(hudTimer);
  $('#banner').hidden = true;
  setMood(0);
  showScreen('main');
  showTab(S.tab);
}

$('#btn-menu').addEventListener('click', openMenu);
function openMenu() {
  const sh = openSheet(`
    <div class="s-kicker">Меню</div>
    <div class="s-title">Таймер не зупиняється</div>
    <p class="note">Можна вийти й повернутися пізніше, прогрес збережеться, але час іде далі.</p>
    <div class="field btn-row">
      <button class="btn dark" id="m-music">Музика: ${S.settings.music ? 'увімк.' : 'вимк.'}</button>
      <button class="btn dark" id="m-sfx">Звуки: ${S.settings.sfx ? 'увімк.' : 'вимк.'}</button>
    </div>
    <div class="s-actions stack">
      <button class="btn" id="m-back">Повернутися до гри</button>
      <button class="btn ghost" id="m-help">Як грати</button>
      <button class="btn ghost" id="m-exit">Вийти в меню</button>
      <button class="btn dark" id="m-restart">Почати рівень заново</button>
    </div>
  `);
  $('#m-music', sh).onclick = () => { S.settings.music = !S.settings.music; LS.set('settings', S.settings); initAudio(); setMusic(S.settings.music); renderSoundBtn(); openMenu(); };
  $('#m-sfx', sh).onclick = () => { S.settings.sfx = !S.settings.sfx; LS.set('settings', S.settings); setSfx(S.settings.sfx); renderSoundBtn(); openMenu(); };
  $('#m-back', sh).onclick = closeSheet;
  $('#m-help', sh).onclick = () => {
    const h = openSheet(`<div class="s-kicker">Довідка</div><div class="s-title">Як грати</div><div class="howto" style="margin-top:10px">${HOWTO}</div><div class="s-actions"><button class="btn" id="h-ok">Зрозуміло</button></div>`);
    $('#h-ok', h).onclick = closeSheet;
  };
  $('#m-exit', sh).onclick = () => { closeSheet(); fade(exitGame); };
  $('#m-restart', sh).onclick = () => confirmRestart(S.run.level);
}

// ---------- взаємодія з предметами ----------
function iconImg(o) {
  const name = game.spriteName(o);
  return `<img src="${spriteURL(name, 3)}" alt="">`;
}

function onInteract(o) {
  const rs = curRS();
  if (o.kind === 'door') {
    if (o.open) { game.walkIntoDoor(); return; }
    openDoor(o);
    return;
  }
  if (o.kind === 'hint') {
    sfx('read');
    if (!rs.read.includes(o.id)) { rs.read.push(o.id); saveRun(); }
    o.read = true;
    let body = o.text;
    if (o.graph) body = body.replace('<div class="graph-slot"></div>', boardGraphSVG(S.run.params[S.run.room]));
    const sh = openSheet(`
      <div class="s-head"><div class="s-icon">${iconImg(o)}</div><div><div class="s-kicker">Підказка</div><div class="s-title">${o.title}</div></div></div>
      <div class="s-body">${body}</div>
      <div class="s-actions"><button class="btn" id="ok">Запам'ятав</button></div>`);
    $('#ok', sh).onclick = closeSheet;
    return;
  }
  if (o.kind === 'cat') {
    sfx('meow');
    S.run.catTaps++;
    let extra = '';
    if (S.run.catTaps >= 5 && !S.run.catGift) {
      S.run.catGift = true; S.run.inv.shield++; renderInv('shield');
      extra = `<div class="helper">Ньютон потерся об ногу і притягнув звідкись <b>щит паладина</b>. Схоже, ти йому сподобався. Наступна помилка без штрафу.</div>`;
      sfx('bonus');
    }
    saveRun();
    const sh = openSheet(`
      <div class="s-head"><div class="s-icon">${iconImg(o)}</div><div><div class="s-kicker">Мешканець замку</div><div class="s-title">Кіт Ньютон</div></div></div>
      <div class="s-body">${o.text}</div>${extra}
      <div class="s-actions"><button class="btn dark" id="ok">Погладити й іти далі</button></div>`, { cls: 'compact' });
    $('#ok', sh).onclick = closeSheet;
    return;
  }
  if (o.kind === 'fresco') {
    const painter = S.run.hero.cls === 'painter';
    if (painter && !o.restored) {
      const sh = openSheet(`
        <div class="s-head"><div class="s-icon">${iconImg(o)}</div><div><div class="s-kicker">Маляр-Штукатур</div><div class="s-title">Вицвіла фреска</div></div></div>
        <div class="s-body">Фарба облізла, штукатурка пішла тріщинами. Але ти знаєш, що робити.</div>
        <div class="s-actions"><button class="btn" id="fx">Відновити фреску</button></div>`);
      $('#fx', sh).onclick = () => {
        rs.restored = true; o.restored = true; saveRun(); sfx('bonus');
        onInteract(o);
      };
      return;
    }
    if (painter) {
      sfx('read');
      const sh = openSheet(`
        <div class="s-head"><div class="s-icon">${iconImg(o)}</div><div><div class="s-kicker">Відновлена фреска</div><div class="s-title">Таємний напис</div></div></div>
        <div class="s-body">${o.text}</div>
        <div class="s-actions"><button class="btn" id="ok">Дякую, майстре</button></div>`);
      $('#ok', sh).onclick = closeSheet;
      return;
    }
    const sh = openSheet(`
      <div class="s-head"><div class="s-icon">${iconImg(o)}</div><div><div class="s-kicker">Стіна</div><div class="s-title">Вицвіла фреска</div></div></div>
      <div class="s-body">Колись тут був малюнок з написом, але фарба облізла. Розібрати нічого не вдається.<br><span class="dim">Маляр-Штукатур зміг би її відновити.</span></div>
      <div class="s-actions"><button class="btn dark" id="ok">Іти далі</button></div>`, { cls: 'compact' });
    $('#ok', sh).onclick = closeSheet;
    return;
  }
  if (o.kind === 'crack') {
    const welder = S.run.hero.cls === 'welder';
    if (o.broken) {
      const sh = openSheet(`<div class="s-head"><div class="s-icon">${iconImg(o)}</div><div><div class="s-kicker">Ніша</div><div class="s-title">Порожня скриня</div></div></div><div class="s-body">Скарб уже твій.</div><div class="s-actions"><button class="btn dark" id="ok">Іти далі</button></div>`, { cls: 'compact' });
      $('#ok', sh).onclick = closeSheet;
      return;
    }
    if (welder) {
      const sh = openSheet(`
        <div class="s-head"><div class="s-icon">${iconImg(o)}</div><div><div class="s-kicker">Зварювальник-Муляр</div><div class="s-title">Тріснута кладка</div></div></div>
        <div class="s-body">Розчин висипається, цеглини ледве тримаються, а крізь щілину щось блищить золотом. Для муляра це п'ять секунд роботи.</div>
        <div class="s-actions"><button class="btn" id="fx">Розібрати кладку</button></div>`);
      $('#fx', sh).onclick = () => {
        rs.broken = true; o.broken = true; saveRun(); sfx('smash');
        closeSheet();
        setTimeout(() => openBonus('Скриня за стіною', 'Схованка Ордену'), 250);
      };
      return;
    }
    const sh = openSheet(`
      <div class="s-head"><div class="s-icon">${iconImg(o)}</div><div><div class="s-kicker">Стіна</div><div class="s-title">Тріснута кладка</div></div></div>
      <div class="s-body">Крізь щілину щось блищить, але цеглини міцно сидять.<br><span class="dim">Без Зварювальника-Муляра її не розібрати.</span></div>
      <div class="s-actions"><button class="btn dark" id="ok">Іти далі</button></div>`, { cls: 'compact' });
    $('#ok', sh).onclick = closeSheet;
    return;
  }
  // декор
  sfx('tap');
  const sh = openSheet(`
    <div class="s-head"><div class="s-icon">${iconImg(o)}</div><div><div class="s-kicker">${curRoom().name}</div><div class="s-title">${o.title}</div></div></div>
    <div class="s-body">${o.text}</div>
    <div class="s-actions"><button class="btn dark" id="ok">Далі</button></div>`, { cls: 'compact' });
  $('#ok', sh).onclick = closeSheet;
}

// ---------- двері ----------
function parseNum(s) {
  const t = String(s).trim().replace(/\s/g, '').replace(',', '.').replace(/[^0-9.\-]/g, '');
  if (!t || t === '-' || t === '.') return NaN;
  return parseFloat(t);
}
function numOk(x, ans) { return Math.abs(x - ans) <= Math.max(0.011, Math.abs(ans) * 0.01); }

function signalHTML(x, ans) {
  const rel = Math.abs(x - ans) / Math.max(1, Math.abs(ans));
  const lvl = rel < 0.15 ? 4 : rel < 0.4 ? 3 : rel < 1 ? 2 : 1;
  const word = ['', 'холодно', 'прохолодно', 'тепло', 'гаряче!'][lvl];
  return `<span class="signal">${[1, 2, 3, 4].map((i) => `<i class="${i <= lvl ? 'on' : ''}" style="height:${4 + i * 3}px"></i>`).join('')}</span>Сигнал: ${word}`;
}

function openDoor(o, feedback = null) {
  const rs = curRS();
  const type = DOOR_TYPES[o.door];
  const qs = o.questions;
  const qi = Math.min(rs.qi, qs.length - 1);
  const q = qs[qi];
  const inv = S.run.inv;
  const welder = S.run.hero.cls === 'welder';
  const radio = S.run.hero.cls === 'radio';
  const pen = (p) => welder ? p / 2 : p;

  let answerUI = '';
  if (q.kind === 'num') {
    answerUI = `<form class="answer" id="ans-form" autocomplete="off">
      <input class="input" id="ans" inputmode="decimal" enterkeyhint="done" placeholder="?" aria-label="Відповідь">
      <span class="unit">${q.unit}</span>
      <button class="btn" type="submit">OK</button>
    </form>`;
  } else {
    const off = radio ? (q.correct + 1 + (S.run.seed % (q.options.length - 1))) % q.options.length : -1;
    const graphs = q.kind === 'graph';
    answerUI = `<div class="choices ${graphs ? 'graphs' : ''}">${q.options.map((opt, i) => `
      <button class="choice ${i === off ? 'off' : ''}" data-i="${i}">${graphs ? graphSVG(opt) : esc(opt)}</button>`).join('')}</div>
      ${radio ? '<div class="note">Сигнал радіоелектроніка вже відсіяв одну хибну відповідь.</div>' : ''}`;
  }

  const sh = openSheet(`
    <div class="s-head"><div class="s-icon"><img src="${spriteURL(type.sprite, o.w > 1 ? 1 : 3)}" alt=""></div>
      <div><div class="s-kicker">Двері · зал ${S.run.room + 1}</div><div class="s-title">${type.name}</div></div></div>
    <div class="rules">${type.rules.map((r) => `<div class="rule">${welder && /\+\d+ с/.test(r) ? r.replace(/\+(\d+) с/g, (m, d) => `+${d / 2} с (муляр)`) : r}</div>`).join('')}</div>
    ${qs.length > 1 ? `<div class="q-step">${qs.map((_, i) => `<i class="${i < qi ? 'done' : i === qi ? 'cur' : ''}"></i>`).join('')}</div>` : ''}
    <div class="q-text">${q.text}</div>
    ${answerUI}
    <div class="feedback ${feedback ? feedback.cls : ''}" id="fb">${feedback ? feedback.html : ''}</div>
    ${rs.scrolls[qi] ? `<div class="helper"><b>Сувій мудреця:</b> ${q.hint}</div>` : ''}
    <div class="s-actions stack" id="door-actions">
      ${type.key && inv.key ? `<button class="btn ghost" id="d-key"><img src="${iconURL('key', 2)}" alt="">Відчинити ключем (є ${inv.key})</button>` : ''}
      ${inv.scroll && !rs.scrolls[qi] ? `<button class="btn ghost" id="d-scroll"><img src="${iconURL('scroll', 2)}" alt="">Розгорнути сувій мудреця (є ${inv.scroll})</button>` : ''}
      ${type.giveUp && rs.fails >= type.giveUp ? `<button class="btn ghost" id="d-giveup">Пройти зі штрафом +${pen(type.giveUpPenalty)} с</button>` : ''}
      <button class="btn dark" id="d-close">Відійти й пошукати підказки</button>
    </div>
  `);

  const wrong = (el) => {
    let p = pen(type.penalty);
    let msg = '';
    if (p > 0 && inv.shield > 0) { inv.shield--; msg = 'Неправильно, але <b>щит паладина</b> поглинув штраф.'; p = 0; renderInv(); }
    else if (p > 0) msg = `Неправильно. +${p} с до часу.`;
    else msg = 'Неправильно. Штрафу немає, спробуй ще.';
    S.run.penalty += p; S.run.mistakes++; rs.fails++; rs.failsQ[qi] = (rs.failsQ[qi] || 0) + 1;
    saveRun(); sfx('wrong'); if (p) bumpTimer();
    if (type.giveUp && rs.fails === type.giveUp) msg += ' Двері терпіння тепер дозволяють пройти зі штрафом.';
    return msg;
  };

  const right = () => {
    sfx('right');
    let note = '';
    if (type.skipSecond && qi === 0 && !rs.failsQ[0] && qs.length > 1) { rs.qi = qs.length; note = 'skip'; }
    else rs.qi = qi + 1;
    saveRun();
    if (rs.qi >= qs.length) {
      openDoorDone(o, note === 'skip' ? 'Мудрець усміхається: з першої спроби! Друге питання він пропускає.' : null);
    } else {
      openDoor(o, { cls: 'good', html: 'Правильно! Наступне випробування.' });
    }
  };

  if (q.kind === 'num') {
    const input = $('#ans', sh);
    setTimeout(() => input.focus({ preventScroll: true }), 280);
    $('#ans-form', sh).onsubmit = (e) => {
      e.preventDefault();
      const x = parseNum(input.value);
      if (Number.isNaN(x)) { $('#fb', sh).className = 'feedback info'; $('#fb', sh).textContent = 'Введи число (можна з комою).'; return; }
      if (numOk(x, q.answer)) { right(); return; }
      let msg = wrong();
      if (radio) msg += `<div style="margin-top:6px;color:var(--gold-hi)">${signalHTML(x, q.answer)}</div>`;
      openDoor(o, { cls: 'bad', html: msg });
      const ni = $('#ans');
      if (ni) { ni.value = input.value; ni.classList.add('shake'); }
    };
  } else {
    $$('.choice', sh).forEach((b) => b.onclick = () => {
      const i = +b.dataset.i;
      if (i === q.correct) { right(); return; }
      const msg = wrong();
      b.classList.add('bad', 'off');
      const fb = $('#fb', sh); fb.className = 'feedback bad'; fb.innerHTML = msg;
      // перерендер, щоб оновити кнопки дверей терпіння
      if (type.giveUp && rs.fails >= type.giveUp && !$('#d-giveup', sh)) openDoor(o, { cls: 'bad', html: msg });
    });
  }

  $('#d-close', sh).onclick = closeSheet;
  const keyB = $('#d-key', sh);
  if (keyB) keyB.onclick = () => { inv.key--; sfx('key'); saveRun(); renderInv(); openDoorDone(o, 'Ключ клацнув у замку.'); };
  const scB = $('#d-scroll', sh);
  if (scB) scB.onclick = () => { inv.scroll--; rs.scrolls[qi] = true; sfx('read'); saveRun(); renderInv(); openDoor(o); };
  const guB = $('#d-giveup', sh);
  if (guB) guB.onclick = () => { S.run.penalty += pen(type.giveUpPenalty); saveRun(); bumpTimer(); openDoorDone(o, `Двері терпіння зглянулися. +${pen(type.giveUpPenalty)} с.`); };
}

function openDoorDone(o, note) {
  const rs = curRS();
  rs.open = true; rs.qi = o.questions.length;
  o.open = true;
  saveRun();
  sfx('door');
  closeSheet();
  const last = S.run.room === curLevel().rooms.length - 1;
  if (note) toast(note, 2600);
  if (last) { setTimeout(() => game.walkIntoDoor(), 500); return; }
  setTimeout(() => openBonus('Двері відчинено!', 'Обери нагороду', () => game.walkIntoDoor()), 450);
}

function openBonus(title, kicker, then) {
  const inv = S.run.inv;
  const pool = Object.keys(BONUSES).filter((k) => !(k === 'boots' && inv.boots));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const pick3 = pool.slice(0, 3);
  sfx('bonus');
  const sh = openSheet(`
    <div class="s-head"><div class="s-icon"><img src="${iconURL('chest', 3)}" alt=""></div><div><div class="s-kicker">${kicker}</div><div class="s-title">${title}</div></div></div>
    <p class="note">Можна взяти лише одне.</p>
    <div class="bonuses">${pick3.map((k) => `
      <button class="bonus" data-k="${k}"><img src="${iconURL(BONUSES[k].icon, 3)}" alt="">
        <div><div class="bonus-n">${BONUSES[k].name}</div><div class="bonus-t">${BONUSES[k].text}</div></div></button>`).join('')}
    </div>`, { dismiss: false });
  $$('.bonus', sh).forEach((b) => b.onclick = () => {
    const k = b.dataset.k;
    if (k === 'key') inv.key++;
    else if (k === 'shield') inv.shield++;
    else if (k === 'scroll') inv.scroll++;
    else if (k === 'boots') { inv.boots = true; game.setSpeed(2); }
    else if (k === 'hourglass') { S.run.bonusTime += 20; renderTimer(); }
    saveRun(); sfx('key');
    renderInv(k);
    closeSheet();
    toast(k === 'hourglass' ? '−20 с від часу!' : `Отримано: ${BONUSES[k].name}`, 1600);
    if (then) setTimeout(then, 250);
  });
}

function onExit() {
  const L = curLevel();
  const now = Date.now();
  S.run.splits.push((now - S.run.roomStart) / 1000);
  S.run.roomStart = now;
  if (S.run.room >= L.rooms.length - 1) { victory(); return; }
  S.run.room++;
  saveRun();
  sfx('open');
  fade(() => enterRoom(true));
}

// ---------- перемога ----------
async function victory() {
  const run = S.run;
  const total = score();
  const L = curLevel();
  run.finished = true;
  clearInterval(hudTimer);
  renderTimer();
  game.locked = true;
  sfx('win');
  const p = S.profile || {};
  const entry = {
    level: run.level, timeMs: Math.round(total * 1000), rawMs: Math.round(elapsed() * 1000),
    penalty: run.penalty, bonus: run.bonusTime, mistakes: run.mistakes,
    nick: p.nick || 'Анонім', groupId: p.groupId || '', group: p.groupName || '',
    studentId: p.studentId || '', student: p.studentName || '',
    hero: run.hero.cls, gender: run.hero.gender, runId: run.id, device: S.device, at: Date.now(),
  };
  const prevBest = bestLocal(run.level);
  S.results.push(entry); LS.set('results', S.results);
  S.run = null; saveRun();
  delete S.rtCache[entry.level];

  const sh = openSheet(`
    <div class="win">
      <img class="win-crown" src="${iconURL('crown', 6)}" alt="">
      <div class="win-k">Рівень ${ROMAN[L.id]} · ${L.title}</div>
      <div class="win-t">Печать зламано!</div>
      <div class="note">Орден Дельти визнає тебе паладином руху.</div>
      <div class="win-time">${fmtTime(total)}</div>
      ${prevBest != null ? `<div class="chip ${total < prevBest ? 'gold' : ''}">${total < prevBest ? 'Новий особистий рекорд!' : 'Твій рекорд: ' + fmtTime(prevBest)}</div>` : ''}
      <div class="win-grid">
        <div class="win-cell"><span>Чистий час</span><strong>${fmtTime(entry.rawMs / 1000)}</strong></div>
        <div class="win-cell"><span>Помилок</span><strong>${run.mistakes}</strong></div>
        <div class="win-cell"><span>Штрафи</span><strong style="color:var(--minus)">+${run.penalty} с</strong></div>
        <div class="win-cell"><span>Бонус часу</span><strong style="color:var(--plus)">−${run.bonusTime} с</strong></div>
      </div>
      <div class="splits">${L.rooms.map((r, i) => `<div class="split"><span>${i + 1}. ${r.name}</span><span>${run.splits[i] != null ? fmtTime(run.splits[i]) : '—'}</span></div>`).join('')}</div>
      <div class="sent" id="w-sent">${ratingEnabled() ? 'Надсилаю результат у рейтинг…' : 'Результат збережено на цьому пристрої.'}</div>
      <div class="stack">
        <button class="btn" id="w-rating">Рейтинг</button>
        <div class="btn-row"><button class="btn ghost" id="w-again">Ще раз</button><button class="btn dark" id="w-menu">До рівнів</button></div>
      </div>
    </div>`, { cls: 'full', dismiss: false });
  confetti();
  const leave = (fn) => { closeSheet(); fade(() => { exitGame(); fn && fn(); }); };
  $('#w-rating', sh).onclick = () => leave(() => { S.rtLevel = entry.level; showTab('rating'); });
  $('#w-menu', sh).onclick = () => leave();
  $('#w-again', sh).onclick = () => { closeSheet(); exitGame(); startLevel(entry.level); };

  if (ratingEnabled()) {
    const ok = await submitResult(entry);
    if (!ok) { S.pending.push(entry); LS.set('pending', S.pending); }
    const el = $('#w-sent');
    if (el) el.textContent = ok ? 'Результат записано в рейтинг ✓' : 'Немає зв\'язку, результат надішлеться пізніше автоматично.';
  }
}

function confetti() {
  const c = document.createElement('canvas');
  c.className = 'confetti';
  document.body.appendChild(c);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  const g = c.getContext('2d');
  const cols = ['#f6de8f', '#d8b04a', '#8c6b22', '#fff'];
  const ps = Array.from({ length: 140 }, () => ({
    x: c.width / 2 + (Math.random() - 0.5) * c.width * 0.3, y: c.height * 0.35,
    vx: (Math.random() - 0.5) * 16 * dpr, vy: (-Math.random() * 16 - 6) * dpr,
    s: (3 + Math.random() * 5) * dpr, c: cols[Math.floor(Math.random() * cols.length)], r: Math.random() * 6,
  }));
  let t = 0;
  const step = () => {
    t++;
    g.clearRect(0, 0, c.width, c.height);
    for (const p of ps) {
      p.vy += 0.45 * dpr; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += 0.1;
      g.fillStyle = p.c; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore();
    }
    if (t < 200) requestAnimationFrame(step); else c.remove();
  };
  step();
}

async function flushPending() {
  if (!ratingEnabled() || !S.pending.length) return;
  const left = [];
  for (const e of S.pending) { if (!(await submitResult(e))) left.push(e); }
  S.pending = left; LS.set('pending', left);
}

// ---------- рейтинг ----------
function myKey() {
  const p = S.profile || {};
  return p.studentId ? 's:' + p.studentId : 'n:' + String(p.nick || '').toLowerCase() + ':' + S.device;
}

async function renderRating(refetch) {
  const box = $('#tab-rating');
  const levels = LEVELS.filter((l) => !l.locked);
  const lv = S.rtLevel;
  const groups = S.groups || [];
  let rows = null, note = '';

  if (ratingEnabled()) {
    rows = S.rtCache[lv];
    if ((refetch || !rows) && S.rtState !== 'loading') {
      S.rtState = 'loading';
      fetchRating(lv).then((r) => { S.rtCache[lv] = r; S.rtState = 'ok'; if (S.tab === 'rating') renderRating(false); })
        .catch(() => { S.rtState = 'error'; if (S.tab === 'rating') renderRating(false); });
    }
  } else {
    const mine = S.results.filter((r) => r.level === lv);
    if (mine.length) {
      const best = mine.reduce((a, b) => (a.timeMs <= b.timeMs ? a : b));
      rows = [{ ...best, best: best.timeMs, attempts: mine.length, key: myKey() }];
    } else rows = [];
    note = `<div class="card note" style="margin-bottom:12px">Загальний рейтинг ще не підключено, тому тут видно лише результати з цього пристрою. Викладач підключає таблицю за інструкцією з README.</div>`;
  }

  let list = rows ? rows.slice() : null;
  if (list && S.rtGroup !== 'all') list = list.filter((r) => r.groupId === S.rtGroup || (S.rtGroup === 'none' && !r.groupId));
  const me = myKey();

  box.innerHTML = `
    <div class="rt-head">
      <div class="h2">Рейтинг</div>
      <button class="iconbtn" id="rt-refresh" aria-label="Оновити"><svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    </div>
    ${levels.length > 1 ? `<div class="filters">${levels.map((l) => `<button data-lv="${l.id}" class="${l.id === lv ? 'on' : ''}">Рівень ${ROMAN[l.id]}</button>`).join('')}</div>` : `<div class="chip gold" style="margin-bottom:12px">Рівень ${ROMAN[lv]} · ${levels[0].title}</div>`}
    ${groups.length ? `<div class="filters"><button data-g="all" class="${S.rtGroup === 'all' ? 'on' : ''}">Усі</button>${groups.map((g) => `<button data-g="${esc(g.id)}" class="${S.rtGroup === g.id ? 'on' : ''}">${esc(g.name)}</button>`).join('')}<button data-g="none" class="${S.rtGroup === 'none' ? 'on' : ''}">Без групи</button></div>` : ''}
    ${note}
    <div class="rows">${
      !list ? (S.rtState === 'error' ? `<div class="empty"><b>Не вдалося завантажити</b>Перевір інтернет і натисни «оновити».</div>` : `<div class="empty">Завантажую…</div>`)
      : !list.length ? `<div class="empty"><b>Поки що порожньо</b>Будь першим, хто зламає печать Паладина.</div>`
      : list.map((r, i) => {
        const rank = i + 1;
        const meta = [r.group ? 'гр. ' + r.group : '', r.student].filter(Boolean).join(' · ') || 'без групи';
        return `<div class="row ${r.key === me ? 'me' : ''}">
          <div class="rank ${rank <= 3 ? 'r' + rank : ''}">${rank <= 3 ? `<span class="medal">${rank}</span>` : rank}</div>
          <div style="min-width:0"><div class="row-nick">${esc(r.nick)}</div><div class="row-meta">${esc(meta)}</div></div>
          <div class="row-time"><div class="row-t">${fmtTime(r.best / 1000)}</div><div class="row-a">${r.attempts} ${plural(r.attempts, 'спроба', 'спроби', 'спроб')}</div></div>
        </div>`;
      }).join('')
    }</div>
  `;
  $('#rt-refresh').onclick = () => { delete S.rtCache[lv]; S.rtState = 'idle'; renderRating(true); };
  $$('[data-lv]', box).forEach((b) => b.onclick = () => { S.rtLevel = +b.dataset.lv; renderRating(true); });
  $$('[data-g]', box).forEach((b) => b.onclick = () => { S.rtGroup = b.dataset.g; renderRating(false); });
}

// ---------- старт ----------
document.addEventListener('visibilitychange', () => {
  if (!game) return;
  if (document.hidden) game.stop();
  else if (!$('#scr-game').hidden) { game.start(); }
});

renderSoundBtn();
showScreen('main');
fetchGroups();
flushPending();
if (!S.profile) openProfile(true);
else if (!S.hero) openHeroPicker(true);
showTab('levels');
