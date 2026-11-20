import { toT, nextHour } from './timeText.js';

export const STARS_TO_UNLOCK = 8;
export const ROUND_LENGTH = 6;

const FIVES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

// step – בכמה דקות קופץ המחוג הארוך כשגוררים
// style – סגנון הניסוח (ראו timeText.js)
export const LEVELS = [
  { id: 1, title: 'שעות עגולות', example: { h: 3, m: 0 }, minutes: [0], step: 60, lockMinute: true, style: 'numeric',
    intro: 'בשלב הזה המחוג הארוך תמיד למעלה, על השתים עשרה. המחוג הקצר מראה את השעה!',
    types: ['read', 'read', 'set', 'read', 'set', 'read'] },
  { id: 2, title: 'ושלושים', example: { h: 4, m: 30 }, minutes: [0, 30, 30, 30], step: 30, style: 'numeric',
    intro: 'כשהמחוג הארוך למטה, על השש, עברו שלושים דקות. והמחוג הקצר נמצא בין שני מספרים.' },
  { id: 3, title: 'חמש עשרה וארבעים וחמש', example: { h: 2, m: 15 }, minutes: [0, 15, 30, 45, 15, 45], step: 15, style: 'numeric',
    intro: 'המחוג הארוך על השלוש – חמש עשרה דקות. על התשע – ארבעים וחמש דקות.' },
  { id: 4, title: 'קפיצות של חמש', example: { h: 8, m: 20 }, minutes: FIVES, step: 5, helpers: true, style: 'numeric',
    intro: 'כל מספר בשעון שווה חמש דקות. סופרים בקפיצות: חמש, עשר, חמש עשרה, עשרים...' },
  { id: 5, title: 'וחצי, ורבע, ושלושת רבעי', example: { h: 7, m: 30 }, minutes: [15, 30, 45, 30, 0], step: 15, style: 'words',
    intro: 'שבע ושלושים זה גם שבע וחצי! שבע וחמש עשרה זה שבע ורבע, ושבע ארבעים וחמש זה שבע ושלושת רבעי.' },
  { id: 6, title: 'רבע ל...', example: { h: 7, m: 45 }, minutes: [45, 45, 15, 30, 45], step: 15, style: 'to',
    intro: 'שבע ארבעים וחמש זה גם רבע לשמונה – כי עוד רבע שעה תהיה השעה שמונה!' },
  { id: 7, title: 'כל דקה', example: { h: 10, m: 17 }, minutes: 'any', step: 1, helpers: true, style: 'numeric',
    intro: 'עכשיו כל קו קטן בשעון הוא דקה אחת. סופרים בחמישיות ואז מוסיפים עוד דקות.' },
];

const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomMinute(level) {
  return level.minutes === 'any' ? rand(60) : pick(level.minutes);
}

export function randomTime(level, avoid = null) {
  for (;;) {
    const t = { h: 1 + rand(12), m: randomMinute(level) };
    if (!avoid || toT(t) !== toT(avoid)) return t;
  }
}

/** שתי תשובות שגויות "הגיוניות" – הטעויות שילדים עושים באמת. */
export function distractors(level, correct) {
  const { h, m } = correct;
  const prev = h === 1 ? 12 : h - 1;
  const candidates = [
    { h: nextHour(h), m },                // הטעות הכי נפוצה: ב-7:45 לקרוא 8:45
    { h: prev, m },
    { h, m: randomMinute(level) },
  ];
  if (m % 5 === 0 && m !== 0) candidates.push({ h: m / 5, m: (h % 12) * 5 }); // החלפת מחוגים
  const out = [];
  const seen = new Set([toT(correct)]);
  for (const c of shuffle(candidates)) {
    if (out.length < 2 && !seen.has(toT(c))) { seen.add(toT(c)); out.push(c); }
  }
  while (out.length < 2) {
    const c = randomTime(level);
    if (!seen.has(toT(c))) { seen.add(toT(c)); out.push(c); }
  }
  return out;
}

export function roundTypes(level) {
  return level.types || ['read', 'set', 'read', 'set', 'read', 'set'];
}
