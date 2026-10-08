// Мережа: списки груп з gamma та рейтинг у Google Таблиці.
import { CONFIG } from './config.js';

const LSK = 'delta.groupsCache';

export async function loadGroups() {
  for (const url of CONFIG.GROUPS_URLS) {
    try {
      const res = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Math.floor(Date.now() / 600000), { cache: 'no-store' });
      if (!res.ok) continue;
      const data = await res.json();
      const groups = (data.groups || [])
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((g) => ({
          id: g.id, name: g.name,
          students: (g.students || []).map((s) => ({ id: s.id, name: s.name }))
            .sort((a, b) => a.name.localeCompare(b.name, 'uk')),
        }));
      if (groups.length) {
        try { localStorage.setItem(LSK, JSON.stringify(groups)); } catch (e) { /* без кешу */ }
        return groups;
      }
    } catch (e) { /* пробуємо наступне джерело */ }
  }
  try {
    const cached = JSON.parse(localStorage.getItem(LSK) || 'null');
    if (cached && cached.length) return cached;
  } catch (e) { /* немає кешу */ }
  return null;
}

export const ratingEnabled = () => !!CONFIG.RATING_URL;

export async function submitResult(entry) {
  if (!CONFIG.RATING_URL) return false;
  const body = JSON.stringify({ action: 'submit', ...entry });
  try {
    const res = await fetch(CONFIG.RATING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
    });
    const j = await res.json();
    return !!j.ok;
  } catch (e) {
    // запасний шлях: відправка «наосліп», без читання відповіді
    try {
      await fetch(CONFIG.RATING_URL, { method: 'POST', mode: 'no-cors', body });
      return true;
    } catch (e2) {
      return false;
    }
  }
}

export async function fetchRating(level) {
  if (!CONFIG.RATING_URL) return null;
  const res = await fetch(`${CONFIG.RATING_URL}?action=top&level=${encodeURIComponent(level)}&t=${Date.now()}`);
  const j = await res.json();
  if (!j.ok) throw new Error(j.error || 'rating error');
  return j.rows || [];
}
