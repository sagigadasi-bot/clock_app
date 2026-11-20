// שמירת ההתקדמות של רוני במכשיר (localStorage).
import { LEVELS, STARS_TO_UNLOCK } from './levels.js';

const KEY = 'hagia-hazman-v1';
const DEFAULTS = {
  stars: {},          // levelId -> מספר כוכבים
  stickers: [],       // מזהי מדבקות שנאספו
  unlockAll: false,
  voice: true,        // הקראה
  sound: true,        // צלילים
  rate: 0.9,          // מהירות הקראה
  voiceName: null,
  rounds: 0,
  seenIntro: {},      // levelId -> true
  lastLevel: null,    // השלב האחרון ששיחקה בו
  round: null,        // סבב שלא הסתיים: { levelIndex, qi, results, starsBefore, current }
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return structuredClone(DEFAULTS);
}

export const store = {
  data: load(),
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch {} },
  reset() { const { voice, sound, rate, voiceName } = this.data; this.data = { ...structuredClone(DEFAULTS), voice, sound, rate, voiceName }; this.save(); },
  stars(levelId) { return this.data.stars[levelId] || 0; },
  addStar(levelId) { this.data.stars[levelId] = this.stars(levelId) + 1; this.save(); },
  totalStars() { return Object.values(this.data.stars).reduce((a, b) => a + b, 0); },
  isUnlocked(index) {
    if (index === 0 || this.data.unlockAll) return true;
    return this.stars(LEVELS[index - 1].id) >= STARS_TO_UNLOCK;
  },
  // ---- העברה לטלפון אחר: ההתקדמות נארזת בתוך קישור ----
  exportCode() {
    const { stars, stickers, unlockAll, rounds, seenIntro, lastLevel, round } = this.data;
    const json = JSON.stringify({ v: 1, stars, stickers, unlockAll, rounds, seenIntro, lastLevel, round });
    return btoa(String.fromCharCode(...new TextEncoder().encode(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  transferLink() {
    return `${location.origin}${location.pathname}#restore=${this.exportCode()}`;
  },
  /** מחזיר את הנתונים מהקוד, או null אם הקוד לא תקין. */
  parseCode(code) {
    try {
      const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const d = JSON.parse(new TextDecoder().decode(bytes));
      if (d.v !== 1 || typeof d.stars !== 'object' || !Array.isArray(d.stickers)) return null;
      return d;
    } catch { return null; }
  },
  importData(d) {
    Object.assign(this.data, {
      stars: d.stars, stickers: d.stickers, unlockAll: !!d.unlockAll,
      rounds: d.rounds || 0, seenIntro: d.seenIntro || {},
      lastLevel: d.lastLevel ?? null, round: d.round || null,
    });
    this.save();
  },
  missingStars(index) { return Math.max(0, STARS_TO_UNLOCK - this.stars(LEVELS[index - 1].id)); },
};
