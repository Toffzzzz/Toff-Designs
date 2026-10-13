/*
 * Hollis & Pine: the vase on the home page (the signature) and the loader the product page
 * shares. three.js and vase.js are only fetched when the stage is near (600px away) or
 * when the visitor asks for 3D, so the page stays light before any interaction.
 *
 * The turn: one slow turn when it first appears. On laptops it follows the scroll
 * (forwards only); on phones it plays by itself over 8 seconds. Dragging, the arrow keys
 * or "Stop turning" take over for good. With reduced motion it stands still at its best
 * angle. Without WebGL (or if the context is lost) the drawn still stays in its place.
 */
import { start, reducedMotion } from '../../../assets/shared/motion.js';
import { byId, COLOURS } from './data.js';
import { productArt } from './art.js';
import basket, { announce } from './basket.js';

const TAU = Math.PI * 2;
const BASE_ANGLE = 0.6;
const sine = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);

/* three.js r186 needs WebGL2: check first, so a browser without it never downloads three.js. */
function hasWebGL2() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return false;
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return true;
  } catch (e) { return false; }
}

/* Load three.js and the vase module, then build it. Resolves to the vase, or null without WebGL. */
export async function loadVase(canvas, opts) {
  if (!hasWebGL2()) return null;
  try {
    const mod = await import('./vase.js');
    const vase = mod.createVase(canvas, opts);
    await vase.ready;
    return vase;
  } catch (e) {
    console.warn('Hollis & Pine: showing the still vase instead of 3D.', e && e.message);
    return null;
  }
}

