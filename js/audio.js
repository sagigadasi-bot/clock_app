// קול: הקראה בעברית (Web Speech API) + צלילי משחק קצרים (Web Audio).
import { store } from './progress.js';

let voices = [];
function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  voices = speechSynthesis.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith('he'));
}
if ('speechSynthesis' in window) {
  loadVoices();
  speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}

export function hebrewVoices() { loadVoices(); return voices; }

/** הקול הכי טוב שיש: מה שנבחר באזור ההורים → Premium → Enhanced → כל קול עברי. */
function bestVoice() {
  loadVoices();
  const saved = store.data.voiceName && voices.find((v) => v.name === store.data.voiceName);
  if (saved) return saved;
  return (
    voices.find((v) => /premium/i.test(v.name)) ||
    voices.find((v) => /enhanced|משופר/i.test(v.name)) ||
    voices.find((v) => /carmit|כרמית/i.test(v.name)) ||
    voices[0] || null
  );
}

let speakToken = 0;
let current = null; // שומרים הפניה – אחרת Safari לפעמים "שוכח" את המשפט באמצע
export function speak(text) {
  const token = ++speakToken;
  return new Promise((resolve) => {
    if (!store.data.voice || !('speechSynthesis' in window) || !text) return resolve();
    const busy = speechSynthesis.speaking || speechSynthesis.pending;
    if (busy) speechSynthesis.cancel();
    // ב-iOS משפט שנשלח מיד אחרי cancel() נבלע לפעמים – מחכים רגע קצר
    setTimeout(() => {
      if (token !== speakToken) return resolve(false);
      speakNow(text, token, resolve);
    }, busy ? 120 : 0);
  });
}

function speakNow(text, token, resolve) {
    const u = (current = new SpeechSynthesisUtterance(text));
    u.lang = 'he-IL';
    const v = bestVoice();
    if (v) u.voice = v;
    u.rate = store.data.rate;
    u.pitch = 1.05;
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(token === speakToken); } };
    u.onend = finish;
    u.onerror = finish;
    setTimeout(finish, 1500 + text.length * 140);
    speechSynthesis.resume();
    speechSynthesis.speak(u);
}
export function stopSpeaking() { speakToken++; if ('speechSynthesis' in window) speechSynthesis.cancel(); }

// ---- צלילים ----
let ctx = null;
export function unlockAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch {}
  // ב-iOS ההקראה הראשונה חייבת לקרות בתוך לחיצה
  if ('speechSynthesis' in window && !unlockAudio.done) {
    unlockAudio.done = true;
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
  }
}

function tone(freq, at, dur, type = 'sine', gain = 0.18) {
  if (!ctx || !store.data.sound) return;
  const t0 = ctx.currentTime + at;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

let lastTick = 0;
export const sfx = {
  correct() { tone(660, 0, 0.18); tone(880, 0.12, 0.22); tone(1175, 0.24, 0.35); },
  oops() { tone(392, 0, 0.18, 'triangle', 0.14); tone(330, 0.16, 0.25, 'triangle', 0.14); },
  tick() {
    const now = performance.now();
    if (now - lastTick < 35) return;
    lastTick = now;
    tone(1500, 0, 0.03, 'square', 0.025);
  },
  pop() { tone(520, 0, 0.08, 'sine', 0.12); tone(780, 0.05, 0.1, 'sine', 0.1); },
  fanfare() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.3, 'triangle', 0.16)); },
};
