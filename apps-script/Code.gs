/**
 * Орден Дельти: рейтинг у Google Таблиці.
 * Встановлення описано в README.md (розділ «Рейтинг у Google Таблиці»).
 *
 * POST: гра надсилає результат, а він дописується рядком у лист «Результати».
 * GET ?action=top&level=1: найкращий час кожного гравця та кількість спроб.
 */

const SHEET_NAME = 'Результати';
const HEAD = [
  'Записано', 'Рівень', 'Нік', 'Група', 'Студент',
  'Час, с', 'Час', 'Помилки', 'Штраф, с', 'Бонус, с', 'Чистий час, с',
  'Герой', 'ID групи', 'ID студента', 'Пристрій', 'ID забігу',
];
const COL = { level: 2, nick: 3, group: 4, student: 5, sec: 6, groupId: 13, studentId: 14, device: 15, runId: 16 };

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEAD);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEAD.length).setFontWeight('bold');
  }
  return sh;
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// обрізає рядок і не дає вписати формулу в клітинку
function cut_(v, n) {
  let s = String(v == null ? '' : v).trim().slice(0, n);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function fmt_(ms) {
  const t = Math.round(ms / 100) / 10;
  const m = Math.floor(t / 60), s = (t % 60).toFixed(1);
  return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    const level = Number(d.level);
    const ms = Number(d.timeMs);
    const nick = cut_(d.nick, 24);
    if (!(level >= 1 && level <= 50)) throw new Error('bad level');
    if (!(ms >= 20000 && ms <= 6 * 3600 * 1000)) throw new Error('bad time');
    if (nick.length < 2) throw new Error('bad nick');
    const runId = cut_(d.runId, 40);

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sh = sheet_();
      const last = sh.getLastRow();
      if (runId && last > 1) {
        const ids = sh.getRange(2, COL.runId, last - 1, 1).getValues();
        for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === runId) return out_({ ok: true, duplicate: true });
      }
      sh.appendRow([
        new Date(), level, nick, cut_(d.group, 12), cut_(d.student, 80),
        Math.round(ms) / 1000, fmt_(ms), Number(d.mistakes) || 0, Number(d.penalty) || 0, Number(d.bonus) || 0,
        Math.round(Number(d.rawMs) || 0) / 1000,
        cut_(d.hero, 20), cut_(d.groupId, 40), cut_(d.studentId, 40), cut_(d.device, 40), runId,
      ]);
    } finally {
      lock.releaseLock();
    }
    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  }
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  const level = Number(p.level || 1);
  const sh = sheet_();
  const last = sh.getLastRow();
  if (last < 2) return out_({ ok: true, level: level, rows: [] });
  const vals = sh.getRange(2, 1, last - 1, HEAD.length).getValues();
  const byKey = {};
  for (let i = 0; i < vals.length; i++) {
    const r = vals[i];
    if (Number(r[COL.level - 1]) !== level) continue;
    const nick = String(r[COL.nick - 1]);
    const studentId = String(r[COL.studentId - 1] || '');
    const device = String(r[COL.device - 1] || '');
    const key = studentId ? 's:' + studentId : 'n:' + nick.toLowerCase() + ':' + device;
    const ms = Math.round(Number(r[COL.sec - 1]) * 1000);
    const row = {
      key: key, nick: nick,
      group: String(r[COL.group - 1] || ''), groupId: String(r[COL.groupId - 1] || ''),
      student: String(r[COL.student - 1] || ''), best: ms, attempts: 1,
    };
    const cur = byKey[key];
    if (!cur) byKey[key] = row;
    else {
      cur.attempts++;
      if (ms < cur.best) { row.attempts = cur.attempts; byKey[key] = row; }
    }
  }
  const rows = Object.keys(byKey).map(function (k) { return byKey[k]; })
    .sort(function (a, b) { return a.best - b.best; })
    .slice(0, 1000);
  return out_({ ok: true, level: level, rows: rows });
}
