// Рівень II «Динаміка». Зали неправильної форми: ' ' — порожнеча за стінами.
// g береться 10 Н/кг, щоб числа були круглими (про це сказано в підказках).

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const shuffle = (rng, arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const n = (x) => String(Math.round(x * 1000) / 1000).replace('.', ',');
const F = (s) => `<span class="f">${s}</span>`;
const G = 10;

// ---------- Зал 1: Арсенал (Г-подібний) ----------
const arsenal = {
  name: 'Арсенал',
  floor: 'stone',
  intro: 'Зброярня Ордену. Тут усе має масу, а Земля тягне кожну річ донизу. Дізнайся, як сильно.',
  map: [
    '#####    ',
    '#####    ',
    '#...#    ',
    '#...#    ',
    '#...#    ',
    '#...#####',
    '#...#####',
    '#.......#',
    '#.......#',
    '#.......#',
    '#.......#',
    '#.......#',
    '#########',
  ],
  entry: [6, 11],
  catSpots: [[2, 9], [5, 9], [3, 3]],
  params(rng) {
    const m = pick(rng, [6, 8, 12, 15, 18, 24]);
    return { m, Fg: m * G };
  },
  objects: (p) => [
    { id: 'door', kind: 'door', x: 2, y: 1, wall: true, door: 'oak',
      questions: [{
        kind: 'num', unit: 'Н', answer: p.Fg,
        text: 'З якою силою тяжіння Земля притягує бойовий щит Ордену?',
        hint: `${F('F = m·g')} = ${p.m} кг · 10 Н/кг`,
      }] },
    { id: 't1', kind: 'decor', sprite: 'torch', x: 1, y: 1, wall: true, light: 'torch', title: 'Смолоскип', text: 'Полум’я тягнеться вгору, хоча все інше в арсеналі тягнеться донизу.' },
    { id: 't2', kind: 'decor', sprite: 'torch', x: 3, y: 1, wall: true, light: 'torch', title: 'Смолоскип', text: 'Тепло і світло. Сили тут ні до чого.' },
    { id: 'fresco', kind: 'fresco', x: 4, y: 6, wall: true,
      text: `Фреска: лицар тримає щит, а стрілка від щита показує донизу. Підпис: «<b>Маса в кілограмах, помножена на 10</b>, і маєш силу тяжіння в ньютонах».` },
    { id: 'ban', kind: 'decor', sprite: 'banner', x: 5, y: 6, wall: true, title: 'Стяг Ордену', text: 'На новому стягу Ордену вишито F = m·a.' },
    { id: 't3', kind: 'decor', sprite: 'torch', x: 6, y: 6, wall: true, light: 'torch', title: 'Смолоскип', text: 'Біля зброї завжди світло.' },
    { id: 'win', kind: 'decor', sprite: 'window', x: 7, y: 6, wall: true, light: 'cool', title: 'Вікно', text: 'За вікном падає сніг. Кожна сніжинка теж відчуває силу тяжіння.' },
    { id: 'scroll', kind: 'hint', sprite: 'table_scroll', x: 1, y: 3,
      title: 'Сувій: Сила тяжіння',
      text: `Земля притягує кожне тіло. Цю силу називають <b>силою тяжіння</b>.<div class="formula">F = m · g</div>m — маса (кг), g ≈ 10 Н/кг (точніше 9,8).<br>Силу вимірюють у <b>ньютонах</b> (Н).` },
    { id: 'scales', kind: 'hint', sprite: 'scales', x: 3, y: 5,
      title: 'Терези',
      text: `<b>Маса</b> — міра інертності тіла, вимірюється в кілограмах.<br>Маса щита однакова і на Землі, і на Місяці. А от сила тяжіння на Місяці вшестеро менша.` },
    { id: 'shield', kind: 'hint', sprite: 'shield_stand', x: 6, y: 8,
      title: 'Бойовий щит',
      text: `Табличка на стійці: «Щит Ордену Дельти. Маса <b>${p.m} кг</b>. Не впускати на ногу.»` },
    { id: 'wt', kind: 'decor', sprite: 'weights', x: 7, y: 9, title: 'Гирі', text: 'Хтось тут тренувався. Гирі по 16 кг, тобто приблизно 160 Н кожна.' },
    { id: 'armor', kind: 'decor', sprite: 'armor', x: 1, y: 8, title: 'Обладунок', text: 'Повний обладунок важить близько 25 кг. Лицарі були дуже сильними.' },
    { id: 'rack', kind: 'decor', sprite: 'rack', x: 1, y: 11, title: 'Стійка зі списами', text: 'Списи стоять рівно: сила тяжіння і сила реакції опори врівноважують одна одну.' },
    { id: 'b1', kind: 'decor', sprite: 'barrel', x: 7, y: 11, title: 'Бочка', text: 'Порожня. Отже, сила тяжіння тут невелика.' },
  ],
  cat: 'Ньютон спить на подушці біля щита. Його сила тяжіння приблизно 40 Н, а впевненість у собі нескінченна.',
};

// ---------- Зал 2: Двір тарана (П-подібний) ----------
const ramYard = {
  name: 'Двір тарана',
  floor: 'straw',
  intro: 'Загін Ордену розганяє таран. Що більша сила і менша маса, то швидше він набирає швидкість.',
  map: [
    '#########',
    '#########',
    '#.......#',
    '#.......#',
    '#..###..#',
    '#..###..#',
    '#..###..#',
    '#..###..#',
    '#..###..#',
    '#..###..#',
    '#..###..#',
    '#..###..#',
    '#########',
  ],
  entry: [2, 11],
  catSpots: [[1, 9], [7, 4], [6, 11]],
  params(rng) {
    const m = pick(rng, [200, 250, 400, 500]);
    const a = pick(rng, [0.5, 1, 1.5, 2]);
    return { m, a, F: m * a };
  },
  objects: (p) => [
    { id: 'door', kind: 'door', x: 4, y: 1, wall: true, door: 'iron',
      questions: [{
        kind: 'num', unit: 'м/с²', answer: p.a,
        text: 'З яким прискоренням рушить таран?',
        hint: `${F('a = F / m')} = ${p.F} Н / ${p.m} кг`,
      }] },
    { id: 'win', kind: 'decor', sprite: 'window', x: 1, y: 1, wall: true, light: 'cool', title: 'Вікно', text: 'На брамі навпроти видно сліди від тарана.' },
    { id: 't1', kind: 'decor', sprite: 'torch', x: 2, y: 1, wall: true, light: 'torch', title: 'Смолоскип', text: 'Горить рівно.' },
    { id: 'crack', kind: 'crack', x: 3, y: 1, wall: true },
    { id: 'fresco', kind: 'fresco', x: 5, y: 1, wall: true,
      text: `Фреска: воїни штовхають таран, над ними напис: «<b>Силу поділи на масу</b> — і дізнаєшся, як швидко він розганяється».` },
    { id: 't2', kind: 'decor', sprite: 'torch', x: 6, y: 1, wall: true, light: 'torch', title: 'Смолоскип', text: 'Пахне смолою й сіном.' },
    { id: 'ban', kind: 'decor', sprite: 'banner', x: 7, y: 1, wall: true, title: 'Стяг Ордену', text: 'Δv / Δt = F / m. Два девізи Ордену в одному.' },
    { id: 'scroll', kind: 'hint', sprite: 'table_scroll', x: 1, y: 3,
      title: 'Сувій: Другий закон Ньютона',
      text: `Прискорення тіла прямо пропорційне силі й обернено пропорційне масі:<div class="formula">a = F / m</div>або ${F('F = m·a')}.<br>1 Н — сила, що тілу масою 1 кг надає прискорення 1 м/с².` },
    { id: 'dyn', kind: 'hint', sprite: 'dynamometer', x: 7, y: 3,
      title: 'Динамометр з майбутнього',
      text: `Прилад для вимірювання сили. Що більша сила, то сильніше розтягується пружина.<br><span class="dim">Паладини думають, що це дуже точні ваги для риби.</span>` },
    { id: 'ram', kind: 'hint', sprite: 'ram', x: 6, y: 9, w: 2,
      title: 'Таран Ордену',
      text: `Табличка: «Маса тарана <b>${p.m} кг</b>. Загін штовхає його із сумарною силою <b>${p.F} Н</b>. Тертям коліс можна знехтувати.»` },
    { id: 'dummy', kind: 'decor', sprite: 'dummy', x: 1, y: 6, title: 'Опудало', text: 'Тренувальне опудало. Б’єш його із силою F, а воно тебе з такою ж. Третій закон, нічого особистого.' },
    { id: 'h1', kind: 'decor', sprite: 'hay', x: 7, y: 6, title: 'Сіно', text: 'М’яке. Зменшує силу удару, бо подовжує час зупинки.' },
    { id: 'wt', kind: 'decor', sprite: 'weights', x: 1, y: 11, title: 'Гирі', text: 'Для тренувань загону тарана.' },
  ],
  cat: 'Ньютон сидить на тарані. Таран не рушить, доки на нього не подіє сила. Кіт тим паче.',
};

// ---------- Зал 3: Зал канату (Г-подібний) ----------
const ropeHall = {
  name: 'Зал канату',
  floor: 'wood',
  intro: 'Дві команди перетягують канат. Кожна тягне у свій бік, а виграє та, чия сила більша.',
  map: [
    '#########',
    '#########',
    '#.......#',
    '#.......#',
    '#.......#',
    '####....#',
    '   #....#',
    '   #....#',
    '   #....#',
    '   #....#',
    '   #....#',
    '   #....#',
    '   ######',
  ],
  entry: [6, 11],
  catSpots: [[5, 2], [7, 6], [4, 11]],
  params(rng) {
    const F1 = pick(rng, [600, 700, 800, 900]);
    const d = pick(rng, [100, 150, 200, 250]);
    return { F1, F2: F1 - d, R: d };
  },
  objects: (p) => [
    { id: 'door', kind: 'door', x: 2, y: 1, wall: true, door: 'rune',
      questions: [{
        kind: 'num', unit: 'Н', answer: p.R,
        text: 'Яка рівнодійна сил, що діють на канат?',
        hint: `${F('R = F₁ − F₂')} = ${p.F1} − ${p.F2}`,
      }] },
    { id: 't1', kind: 'decor', sprite: 'torch', x: 1, y: 1, wall: true, light: 'torch', title: 'Смолоскип', text: 'Вогонь хитається від криків уболівальників.' },
    { id: 't2', kind: 'decor', sprite: 'torch', x: 3, y: 1, wall: true, light: 'torch', title: 'Смолоскип', text: 'Тут жарко від азарту.' },
    { id: 'ban', kind: 'decor', sprite: 'banner', x: 5, y: 1, wall: true, title: 'Стяг Ордену', text: 'Дія дорівнює протидії. Девіз вишито двічі: з обох боків стягу.' },
    { id: 'fresco', kind: 'fresco', x: 6, y: 1, wall: true,
      text: `Фреска: дві команди і стрілки різної довжини. Підпис: «Сили в різні боки <b>віднімай</b>, в один бік <b>додавай</b>».` },
    { id: 'win', kind: 'decor', sprite: 'window', x: 7, y: 1, wall: true, light: 'cool', title: 'Вікно', text: 'Внизу на подвір’ї ще одна команда тренується.' },
    { id: 'rope', kind: 'hint', sprite: 'rope', x: 1, y: 3, w: 3,
      title: 'Канат',
      text: `Суддя записав на дошці: «Ліва команда тягне з силою <b>${p.F1} Н</b>, права — з силою <b>${p.F2} Н</b>. Канат поки що їде ліворуч.»` },
    { id: 'scroll', kind: 'hint', sprite: 'table_scroll', x: 7, y: 4,
      title: 'Сувій: Рівнодійна',
      text: `<b>Рівнодійна</b> — сила, що замінює дію кількох сил.<br>Сили вздовж однієї прямої в <b>один бік</b>: ${F('R = F₁ + F₂')}.<br>У <b>протилежні</b> боки: ${F('R = F₁ − F₂')}, напрямлена в бік більшої.` },
    { id: 'book', kind: 'hint', sprite: 'lectern', x: 7, y: 8,
      title: 'Книга: Третій закон Ньютона',
      text: `Тіла діють одне на одне із силами, <b>рівними за модулем</b> і протилежними за напрямком:<div class="formula">F₁₂ = −F₂₁</div>Команда тягне канат, а канат тягне команду з такою самою силою.` },
    { id: 'horse', kind: 'decor', sprite: 'horse', x: 4, y: 9, w: 2, title: 'Кінь', text: 'Кінь тягне віз, а віз тягне коня з тією самою силою. Рухаються вони, бо коня штовхає вперед земля: тертя копит.' },
    { id: 'apple', kind: 'decor', sprite: 'apple_tree', x: 7, y: 11, title: 'Яблуня', text: 'Яблуко падає, бо Земля тягне його. А яблуко тягне Землю з такою самою силою! Просто Земля трохи масивніша.' },
  ],
  cat: 'Ньютон уболіває за обидві команди одночасно. Рівнодійна його симпатій дорівнює нулю.',
};

// ---------- Зал 4: Крижаний двір (дві ніші, міфічні двері) ----------
const FRICTION_Q = { text: 'Як напрямлена сила тертя ковзання, що діє на санки?',
  options: ['Проти напрямку руху', 'У напрямку руху', 'Вертикально вгору', 'До центру Землі'], correct: 0 };

const iceYard = {
  name: 'Крижаний двір',
  floor: 'ice',
  intro: 'Тут ковзають санки, а тертя гальмує все, що рухається. У правій ніші світяться <b>міфічні двері</b>: лише одна спроба й лише для сміливих.',
  map: [
    '#########',
    '#########',
    '#...#...#',
    '#...#...#',
    '#...#...#',
    '#...#...#',
    '#.......#',
    '#.......#',
    '#.......#',
    '#.......#',
    '#.......#',
    '#.......#',
    '#########',
  ],
  entry: [4, 11],
  catSpots: [[3, 7], [5, 9], [1, 4]],
  params(rng) {
    const m = pick(rng, [20, 30, 40, 50]);
    const mu = pick(rng, [0.1, 0.2, 0.3]);
    const a = pick(rng, [0.5, 1, 2]);
    const Ftr = Math.round(mu * m * G * 1000) / 1000;
    return { m, mu, a, Ftr, Fm: Math.round((m * a + Ftr) * 1000) / 1000, order: shuffle(rng, [0, 1, 2, 3]) };
  },
  objects: (p) => [
    { id: 'door', kind: 'door', x: 2, y: 1, wall: true, door: 'sage',
      given: [`m = ${p.m} кг`, `μ = ${n(p.mu)}`, 'g = 10 Н/кг'],
      questions: [
        { kind: 'choice', text: FRICTION_Q.text, options: p.order.map((i) => FRICTION_Q.options[i]), correct: p.order.indexOf(0),
          hint: 'Тертя завжди заважає руху.' },
        { kind: 'num', unit: 'Н', answer: p.Ftr, found: 'F<sub>тр</sub>',
          text: 'Яка сила тертя ковзання діє на санки?',
          hint: `${F('Fтр = μ·m·g')} = ${n(p.mu)} · ${p.m} · 10` },
      ] },
    { id: 'mythic', kind: 'mythic', x: 6, y: 1, wall: true, door: 'mythic',
      given: [`m = ${p.m} кг`, `μ = ${n(p.mu)}`, `a = ${n(p.a)} м/с²`, 'g = 10 Н/кг'],
      questions: [{
        kind: 'num', unit: 'Н', answer: p.Fm,
        text: `Яку горизонтальну силу треба прикласти до санок, щоб вони їхали по льоду з прискоренням <b>${n(p.a)} м/с²</b>?`,
        hint: `${F('F = m·a + μ·m·g')} = ${p.m} · ${n(p.a)} + ${n(p.mu)} · ${p.m} · 10`,
      }] },
    { id: 't1', kind: 'decor', sprite: 'torch', x: 1, y: 1, wall: true, light: 'torch', title: 'Смолоскип', text: 'Від тепла лід поруч підтанув.' },
    { id: 't2', kind: 'decor', sprite: 'torch', x: 3, y: 1, wall: true, light: 'torch', title: 'Смолоскип', text: 'Єдине тепле місце на дворі.' },
    { id: 't3', kind: 'decor', sprite: 'torch', x: 5, y: 1, wall: true, light: 'torch', title: 'Смолоскип', text: 'Вогонь тут має фіолетовий відблиск.' },
    { id: 't4', kind: 'decor', sprite: 'torch', x: 7, y: 1, wall: true, light: 'torch', title: 'Смолоскип', text: 'Охороняє міфічні двері.' },
    { id: 'fresco', kind: 'fresco', x: 4, y: 5, wall: true,
      text: `Фреска: санки на льоду і напис: «Тертя = <b>μ · m · g</b>. Хто хоче розігнатися, мусить перемогти тертя й ще трохи».` },
    { id: 'sled', kind: 'hint', sprite: 'sled', x: 2, y: 8,
      title: 'Санки з дровами',
      text: `Бирка на санках: «Маса з дровами <b>${p.m} кг</b>. Коефіцієнт тертя полозів по льоду <b>μ = ${n(p.mu)}</b>.»` },
    { id: 'scroll', kind: 'hint', sprite: 'table_scroll', x: 7, y: 8,
      title: 'Сувій: Сила тертя',
      text: `Сила тертя ковзання:<div class="formula">F<sub>тр</sub> = μ · N</div>На горизонтальній поверхні сила реакції опори ${F('N = m·g')}.<br>μ — коефіцієнт тертя, він без одиниць. Тертя завжди напрямлене <b>проти руху</b>.` },
    { id: 'notes', kind: 'hint', sprite: 'lectern', x: 7, y: 3,
      title: 'Записник майстра',
      text: `«Для сміливих. Якщо тіло <b>розганяється</b>, сила тяги має подолати тертя і ще надати прискорення:<div class="formula">F − F<sub>тр</sub> = m · a</div>Міфічні двері не прощають поспіху.»` },
    { id: 'br', kind: 'decor', sprite: 'brazier', x: 6, y: 7, light: 'forge', title: 'Жаровня', text: 'Біля жаровні лід тане, і тертя стає ще меншим. Мокрий лід — найслизькіший.' },
    { id: 'snow1', kind: 'decor', sprite: 'snow', x: 1, y: 11, title: 'Замет', text: 'По снігу санки їдуть гірше, ніж по льоду: тертя більше.' },
    { id: 'snow2', kind: 'decor', sprite: 'snow', x: 7, y: 11, title: 'Замет', text: 'Тут хтось ліпив сніговика і передумав.' },
    { id: 'ice', kind: 'decor', sprite: 'ice_crystal', x: 1, y: 6, title: 'Крижаний кристал', text: 'Гладенький. μ майже нуль. Не стій на ньому.' },
  ],
  cat: 'Ньютон не виходить на лід. Він знає про коефіцієнт тертя більше, ніж здається.',
};

// ---------- Зал 5: Зала Ньютона (перевернута Т) ----------
const newtonHall = {
  name: 'Зала Ньютона',
  floor: 'stone',
  intro: 'Печать Ньютона: три випробування з одним королівським возом. Дані будуть перед очима на кожному кроці.',
  map: [
    '#########',
    '#########',
    '#..===..#',
    '#..===..#',
    '#..===..#',
    '#..===..#',
    '#..===..#',
    '#..===..#',
    '#..===..#',
    '###===###',
    '  #===#  ',
    '  #===#  ',
    '  #####  ',
  ],
  entry: [4, 11],
  catSpots: [[2, 5], [6, 4], [5, 10]],
  params(rng) {
    const m = pick(rng, [100, 200, 250, 400]);
    const mu = pick(rng, [0.1, 0.2]);
    const a = pick(rng, [0.5, 1, 1.5, 2]);
    const Fg = m * G, Ftr = Math.round(mu * Fg * 1000) / 1000;
    return { m, mu, a, Fg, Ftr, F: Math.round((m * a + Ftr) * 1000) / 1000 };
  },
  objects: (p) => [
    { id: 'door', kind: 'door', x: 3, y: 1, w: 3, wall: true, door: 'newton',
      given: [`m = ${p.m} кг`, `F = ${n(p.F)} Н`, `μ = ${n(p.mu)}`, 'g = 10 Н/кг'],
      questions: [
        { kind: 'num', unit: 'Н', answer: p.Fg, found: 'F<sub>т</sub>',
          text: `Королівський віз масою <b>${p.m} кг</b>. Яка сила тяжіння діє на нього?`,
          hint: `${F('Fт = m·g')} = ${p.m} · 10` },
        { kind: 'num', unit: 'Н', answer: p.Ftr, found: 'F<sub>тр</sub>',
          text: `Коефіцієнт тертя коліс об підлогу <b>μ = ${n(p.mu)}</b>. Яка сила тертя діє на віз?`,
          hint: `${F('Fтр = μ·m·g')} = ${n(p.mu)} · ${p.Fg}` },
        { kind: 'num', unit: 'м/с²', answer: p.a, found: 'a',
          text: `Коні тягнуть віз із силою <b>${n(p.F)} Н</b>. З яким прискоренням він рушить?`,
          hint: `${F('a = (F − Fтр) / m')} = (${n(p.F)} − ${n(p.Ftr)}) / ${p.m}` },
      ] },
    { id: 'fresco', kind: 'fresco', x: 1, y: 1, wall: true,
      text: `Фреска з трьома сувоями: «${F('Fт = m·g')}», «${F('Fтр = μ·m·g')}», «${F('a = (F − Fтр) / m')}». Під ними: «Від сили тяги віднімай тертя».` },
    { id: 'ban1', kind: 'decor', sprite: 'banner', x: 2, y: 1, wall: true, title: 'Стяг Ордену', text: 'Три закони, три стяги, одна печать.' },
    { id: 'ban2', kind: 'decor', sprite: 'banner', x: 6, y: 1, wall: true, title: 'Стяг Ордену', text: 'На звороті вишито яблуко.' },
    { id: 'sg', kind: 'decor', sprite: 'stained', x: 7, y: 1, wall: true, light: 'cool', title: 'Вітраж', text: 'На вітражі Ньютон розкладає світло на кольори. Це вже інша його історія.' },
    { id: 'statue', kind: 'hint', sprite: 'newton', x: 1, y: 3,
      title: 'Статуя Ісаака Ньютона',
      text: `Три закони на постаменті:<br><b>I.</b> Без дії сил тіло зберігає швидкість (або спокій).<br><b>II.</b> ${F('F = m·a')}<br><b>III.</b> Дія дорівнює протидії.<br><span class="dim">У руці статуя тримає яблуко. Кажуть, справжнє.</span>` },
    { id: 'chron', kind: 'hint', sprite: 'chronicle', x: 7, y: 3,
      title: 'Хроніка Ордену',
      text: `«Віз рушає, коли тяга перемагає тертя. Те, що лишається від сили тяги, розганяє віз:<div class="formula">a = (F − F<sub>тр</sub>) / m</div>А тертя рахуй як ${F('Fтр = μ·m·g')}.»` },
    { id: 'wagon', kind: 'hint', sprite: 'wagon', x: 6, y: 6, w: 2,
      title: 'Королівський віз',
      text: `Табличка: «Маса <b>${p.m} кг</b>. Коні тягнуть із силою <b>${n(p.F)} Н</b>. Коефіцієнт тертя <b>μ = ${n(p.mu)}</b>.»` },
    { id: 'apple', kind: 'decor', sprite: 'apple_tree', x: 1, y: 7, title: 'Яблуня Ньютона', text: 'Те саме дерево? Ніхто не знає. Але яблука падають рівноприскорено, з a ≈ 10 м/с².' },
    { id: 'br1', kind: 'decor', sprite: 'brazier', x: 2, y: 8, light: 'forge', title: 'Жаровня', text: 'Тепло. Печать уже близько.' },
    { id: 'br2', kind: 'decor', sprite: 'brazier', x: 6, y: 8, light: 'forge', title: 'Жаровня', text: 'Вогонь Ордену не гасне.' },
  ],
  cat: 'Ньютон сидить біля статуї свого тезки й робить вигляд, що це його портрет.',
};

export const LEVEL2 = {
  id: 2,
  title: 'Динаміка',
  subtitle: 'Сила · Маса · Закони Ньютона',
  desc: 'П’ять залів неправильної форми: від сили тяжіння до печаті Ньютона. Десь сховано міфічні двері.',
  rooms: [arsenal, ramYard, ropeHall, iceYard, newtonHall],
  bonus: {
    rare: ['shield', 'scroll', 'hourglass'],
    legendary: ['boots', 'chronos', 'key'],
    weights: { key: 0.4 },
    legendaryChance: 0.22,
  },
  win: { title: 'Печать Ньютона зламано!', text: 'Орден Дельти визнає тебе майстром сили.' },
};
