/*
 * Lab piece 3: "A million specks" (lab.html#specks)
 *
 * Art direction: gold dust in a dark room. Up to a million fine specks, gold with a little amber and
 * cream, a few larger flakes that catch the light, gather into the name you type, then sweep across,
 * one after another like a gust, into a laptop, a phone and the Toff T, each a real 3D arrangement seen
 * in three-quarter view, slowly turning. They arrive on springs with a curling drift, so a change reads
 * as a current of dust, never a jump. The pointer or a finger pushes them aside; a tap scatters them.
 * The interface around it is the studio's: midnight, Work Sans labels, a serif field, gold for what's
 * selected, nothing that glows.
 *
 * How it is made: where WebGPU is available, three.js's WebGPURenderer with a TSL compute shader moves
 * every speck on the graphics card each frame (1,000,000 on a laptop, 600,000 on a phone, 250,000 when
 * low powered); elsewhere a WebGL2 version runs the same physics as a fragment shader over float textures
 * (262,144 specks, or 65,536 when low powered). The shapes are drawn in code (specks/shapes.js).
 *
 * Contract (rounds/round-05-plan.md section 6):
 *   const piece = await mount(container, { reducedMotion, lowPower, soundOn, still });
 *   piece.title, piece.made, piece.goodFor, piece.describe(), piece.pause(), piece.resume(), await piece.dispose()
 * Extra options for tests only: forceWebGL, count (WebGPU speck count), name, shape ('name'|'laptop'|'phone'|'t').
 * The Lab can set --lab-caption-h on the container to tell the piece how tall its caption bar is.
 */
import { makeShape, loadFont } from './specks/shapes.js';

const TITLE = 'A million specks';
const MADE = 'Up to a million gold specks, each moved every frame on your graphics card by a WebGPU compute shader, or by WebGL2 with fewer where WebGPU isn’t available.';
const GOOD_FOR = 'Launches and events';
const SHAPES = [
  { id: 'name', label: 'Your name' },
  { id: 'laptop', label: 'Laptop' },
  { id: 'phone', label: 'Phone' },
  { id: 't', label: 'The T' },
];
const HOLD = { name: 4.6, laptop: 5.2, phone: 5.2, t: 5.2 };   // seconds each shape holds in the one pass

const CSS = `
.sp-root { position: absolute; inset: 0; overflow: hidden; background: var(--bg, #0E1628); color: var(--text, #F6F0E4);
  font: 400 15px/1.5 var(--sans, "Work Sans", system-ui, sans-serif); -webkit-tap-highlight-color: transparent; }
.sp-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; }
.sp-panel { position: absolute; z-index: 2; top: max(var(--s-5, 24px), env(safe-area-inset-top)); left: var(--margin, 16px); right: var(--margin, 16px);
  display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--s-3, 12px) var(--s-5, 24px); pointer-events: none; }
.sp-panel > * { pointer-events: auto; }
.sp-field { display: grid; gap: 6px; }
.sp-label { color: var(--slate, #A7AFC2); font-size: 15px; line-height: 1.2; }
.sp-row { display: flex; gap: var(--s-2, 8px); align-items: center; }
.sp-input { width: 13em; max-width: calc(100vw - 2 * var(--margin, 16px) - 110px); min-height: 52px; padding: 2px 14px 0;
  border: 1px solid var(--outline, rgba(167,175,194,.4)); border-radius: var(--radius, 8px); background: var(--tint, #1A2541);
  color: var(--text, #F6F0E4); caret-color: var(--gold, #D8AC5F); font: 400 26px/1 var(--serif, "Cormorant Garamond", Georgia, serif); }
.sp-input:focus-visible { outline: 2px solid var(--gold, #D8AC5F); outline-offset: 3px; border-color: transparent; }
.sp-btn { min-height: 44px; padding: 0 16px; border: 1px solid var(--outline, rgba(167,175,194,.4)); border-radius: var(--radius, 8px);
  background: var(--tint, #1A2541); color: var(--ink, #F1E3C6); font: 500 15px/1.2 var(--sans, "Work Sans", system-ui, sans-serif); cursor: pointer;
  transition: border-color var(--dur-quick, 180ms) var(--ease-out, ease), color var(--dur-quick, 180ms) var(--ease-out, ease); }
.sp-btn:focus-visible { outline: 2px solid var(--gold, #D8AC5F); outline-offset: 3px; }
@media (hover: hover) { .sp-btn:hover { border-color: var(--gold, #D8AC5F); } }
.sp-shapes { display: flex; flex-wrap: wrap; gap: var(--s-2, 8px); margin: 0; padding: 0; border: 0; }
.sp-shapes legend { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
.sp-shapes .sp-btn[aria-pressed="true"] { border-color: var(--gold, #D8AC5F); color: var(--gold, #D8AC5F); }
.sp-meta { flex-basis: 100%; margin: 0; color: var(--slate, #A7AFC2); font-size: 14px; }
@media (max-width: 699px) { .sp-shapes .sp-btn { padding: 0 12px; } .sp-panel { row-gap: 10px; } }
.sp-meta .sp-touch { display: none; }
@media (hover: none) { .sp-meta .sp-fine { display: none; } .sp-meta .sp-touch { display: inline; } }
.sp-still { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.sp-play { position: absolute; z-index: 3; left: 50%; bottom: calc(var(--lab-caption-h, 112px) + 24px); transform: translateX(-50%);
  min-height: 48px; padding: 0 28px; border: 0; border-radius: var(--radius, 8px); background: var(--gold, #D8AC5F); color: var(--bg, #0E1628);
  font: 500 15px/1.2 var(--sans, "Work Sans", system-ui, sans-serif); cursor: pointer; }
.sp-play:focus-visible { outline: 2px solid var(--text, #F6F0E4); outline-offset: 3px; }
.sp-msg { position: absolute; left: var(--margin, 16px); right: var(--margin, 16px); top: 45%; text-align: center; color: var(--slate, #A7AFC2); }
.sp-sr { position: absolute !important; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0; }
@media (min-width: 1024px) { .sp-meta { flex-basis: auto; margin-left: auto; align-self: flex-end; padding-bottom: 12px; } }`;
let styleUsers = 0, styleEl = null;
function addStyle() { styleUsers++; if (!styleEl) { styleEl = document.createElement('style'); styleEl.dataset.labPiece = 'specks'; styleEl.textContent = CSS; document.head.appendChild(styleEl); } }
function removeStyle() { styleUsers = Math.max(0, styleUsers - 1); if (!styleUsers && styleEl) { styleEl.remove(); styleEl = null; } }

