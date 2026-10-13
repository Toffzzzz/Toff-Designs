/*
 * Lab piece 5: Ink that moves (#ink).
 * Midnight water with cream and gold ink (assets/lab/pieces/ink/fluid.js). The pointer or a finger
 * stirs it; pressing and dragging lays down gold. Type a name and the studio's pen (the handwriting
 * line's Hershey cursive, laid out by ink/cursive.js) writes it into the water in cream with the gold
 * under-shadow, at the handwriting's own pace, and the water carries it away.
 *
 * Contract (rounds/round-05-plan.md section 6):
 *   mount(container, { reducedMotion, lowPower, soundOn, still }) -> { title, made, goodFor, describe, pause, resume, dispose }
 */
import { loadCss, el, tokens, rgb, settings, isPhone, coarse, listeners, stillGate, makeSound } from './ink/kit.js';
import { layoutName, cleanName } from './ink/cursive.js';
import { createFluid } from './ink/fluid.js';

const TITLE = 'Ink that moves';
const MADE = 'A fluid simulation on the graphics card; the pen writes your name into it in the same hand as the line on our home page.';
const GOOD_FOR = 'artisans and studios';
let uid = 0;

export async function mount(container, { reducedMotion = false, lowPower = false, soundOn = false, still } = {}) {
  const base = new URL('./ink/', import.meta.url);
  const id = 'lp-ink-' + (++uid);
  const root = el('div', { class: 'lp lp-ink' });
  container.appendChild(root);
  await Promise.all([loadCss(root, new URL('kit.css', base).href), loadCss(root, new URL('ink.css', base).href)]);

  const S = settings(), hw = S.handwriting || {};
  const studio = S.studioName || 'Toff Studio';
  const ev = listeners(), sound = makeSound(!!soundOn);
  let written = '', fluid = null, raf = 0, paused = false, disposed = false, gate = null, live = null;

  const status = el('p', { class: 'lp-sr', 'aria-live': 'polite' });
  root.appendChild(status);

  function describe() {
    const what = written ? `The pen has written “${written}” into it in a flowing cursive, cream with a fine gold shadow under the line. ` : '';
    return `${TITLE}. A dark pool of midnight water with fine threads of gold and cream ink that curl and marble as the water moves. ${what}` +
      'Move the pointer or drag a finger through the water to stir it; press and drag to lay down gold ink. Type a name and choose Write it, and the pen writes it into the ink. With the keyboard, focus the water and use the arrow keys to push a current through it.';
  }

  // ---- a still, for reduced motion, low power and browsers without WebGL 2
  function paintStill(c, d) {
    const g = c.getContext('2d'), T = tokens(root), W = c.width / d, H = c.height / d;
    g.scale(d, d); g.fillStyle = T.bg; g.fillRect(0, 0, W, H);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const plan = layoutName(studio, { width: W * 0.8, height: H * 0.34, cx: W / 2, cy: H * 0.5, maxLineHeight: W < 700 ? 120 : 220 });
    const [nt, nb] = extent(plan.strokes);
    threadRows(H, nt, nb).forEach((y0, i) => {
      g.strokeStyle = T.gold; g.globalAlpha = 0.55; g.lineWidth = 1.6; g.beginPath();
      for (let x = -10; x <= W + 10; x += 8) { const y = threadY(x, y0, i); if (x < 0) g.moveTo(x, y); else g.lineTo(x, y); }
      g.stroke();
    });
    g.globalAlpha = 1;
    const lw = Math.max(2.4, Math.min(4.6, plan.scale * 0.62));
    [[T.gold, lw + 1.2, 3.5, 0.55], [T.ink, lw, 0, 1]].forEach(([colr, w, dy, a]) => {
      g.strokeStyle = colr; g.globalAlpha = a; g.lineWidth = w;
      plan.strokes.forEach((s) => { g.beginPath(); s.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y + dy) : g.moveTo(x, y + dy))); g.stroke(); });
    });
    g.globalAlpha = 1;
  }

  const api = {
    title: TITLE, made: MADE, goodFor: GOOD_FOR, describe,
    pause() { paused = true; if (raf) cancelAnimationFrame(raf); raf = 0; },
    resume() { if (disposed) return; paused = false; if (live) live.wake(); },
    dispose() {
      if (disposed) return; disposed = true;
      if (raf) cancelAnimationFrame(raf); raf = 0;
      ev.clear(); if (live) live.stop(); if (fluid) fluid.dispose(); fluid = null;
      sound.dispose(); if (gate) gate.remove(); root.remove();
    },
  };

  const needsGate = reducedMotion || lowPower;
  if (needsGate) {
    gate = stillGate(root, {
      still, draw: paintStill,
      message: reducedMotion ? 'Your device asks for less motion, so this is a still. Press Play to see the ink move.' : 'This one works the graphics card hard. Press Play to start a lighter version.',
      label: 'Play: start the moving ink',
    });
    gate.played.then(() => { if (!disposed) { start(lowPower); gate.leave(); } });
    return api;
  }
  await start(false);
  return api;

  // ---------------------------------------------------------------- the live piece
  async function start(light) {
    const T = tokens(root);
    const canvas = el('canvas', { class: 'lp-canvas', tabindex: '0', role: 'img', 'aria-label': describe() });
    const stage = el('div', { class: 'lp-live' }, [canvas]);
    root.insertBefore(stage, root.firstChild);
    fluid = createFluid(canvas, {
      light,
      colours: { bg: rgb(T.bg), cream: rgb(T.ink), gold: rgb(T.gold), deep: mixRgb(rgb(T.gold), rgb(T.bg), 0.45) },
    });
    if (!fluid) {
      stage.remove();
      const c = el('canvas', { class: 'lp-canvas', role: 'img', 'aria-label': describe() });
      root.insertBefore(c, root.firstChild);
      const r = root.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.round(r.width * d); c.height = Math.round(r.height * d); paintStill(c, d);
      root.appendChild(el('p', { class: 'lp-ink-note', text: 'The moving ink needs WebGL 2, which this browser doesn’t offer, so here is a still of it.' }));
      return;
    }

    // ---- the panel
    const input = el('input', { id: id + '-name', class: 'lp-input', type: 'text', maxlength: '24', autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false', enterkeyhint: 'go', placeholder: 'Your name' });
    const write = el('button', { type: 'submit', class: 'lp-btn lp-btn--line', text: 'Write it' });
    const clearBtn = el('button', { type: 'button', class: 'lp-btn lp-btn--quiet', text: 'Clear the water' });
    const form = el('form', { class: 'lp-panel', 'aria-label': 'Write in the ink' }, [
      el('div', {}, [el('label', { class: 'lp-label', for: input.id, text: 'Type your name' }), el('div', { class: 'lp-row' }, [input, write])]),
      el('p', { class: 'lp-hint', text: coarse() ? 'Draw through the water with a finger to stir it and leave gold behind.' : 'Move through the water to stir it. Press and drag to leave gold behind.' }),
      el('div', { class: 'lp-actions' }, [clearBtn]),
    ]);
    root.appendChild(form);

    const tok = tokens(root);
    const safeTop = tok.safeTop, safeBottom = tok.safeBottom;
    const penSpeed = isPhone() ? (hw.phoneSpeedPx || 620) : (hw.autoSpeedPx || 820);
    const shadowDy = (hw.shadow && hw.shadow.offsetPx) || 3.5;

    // ---- the pen
    let pen = null;                 // { strokes, t, total, idx }
    let penTip = { x: 0, y: 0, r: 3.4, a: 0 };
    function nameBox() {
      const { w, h } = fluid.size();
      const pr = form.getBoundingClientRect(), rr = root.getBoundingClientRect();
      const phone = w < 700;
      const top = phone ? (pr.bottom - rr.top) + 16 : safeTop + 24, bottom = h - safeBottom - 24;
      return { width: w * (phone ? 0.88 : 0.74), height: Math.max(80, (bottom - top) * (phone ? 0.62 : 0.46)), cx: w / 2 + (phone ? 0 : Math.min(120, w * 0.06)), cy: phone ? (top + bottom) / 2 : top + (bottom - top) * 0.54, maxLineHeight: phone ? 150 : 250 };
    }
    function writeName(text) {
      const clean = cleanName(text);
      if (!clean) return false;
      const plan = layoutName(clean, nameBox());
      if (!plan.strokes.length) return false;
      let t = 0;
      const strokes = plan.strokes.map((s) => {
        const cum = [0];
        for (let i = 1; i < s.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(s.pts[i][0] - s.pts[i - 1][0], s.pts[i][1] - s.pts[i - 1][1]));
        const item = { pts: s.pts, cum, len: Math.max(1, s.len), start: t, done: 0 };
        t += item.len / penSpeed + (s.mark ? 0.16 : 0.11);
        return item;
      });
      const lw = Math.max(1.5, Math.min(2.6, plan.scale * 0.3));
      // a name already in the water: the water clears that part first, then the pen writes
      let box = bounds(plan.strokes, lw + 8);
      const wait = lastBox ? 0.75 : 0;
      if (lastBox) { wash = { box: union(box, lastBox), t: 0, dur: wait }; }
      lastBox = box;
      pen = { strokes, t: -wait, total: t, idx: 0, lw, text: plan.text };
      written = plan.text;
      say(`Writing “${plan.text}”.`);
      wake();
      return true;
    }
    let lastBox = null, wash = null;
    function bounds(strokes, pad) {
      const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
      strokes.forEach((s) => s.pts.forEach(([x, y]) => { b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y + shadowDy); }));
      return { x0: b.x0 - pad, y0: b.y0 - pad, x1: b.x1 + pad, y1: b.y1 + pad };
    }
    function union(a, b) { return { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) }; }
    function washStep(dt) {
      if (!wash) return;
      wash.t += dt;
      fluid.wash(wash.box, Math.pow(0.02, dt / wash.dur));      // down to 2% over the wash
      if (wash.t >= wash.dur) wash = null;
    }
    function sub(item, d0, d1) {
      const { pts, cum } = item, out = [];
      const at = (d) => {
        let j = 0; while (j < cum.length - 2 && cum[j + 1] < d) j++;
        const f = (d - cum[j]) / ((cum[j + 1] - cum[j]) || 1);
        return [pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f];
      };
      if (pts.length < 2) return pts.slice();
      out.push(at(d0));
      for (let i = 1; i < pts.length - 1; i++) if (cum[i] > d0 && cum[i] < d1) out.push(pts[i]);
      out.push(at(d1));
      return out;
    }
    function penStep(dt) {
      if (!pen) return;
      pen.t += dt;
      let moved = false;
      for (let i = pen.idx; i < pen.strokes.length; i++) {
        const it = pen.strokes[i];
        if (pen.t < it.start) break;
        const d1 = Math.min(it.len, (pen.t - it.start) * penSpeed);
        if (d1 > it.done + 0.01) {
          const pts = sub(it, Math.max(0, it.done - 0.5), d1);
          fluid.ink(pts.map(([x, y]) => [x, y + shadowDy]), { gold: 0.62, radius: pen.lw + 0.8 });
          fluid.ink(pts, { cream: 1, radius: pen.lw });
          const last = pts[pts.length - 1];
          penTip.x = last[0]; penTip.y = last[1]; penTip.a = 1;
          it.done = d1; moved = true;
        }
        if (it.done >= it.len - 0.01) pen.idx = i + 1;
      }
      if (moved) sound.scratch();
      if (pen.t >= pen.total) { pen = null; say(`Written: “${written}”.`); canvas.setAttribute('aria-label', describe()); }
    }

    // ---- gold threads and a few slow turns when the piece opens (stops for good once the visitor takes over)
    let auto = true, autoT = 0;
    const kicks = [];
    function seed() {
      const { w, h } = fluid.size();
      const [nt, nbot] = extent(layoutName(studio, nameBox()).strokes);
      threadRows(h, nt, nbot).forEach((y0, i) => {
        const pts = [];
        for (let x = -10; x <= w + 10; x += 9) pts.push([x, threadY(x, y0, i)]);
        fluid.ink(pts, { gold: 0.72, radius: 1.25, soft: 0.8 });
      });
      const r = (a, b) => a + Math.random() * (b - a);
      kicks.length = 0;
      const nb = nameBox(), avoidTop = nb.cy - nb.height * 0.62, avoidBottom = nb.cy + nb.height * 0.62;
      for (let k = 0; k < 6; k++) {
        const top = k % 2 === 0;
        const y = top ? r(h * 0.08, Math.max(h * 0.1, avoidTop - 40)) : r(Math.min(h * 0.9, avoidBottom + 40), h * 0.92);
        kicks.push({ t: 0.2 + k * 0.42, x: w * r(0.1, 0.9), y, a: r(-0.5, 0.5) + (Math.random() < 0.5 ? 0 : Math.PI), done: false });
      }
    }
    function autoStep(dt) {
      if (!auto) return;
      autoT += dt;
      const { w } = fluid.size(), rad = Math.max(40, w * 0.05);
      kicks.forEach((k) => {
        if (k.done || autoT < k.t) return;
        k.done = true;
        const v = 260;
        fluid.swirl(k.x - rad * 0.5, k.y, Math.cos(k.a) * v, Math.sin(k.a) * v, rad);
        fluid.swirl(k.x + rad * 0.5, k.y, -Math.cos(k.a) * v, -Math.sin(k.a) * v, rad);
      });
      if (kicks.every((k) => k.done)) auto = false;
    }
    function takeOver() { auto = false; }

    // ---- the pointer and a finger
    let last = null, dragging = false;
    function local(e) { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    function stir(p, t, laying) {
      if (paused) return;
      if (last) {
        const dt = Math.max(0.008, (t - last.t) / 1000), dx = p[0] - last.p[0], dy = p[1] - last.p[1];
        const sp = Math.hypot(dx, dy) / dt, k = Math.min(1, 2400 / (sp || 1));
        const rad = isPhone() ? 30 : 42;
        if (Math.hypot(dx, dy) > 0.5) fluid.swirl(p[0], p[1], dx / dt * k * 0.85, dy / dt * k * 0.85, rad);
        if (laying) fluid.ink([last.p, p], { gold: 0.9, radius: 1.15, soft: 0.7 });
      }
      last = { p, t };
      wake();
    }
    ev.on(canvas, 'pointerdown', (e) => {
      takeOver(); dragging = true; canvas.setAttribute('data-dragging', '');
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
      last = { p: local(e), t: e.timeStamp };
      fluid.ink([last.p], { gold: 0.9, radius: 2.2 }); wake();
    });
    ev.on(canvas, 'pointermove', (e) => {
      const touchy = e.pointerType !== 'mouse';
      if (touchy && !dragging) return;
      if (!dragging && !last) { last = { p: local(e), t: e.timeStamp }; return; }
      if (!dragging) takeOver();
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      (evs.length ? evs : [e]).forEach((c) => stir(local(c), c.timeStamp, dragging));
    });
    const up = () => { dragging = false; canvas.removeAttribute('data-dragging'); last = null; };
    ev.on(canvas, 'pointerup', up); ev.on(canvas, 'pointercancel', up);
    ev.on(canvas, 'pointerleave', (e) => { if (e.pointerType === 'mouse' && !dragging) last = null; });
    ev.on(canvas, 'keydown', (e) => {
      const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (!dir || paused) return;
      e.preventDefault(); takeOver();
      const { w, h } = fluid.size(), v = 900;
      fluid.swirl(w / 2 - dir[0] * w * 0.08, h / 2 - dir[1] * h * 0.08, dir[0] * v, dir[1] * v, Math.max(60, Math.min(w, h) * 0.12));
      wake();
    });
    ev.on(form, 'submit', (e) => {
      e.preventDefault(); takeOver();
      if (!writeName(input.value)) { input.focus(); say('Type a name first, in letters the pen knows.'); }
    });
    ev.on(clearBtn, 'click', () => { takeOver(); pen = null; wash = null; lastBox = null; written = ''; penTip.a = 0; fluid.clear(); seedThreadsOnly(); say('The water is clear.'); canvas.setAttribute('aria-label', describe()); wake(); });
    function seedThreadsOnly() { const a = auto; seed(); auto = a; kicks.forEach((k) => { k.done = true; }); }

    // ---- size changes keep the ink
    let resizeTimer = 0;
    const ro = new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (!disposed && fluid) { fluid.resize(); wake(); } }, 120); });
    ro.observe(canvas);
    ev.on(canvas, 'webglcontextlost', (e) => { e.preventDefault(); stop(); });

    // ---- the loop (sleeps when the water is still, wakes on any touch)
    let lastT = 0, quietSince = 0, sleeping = false;
    function frame(now) {
      raf = 0;
      if (paused || disposed || !fluid) return;
      const real = Math.min(0.25, Math.max(1 / 240, ((now - (lastT || now)) / 1000) || 1 / 60));
      const dt = Math.min(1 / 40, real);
      lastT = now;
      autoStep(dt); washStep(real); penStep(real);
      fluid.step(dt);
      if (!pen) penTip.a = Math.max(0, penTip.a - dt * 4);
      fluid.render(penTip.a > 0 ? penTip : null);
      const busy = pen || wash || auto || dragging || (last && now - last.t < 400);
      if (busy) quietSince = now;
      if (now - quietSince > 9000) { sleeping = true; return; }
      raf = requestAnimationFrame(frame);
    }
    function wake() { sleeping = false; quietSince = performance.now(); if (!raf && !paused && !disposed) { lastT = 0; raf = requestAnimationFrame(frame); } }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; ro.disconnect(); clearTimeout(resizeTimer); }
    function say(t) { status.textContent = t; }
    live = { wake, stop };

    seed();
    writeName(studio);
    fluid.step(1 / 60); fluid.render(null);
    requestAnimationFrame(() => stage.setAttribute('data-in', ''));
    await new Promise((res) => requestAnimationFrame(() => res()));
    if (!paused) wake();
  }
}

/* where the gold threads run: three above the name, four below, never through it */
function threadRows(h, nameTop, nameBottom) {
  const ys = [], a0 = h * 0.05, a1 = Math.max(a0 + 20, nameTop - 28), b0 = Math.min(h * 0.95 - 20, nameBottom + 34), b1 = h * 0.95;
  for (let i = 0; i < 3; i++) ys.push(a0 + (a1 - a0) * (i + 0.5) / 3);
  for (let i = 0; i < 4; i++) ys.push(b0 + (b1 - b0) * (i + 0.4) / 4);
  return ys;
}
function threadY(x, y0, i) { return y0 + Math.sin(x / (170 + i * 37) + i * 1.7) * (8 + i * 2) + Math.sin(x / 61 + i) * 2.5; }
function extent(strokes) {
  let t = Infinity, b = -Infinity;
  strokes.forEach((s) => s.pts.forEach(([, y]) => { t = Math.min(t, y); b = Math.max(b, y); }));
  return [t, b];
}

function mixRgb(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
