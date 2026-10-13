/*
 * Saltmarsh: heat and steam rising off the hero dish (the signature).
 * Loaded by main.js after the page has loaded and gone idle, and only once the hero is on
 * screen, so the photo is the first paint and this never delays it. One WebGL (1)
 * full-screen pass over the same photo (js/steam-gl.js):
 *  - a heat shimmer just above the food (the photo is resampled through a rising flow), and
 *  - soft, slow wisps: long ridged noise filaments, screen-blended in candle white, that
 *    widen and fade as they climb into the dark of the room.
 * It draws in a worker (js/steam-worker.js, on an OffscreenCanvas), so creating the
 * context, compiling the shaders and every frame stay off the page's main thread; where a
 * worker cannot draw WebGL it runs here instead, its setup spread over several frames.
 * The canvas maps the photo exactly like the <img> beneath it (object-fit: cover, the same
 * object-position) and draws the headline's shade itself (the same stops as .hero__shade),
 * so the wisps rise above the shade. It replaces the photo and the CSS shade in one frame,
 * from a frame identical to them, and the steam then gathers over three seconds.
 * Runs only while the hero is on screen and the tab is visible; the "Pause the steam"
 * button (WCAG 2.2.2, it runs past five seconds) stops it for the rest of the visit.
 * Reduced motion: one still frame with the steam held, no loop, no button.
 * A fine pointer over the hero stirs the steam a little (it answers the pointer only).
 * No WebGL, a shader error or a lost context: the canvas goes and the photo stays.
 */
// js/steam-gl.js is imported here only for the fallback (the worker loads its own copy)
const breather = () => new Promise((res) => requestAnimationFrame(() => setTimeout(res, 0)));

function whenLoaded(img) {
  if (img.complete && img.naturalWidth) return (img.decode ? img.decode().catch(() => {}) : Promise.resolve());
  return new Promise((res, rej) => { img.addEventListener('load', res, { once: true }); img.addEventListener('error', rej, { once: true }); });
}

const newCanvas = () => { const c = document.createElement('canvas'); c.setAttribute('aria-hidden', 'true'); return c; };

// the worker: resolves to a port once its first frame is drawn, or to null if it cannot draw
function inWorker(canvas, img, init, onLost) {
  if (typeof OffscreenCanvas === 'undefined' || !canvas.transferControlToOffscreen || typeof createImageBitmap !== 'function') return Promise.resolve(null);
  return new Promise((resolve) => {
    let worker;
    const fail = (why) => { if (worker) worker.terminate(); if (why) console.warn('Steam worker unavailable:', why); resolve(null); };
    try { worker = new Worker(new URL('./steam-worker.js', import.meta.url), { type: 'module' }); } catch (err) { fail(err.message); return; }
    worker.onerror = (e) => { e.preventDefault(); fail(e.message || 'worker'); };
    worker.onmessage = (e) => {
      const t = e.data && e.data.type;
      if (t === 'ready') resolve({ apply: (m) => worker.postMessage(m) });
      else if (t === 'fail') fail(e.data.message);
      else if (t === 'lost') onLost();
    };
    createImageBitmap(img).then((bitmap) => {
      const off = canvas.transferControlToOffscreen();
      worker.postMessage({ type: 'init', canvas: off, bitmap, init }, [off, bitmap]);
    }, (err) => fail(err && err.message));
  });
}

