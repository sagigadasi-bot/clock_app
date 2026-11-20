// רכיבי ממשק משותפים: מיצי, קונפטי, מדבקות.
import { speak } from './audio.js';

export const $ = (sel, root = document) => root.querySelector(sel);

export function mitziSVG(mood = 'normal') {
  const eyes = mood === 'happy'
    ? `<path d="M34 60 q8 -10 16 0 M70 60 q8 -10 16 0" stroke="#3a2a20" stroke-width="4.5" fill="none" stroke-linecap="round"/>`
    : `<circle cx="42" cy="58" r="8" fill="#3a2a20"/><circle cx="78" cy="58" r="8" fill="#3a2a20"/>
       <circle cx="45" cy="54.5" r="3" fill="#fff"/><circle cx="81" cy="54.5" r="3" fill="#fff"/>`;
  const mouth = mood === 'happy'
    ? `<path d="M51 79 q9 12 18 0 z" fill="#c2405f"/>`
    : `<path d="M60 77 q-5 7 -10 2 M60 77 q5 7 10 2" stroke="#7a4a2a" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  return `<svg class="mitzi-svg" viewBox="0 0 120 112" aria-label="מיצי">
    <polygon points="14,52 24,4 54,30" fill="#f39c4a"/>
    <polygon points="22,42 27,16 45,31" fill="#ffb8c6"/>
    <polygon points="106,52 96,4 66,30" fill="#f39c4a"/>
    <polygon points="98,42 93,16 75,31" fill="#ffb8c6"/>
    <ellipse cx="60" cy="64" rx="48" ry="42" fill="#f6a24f"/>
    <path d="M60 24 v11 M48 27 l3 9 M72 27 l-3 9" stroke="#dc7a2c" stroke-width="4.5" stroke-linecap="round"/>
    <ellipse cx="60" cy="80" rx="22" ry="15" fill="#fff0de"/>
    ${eyes}
    <ellipse cx="29" cy="74" rx="7" ry="4.5" fill="#ff8fa6" opacity=".55"/>
    <ellipse cx="91" cy="74" rx="7" ry="4.5" fill="#ff8fa6" opacity=".55"/>
    <path d="M55 70 h10 l-5 6 z" fill="#ff7096" stroke="#ff7096" stroke-linejoin="round" stroke-width="2"/>
    ${mouth}
    <path d="M38 76 l-26 -4 M38 81 l-25 4 M82 76 l26 -4 M82 81 l25 4" stroke="#8a5a3a" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`;
}

/** מיצי + בועת דיבור. say() מציג טקסט ומקריא אותו. */
export class Mitzi {
  constructor(container, { big = false } = {}) {
    this.root = document.createElement('div');
    this.root.className = 'mitzi' + (big ? ' big' : '');
    this.root.innerHTML = `<div class="mitzi-face"></div>
      <div class="bubble"><span class="bubble-text"></span><button class="say-again" aria-label="להקריא שוב">🔊</button></div>`;
    container.appendChild(this.root);
    this.face = $('.mitzi-face', this.root);
    this.text = $('.bubble-text', this.root);
    this.last = '';
    this.setMood('normal');
    $('.say-again', this.root).addEventListener('click', () => speak(this.last));
    this.face.addEventListener('click', () => { this.jump(); speak(this.last); });
  }
  setMood(mood) { this.face.innerHTML = mitziSVG(mood); }
  jump() { this.root.classList.remove('jump'); void this.root.offsetWidth; this.root.classList.add('jump'); }
  say(text, { mood = 'normal', display = text } = {}) {
    this.last = text;
    this.text.textContent = display;
    this.setMood(mood);
    if (mood === 'happy') this.jump();
    return speak(text);
  }
}

export function confetti(n = 70) {
  const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#ff9ff3', '#5f27cd', '#ff9f43'];
  const layer = document.createElement('div');
  layer.className = 'confetti';
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i');
    s.style.left = Math.random() * 100 + 'vw';
    s.style.background = colors[i % colors.length];
    s.style.animationDelay = Math.random() * 0.6 + 's';
    s.style.animationDuration = 1.8 + Math.random() * 1.4 + 's';
    s.style.setProperty('--drift', (Math.random() * 120 - 60) + 'px');
    s.style.setProperty('--spin', (Math.random() * 720 - 360) + 'deg');
    layer.appendChild(s);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 4000);
}

export const STICKERS = [
  ['🐶', 'כלבלב'], ['🐰', 'ארנב'], ['🦊', 'שועל'], ['🐼', 'פנדה'], ['🐨', 'קואלה'], ['🦁', 'אריה'],
  ['🐯', 'נמר'], ['🐸', 'צפרדע'], ['🐵', 'קוף'], ['🦄', 'חד קרן'], ['🐙', 'תמנון'], ['🐢', 'צב'],
  ['🦋', 'פרפר'], ['🐞', 'פרת משה רבנו'], ['🐬', 'דולפין'], ['🦉', 'ינשוף'], ['🐧', 'פינגווין'], ['🦒', 'ג׳ירפה'],
  ['🐘', 'פיל'], ['🐹', 'אוגר'], ['🦔', 'קיפוד'], ['🐳', 'לווייתן'], ['🌈', 'קשת בענן'], ['🍓', 'תות'],
  ['🧁', 'קאפקייק'], ['🎈', 'בלון'], ['🌻', 'חמנייה'], ['🍦', 'גלידה'], ['🚀', 'חללית'], ['👑', 'כתר'],
];

export const PRAISE = ['כל הכבוד, רוני!', 'מעולה!', 'יופי!', 'את אלופה!', 'וואו, איזה יופי!', 'מצוין!'];
export const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
