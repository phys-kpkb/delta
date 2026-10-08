// Рівні й кімнати. Числа в задачах генеруються з «зерна» забігу,
// тож у кожного гравця свої значення, а підказки в кімнаті з ними збігаються.

export const DOOR_TYPES = {
  oak: {
    name: 'Дубові двері', sprite: 'door_oak', penalty: 30, key: true,
    rules: ['Кожна помилка: +30 с до часу', 'Ключ відчиняє без відповіді'],
  },
  iron: {
    name: 'Залізні ґрати', sprite: 'door_iron', penalty: 0, key: false,
    rules: ['Відчиняються тільки правильною відповіддю', 'Помилки без штрафу, але ключ тут безсилий'],
  },
  rune: {
    name: 'Двері терпіння', sprite: 'door_rune', penalty: 20, key: true, giveUp: 3, giveUpPenalty: 60,
    rules: ['Кожна помилка: +20 с', 'Після 3 помилок можна пройти, заплативши +60 с', 'Ключ відчиняє без відповіді'],
  },
  sage: {
    name: 'Двері мудреця', sprite: 'door_sage', penalty: 30, key: false, skipSecond: true,
    rules: ['Мудрець ставить 2 питання, кожна помилка: +30 с', 'Відповіси на перше з першої спроби, і друге він пропустить', 'Ключ не діє: мудреця не обдуриш'],
  },
  seal: {
    name: 'Печать Паладина', sprite: 'seal', penalty: 30, key: false,
    rules: ['Фінал: 3 випробування поспіль', 'Кожна помилка: +30 с', 'Ні ключі, ні хитрощі тут не працюють'],
  },
};

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const shuffle = (rng, arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const n = (x) => String(x).replace('.', ',');

const F = (s) => `<span class="f">${s}</span>`;

const GRAPH_WORDS = {
  up: 'розганяється (рівноприскорено)',
  down: 'гальмує',
  flat: 'рухається рівномірно',
  zero: 'стоїть на місці',
};

// ---------------- Рівень 1 ----------------

const room1 = {
  name: 'Вартова брама',
  floor: 'stone',
  intro: 'Варта Ордену Дельти зустрічає новачків. Гонець щойно приніс донесення. Дізнайся, як швидко він біг.',
  map: [
    '#########',
    '#########',
    '#.......#',
    '#..===..#',
    '#..===..#',
    '#..===..#',
    '#..===..#',
    '#..===..#',
    '#..===..#',
    '#..===..#',
    '#..===..#',
    '#.......#',
    '#########',
  ],
  entry: [4, 11],
  catSpots: [[6, 9], [2, 6], [6, 3]],
  params(rng) {
    const t = pick(rng, [4, 5, 6, 8, 10]);
    const v = pick(rng, [5, 6, 7, 8, 9, 12]);
    return { t, v, s: v * t };
  },
  objects: (p) => [
    { id: 'door', kind: 'door', x: 4, y: 1, wall: true, door: 'oak',
      questions: [{
        kind: 'num', unit: 'м/с', answer: p.v,
        text: `Гонець біг рівномірно. З якою швидкістю він біг?`,
        hint: `${F('v = s / t')} = ${p.s} м / ${p.t} с`,
      }] },
    { id: 'win', kind: 'decor', sprite: 'window', x: 1, y: 1, wall: true, light: 'cool',
      title: 'Бійниця', text: 'Вузьке вікно. Звідси вартові рахують, скільки секунд скаче гонець від вежі.' },
    { id: 'board', kind: 'hint', sprite: 'noticeboard', x: 2, y: 1, wall: true,
      title: 'Донесення варти',
      text: `«Гонець пробіг від сторожової вежі до брами <b>${p.s} м</b> за <b>${p.t} с</b>. Біг рівно, не зупинявся.»<br><span class="dim">— Сержант варти</span>` },
    { id: 't1', kind: 'decor', sprite: 'torch', x: 3, y: 1, wall: true, light: 'torch',
      title: 'Смолоскип', text: 'Горить рівно і спокійно, як рівномірний рух.' },
    { id: 't2', kind: 'decor', sprite: 'torch', x: 5, y: 1, wall: true, light: 'torch',
      title: 'Смолоскип', text: 'Полум\'я тягнеться вгору. Гаряче повітря легше за холодне, але це вже інша історія.' },
    { id: 'ban', kind: 'decor', sprite: 'banner', x: 6, y: 1, wall: true,
      title: 'Стяг Ордену', text: `Знак Ордену — грецька літера Δ («дельта»). У фізиці вона означає <b>зміну</b>: ${F('Δt')} — проміжок часу, ${F('Δv')} — зміна швидкості.` },
    { id: 'fresco', kind: 'fresco', x: 7, y: 1, wall: true,
      text: `На фресці гонець біжить повз стовпчики-відмітки, а внизу напис: «Швидкість — це шлях, поділений на час. <b>Метри ділимо на секунди</b>».` },
    { id: 'scroll', kind: 'hint', sprite: 'table_scroll', x: 1, y: 3,
      title: 'Сувій варти: Швидкість',
      text: `<b>Швидкість</b> показує, який шлях тіло проходить за одиницю часу.<div class="formula">v = s / t</div>v — швидкість (м/с), s — шлях (м), t — час (с).<br>Якщо швидкість не змінюється, рух називають <b>рівномірним</b>.` },
    { id: 'hg', kind: 'hint', sprite: 'hourglass', x: 7, y: 4,
      title: 'Пісочний годинник',
      text: `Час у фізиці вимірюють у <b>секундах</b> (с), шлях у <b>метрах</b> (м).<br>1 хв = 60 с, 1 год = 3600 с.<br>Отже, швидкість у системі СІ вимірюють у ${F('м/с')}.` },
    { id: 'rack', kind: 'decor', sprite: 'rack', x: 1, y: 7,
      title: 'Стійка зі списами', text: 'Спис, кинутий вперед, летить по дузі. Але це тема наступних рівнів.' },
    { id: 'armor', kind: 'decor', sprite: 'armor', x: 7, y: 8,
      title: 'Обладунок паладина', text: 'Порожній. На нагруднику викарбувано Δ. Може, колись він стане твоїм.' },
    { id: 'b1', kind: 'decor', sprite: 'barrel', x: 1, y: 10, title: 'Бочка', text: 'Пахне яблуками. Ньютон би оцінив.' },
    { id: 'c1', kind: 'decor', sprite: 'crate', x: 7, y: 11, title: 'Ящик', text: 'Підписано: «Гирі. Обережно, мають масу».' },
  ],
  cat: 'Кіт Ньютон спить. Його швидкість 0 м/с. Це теж рівномірний рух, просто дуже спокійний.',
};

const room2 = {
  name: 'Стайня',
  floor: 'straw',
  intro: 'Бойовий кінь Буцефал б\'є копитом. Залізні ґрати відчиняться лише перед тим, хто назве його швидкість у м/с.',
  map: [
    '#########',
    '#########',
    '#.......#',
    '#.......#',
    '#.......#',
    '#.......#',
    '#.......#',
    '#.......#',
    '#.......#',
    '#.......#',
    '#.......#',
    '#.......#',
    '#########',
  ],
  entry: [4, 11],
  catSpots: [[4, 8], [3, 10], [6, 4]],
  params(rng) {
    const kmh = pick(rng, [18, 36, 54, 72]);
    return { kmh, ms: kmh / 3.6, ex: kmh === 36 ? [72, 20] : [36, 10] };
  },
  objects: (p) => [
    { id: 'door', kind: 'door', x: 4, y: 1, wall: true, door: 'iron',
      questions: [{
        kind: 'num', unit: 'м/с', answer: p.ms,
        text: `Яка максимальна швидкість Буцефала в м/с?`,
        hint: `${p.kmh} км/год = ${p.kmh} · 1000 м / 3600 с = ${p.kmh} / 3,6 м/с`,
      }] },
    { id: 'win', kind: 'decor', sprite: 'window', x: 1, y: 1, wall: true, light: 'cool',
      title: 'Вікно', text: 'Крізь вікно видно поле для перегонів. Там хтось розставив стовпчики через кожні 100 м.' },
    { id: 'shoe', kind: 'decor', sprite: 'horseshoe', x: 2, y: 1, wall: true,
      title: 'Підкова', text: 'Висить на щастя. Фізики в цьому немає, але хай буде.' },
    { id: 't1', kind: 'decor', sprite: 'torch', x: 3, y: 1, wall: true, light: 'torch', title: 'Смолоскип', text: 'Обережно, тут сіно.' },
    { id: 't2', kind: 'decor', sprite: 'torch', x: 5, y: 1, wall: true, light: 'torch', title: 'Смолоскип', text: 'Обережно, тут сіно. Двічі обережно.' },
    { id: 'crack', kind: 'crack', x: 6, y: 1, wall: true },
    { id: 'fresco', kind: 'fresco', x: 7, y: 1, wall: true,
      text: `Фреска: вершник, а поруч табличка «<b>÷ 3,6</b>». Хтось дописав вугіллям: «з км/год у м/с — ділимо, назад — множимо».` },
    { id: 'horse', kind: 'hint', sprite: 'horse', x: 1, y: 3, w: 2,
      title: 'Буцефал',
      text: `Табличка на стійлі: «Бойовий кінь <b>Буцефал</b>. На галопі розганяється до <b>${p.kmh} км/год</b>. Не годувати після заходу сонця.»` },
    { id: 'f1', kind: 'decor', sprite: 'fence', x: 1, y: 4, title: 'Загорожа', text: 'Буцефал і не думає тікати. Він чекає на свою відповідь.' },
    { id: 'f2', kind: 'decor', sprite: 'fence', x: 2, y: 4, title: 'Загорожа', text: 'Старі дошки. Скриплять.' },
    { id: 'scroll', kind: 'hint', sprite: 'table_scroll', x: 7, y: 3,
      title: 'Сувій конюха: одиниці',
      text: `1 км = 1000 м, 1 год = 3600 с.<div class="formula">1 км/год = 1000 м / 3600 с = 1/3,6 м/с</div>Щоб перевести <b>км/год → м/с</b>, ділимо на 3,6.<br>Щоб перевести <b>м/с → км/год</b>, множимо на 3,6.` },
    { id: 'speedo', kind: 'hint', sprite: 'speedometer', x: 6, y: 7,
      title: 'Дивний прилад з майбутнього',
      text: `Скляний циферблат зі стрілкою. Шкала в км/год. Хтось нашкрябав збоку: «<b>${p.ex[0]} км/год = ${p.ex[1]} м/с</b>, перевірено!»<br><span class="dim">Ти впізнаєш спідометр. Паладини досі сперечаються, що це таке.</span>` },
    { id: 'tr', kind: 'decor', sprite: 'trough', x: 1, y: 7, title: 'Корито', text: 'Вода стоїть спокійно. Її середня швидкість дорівнює нулю.' },
    { id: 'h1', kind: 'decor', sprite: 'hay', x: 1, y: 10, title: 'Сіно', text: 'Кінь з\'їдає близько 10 кг сіна на день. Не відволікайся.' },
    { id: 'h2', kind: 'decor', sprite: 'hay', x: 2, y: 11, title: 'Сіно', text: 'М\'яке. Можна було б поспати, але таймер іде.' },
    { id: 'h3', kind: 'decor', sprite: 'hay', x: 1, y: 11, title: 'Сіно', text: 'Тут хтось загубив голку. Шукати не будемо.' },
    { id: 'bk', kind: 'decor', sprite: 'bucket', x: 7, y: 10, title: 'Відро', text: 'Порожнє відро. Звук від нього гучніший, ніж від повного.' },
  ],
  cat: 'Ньютон уважно дивиться на коня. Здається, кіт вважає, що галоп — це занадто швидко.',
};

const room3 = {
  name: 'Кузня',
  floor: 'stone',
  intro: 'Тут гартують сталь і розганяють вагонетки з рудою. Двері терпіння пропустять навіть того, хто помиляється, але за це доведеться заплатити часом.',
  map: [
    '#########',
    '#########',
    '#.......#',
    '#.......#',
    '#.......#',
    '#.......#',
    '#.......#',
    '#.......#',
    '#_______#',
    '#.......#',
    '#.......#',
    '#.......#',
    '#########',
  ],
  entry: [4, 11],
  catSpots: [[3, 3], [2, 10], [6, 6]],
  params(rng) {
    const v0 = pick(rng, [0, 2, 3, 4]);
    const t = pick(rng, [2, 4, 5]);
    const a = pick(rng, [2, 3, 4]);
    return { v0, t, a, v: v0 + a * t };
  },
  objects: (p) => [
    { id: 'door', kind: 'door', x: 4, y: 1, wall: true, door: 'rune',
      questions: [{
        kind: 'num', unit: 'м/с²', answer: p.a,
        text: `З яким прискоренням розганялася вагонетка?`,
        hint: `${F('a = (v − v₀) / t')} = (${p.v} − ${p.v0}) / ${p.t}`,
      }] },
    { id: 'tools', kind: 'decor', sprite: 'tools', x: 1, y: 1, wall: true,
      title: 'Інструменти коваля', text: 'Молот, кліщі, зубило. Молот важкий: щоб його розігнати, треба силу. Але це вже другий рівень.' },
    { id: 't1', kind: 'decor', sprite: 'torch', x: 6, y: 1, wall: true, light: 'torch', title: 'Смолоскип', text: 'Тут і без нього спекотно.' },
    { id: 'notes', kind: 'hint', sprite: 'noticeboard', x: 3, y: 1, wall: true,
      title: 'Записи коваля',
      text: `«Якщо вагонетка щосекунди додає однакову швидкість, то це <b>рівноприскорений рух</b>.<br>Розганялася з 2 м/с до 8 м/с за 3 с, тобто додавала по 2 м/с щосекунди. Отже, a = 2 м/с².»` },
    { id: 'ban', kind: 'decor', sprite: 'banner', x: 5, y: 1, wall: true, title: 'Стяг Ордену', text: 'Δ на стягу трохи закіптявів.' },
    { id: 'fresco', kind: 'fresco', x: 7, y: 1, wall: true,
      text: `Фреска: коваль б'є молотом, над ним напис: «<b>Від кінцевої швидкості відніми початкову і поділи на час.</b> Що вийшло, те й прискорення».` },
    { id: 'furn', kind: 'decor', sprite: 'furnace', x: 1, y: 2, w: 2, light: 'forge',
      title: 'Горно', text: 'Жар такий, що повітря тремтить. Сталь тут нагрівають до 1200 °C.' },
    { id: 'anvil', kind: 'decor', sprite: 'anvil', x: 4, y: 4,
      title: 'Ковадло', text: 'Нерухоме й надійне: v = 0, a = 0. Можна позаздрити такій стабільності.' },
    { id: 'b1', kind: 'decor', sprite: 'barrel', x: 1, y: 5, title: 'Бочка для гартування', text: 'Вода, у якій гартують клинки. Ш-ш-ш!' },
    { id: 'coal', kind: 'decor', sprite: 'coal', x: 2, y: 5, title: 'Вугілля', text: 'Чорне золото кузні.' },
    { id: 'scroll', kind: 'hint', sprite: 'table_scroll', x: 7, y: 3,
      title: 'Сувій: Прискорення',
      text: `<b>Прискорення</b> показує, наскільки змінюється швидкість за кожну секунду.<div class="formula">a = (v − v₀) / t</div>v₀ — початкова швидкість, v — кінцева, t — час.<br>Одиниця: ${F('м/с²')} (метр на секунду в квадраті).` },
    { id: 'cart', kind: 'hint', sprite: 'minecart', x: 5, y: 8,
      title: 'Журнал вагонетки',
      text: `На боці вагонетки крейдою: «Початкова швидкість <b>${p.v0} м/с</b>. Розганялася рівноприскорено, через <b>${p.t} с</b> мала <b>${p.v} м/с</b>.»` },
    { id: 'c1', kind: 'decor', sprite: 'crate', x: 7, y: 10, title: 'Ящик з рудою', text: 'Важкий. Дуже. Не штовхай.' },
    { id: 'c2', kind: 'decor', sprite: 'crate', x: 7, y: 11, title: 'Ящик з цвяхами', text: 'Столяр би зрадів.' },
  ],
  cat: 'Ньютон гріється біля горна. Прискорення нуль, задоволення максимальне.',
};

const room4 = {
  name: 'Бібліотека',
  floor: 'wood',
  intro: 'Мудрець Ордену читає рух за графіками. На дошці намальовано графік швидкості. Придивись до нього уважно.',
  map: [
    '#########',
    '#########',
    '#.......#',
    '#.......#',
    '#.......#',
    '#..===..#',
    '#..===..#',
    '#..===..#',
    '#..===..#',
    '#..===..#',
    '#.......#',
    '#.......#',
    '#########',
  ],
  entry: [4, 11],
  catSpots: [[4, 7], [5, 5], [3, 9]],
  params(rng) {
    const v0 = pick(rng, [0, 2, 4]);
    const v1 = pick(rng, [8, 10, 12]);
    const t = pick(rng, [4, 5, 6, 10]);
    const ask = pick(rng, ['up', 'down', 'flat', 'zero']);
    const order = shuffle(rng, ['up', 'down', 'flat', 'zero']);
    return { v0, v1, t, s: (v0 + v1) / 2 * t, ask, order };
  },
  objects: (p) => [
    { id: 'door', kind: 'door', x: 4, y: 1, wall: true, door: 'sage',
      questions: [
        { kind: 'graph', text: `На якому графіку v(t) тіло <b>${GRAPH_WORDS[p.ask]}</b>?`,
          options: p.order, correct: p.order.indexOf(p.ask),
          hint: `Горизонталь — рівномірно; вгору — розгін; вниз — гальмування; на нулі — стоїть.` },
        { kind: 'num', unit: 'м', answer: p.s,
          text: `Який шлях пройшло тіло за графіком на дошці?`,
          hint: `${F('s = (v₀ + v) / 2 · t')} = (${p.v0} + ${p.v1}) / 2 · ${p.t}` },
      ] },
    { id: 'win', kind: 'decor', sprite: 'window', x: 1, y: 1, wall: true, light: 'cool',
      title: 'Вікно', text: 'Світло падає на сторінки. Мудрець каже, що світло теж має швидкість. Дуже велику.' },
    { id: 'board', kind: 'hint', sprite: 'chalkboard', x: 2, y: 1, w: 2, wall: true, graph: true,
      title: 'Графік на дошці',
      text: `Мудрець накреслив, як змінювалася швидкість тіла:<div class="graph-slot"></div>Початкова швидкість <b>${p.v0} м/с</b>, через <b>${p.t} с</b> вона стала <b>${p.v1} м/с</b>.` },
    { id: 't1', kind: 'decor', sprite: 'torch', x: 5, y: 1, wall: true, light: 'torch', title: 'Смолоскип', text: 'Біля книжок? Сміливо.' },
    { id: 'crack', kind: 'crack', x: 6, y: 1, wall: true },
    { id: 'fresco', kind: 'fresco', x: 7, y: 1, wall: true,
      text: `Фреска з мудрецем: «Графік — це картина руху. <b>Шлях дорівнює площі під лінією</b>. Трапецію рахуй як середню швидкість, помножену на час: (v₀ + v)/2 · t».` },
    { id: 'lect', kind: 'hint', sprite: 'lectern', x: 2, y: 4,
      title: 'Книга «Як читати графіки»',
      text: `На графіку <b>v(t)</b> по горизонталі відкладено час, по вертикалі швидкість.<br>— <b>горизонтальна лінія</b>: рівномірний рух;<br>— <b>лінія вгору</b>: тіло розганяється;<br>— <b>лінія вниз</b>: тіло гальмує;<br>— <b>лінія на нулі</b>: тіло стоїть.` },
    { id: 'book', kind: 'hint', sprite: 'table_book', x: 6, y: 5,
      title: 'Книга «Площа під графіком»',
      text: `Шлях дорівнює <b>площі фігури під графіком v(t)</b>.<br>Прямокутник: ${F('s = v · t')}<br>Трикутник: ${F('s = v · t / 2')}<br>Трапеція: ${F('s = (v₀ + v) / 2 · t')}` },
    { id: 'sh1', kind: 'decor', sprite: 'bookshelf', x: 1, y: 7, title: 'Полиця', text: '«Начала» Евкліда, «Діалоги» Галілея і чомусь кулінарна книга.' },
    { id: 'sh2', kind: 'decor', sprite: 'bookshelf', x: 1, y: 8, title: 'Полиця', text: 'Книжки стоять нерухомо. Відносно полиці, звісно.' },
    { id: 'globe', kind: 'decor', sprite: 'globe', x: 7, y: 8, title: 'Глобус', text: 'Земля обертається, тож навіть «нерухомий» ти мчиш зі швидкістю сотні метрів за секунду. Відносно її осі.' },
    { id: 'tel', kind: 'decor', sprite: 'telescope', x: 6, y: 10, title: 'Підзорна труба', text: 'Галілей першим почав вимірювати рух, а не просто сперечатися про нього.' },
    { id: 'cand', kind: 'decor', sprite: 'candles', x: 2, y: 10, light: 'candle', title: 'Свічник', text: 'Три свічки, три вогники.' },
  ],
  cat: 'Ньютон спить на підручнику з механіки. Кажуть, так знання передаються осмосом.',
};

const CONCEPT = [
  { text: 'Тіло рухається рівномірно і прямолінійно. Чому дорівнює його прискорення?',
    options: ['Нулю', 'Сталому ненульовому значенню', 'Воно весь час зростає', 'Залежить від маси тіла'], correct: 0 },
  { text: 'У яких одиницях СІ вимірюють прискорення?',
    options: ['м/с²', 'м/с', 'км/год', 'с/м'], correct: 0 },
  { text: 'Що показує спідометр автомобіля?',
    options: ['Миттєву швидкість', 'Середню швидкість за поїздку', 'Прискорення', 'Пройдений шлях'], correct: 0 },
  { text: 'Автомобіль гальмує. Як напрямлене його прискорення?',
    options: ['Проти напрямку руху', 'За напрямком руху', 'Вертикально вгору', 'Прискорення немає'], correct: 0 },
];

const room5 = {
  name: 'Тронна зала',
  floor: 'stone',
  intro: 'Печать Паладина — останнє випробування Ордену. Колісниці Паладина завжди рушають з місця.',
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
    '#..===..#',
    '#..===..#',
    '#..===..#',
    '#########',
  ],
  entry: [4, 11],
  catSpots: [[2, 6], [6, 6], [5, 9]],
  params(rng) {
    const a = pick(rng, [2, 3, 4, 5]);
    const t = pick(rng, [4, 6, 8, 10]);
    const ci = Math.floor(rng() * CONCEPT.length);
    const order = shuffle(rng, [0, 1, 2, 3]);
    return { a, t, v: a * t, s: a * t * t / 2, ci, order };
  },
  objects: (p) => {
    const c = CONCEPT[p.ci];
    return [
      { id: 'door', kind: 'door', x: 3, y: 1, w: 3, wall: true, door: 'seal',
        questions: [
          { kind: 'num', unit: 'м/с', answer: p.v,
            text: `Колісниця рушає з місця з прискоренням <b>${p.a} м/с²</b>. Яку швидкість вона матиме через <b>${p.t} с</b>?`,
            hint: `${F('v = v₀ + a·t')} = 0 + ${p.a} · ${p.t}` },
          { kind: 'num', unit: 'м', answer: p.s,
            text: `Який шлях пройде ця колісниця за ці <b>${p.t} с</b>?`,
            hint: `${F('s = a·t² / 2')} = ${p.a} · ${p.t}² / 2` },
          { kind: 'choice', text: c.text, options: p.order.map((i) => c.options[i]), correct: p.order.indexOf(c.correct),
            hint: 'Згадай означення з першої кімнати та бібліотеки.' },
        ] },
      { id: 'fresco', kind: 'fresco', x: 1, y: 1, wall: true,
        text: `Фреска: колісниця, а над нею три підписи: «${F('v = a·t')}», «${F('s = a·t²/2')}», «рівномірний рух: прискорення дорівнює нулю».` },
      { id: 'ban1', kind: 'decor', sprite: 'banner', x: 2, y: 1, wall: true, title: 'Стяг Ордену', text: 'Δv / Δt = a. Девіз Ордену вишито золотом.' },
      { id: 'ban2', kind: 'decor', sprite: 'banner', x: 6, y: 1, wall: true, title: 'Стяг Ордену', text: 'На звороті хтось вишив маленького кота.' },
      { id: 'sg', kind: 'decor', sprite: 'stained', x: 7, y: 1, wall: true, light: 'cool',
        title: 'Вітраж', text: 'Світло проходить крізь кольорове скло. Біле світло насправді складається з усіх кольорів. Це теж колись буде на рівні.' },
      { id: 'statue', kind: 'hint', sprite: 'statue', x: 1, y: 4,
        title: 'Статуя Першого Паладина',
        text: `На постаменті викарбувано закони рівноприскореного руху:<div class="formula">v = v₀ + a·t</div><div class="formula">s = v₀·t + a·t² / 2</div>«Хто рушає з місця, той має v₀ = 0»` },
      { id: 'chron', kind: 'hint', sprite: 'chronicle', x: 7, y: 4,
        title: 'Хроніка Ордену',
        text: `«Колісниці Паладина рушають <b>з місця</b> (v₀ = 0). Тоді все простіше:<div class="formula">v = a·t &nbsp;&nbsp; s = a·t² / 2</div>Не забувай: у квадрат підноситься лише час!»` },
      { id: 'incl', kind: 'hint', sprite: 'incline', x: 7, y: 9,
        title: 'Жолоб Галілея',
        text: `Кулька скочується похилим жолобом рівноприскорено. Галілей помітив, що за 1 с вона проходить 1 відрізок, за 2 с уже 4, за 3 с аж 9.<br><b>Шлях росте як квадрат часу: s ~ t²</b>.` },
      { id: 'p1', kind: 'decor', sprite: 'pillar', x: 1, y: 8, title: 'Колона', text: 'Стоїть тут уже 800 років. Рекорд рівномірного спокою.' },
      { id: 'br1', kind: 'decor', sprite: 'brazier', x: 2, y: 10, light: 'forge', title: 'Жаровня', text: 'Вогонь Ордену ніколи не гасне. Принаймні так кажуть.' },
      { id: 'br2', kind: 'decor', sprite: 'brazier', x: 6, y: 10, light: 'forge', title: 'Жаровня', text: 'Тепло. Ти майже біля мети.' },
    ];
  },
  cat: 'Ньютон сидить біля печаті й дивиться на тебе. Він вірить у тебе. Мабуть.',
};