export async function mountSteam(stage, { img, toggle, reduced, store }) {
  if (!stage || !img) return null;
  await whenLoaded(img);
  await breather();

  const hero = stage.closest('.hero') || stage;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const nightHex = (getComputedStyle(document.documentElement).getPropertyValue('--night').trim() || '#17110E').replace('#', '');
  const night = [0, 2, 4].map((i) => parseInt(nightHex.slice(i, i + 2), 16) / 255);

  // the same crop as the <img> (object-fit cover, its computed object-position), the shade's
  // stops (set on the hero by main.js) and the text boxes, in the canvas's uv
  let cover = [1, 1, 0, 0];
  function measure() {
    const r = stage.getBoundingClientRect();
    const W = Math.max(1, r.width), H = Math.max(1, r.height);
    const s = Math.max(W / iw, H / ih);
    const density = Math.min(window.devicePixelRatio || 1, Math.max(1, 1 / s), 2);
    const pos = getComputedStyle(img).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
    const px = Number.isFinite(pos[0]) ? pos[0] : 0.5, py = Number.isFinite(pos[1]) ? pos[1] : 0.5;
    const dw = iw * s, dh = ih * s;
    const ox = (W - dw) * px, oy = (H - dh) * py;
    cover = [W / dw, H / dh, -ox / dw, -oy / dh];
    const cs = getComputedStyle(hero);
    const st = [1, 2, 3, 4, 5].map((i, k) => { const v = parseFloat(cs.getPropertyValue(`--sh-${i}`)); return Number.isFinite(v) ? v / H : [0.26, 0.46, 0.6, 0.72, 0.88][k]; });
    const rect = (el) => {
      if (!el) return [2, 2, 2, 2];
      const b = el.getBoundingClientRect();
      return [(b.left - r.left) / W, (b.top - r.top) / H, (b.right - r.left) / W, (b.bottom - r.top) / H];
    };
    return { type: 'layout', W, H, density, cover, stops: st.slice(0, 4), stop5: st[4], title: rect(hero.querySelector('.hero__title')), lede: rect(hero.querySelector('.hero__lede')) };
  }

  let paused = !!(store && store.get('steamPaused'));
  let visible = false, lost = false, gone = false;
  const init = { iw, ih, night, fade: reduced || paused ? 1 : 0, layout: measure() };

  // the canvas goes in over the photo (still transparent) and fades up from an identical first frame
  let canvas = newCanvas();
  const onLost = () => {
    lost = true;
    hero.classList.remove('is-steaming');
    canvas.remove();
    if (toggle) toggle.hidden = true;
  };
  stage.append(canvas);
  let r = await inWorker(canvas, img, init, onLost);
  if (!r) {
    canvas.remove(); canvas = newCanvas(); stage.append(canvas);
    try {
      init.layout = measure();
      const { createRenderer } = await import('./steam-gl.js');
      r = await createRenderer(canvas, img, init, onLost);
    } catch (err) {
      console.warn('Steam unavailable:', err.message);
      canvas.remove(); gone = true;
      return null;
    }
  }
  if (gone || lost) return null;
  r.apply(measure());                                  // in case the layout moved while it set up
  // the canvas carries the shade itself (so the steam can rise above it): swap both in one frame
  requestAnimationFrame(() => { if (!lost) { canvas.classList.add('is-live'); hero.classList.add('is-steaming'); } });

  const running = () => !reduced && !paused && visible && !document.hidden && !lost;
  let was = null;
  const kick = () => { const on = running(); if (on !== was) { was = on; r.apply({ type: 'run', on }); } };

  new ResizeObserver(() => { r.apply(measure()); }).observe(stage);
  hero.addEventListener('saltmarsh:shade', () => { r.apply(measure()); });
  const io = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    kick();
  }, { threshold: 0 });
  io.observe(stage);
  document.addEventListener('visibilitychange', kick);

  // the pause control (it runs past five seconds)
  const label = toggle && toggle.querySelector('.steam-toggle__verb');
  const syncToggle = () => {
    if (!toggle) return;
    toggle.dataset.state = paused ? 'paused' : 'playing';
    label.textContent = paused ? 'Play' : 'Pause';
  };
  if (toggle && !reduced) {
    syncToggle();
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      paused = !paused;
      if (store) store.set('steamPaused', paused);
      if (!paused) r.apply({ type: 'play' });
      syncToggle();
      kick();
    });
  }

  // a fine pointer over the hero stirs the steam (never on touch: that is scrolling)
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduced) {
    hero.addEventListener('pointermove', (e) => {
      const b = stage.getBoundingClientRect();
      const sx = (e.clientX - b.left) / b.width, sy = (e.clientY - b.top) / b.height;
      r.apply({ type: 'ptr', x: sx * cover[0] + cover[2], y: sy * cover[1] + cover[3] });
    }, { passive: true });
  }

  // reduced motion switched on mid-visit: hold the current frame and stop for good
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onMq = () => { if (mq.matches) { reduced = true; was = false; r.apply({ type: 'still' }); if (toggle) toggle.hidden = true; } };
  if (mq.addEventListener) mq.addEventListener('change', onMq);

  return {
    pause() { paused = true; syncToggle(); kick(); },
    play() { paused = false; syncToggle(); kick(); },
    get running() { return running(); },
  };
}
