// רכיב שעון מחוגים ב-SVG: ציור, אנימציה וגרירת מחוגים באצבע.
// הזמן נשמר כ-t = דקות מ-12:00 (0–719).

const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}
const norm = (a) => ((a % 360) + 360) % 360;
const angDiff = (a, b) => { const d = Math.abs(norm(a) - norm(b)); return Math.min(d, 360 - d); };

export class Clock {
  constructor(container, opts = {}) {
    this.o = {
      interactive: false, step: 5, lockMinute: false, helpers: false,
      onChange: null, onRelease: null, onTick: null, ...opts,
    };
    this.t = 0;
    this.drag = null;
    this.anim = null;

    const svg = (this.svg = el('svg', { viewBox: '-128 -128 256 256', class: 'clock', role: 'img' }, container));
    el('circle', { r: 104, class: 'face-rim' }, svg);
    el('circle', { r: 98, class: 'face' }, svg);

    for (let i = 0; i < 60; i++) {
      const big = i % 5 === 0;
      const a = (i * 6 * Math.PI) / 180;
      const r1 = 92, r2 = big ? 80 : 86;
      el('line', {
        x1: Math.sin(a) * r1, y1: -Math.cos(a) * r1, x2: Math.sin(a) * r2, y2: -Math.cos(a) * r2,
        class: big ? 'tick big' : 'tick',
      }, svg);
    }
    for (let n = 1; n <= 12; n++) {
      const a = (n * 30 * Math.PI) / 180;
      const tx = el('text', { x: Math.sin(a) * 66, y: -Math.cos(a) * 66 + 1, class: 'num' }, svg);
      tx.textContent = n;
    }
    this.helpersG = el('g', { class: 'helpers' }, svg);
    for (let i = 0; i < 12; i++) {
      const a = (i * 30 * Math.PI) / 180;
      const tx = el('text', { x: Math.sin(a) * 116, y: -Math.cos(a) * 116 + 1, class: 'helper-num' }, this.helpersG);
      tx.textContent = i * 5;
    }

    this.hourG = el('g', { class: 'hand hour' }, svg);
    el('line', { x1: 0, y1: 10, x2: 0, y2: -50, class: 'hit' }, this.hourG);
    el('line', { x1: 0, y1: 10, x2: 0, y2: -50, class: 'shape' }, this.hourG);

    this.minuteG = el('g', { class: 'hand minute' }, svg);
    el('line', { x1: 0, y1: 14, x2: 0, y2: -84, class: 'hit' }, this.minuteG);
    el('line', { x1: 0, y1: 14, x2: 0, y2: -84, class: 'shape' }, this.minuteG);

    el('circle', { r: 8, class: 'pin' }, svg);
    el('circle', { r: 3, class: 'pin-dot' }, svg);

    this.setHelpers(this.o.helpers);
    this.setInteractive(this.o.interactive);
    this._bind();
    this.render();
  }

  hourAngle() { return (((this.t % 720) + 720) % 720) / 2; }
  minuteAngle() { return (((this.t % 60) + 60) % 60) * 6; }

  render() {
    this.hourG.setAttribute('transform', `rotate(${this.hourAngle()})`);
    this.minuteG.setAttribute('transform', `rotate(${this.minuteAngle()})`);
  }

  setTime(t) {
    this._stopAnim();
    this.t = ((Math.round(t) % 720) + 720) % 720;
    this.render();
  }

  /** אנימציה של המחוגים לשעה חדשה (בדרך הקצרה). */
  animateTo(target, ms = 900) {
    this._stopAnim();
    const from = this.t;
    const d = ((((target - from) % 720) + 1080) % 720) - 360;
    const start = performance.now();
    return new Promise((resolve) => {
      const step = (now) => {
        const p = Math.min(1, (now - start) / ms);
        const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        this.t = from + d * e;
        this.render();
        if (p < 1) this.anim = requestAnimationFrame(step);
        else { this.anim = null; this.setTime(target); resolve(); }
      };
      this.anim = requestAnimationFrame(step);
    });
  }

  _stopAnim() { if (this.anim) { cancelAnimationFrame(this.anim); this.anim = null; } }

  setHelpers(on) { this.helpersG.style.display = on ? '' : 'none'; }
  setInteractive(on) { this.o.interactive = on; this.svg.classList.toggle('interactive', on); }
  setOptions(o) { Object.assign(this.o, o); if ('helpers' in o) this.setHelpers(o.helpers); if ('interactive' in o) this.setInteractive(o.interactive); }

  /** הבהוב של מחוג כדי למשוך תשומת לב ('hour' / 'minute'). */
  flash(which) {
    const g = which === 'hour' ? this.hourG : this.minuteG;
    g.classList.remove('flash');
    void g.getBBox();
    g.classList.add('flash');
    setTimeout(() => g.classList.remove('flash'), 2000);
  }

  _point(e) {
    const p = this.svg.createSVGPoint();
    p.x = e.clientX; p.y = e.clientY;
    return p.matrixTransform(this.svg.getScreenCTM().inverse());
  }

  _pickHand(ang, dist) {
    if (this.o.lockMinute) return 'hour';
    const dh = angDiff(ang, this.hourAngle());
    const dm = angDiff(ang, this.minuteAngle());
    if (dist < 60 && dh < 35) return 'hour';
    if (dm < 30) return 'minute';
    if (dh < 30) return 'hour';
    return dist < 60 ? 'hour' : 'minute';
  }

  _moveTo(ang) {
    let t;
    if (this.drag === 'minute') {
      const step = this.o.step;
      const m = (Math.round(ang / 6 / step) * step) % 60;
      const cur = ((Math.round(this.t) % 60) + 60) % 60;
      let h = Math.floor(Math.round(this.t) / 60);
      const d = m - cur;
      if (d < -30) h++; // עברנו את ה-12 קדימה
      else if (d > 30) h--; // עברנו את ה-12 אחורה
      t = h * 60 + m;
    } else {
      const m = ((Math.round(this.t) % 60) + 60) % 60;
      const h = Math.round(ang / 30 - m / 60);
      t = h * 60 + m;
    }
    t = ((t % 720) + 720) % 720;
    if (t !== this.t) {
      this.t = t;
      this.render();
      this.o.onTick?.(this.drag);
      this.o.onChange?.(t);
    }
  }

  _bind() {
    const angleOf = (p) => norm((Math.atan2(p.x, -p.y) * 180) / Math.PI);
    this.svg.addEventListener('pointerdown', (e) => {
      if (!this.o.interactive) return;
      e.preventDefault();
      this._stopAnim();
      this.t = Math.round(this.t);
      const p = this._point(e);
      const dist = Math.hypot(p.x, p.y);
      if (dist > 128) return;
      const ang = angleOf(p);
      this.drag = this._pickHand(ang, dist);
      this.svg.classList.add('dragging', `dragging-${this.drag}`);
      try { this.svg.setPointerCapture(e.pointerId); } catch {}
      this._moveTo(ang);
    });
    this.svg.addEventListener('pointermove', (e) => {
      if (!this.drag) return;
      e.preventDefault();
      this._moveTo(angleOf(this._point(e)));
    });
    const end = () => {
      if (!this.drag) return;
      this.svg.classList.remove('dragging', 'dragging-hour', 'dragging-minute');
      this.drag = null;
      this.o.onRelease?.(this.t);
    };
    this.svg.addEventListener('pointerup', end);
    this.svg.addEventListener('pointercancel', end);
  }
}