function perspective(w, h) {
  const D = (h / 2) / Math.tan((15 * Math.PI) / 180), f = 1 / Math.tan((15 * Math.PI) / 180), near = D * 0.2, far = D * 3, a = w / h;
  const nf = 1 / (near - far);
  // proj * translate(0, 0, -D), column-major
  return { D, mvp: new Float32Array([f / a, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, -D * (far + near) * nf + 2 * far * near * nf, D]) };
}

export async function mount(container, opts = {}) {
  const reducedMotion = !!opts.reducedMotion;
  const lowPower = !!opts.lowPower;
  const ac = new AbortController();
  const on = (t, ev, fn, o) => t.addEventListener(ev, fn, Object.assign({ signal: ac.signal }, o || {}));
  addStyle();

  const uid = 'sp-' + Math.random().toString(36).slice(2, 8);
  const root = document.createElement('div');
  root.className = 'sp-root';
  root.innerHTML = `
    <div class="sp-panel">
      <div class="sp-field">
        <label class="sp-label" for="${uid}-name">Your name</label>
        <div class="sp-row">
          <input class="sp-input" id="${uid}-name" type="text" maxlength="24" autocomplete="off" spellcheck="false" aria-describedby="${uid}-meta" />
          <button class="sp-btn sp-scatter" type="button">Scatter</button>
        </div>
      </div>
      <fieldset class="sp-shapes"><legend>Shape</legend>
        ${SHAPES.map((s) => `<button class="sp-btn" type="button" data-shape="${s.id}" aria-pressed="false">${s.label}</button>`).join('')}
      </fieldset>
      <p class="sp-meta" id="${uid}-meta"><span class="sp-count"></span> <span class="sp-fine">Run the pointer through them.</span><span class="sp-touch">Drag a finger through them.</span></p>
    </div>
    <p class="sp-sr" aria-live="polite"></p>`;
  container.appendChild(root);
  const panel = root.querySelector('.sp-panel');
  const input = root.querySelector('.sp-input');
  const scatterBtn = root.querySelector('.sp-scatter');
  const shapeBtns = [...root.querySelectorAll('[data-shape]')];
  const countEl = root.querySelector('.sp-count');
  const live = root.querySelector('[aria-live]');
  let name = (opts.name || 'Toff Studio').slice(0, 24);
  input.value = name;

  let canvas = null, engine = null, raf = 0, running = false, paused = false, disposed = false;
  let played = !(reducedMotion || lowPower);
  let w = 1, h = 1, dpr = 1, avail = { w: 1, h: 1, oy: 0 };
  let kind = SHAPES.some((s) => s.id === opts.shape) ? opts.shape : 'name';
  let auto = !opts.shape, seqT = 0, seqIndex = 0, seqDone = false;
  let swayAmp = 0, swayTarget = 0.05, swayT = 0, alpha = 0.3, alphaTarget = 0.3, lastNow = 0, frames = 0, shapeMs = 0;
  let stillImg = null, playBtn = null;
  const U = {
    time: 0, dt: 0.016, switchT: 0, spanX: 700, jitter: 1, stiff: 1, swirl: 1, rad: 120, ptrOn: 0, burst: 0,
    ptr: [1e5, 1e5], ptrVel: [0, 0], burstPos: [0, 0], offset: [0, 0, 0], rot: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    mvp: null, camD: 1000, size: 1, alpha: 0.3,
  };
  const ptr = { x: 1e5, y: 1e5, vx: 0, vy: 0, t: 0, active: false, down: null };

  function announce(text) { live.textContent = ''; setTimeout(() => { if (!disposed) live.textContent = text; }, 30); }
  function pressed() { shapeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.shape === kind))); }
  pressed();

  /* --- Engine --- */
  async function makeEngine() {
    const tryGPU = !opts.forceWebGL && 'gpu' in navigator;
    if (tryGPU) {
      try {
        const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
        if (adapter && !disposed) {
          const small = Math.min(window.innerWidth, window.innerHeight) < 700;
          const count = opts.count || (lowPower ? 250000 : small ? 600000 : 1000000);
          const c = newCanvas();
          const { createGPU } = await import('./specks/gpu.js');
          const e = await createGPU(c, { count });
          if (e && !disposed) { canvas = c; return e; }
          if (e) e.dispose();
          c.remove();
        }
      } catch (err) {
        console.warn('Specks: WebGPU unavailable, using WebGL2.', err && err.message);
      }
    }
    if (disposed) return null;
    const c = newCanvas();
    const { createGL } = await import('./specks/gl.js');
    const e = createGL(c, { lowPower });
    if (e) { canvas = c; return e; }
    c.remove();
    return null;
  }
  function newCanvas() {
    const c = document.createElement('canvas');
    c.className = 'sp-canvas';
    c.setAttribute('role', 'img');
    root.insertBefore(c, root.firstChild);
    return c;
  }

  /* --- Layout --- */
  function captionH() {
    const v = parseFloat(getComputedStyle(container).getPropertyValue('--lab-caption-h'));
    return Number.isFinite(v) ? v : (w < 700 ? 168 : 112);
  }
  function layout() {
    const r = root.getBoundingClientRect();
    w = Math.max(1, r.width); h = Math.max(1, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const top = panel.getBoundingClientRect().bottom - r.top + 16;
    const bottom = captionH() + 12;
    const margin = w < 700 ? 16 : Math.min(64, w * 0.044);
    avail = { w: w - margin * 2, h: Math.max(140, h - top - bottom), oy: h / 2 - (top + Math.max(140, h - top - bottom) / 2) };
    U.offset = [0, avail.oy, 0];
    U.spanX = w / 2;
    U.rad = w < 700 ? 80 : 120;
    const pm = perspective(w, h);
    U.mvp = pm.mvp; U.camD = pm.D;
    if (engine) engine.resize(w, h, dpr);
  }

  /* --- Shapes --- */
  let current = null;
  async function setShape(next, { morph = true, announceIt = true } = {}) {
    await loadFont();
    if (disposed || !engine) return;
    const t0 = performance.now();
    const s = makeShape(next, name, avail.w, avail.h);
    shapeMs = performance.now() - t0;
    kind = next; current = s;
    engine.setShape(s.pts, morph);
    U.switchT = U.time;
    const avgSize2 = 1.95;
    alphaTarget = Math.max(0.03, Math.min(0.9, (0.95 * s.area) / (engine.count * avgSize2)));
    if (!morph) { alpha = alphaTarget; U.alpha = alpha; }
    swayTarget = next === 'name' ? 0.05 : 0.17;
    if (!auto) swayTarget = 0;
    pressed();
    canvas.setAttribute('aria-label', `Gold specks forming ${s.label}.`);
    if (announceIt) announce(`The specks form ${s.label}.`);
  }

  /* --- Taking over: the one automatic pass and the slow turn stop for good --- */
  function takeOver() { if (!auto) return; auto = false; swayTarget = 0; }

  /* --- Frame --- */
  function rotY(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 1, 0, s, 0, c]; }
  function tick(now) {
    raf = 0;
    if (!running || paused || disposed) return;
    const dt = Math.min(1 / 30, lastNow ? (now - lastNow) / 1000 : 1 / 60);
    lastNow = now;
    U.time += dt; U.dt = dt;
    // the slow turn of the 3D shapes (eases out to a stop when the visitor takes over)
    swayAmp += (swayTarget - swayAmp) * Math.min(1, dt * 0.8);
    if (Math.abs(swayAmp) > 0.0005 || auto) swayT += dt;
    U.rot = rotY(swayAmp * Math.sin(swayT * 0.35));
    alpha += (alphaTarget - alpha) * Math.min(1, dt * 2.5); U.alpha = alpha;
    // the pointer: its push fades in while it moves over the specks and out when it stops or leaves
    const idleFor = now - ptr.t;
    const want = ptr.active && idleFor < 120 ? 1 : 0;
    U.ptrOn += (want - U.ptrOn) * Math.min(1, dt * (want ? 12 : 4));
    U.ptr = [ptr.x, ptr.y];
    U.ptrVel = [ptr.vx * U.ptrOn, ptr.vy * U.ptrOn];
    ptr.vx *= 0.85; ptr.vy *= 0.85;
    engine.step(U);
    U.burst = 0;
    engine.render(U);
    frames++;
    // the one automatic pass: name, laptop, phone, the T, and back to the name, then it stays
    if (auto && !seqDone) {
      seqT += dt;
      const order = ['name', 'laptop', 'phone', 't', 'name'];
      if (seqT > HOLD[order[seqIndex]]) {
        seqT = 0; seqIndex++;
        if (seqIndex < order.length) setShape(order[seqIndex]);
        if (seqIndex >= order.length - 1) { seqDone = true; swayTarget = 0.05; }
      }
    }
    raf = requestAnimationFrame(tick);
  }
  function start() { if (!running) { running = true; lastNow = 0; } if (!raf && !paused && !disposed) raf = requestAnimationFrame(tick); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  function drawStill() { if (engine && !disposed) { engine.place(U, 'target'); engine.render(U); } }

  /* --- Input --- */
  const toWorld = (e) => { const r = root.getBoundingClientRect(); return [e.clientX - r.left - w / 2, h / 2 - (e.clientY - r.top)]; };
  function movePointer(e) {
    const [x, y] = toWorld(e), now = performance.now();
    const dtp = Math.max(8, now - ptr.t) / 1000;
    if (ptr.active && ptr.x < 1e4) { ptr.vx = ptr.vx * 0.5 + ((x - ptr.x) / dtp) * 0.5; ptr.vy = ptr.vy * 0.5 + ((y - ptr.y) / dtp) * 0.5; }
    ptr.x = x; ptr.y = y; ptr.t = now; ptr.active = true;
  }
  let inputTimer = 0;
  function bindInput() {
    on(canvas, 'pointermove', (e) => {
      if (!running) return;
      if (e.pointerType === 'mouse' || ptr.down) movePointer(e);
    });
    on(canvas, 'pointerleave', (e) => { if (e.pointerType === 'mouse') ptr.active = false; });
    on(canvas, 'pointerdown', (e) => {
      if (!running) return;
      takeOver();
      movePointer(e);
      ptr.down = { x: e.clientX, y: e.clientY, t: performance.now() };
      if (e.pointerType !== 'mouse') { try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } }
    });
    const up = (e) => {
      if (!ptr.down) return;
      const moved = Math.hypot(e.clientX - ptr.down.x, e.clientY - ptr.down.y), quick = performance.now() - ptr.down.t < 300;
      if (moved < 10 && quick && running) { U.burst = 520; U.burstPos = toWorld(e); }
      ptr.down = null;
      if (e.pointerType !== 'mouse') ptr.active = false;
    };
    on(canvas, 'pointerup', up);
    on(canvas, 'pointercancel', () => { ptr.down = null; ptr.active = false; });
  }
  on(scatterBtn, 'click', () => {
    if (!running) return;
    takeOver();
    U.burst = 620; U.burstPos = [0, avail.oy];
    announce('Scattered. The specks drift back into place.');
  });
  shapeBtns.forEach((b) => on(b, 'click', () => {
    takeOver();
    const next = b.dataset.shape;
    if (!engine) return;
    if (running) setShape(next);
    else { setShape(next, { morph: false }).then(drawStill); }
  }));
  on(input, 'input', () => {
    clearTimeout(inputTimer);
    inputTimer = setTimeout(() => {
      const v = input.value.replace(/\s+/g, ' ').trim().slice(0, 24);
      if (!v || !engine) return;
      takeOver();
      name = v;
      if (running) setShape('name');
      else setShape('name', { morph: false }).then(drawStill);
    }, 380);
  });
  on(input, 'keydown', (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.stopPropagation(); });

  let resizeTimer = 0;
  const ro = new ResizeObserver(() => {
    if (disposed) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (disposed || !engine) return;
      layout();
      setShape(kind, { morph: running, announceIt: false }).then(() => { if (!running) drawStill(); });
    }, 160);
  });

  /* --- Still and Play --- */
  function showPlay() {
    playBtn = document.createElement('button');
    playBtn.type = 'button'; playBtn.className = 'sp-play'; playBtn.textContent = 'Play';
    playBtn.setAttribute('aria-label', 'Play the specks');
    root.appendChild(playBtn);
    on(playBtn, 'click', async () => {
      played = true;
      playBtn.remove(); playBtn = null;
      if (!engine) {
        if (!(await boot())) return;
        await setShape(kind, { morph: false, announceIt: false });
        drawStill();
      }
      if (stillImg) { stillImg.remove(); stillImg = null; }
      start();
    });
  }
  function failed() {
    const p = document.createElement('p'); p.className = 'sp-msg';
    p.textContent = 'This browser can’t draw the specks (they need WebGPU or WebGL2).';
    root.appendChild(p);
  }
  async function boot() {
    layout();
    engine = await makeEngine();
    if (disposed) { if (engine) engine.dispose(); return false; }
    if (!engine) { failed(); return false; }
    layout();
    countEl.textContent = `${engine.count.toLocaleString('en-GB')} specks, drawn live with ${engine.kind}.`;
    bindInput();
    ro.observe(root);
    return true;
  }

  layout();
  if (lowPower && opts.still && !played) {
    stillImg = document.createElement('img');
    stillImg.className = 'sp-still'; stillImg.alt = ''; stillImg.src = opts.still;
    root.insertBefore(stillImg, root.firstChild);
    countEl.textContent = 'Specks drawn live on your graphics card.';
    showPlay();
    await new Promise((r) => { if (stillImg.complete) r(); else { stillImg.onload = r; stillImg.onerror = r; } });
  } else if (await boot()) {
    await setShape(kind, { morph: false, announceIt: false });
    if (played) {
      engine.place(U, 'cloud');   // a first visit: the dust gathers into the name
      engine.render(U);
      start();
    } else {
      drawStill();
      showPlay();
    }
  }

  return {
    title: TITLE,
    made: MADE,
    goodFor: GOOD_FOR,
    describe() {
      const n = engine ? engine.count.toLocaleString('en-GB') : 'Hundreds of thousands of';
      const now = current ? current.label : `the name “${name}”`;
      return `${n} tiny gold specks on a dark background, drifting together to form ${now}. ` +
        'Without any input they pass once through the typed name, a laptop showing a small website, a phone and the Toff Studio T, each in three-quarter view and slowly turning, then settle on the name. ' +
        'Moving the pointer or a finger through them pushes them aside and they drift back; a tap or the "Scatter" button scatters them. ' +
        'Type a name of up to 24 characters in the "Your name" field, or choose a shape with the buttons.';
    },
    pause() { paused = true; if (raf) cancelAnimationFrame(raf); raf = 0; clearTimeout(inputTimer); },
    resume() { if (disposed) return; paused = false; if (running) { lastNow = 0; raf = requestAnimationFrame(tick); } },
    async dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      clearTimeout(inputTimer); clearTimeout(resizeTimer);
      ac.abort();
      ro.disconnect();
      if (engine) { try { engine.dispose(); } catch (e) { console.warn('Specks: dispose', e); } engine = null; }
      if (canvas) { canvas.width = 1; canvas.height = 1; }
      root.remove();
      removeStyle();
    },
    // for tests: run the simulation forward quickly (no drawing in between), then draw once
    async _advance(seconds) {
      if (!engine) return;
      const n = Math.round(seconds * 30);
      for (let i = 0; i < n; i++) {
        U.time += 1 / 30; U.dt = 1 / 30;
        alpha += (alphaTarget - alpha) * Math.min(1, U.dt * 2.5); U.alpha = alpha;
        engine.step(U);
        if (i % 30 === 29) await new Promise((r) => setTimeout(r, 0));
      }
      engine.render(U);
    },
    async _shape(k) { takeOver(); await setShape(k); },
    _state() { return { kind, auto, seqIndex, running, paused, frames, engine: engine && engine.kind, count: engine && engine.count, alpha: +alpha.toFixed(3), shapeMs: Math.round(shapeMs) }; },
  };
}