export function initHomeVase() {
  const stage = document.querySelector('[data-stage]');
  if (!stage) return;
  const product = byId('hearth-vase');
  const still = stage.querySelector('[data-still]');
  const canvas = stage.querySelector('[data-canvas]');
  const desc = stage.querySelector('[data-vase-desc]');
  const glazesEl = document.querySelector('[data-glazes]');
  const turnBtn = document.querySelector('[data-turn]');
  const addBtn = document.querySelector('[data-vase-add]');
  const reduced = reducedMotion();

  let colour = 'sage';
  let vase = null, failed = false;
  let autoP = 0, taken = false, autoPart = null, manual = null;
  let angle = BASE_ANGLE;

  /* glaze choices: the four finishes of the Hearth vase */
  glazesEl.innerHTML = product.colours.map((c) => {
    const C = COLOURS[c];
    const label = C.glaze[0].toUpperCase() + C.glaze.slice(1);
    return `<label class="chip"><input type="radio" name="glaze" value="${c}" ${c === colour ? 'checked' : ''}><span><i style="background:${C.hex}"></i>${label} <em class="chip__sub">${C.label.toLowerCase()}</em></span></label>`;
  }).join('');

  const describe = () => {
    const C = COLOURS[colour];
    desc.textContent = `The Hearth vase in a ${C.label.toLowerCase()} ${C.glaze} glaze, with a band of bare clay at the foot, standing on a stone plinth.`;
  };
  const paintStill = () => { still.innerHTML = productArt(product, colour); };
  paintStill(); describe();

  glazesEl.addEventListener('change', (e) => {
    if (e.target.name !== 'glaze') return;
    colour = e.target.value;
    describe(); paintStill();
    if (vase) vase.setGlaze(COLOURS[colour].glaze, { colour: COLOURS[colour].hex, instant: reduced });
  });

  addBtn.addEventListener('click', () => {
    basket.add({ id: product.id, colour, size: 'One size', qty: 1 });
    announce(`Added the Hearth vase in ${COLOURS[colour].glaze} ${COLOURS[colour].label.toLowerCase()} to your basket.`);
    basket.open(addBtn);
  });

  /* the angle, the slider semantics and the turn button */
  const deg = () => ((Math.round((angle - BASE_ANGLE) * 180 / Math.PI) % 360) + 360) % 360;
  let ariaT = 0;
  const syncAria = () => {
    stage.dataset.angle = angle.toFixed(4);   // the unwrapped turn (radians), for tests
    const now = performance.now();
    if (now - ariaT < 120) return; ariaT = now;
    const d = deg();
    stage.setAttribute('aria-valuenow', String(d));
    stage.setAttribute('aria-valuetext', d === 0 ? 'Facing the front' : `Turned ${d} degrees`);
  };
  const setAngle = (a) => { angle = a; if (vase) vase.setAngle(a); syncAria(); };
  const running = () => !!manual || (!taken && autoP > 0 && autoP < 1 && !reduced);
  const syncButton = () => { if (turnBtn) turnBtn.textContent = running() ? 'Stop turning' : 'Turn it once'; };

  function takeOver() {
    if (manual) { cancelAnimationFrame(manual.raf); manual = null; }
    if (!taken) { taken = true; if (autoPart) autoPart.destroy(); }
    syncButton();
  }

  // the automatic first turn (motion.js: scroll-driven on laptops, by itself on phones)
  if (!reduced) {
    autoPart = start(stage, {
      start: 0.95, end: 0.12, anchor: 0, trigger: 0.6, duration: 8000, minDuration: 2600,
      onProgress(p) {
        if (taken) return;
        autoP = p;
        setAngle(BASE_ANGLE + TAU * sine(p));
        syncButton();
      },
    });
  } else if (turnBtn) {
    turnBtn.closest('.vase__turnrow').hidden = true;
  }

  // "Turn it once" (the visitor asked: one slow turn, which they can stop)
  turnBtn?.addEventListener('click', () => {
    if (running()) { takeOver(); return; }
    takeOver();
    const from = angle, t0 = performance.now(), dur = 8000;
    manual = { raf: 0 };
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      setAngle(from + TAU * sine(t));
      if (t < 1 && manual) manual.raf = requestAnimationFrame(step);
      else { manual = null; syncButton(); }
    };
    manual.raf = requestAnimationFrame(step);
    syncButton();
  });

  // keyboard: the stage is a slider
  stage.addEventListener('keydown', (e) => {
    if (failed) return;
    const steps = { ArrowRight: 15, ArrowUp: 15, ArrowLeft: -15, ArrowDown: -15, PageUp: 45, PageDown: -45 };
    let d = steps[e.key];
    if (e.key === 'Home') { takeOver(); setAngle(BASE_ANGLE); e.preventDefault(); return; }
    if (d == null) return;
    e.preventDefault();
    takeOver();
    ariaT = 0;
    setAngle(angle + (d * Math.PI) / 180);
  });

  function fallback() {
    failed = true;
    stage.classList.remove('is-live');
    stage.removeAttribute('tabindex');
    ['aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext', 'aria-describedby'].forEach((a) => stage.removeAttribute(a));
    stage.setAttribute('role', 'img');
    stage.setAttribute('aria-label', desc.textContent);
    stage.querySelector('.stage__hint').hidden = true;
    stage.style.cursor = 'default';
    if (turnBtn) turnBtn.closest('.vase__turnrow').hidden = true;
    glazesEl.addEventListener('change', () => stage.setAttribute('aria-label', desc.textContent));
  }

  // load when near, but never before the visitor does something (or the stage is on screen),
  // so three.js isn't part of the first load
  const io = new IntersectionObserver(async (entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    const C = COLOURS[colour];
    vase = await loadVase(canvas, {
      profile: product.profile, glaze: C.glaze, colour: C.hex, angle,
      onInteract: () => takeOver(),
      onChange: (a) => { angle = a; syncAria(); },
      onLost: () => { vase = null; fallback(); },
    });
    if (!vase) { fallback(); return; }
    // the visitor may have changed the glaze while it loaded
    if (COLOURS[colour] !== C) vase.setGlaze(COLOURS[colour].glaze, { colour: COLOURS[colour].hex, instant: true });
    vase.setAngle(angle);
    stage.classList.add('is-live');
  }, { rootMargin: '600px 0px' });
  let armed = false;
  const EVENTS = ['scroll', 'wheel', 'touchstart', 'pointerdown', 'keydown'];
  const arm = () => {
    if (armed) return;
    armed = true;
    EVENTS.forEach((n) => window.removeEventListener(n, arm, { capture: true }));
    io.observe(stage);
  };
  EVENTS.forEach((n) => window.addEventListener(n, arm, { capture: true, passive: true }));
  // already on screen (a short window, a deep link, ?embed=vase): load once the page has loaded
  const r = stage.getBoundingClientRect();
  if (r.top < window.innerHeight && r.bottom > 0) {
    const go = () => (window.requestIdleCallback || setTimeout)(arm, { timeout: 1200 });
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
  }
  syncButton();
}