export const LEVELS = [
  {
    id: 1,
    title: 'Механіка',
    subtitle: 'Рух · Швидкість · Прискорення',
    desc: 'П\'ять залів замку Ордену Дельти: від швидкості гінця до печаті Паладина.',
    rooms: [room1, room2, room3, room4, room5],
  },
  { id: 2, title: 'Динаміка', subtitle: 'Сила · Маса · Закони Ньютона', locked: true },
  { id: 3, title: 'Енергія', subtitle: 'Робота · Потужність · Енергія', locked: true },
];

export const BONUSES = {
  key: { name: 'Ключ', icon: 'key', text: 'Відчиняє дубові двері або двері терпіння без відповіді.' },
  shield: { name: 'Щит паладина', icon: 'shield', text: 'Наступна помилка не додасть штрафу.' },
  scroll: { name: 'Сувій мудреця', icon: 'scroll', text: 'На будь-яких дверях покаже, як рахувати відповідь (з твоїми числами).' },
  hourglass: { name: 'Пісочний годинник', icon: 'hourglass', text: 'Одразу −20 с від твого часу.' },
  boots: { name: 'Чоботи-скороходи', icon: 'boots', text: 'Ходиш удвічі швидше до кінця рівня.' },
};

export function graphSVG(type, opts = {}) {
  const w = opts.w || 120, h = opts.h || 84;
  const pad = 14;
  const x0 = pad, y0 = h - pad, x1 = w - 8, y1 = 8;
  let line;
  const lo = y0 - 4, mid = (y0 + y1) / 2, hi = y1 + 6;
  if (type === 'up') line = `M${x0} ${lo - 10} L${x1 - 6} ${hi}`;
  else if (type === 'down') line = `M${x0} ${hi} L${x1 - 6} ${lo - 10}`;
  else if (type === 'flat') line = `M${x0} ${mid} L${x1 - 6} ${mid}`;
  else if (type === 'zero') line = `M${x0} ${y0 - 1} L${x1 - 6} ${y0 - 1}`;
  return `<svg viewBox="0 0 ${w} ${h}" class="gsvg" aria-hidden="true">
    <path d="M${x0} ${y1} L${x0} ${y0} L${x1} ${y0}" fill="none" stroke="currentColor" stroke-opacity=".55" stroke-width="1.5"/>
    <path d="M${x0 - 3} ${y1 + 4} L${x0} ${y1} L${x0 + 3} ${y1 + 4} M${x1 - 4} ${y0 - 3} L${x1} ${y0} L${x1 - 4} ${y0 + 3}" fill="none" stroke="currentColor" stroke-opacity=".55" stroke-width="1.5"/>
    <text x="${x0 - 11}" y="${y1 + 8}" font-size="10" fill="currentColor" fill-opacity=".7">v</text>
    <text x="${x1 - 6}" y="${y0 + 11}" font-size="10" fill="currentColor" fill-opacity=".7">t</text>
    <path d="${line}" fill="none" stroke="var(--gold)" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
}

export function boardGraphSVG(p) {
  const w = 260, h = 160, L = 36, B = 128, R = 240, Tp = 16;
  const vmax = Math.max(p.v1, 12);
  const X = (t) => L + (t / p.t) * (R - L - 20);
  const Y = (v) => B - (v / vmax) * (B - Tp - 8);
  const ticksV = [0, p.v0, p.v1].filter((v, i, a) => a.indexOf(v) === i);
  return `<svg viewBox="0 0 ${w} ${h}" class="bsvg" aria-hidden="true">
    <rect x="0" y="0" width="${w}" height="${h}" rx="10" fill="#14201a"/>
    <path d="M${L} ${B} L${X(p.t)} ${B} L${X(p.t)} ${Y(p.v1)} L${L} ${Y(p.v0)} Z" fill="#d8b04a" fill-opacity=".14"/>
    <path d="M${L} ${Tp} L${L} ${B} L${R} ${B}" fill="none" stroke="#cfd8cc" stroke-width="1.5"/>
    ${ticksV.map((v) => `<line x1="${L - 4}" x2="${X(p.t)}" y1="${Y(v)}" y2="${Y(v)}" stroke="#cfd8cc" stroke-opacity=".18" stroke-dasharray="3 4"/><text x="${L - 7}" y="${Y(v) + 4}" font-size="11" text-anchor="end" fill="#cfd8cc">${v}</text>`).join('')}
    <line x1="${X(p.t)}" x2="${X(p.t)}" y1="${B}" y2="${Y(p.v1)}" stroke="#cfd8cc" stroke-opacity=".25" stroke-dasharray="3 4"/>
    <text x="${X(p.t)}" y="${B + 15}" font-size="11" text-anchor="middle" fill="#cfd8cc">${p.t}</text>
    <text x="${L}" y="${B + 15}" font-size="11" text-anchor="middle" fill="#cfd8cc">0</text>
    <text x="${L + 6}" y="${Tp + 4}" font-size="11" fill="#cfd8cc">v, м/с</text>
    <text x="${R}" y="${B - 6}" font-size="11" text-anchor="end" fill="#cfd8cc">t, с</text>
    <path d="M${L} ${Y(p.v0)} L${X(p.t)} ${Y(p.v1)}" stroke="#f6de8f" stroke-width="3" stroke-linecap="round"/>
    <circle cx="${L}" cy="${Y(p.v0)}" r="3.5" fill="#f6de8f"/><circle cx="${X(p.t)}" cy="${Y(p.v1)}" r="3.5" fill="#f6de8f"/>
  </svg>`;
}

export { n as fmtNum };
