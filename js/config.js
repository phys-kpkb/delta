// Налаштування гри.
export const CONFIG = {
  // URL веб-застосунку Google Apps Script (див. README → «Рейтинг у Google Таблиці»).
  // Порожній рядок: рейтинг працює лише локально, на пристрої гравця.
  RATING_URL: 'https://script.google.com/macros/s/AKfycbw70_SR-69eocwW7pdGQXVYKFmmQhLIPtykj30l4IXA8POBvrnAjzwTMCbswQwnttcH/exec',

  // Звідки брати групи і студентів (репозиторій gamma).
  GROUPS_URLS: [
    'https://phys-kpkb.github.io/gamma/data.json',
    'https://raw.githubusercontent.com/phys-kpkb/gamma/main/data.json',
  ],
};
