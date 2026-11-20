import { Clock } from './clock.js';
import { LEVELS, STARS_TO_UNLOCK } from './levels.js';
import { allPhrasings, digital, fromT, toT } from './timeText.js';
import { store } from './progress.js';
import { speak, stopSpeaking, unlockAudio, sfx, hebrewVoices } from './audio.js';
import { $, Mitzi, mitziSVG, confetti, STICKERS, pickOne } from './ui.js';
import { gameScreen } from './game.js';

const app = $('#app');

function nav(screen, params = {}) {
  stopSpeaking();
  window.scrollTo(0, 0);
  SCREENS[screen](params);
}

document.addEventListener('pointerdown', unlockAudio, { capture: true });
document.addEventListener('click', (e) => { if (e.target.closest('button')) sfx.pop(); }, { capture: true });

const SCREENS = {
  // מסך פתיחה – נדרש כדי ש-iOS יאפשר קול (חייבים לחיצה ראשונה)
  splash() {
    app.innerHTML = `
      <section class="screen splash">
        <div class="splash-mitzi">${mitziSVG('happy')}</div>
        <h1 class="title">הגיע הזמן</h1>
        <button class="btn primary huge play">▶</button>
      </section>`;
    $('.play', app).addEventListener('click', () => {
      unlockAudio();
      nav('home', { greet: true });
    });
  },

  home({ greet = false } = {}) {
    // מאיפה להמשיך: סבב שלא הסתיים, או השלב האחרון ששיחקה בו
    const r = store.data.round;
    const cont = r ? { levelIndex: r.levelIndex, qi: r.qi }
      : store.data.lastLevel != null ? { levelIndex: store.data.lastLevel, qi: null } : null;
    app.innerHTML = `
      <section class="screen home">
        <button class="icon-btn parents-btn" aria-label="אזור הורים">⚙️</button>
        <h1 class="title small">הגיע הזמן</h1>
        <div class="mitzi-slot"></div>
        <div class="home-stats"><span>⭐ ${store.totalStars()}</span><span>🎁 ${store.data.stickers.length}</span></div>
        <div class="menu">
          ${cont ? `<button class="btn success big continue">▶ להמשיך – שלב ${LEVELS[cont.levelIndex].id}${cont.qi != null ? `<small>שאלה ${Math.min(cont.qi + 1, 6)} מתוך 6</small>` : ''}</button>` : ''}
          <button class="btn primary big" data-go="levels">🎮 ${cont ? 'כל השלבים' : 'משחקים'}</button>
          <button class="btn purple big" data-go="free">🕹️ משחק חופשי</button>
          <button class="btn pink big" data-go="album">📒 המדבקות שלי</button>
        </div>
      </section>`;
    const m = new Mitzi($('.mitzi-slot', app), { big: true });
    const hello = greet && cont
      ? `שלום רוני! איזה כיף שחזרת! ${r ? 'נמשיך מאיפה שעצרנו?' : `נמשיך בשלב ${LEVELS[cont.levelIndex].id}?`} תלחצי על הכפתור הירוק.`
      : greet
      ? 'שלום רוני! אני מיצי. בואי נלמד ביחד לקרוא את השעון!'
      : pickOne(['מה עושים עכשיו, רוני?', 'בואי נתחיל!', 'איזה כיף שחזרת!']);
    m.say(hello, { mood: 'happy' });
    app.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => nav(b.dataset.go)));
    $('.parents-btn', app).addEventListener('click', () => nav('parentsGate'));
    $('.continue', app)?.addEventListener('click', () => nav('game', { levelIndex: cont.levelIndex }));
  },

  levels() {
    app.innerHTML = `
      <section class="screen levels">
        <header class="topbar">
          <button class="icon-btn" data-act="home" aria-label="הביתה">🏠</button>
          <div class="topbar-title">בחרי שלב</div><span class="spacer"></span>
        </header>
        <div class="mitzi-slot compact"></div>
        <div class="level-grid"></div>
      </section>`;
    const m = new Mitzi($('.mitzi-slot', app));
    m.say('באיזה שלב נתחיל?');
    $('[data-act=home]', app).addEventListener('click', () => nav('home'));
    const grid = $('.level-grid', app);
    LEVELS.forEach((level, i) => {
      const open = store.isUnlocked(i);
      const card = document.createElement('button');
      card.className = 'level-card' + (open ? '' : ' locked');
      card.innerHTML = `<div class="mini-clock"></div>
        <div class="level-num">${open ? level.id : '🔒'}</div>
        <div class="level-title">${level.title}</div>
        <div class="level-stars">⭐ ${store.stars(level.id)}</div>`;
      new Clock($('.mini-clock', card)).setTime(toT(level.example));
      card.addEventListener('click', () => {
        if (open) return nav('game', { levelIndex: i });
        const missing = store.missingStars(i);
        m.say(`השלב הזה עוד נעול. צריך עוד ${missing === 1 ? 'כוכב אחד' : missing + ' כוכבים'} בשלב ${LEVELS[i - 1].id}.`);
      });
      grid.appendChild(card);
    });
  },

  game({ levelIndex }) { gameScreen(app, levelIndex, nav); },

  reward({ levelIndex, earned, unlockedNew }) {
    store.data.rounds++;
    const missing = STICKERS.map((s, i) => i).filter((i) => !store.data.stickers.includes(i));
    const idx = missing.length ? pickOne(missing) : Math.floor(Math.random() * STICKERS.length);
    if (missing.length) store.data.stickers.push(idx);
    store.save();
    const [emoji, name] = STICKERS[idx];

    app.innerHTML = `
      <section class="screen reward">
        <div class="mitzi-slot"></div>
        <div class="reward-stars">${'⭐'.repeat(earned)}</div>
        <div class="sticker-reveal">${emoji}</div>
        <div class="sticker-name">${name}</div>
        ${unlockedNew ? `<div class="unlock-banner">🔓 נפתח שלב ${LEVELS[levelIndex + 1].id}!</div>` : ''}
        <div class="menu">
          <button class="btn primary big" data-act="again">🔁 עוד סבב</button>
          <button class="btn pink" data-act="album">📒 לאלבום</button>
          <button class="btn purple" data-act="home">🏠 הביתה</button>
        </div>
      </section>`;
    sfx.fanfare();
    confetti();
    const m = new Mitzi($('.mitzi-slot', app));
    let text = `כל הכבוד רוני! קיבלת ${earned === 1 ? 'כוכב אחד' : earned + ' כוכבים'}, ומדבקה חדשה: ${name}!`;
    if (unlockedNew) text += ' ופתחת שלב חדש!';
    m.say(text, { mood: 'happy' });
    $('[data-act=again]', app).addEventListener('click', () => nav('game', { levelIndex }));
    $('[data-act=album]', app).addEventListener('click', () => nav('album'));
    $('[data-act=home]', app).addEventListener('click', () => nav('home'));
  },

  album() {
    app.innerHTML = `
      <section class="screen album">
        <header class="topbar">
          <button class="icon-btn" data-act="home" aria-label="הביתה">🏠</button>
          <div class="topbar-title">המדבקות של רוני</div>
          <div class="level-badge">${store.data.stickers.length}/${STICKERS.length}</div>
        </header>
        <div class="sticker-grid"></div>
      </section>`;
    $('[data-act=home]', app).addEventListener('click', () => nav('home'));
    speak(store.data.stickers.length
      ? 'אלה המדבקות שלך! תלחצי על מדבקה כדי לשמוע את השם שלה.'
      : 'עוד אין לך מדבקות. בכל סבב שתסיימי תקבלי מדבקה חדשה!');
    const grid = $('.sticker-grid', app);
    STICKERS.forEach(([emoji, name], i) => {
      const have = store.data.stickers.includes(i);
      const b = document.createElement('button');
      b.className = 'sticker' + (have ? '' : ' empty');
      b.textContent = have ? emoji : '?';
      b.addEventListener('click', () => {
        if (!have) return speak('את המדבקה הזאת עוד לא מצאת. בכל סבב שתסיימי תקבלי מדבקה חדשה!');
        b.classList.remove('wiggle'); void b.offsetWidth; b.classList.add('wiggle');
        speak(name);
      });
      grid.appendChild(b);
    });
  },

  free() {
    app.innerHTML = `
      <section class="screen free">
        <header class="topbar">
          <button class="icon-btn" data-act="home" aria-label="הביתה">🏠</button>
          <div class="topbar-title">משחק חופשי</div><span class="spacer"></span>
        </header>
        <div class="mitzi-slot"></div>
        <div class="free-readout"><span class="digital big" dir="ltr"></span><div class="phrases"></div></div>
        <div class="clock-wrap"></div>
        <div class="toggles">
          <button class="toggle" data-t="digital">👁 שעה דיגיטלית</button>
          <button class="toggle" data-t="helpers">🔢 דקות</button>
          <button class="toggle" data-t="fives">⏩ קפיצות של 5</button>
        </div>
        <button class="btn primary say-time">🔊 מה השעה?</button>
      </section>`;
    $('[data-act=home]', app).addEventListener('click', () => nav('home'));
    const m = new Mitzi($('.mitzi-slot', app));
    const readout = $('.free-readout', app);
    const state = { digital: true, helpers: false, fives: true };
    const update = () => {
      const t = fromT(clock.t);
      $('.digital', readout).textContent = digital(t.h, t.m);
      $('.phrases', readout).innerHTML = allPhrasings(t.h, t.m).map((p) => `<span>${p}</span>`).join('');
    };
    const sayTime = () => { const t = fromT(clock.t); speak('השעה ' + allPhrasings(t.h, t.m).join(', או ')); };
    const clock = new Clock($('.clock-wrap', app), {
      interactive: true, step: 5,
      onTick: () => sfx.tick(), onChange: update, onRelease: sayTime,
    });
    clock.setTime(toT({ h: 3, m: 0 }));
    update();
    const applyToggles = () => {
      readout.classList.toggle('hide-digital', !state.digital);
      clock.setOptions({ helpers: state.helpers, step: state.fives ? 5 : 1 });
      app.querySelectorAll('.toggle').forEach((b) => b.classList.toggle('on', state[b.dataset.t]));
    };
    app.querySelectorAll('.toggle').forEach((b) => b.addEventListener('click', () => { state[b.dataset.t] = !state[b.dataset.t]; applyToggles(); }));
    applyToggles();
    $('.say-time', app).addEventListener('click', sayTime);
    m.say('המחוג הקצר והאדום מראה את השעה. המחוג הארוך והכחול מראה את הדקות. נסי להזיז אותם!');
  },

  // ---- אזור הורים ----
  parentsGate() {
    const a = 6 + Math.floor(Math.random() * 4), b = 3 + Math.floor(Math.random() * 7);
    app.innerHTML = `
      <section class="screen parents">
        <header class="topbar">
          <button class="icon-btn" data-act="home" aria-label="הביתה">🏠</button>
          <div class="topbar-title">אזור הורים</div><span class="spacer"></span>
        </header>
        <div class="card">
          <p>כדי להיכנס, פתרו את התרגיל:</p>
          <p class="gate-q" dir="ltr">${a} × ${b} = ?</p>
          <input class="gate-in" type="number" inputmode="numeric" pattern="[0-9]*" dir="ltr">
          <button class="btn primary gate-ok">כניסה</button>
        </div>
      </section>`;
    $('[data-act=home]', app).addEventListener('click', () => nav('home'));
    const go = () => { if (Number($('.gate-in', app).value) === a * b) nav('parents'); else $('.gate-in', app).classList.add('shake'); };
    $('.gate-ok', app).addEventListener('click', go);
    $('.gate-in', app).addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  },

  parents() {
    const voices = hebrewVoices();
    app.innerHTML = `
      <section class="screen parents">
        <header class="topbar">
          <button class="icon-btn" data-act="home" aria-label="הביתה">🏠</button>
          <div class="topbar-title">אזור הורים</div><span class="spacer"></span>
        </header>

        <div class="card">
          <h2>התקדמות</h2>
          <table class="stats">
            ${LEVELS.map((l, i) => `<tr><td>שלב ${l.id} – ${l.title}</td><td>⭐ ${store.stars(l.id)}</td><td>${store.isUnlocked(i) ? '🔓' : '🔒'}</td></tr>`).join('')}
          </table>
          <p class="muted">סבבים שהושלמו: ${store.data.rounds} · מדבקות: ${store.data.stickers.length}/${STICKERS.length} · שלב נפתח אחרי ${STARS_TO_UNLOCK} כוכבים בשלב הקודם.</p>
          <label class="row"><input type="checkbox" data-k="unlockAll" ${store.data.unlockAll ? 'checked' : ''}> לפתוח את כל השלבים</label>
        </div>

        <div class="card">
          <h2>📲 העברה לטלפון אחר</h2>
          <p class="muted">שולחים קישור (AirDrop, וואטסאפ או הודעה) שבתוכו כל הכוכבים והמדבקות של רוני.</p>
          <button class="btn primary share">📤 שליחת ההתקדמות</button>
          <hr>
          <p class="muted">בטלפון החדש: פותחים את המשחק, נכנסים לכאן, ומדביקים את הקישור שקיבלתם:</p>
          <textarea class="import-in" rows="2" dir="ltr" placeholder="הדביקו כאן את הקישור"></textarea>
          <button class="btn purple import">📥 קבלת התקדמות</button>
          <p class="import-msg muted"></p>
        </div>

        <div class="card">
          <h2>קול וצלילים</h2>
          <label class="row"><input type="checkbox" data-k="voice" ${store.data.voice ? 'checked' : ''}> הקראה בקול</label>
          <label class="row"><input type="checkbox" data-k="sound" ${store.data.sound ? 'checked' : ''}> צלילים</label>
          <label class="row">מהירות הקראה <input type="range" min="0.6" max="1.2" step="0.05" value="${store.data.rate}" class="rate"></label>
          <label class="row">קול
            <select class="voice-sel">
              <option value="">אוטומטי (הכי טוב שיש)</option>
              ${voices.map((v) => `<option ${v.name === store.data.voiceName ? 'selected' : ''}>${v.name}</option>`).join('')}
            </select>
          </label>
          ${voices.length ? '' : '<p class="muted">לא נמצא קול עברי בדפדפן. באייפון: הגדרות ← נגישות ← תוכן מוקרא ← קולות ← עברית, ולהוריד את "כרמית" (מומלץ הגרסה המשופרת).</p>'}
          <button class="btn purple test-voice">🔊 בדיקת קול</button>
        </div>

        <div class="card">
          <h2>איפוס</h2>
          <button class="btn danger reset">🗑 איפוס כל ההתקדמות</button>
        </div>
      </section>`;
    $('[data-act=home]', app).addEventListener('click', () => nav('home'));
    app.querySelectorAll('input[type=checkbox][data-k]').forEach((cb) => cb.addEventListener('change', () => {
      store.data[cb.dataset.k] = cb.checked; store.save();
      if (cb.dataset.k === 'unlockAll') nav('parents');
    }));
    $('.rate', app).addEventListener('change', (e) => { store.data.rate = Number(e.target.value); store.save(); });
    $('.voice-sel', app).addEventListener('change', (e) => { store.data.voiceName = e.target.value || null; store.save(); });
    $('.test-voice', app).addEventListener('click', () => speak('שלום רוני! השעה שבע וחצי. זה כמו שבע ושלושים.'));
    $('.reset', app).addEventListener('click', () => {
      if (confirm('למחוק את כל הכוכבים והמדבקות?')) { store.reset(); nav('parents'); }
    });

    $('.share', app).addEventListener('click', async () => {
      const url = store.transferLink();
      const text = `ההתקדמות של רוני ב"הגיע הזמן" (⭐ ${store.totalStars()})`;
      try {
        if (navigator.share) await navigator.share({ title: 'הגיע הזמן', text, url });
        else { await navigator.clipboard.writeText(url); alert('הקישור הועתק'); }
      } catch (e) {
        if (e.name !== 'AbortError') prompt('העתיקו את הקישור:', url);
      }
    });
    $('.import', app).addEventListener('click', () => {
      const raw = $('.import-in', app).value.trim();
      const code = raw.includes('#restore=') ? raw.split('#restore=')[1] : raw;
      const d = store.parseCode(code);
      const msg = $('.import-msg', app);
      if (!d) { msg.textContent = 'הקישור לא תקין. נסו להעתיק אותו שוב.'; return; }
      confirmRestore(d, () => nav('parents'));
    });
  },

  restore({ data }) {
    confirmRestore(data, () => nav('splash'), () => nav('splash'));
  },
};

function confirmRestore(d, done, cancel = done) {
  const stars = Object.values(d.stars).reduce((a, b) => a + b, 0);
  app.innerHTML = `
    <section class="screen parents">
      <div class="card center">
        <div class="splash-mitzi small">${mitziSVG('happy')}</div>
        <h2>להעביר את ההתקדמות של רוני לטלפון הזה?</h2>
        <p class="big-stat">⭐ ${stars} · 🎁 ${d.stickers.length}</p>
        <p class="muted">ההתקדמות שכבר שמורה בטלפון הזה תוחלף.</p>
        <button class="btn primary yes">כן, להעביר</button>
        <button class="btn purple no">ביטול</button>
      </div>
    </section>`;
  $('.yes', app).addEventListener('click', () => { store.importData(d); confetti(40); done(); });
  $('.no', app).addEventListener('click', cancel);
}

// קישור העברה: ...#restore=CODE
const m = location.hash.match(/^#restore=(.+)$/);
if (m) {
  history.replaceState(null, '', location.pathname + location.search);
  const data = store.parseCode(m[1]);
  if (data) nav('restore', { data }); else nav('splash');
} else {
  nav('splash');
}

navigator.storage?.persist?.().catch(() => {});

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
