// המרת שעה (שעון 12 שעות) למשפט בעברית מדוברת.
// שלושה סגנונות ניסוח, לפי ההתקדמות של רוני:
//   numeric – "שבע ושלושים", "שבע וחמש עשרה", "שבע ארבעים וחמש"
//   words   – "שבע וחצי", "שבע ורבע", "שבע ושלושת רבעי"
//   to      – כמו words, אבל 45 → "רבע לשמונה"

export const HOURS = ['', 'אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע', 'עשר', 'אחת עשרה', 'שתים עשרה'];

const UNITS = ['', 'אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע'];
const TEENS = ['עשר', 'אחת עשרה', 'שתים עשרה', 'שלוש עשרה', 'ארבע עשרה', 'חמש עשרה', 'שש עשרה', 'שבע עשרה', 'שמונה עשרה', 'תשע עשרה'];
const TENS = { 2: 'עשרים', 3: 'שלושים', 4: 'ארבעים', 5: 'חמישים' };

export const STYLES = { NUMERIC: 'numeric', WORDS: 'words', TO: 'to' };

/** מספר דקות (1–59) במילים, בלשון נקבה. */
export function minuteWords(m) {
  if (m < 10) return UNITS[m];
  if (m < 20) return TEENS[m - 10];
  const tens = TENS[Math.floor(m / 10)];
  const u = m % 10;
  return u ? `${tens} ו${UNITS[u]}` : tens;
}

export const nextHour = (h) => (h % 12) + 1;

/** h: 1–12, m: 0–59 */
export function timeToHebrew(h, m, style = STYLES.NUMERIC) {
  const hw = HOURS[h];
  if (m === 0) return hw;
  if (style !== STYLES.NUMERIC) {
    if (m === 30) return `${hw} וחצי`;
    if (m === 15) return `${hw} ורבע`;
    if (m === 45) return style === STYLES.TO ? `רבע ל${HOURS[nextHour(h)]}` : `${hw} ושלושת רבעי`;
  }
  const mw = minuteWords(m);
  // "שבע ושלושים", "שבע וחמש עשרה" – אבל "שבע ארבעים וחמש" (כבר יש ו' בפנים)
  return m > 20 && m % 10 !== 0 ? `${hw} ${mw}` : `${hw} ו${mw}`;
}

/** כל הדרכים להגיד את אותה השעה (בלי כפילויות). */
export function allPhrasings(h, m) {
  return [...new Set([STYLES.NUMERIC, STYLES.WORDS, STYLES.TO].map((s) => timeToHebrew(h, m, s)))];
}

export function digital(h, m) {
  return `${h}:${String(m).padStart(2, '0')}`;
}

// ייצוג פנימי: t = דקות מ-12:00 (0–719)
export const toT = ({ h, m }) => (h % 12) * 60 + m;
export function fromT(t) {
  t = ((Math.round(t) % 720) + 720) % 720;
  const h = Math.floor(t / 60);
  return { h: h === 0 ? 12 : h, m: t % 60 };
}
