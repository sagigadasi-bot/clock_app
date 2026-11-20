// סבב משחק: 6 שאלות משני סוגים –
//   read – "מה השעה?" (בחירה מתוך 3 תשובות)
//   set  – "תכווני את השעון" (גרירת מחוגים)
import { Clock } from './clock.js';
import { LEVELS, ROUND_LENGTH, distractors, randomTime, roundTypes, shuffle } from './levels.js';
import { timeToHebrew, digital, toT, fromT, nextHour, HOURS, minuteWords } from './timeText.js';
import { store } from './progress.js';
import { sfx, stopSpeaking } from './audio.js';
import { $, Mitzi, PRAISE, pickOne } from './ui.js';

export function gameScreen(app, levelIndex, nav) {
  const level = LEVELS[levelIndex];
  app.innerHTML = `
    <section class="screen game">
      <header class="topbar">
        <button class="icon-btn" data-act="home" aria-label="הביתה">🏠</button>
        <div class="round-dots">${'<span></span>'.repeat(ROUND_LENGTH)}</div>
        <div class="level-badge">שלב ${level.id}</div>
      </header>
      <div class="mitzi-slot"></div>
      <div class="target"></div>
      <div class="clock-wrap"></div>
      <div class="answers"></div>
      <div class="footer"><button class="btn primary next hidden">הלאה ◀</button></div>
    </section>`;

  const mitzi = new Mitzi($('.mitzi-slot', app));
  const targetEl = $('.target', app);
  const answersEl = $('.answers', app);
  const nextBtn = $('.next', app);
  const dots = [...app.querySelectorAll('.round-dots span')];
  const clock = new Clock($('.clock-wrap', app), {
    step: level.step,
    lockMinute: level.lockMinute,
    helpers: level.helpers,
    onTick: () => sfx.tick(),
  });

  $('[data-act=home]', app).addEventListener('click', () => { stopSpeaking(); nav('levels'); });

  const types = roundTypes(level);
  const results = [];
  let qi = 0;
  let last = null;
  const starsBefore = store.stars(level.id);

  const phrase = (t) => timeToHebrew(t.h, t.m, level.style);
  // בשלבים עם ניסוח מילולי – מגשרים לניסוח המספרי שהיא כבר מכירה
  function bridge(t) {
    const p = phrase(t);
    const n = timeToHebrew(t.h, t.m, 'numeric');
    return p !== n ? `${p}. זה כמו ${n}.` : `${p}.`;
  }

  function showNext(label = 'הלאה ◀') {
    nextBtn.textContent = label;
    nextBtn.classList.remove('hidden');
  }

  function markDot(ok) {
    const d = dots[qi];
    d.className = ok ? 'star' : 'done';
    d.textContent = ok ? '⭐' : '🐾';
  }

  function success(t) {
    sfx.correct();
    store.addStar(level.id);
    results.push(true);
    markDot(true);
    clock.setInteractive(false);
    mitzi.say(`${pickOne(PRAISE)} השעה ${bridge(t)}`, { mood: 'happy' });
    showNext();
  }

  function giveUp(t) {
    results.push(false);
    markDot(false);
    clock.setInteractive(false);
    mitzi.say(`ככה נראית השעה ${bridge(t)} בפעם הבאה תצליחי!`);
    showNext();
  }

  nextBtn.addEventListener('click', () => {
    nextBtn.classList.add('hidden');
    qi++;
    if (qi >= ROUND_LENGTH) {
      const earned = results.filter(Boolean).length;
      const unlockedNew = levelIndex + 1 < LEVELS.length && !store.data.unlockAll &&
        starsBefore < 8 && store.stars(level.id) >= 8;
      nav('reward', { levelIndex, earned, unlockedNew });
    } else {
      ask();
    }
  });

  // ---------- "מה השעה?" ----------
  function askRead(t) {
    targetEl.innerHTML = '';
    clock.setInteractive(false);
    clock.animateTo(toT(t), 700);
    mitzi.say('מה השעה בשעון?');
    let tries = 0;
    const options = shuffle([t, ...distractors(level, t)]);
    answersEl.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'options';
    for (const o of options) {
      const b = document.createElement('button');
      b.className = 'opt';
      b.innerHTML = `<span class="digital" dir="ltr">${digital(o.h, o.m)}</span>` +
        (level.style !== 'numeric' ? `<span class="phrase">${phrase(o)}</span>` : '');
      b.addEventListener('click', () => {
        if (b.disabled || grid.classList.contains('locked')) return;
        if (toT(o) === toT(t)) {
          b.classList.add('right');
          grid.classList.add('locked');
          success(t);
          return;
        }
        tries++;
        sfx.oops();
        b.classList.add('wrong');
        b.disabled = true;
        if (tries >= 2) {
          grid.classList.add('locked');
          [...grid.children][options.indexOf(t)].classList.add('right');
          giveUp(t);
        } else {
          readHint(o, t);
        }
      });
      grid.appendChild(b);
    }
    answersEl.appendChild(grid);
  }

  function readHint(chosen, t) {
    if (chosen.m === t.m && chosen.h !== t.h) {
      clock.flash('hour');
      if (t.m >= 30 && chosen.h === nextHour(t.h)) {
        mitzi.say(`כמעט! תסתכלי טוב על המחוג הקצר – הוא עוד לא הגיע ל${HOURS[nextHour(t.h)]}.`);
      } else {
        mitzi.say('כמעט! תסתכלי על המחוג הקצר והאדום – הוא מראה את השעה.');
      }
    } else if (chosen.h === t.h) {
      clock.flash('minute');
      mitzi.say('כמעט! תסתכלי על המחוג הארוך והכחול – הוא מראה את הדקות.');
    } else {
      clock.flash('hour');
      setTimeout(() => clock.flash('minute'), 900);
      mitzi.say('נסי שוב! המחוג הקצר מראה את השעה, והמחוג הארוך מראה את הדקות.');
    }
  }

  // ---------- "תכווני את השעון" ----------
  function askSet(t) {
    const words = level.style !== 'numeric';
    const p = phrase(t);
    targetEl.innerHTML = words
      ? `<div class="target-card"><span class="phrase-big">${p}</span>
           <button class="peek" aria-label="רמז">💡<span class="digital hidden" dir="ltr">${digital(t.h, t.m)}</span></button></div>`
      : `<div class="target-card"><span class="digital big" dir="ltr">${digital(t.h, t.m)}</span></div>`;
    $('.peek', targetEl)?.addEventListener('click', (e) => {
      e.currentTarget.querySelector('.digital').classList.remove('hidden');
    });

    // שעת התחלה שונה מהיעד
    let start = level.lockMinute ? randomTime(level, t) : { h: 12, m: 0 };
    if (toT(start) === toT(t)) start = { h: 6, m: 0 };
    clock.setTime(toT(start));
    clock.setInteractive(true);
    mitzi.say(`תזיזי את המחוגים לשעה ${p}`);

    let tries = 0;
    answersEl.innerHTML = `<button class="btn success check">✔ בדיקה</button>`;
    const check = $('.check', answersEl);
    check.addEventListener('click', () => {
      if (check.disabled) return;
      const cur = fromT(clock.t);
      if (toT(cur) === toT(t)) {
        check.disabled = true;
        success(t);
        return;
      }
      tries++;
      sfx.oops();
      if (tries >= 3) {
        check.disabled = true;
        clock.setInteractive(false);
        clock.animateTo(toT(t), 1200).then(() => giveUp(t));
        return;
      }
      setHint(cur, t);
    });
  }

  function setHint(cur, t) {
    if (cur.m !== t.m) {
      clock.flash('minute');
      if (t.m === 0) mitzi.say('המחוג הארוך צריך להצביע למעלה, על השתים עשרה.');
      else if (t.m % 5 === 0) mitzi.say(`המחוג הארוך צריך להצביע על המספר ${HOURS[t.m / 5]}.`);
      else mitzi.say(`המחוג הארוך מראה דקות. כל קו קטן זה דקה אחת. צריך ${minuteWords(t.m)} דקות.`);
    } else {
      clock.flash('hour');
      if (t.m === 0) mitzi.say(`המחוג הקצר צריך להצביע על המספר ${HOURS[t.h]}.`);
      else mitzi.say(`המחוג הקצר צריך להיות בין ${HOURS[t.h]} ל${HOURS[nextHour(t.h)]}.`);
    }
  }

  function ask() {
    const t = randomTime(level, last);
    last = t;
    dots.forEach((d, i) => d.classList.toggle('current', i === qi));
    if (types[qi] === 'set') askSet(t); else askRead(t);
  }

  // הסבר קצר בפעם הראשונה בכל שלב
  if (!store.data.seenIntro[level.id]) {
    clock.setTime(toT(level.example));
    targetEl.innerHTML = `<div class="target-card"><span class="phrase-big">${timeToHebrew(level.example.h, level.example.m, level.style)}</span></div>`;
    mitzi.say(level.intro);
    answersEl.innerHTML = `<button class="btn primary go">יאללה, מתחילים!</button>`;
    $('.go', answersEl).addEventListener('click', () => {
      store.data.seenIntro[level.id] = true;
      store.save();
      ask();
    });
  } else {
    ask();
  }
}
