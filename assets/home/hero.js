/*
 * Toff Studio: the home page's hero stage (round 05). Builder HOME.
 *
 * One of our sites, drawn live as a pen-and-pencil sketch (assets/shared/sketch-shader.js), painted back
 * to the finished site:
 *  - laptops (a fine pointer): the pointer is the brush; if the visitor doesn't paint, a brush paints it
 *    in by itself after settings.hero.idleMs (autoPaintMs long). Once the visitor paints, nothing paints
 *    by itself again (automatic motion stops for good when the visitor takes over).
 *  - phones: it plays by itself when 60% of the stage is in view; a tap finishes it; the stage keeps
 *    touch-action: pan-y, so scrolling always wins.
 *  - The site list is the "hero" section of assets/home/captures/captures.json (tools/capture/hero.py),
 *    read by home.js; its first entry is also written into index.html's still (change both together).
 *  - "Build it" finishes it (keyboard users; the stage itself takes no keys). "Another site →" swaps in
 *    the next site from that list as a fresh sketch; nothing advances by itself.
 *  - First paint is the pre-rendered still in index.html (fetchpriority high); WebGL starts after load and
 *    takes over when its first frame is drawn. No WebGL2: the still cross-fades into the screenshot.
 *    Reduced motion or Save-Data: the finished screenshot, nothing moves.
 *  - If the visitor scrolls on past the stage before it's finished, it finishes, so the line can drop.
 *
 *   import { mountHero } from './hero.js';
 *   const hero = mountHero(sectionEl, { settings, manifest: Promise<manifest>, onFirstDone() {} });
 *   hero.state() -> { mode, done, coverage, index, id }   hero.finish()   hero.next()
 */
import { SketchStage } from '../shared/sketch-shader.js';
import { reducedMotion } from '../shared/motion.js';

const PHONE = window.matchMedia('(max-width: 699px)');
const FINE = window.matchMedia('(hover: hover) and (pointer: fine)');

export function mountHero(section, opts) {
  const o = opts || {};
  const S = o.settings || window.TOFF_SETTINGS || {}, H = S.hero || {};
  const idleMs = H.idleMs != null ? H.idleMs : 2500;
  const autoMs = H.autoPaintMs != null ? H.autoPaintMs : 2000;
  const doneAt = H.doneAt != null ? H.doneAt : 0.98;

  const stage = section.querySelector('[data-hero-stage]');
  const capEl = section.querySelector('[data-hero-caption]');
  const hintEl = section.querySelector('[data-hero-hint]');
  const buildBtn = section.querySelector('[data-hero-build]');
  const nextBtn = section.querySelector('[data-hero-next]');
  const stillImg = stage.querySelector('.hero-still img');
  const stillSource = stage.querySelector('.hero-still source');

  const saveData = !!(navigator.connection && navigator.connection.saveData);
  let mode = reducedMotion() || saveData ? 'final' : 'pending';   // 'final' | 'gl' | 'fade' (decided after load)
  let sites = [fromPage()], index = 0, done = false, firstSent = false, tookOver = false;
  let gl = null, canvas = null, siteImg = null, ready = false, busy = false, inView = false, idleTimer = 0, autoOn = false;

  // The first site as the page describes it (until captures.json arrives)
  function fromPage() {
    const cap = capEl.textContent.trim();
    return { id: 'bluebird', name: cap.split(',')[0], kind: /concept/.test(cap) ? 'concept' : 'client', caption: cap,
      laptop: { site: 'assets/home/captures/hero/bluebird-laptop-site.webp' }, phone: { site: 'assets/home/captures/hero/bluebird-phone-site.webp' } };
  }
  const device = () => (PHONE.matches ? 'phone' : 'laptop');
  const cur = () => sites[index];
  const siteUrl = (s) => (s[device()] || s.laptop).site;

  /* ------------------------------------------------------------ words: caption, hint, label, buttons */
  function label() {
    const s = cur();
    stage.setAttribute('aria-label', s.caption + (done || mode === 'final' ? '. Its finished first screen.' : '. A pencil sketch of its first screen, being painted into the finished site.'));
  }
  function words() {
    const s = cur();
    if (capEl.textContent !== s.caption) capEl.textContent = s.caption;
    let h = '';
    if (!done && mode !== 'final') h = mode === 'gl' && FINE.matches && !PHONE.matches ? 'Move your pointer over it to paint it in' : (PHONE.matches || !FINE.matches ? 'Tap to finish it' : '');
    hintEl.textContent = h;
    const hideBuild = done || mode === 'final';
    if (hideBuild && document.activeElement === buildBtn && !nextBtn.hidden) nextBtn.focus({ preventScroll: true });
    buildBtn.hidden = hideBuild;
    nextBtn.hidden = sites.length < 2;
    label();
  }

  /* ------------------------------------------------------------ the finished screenshot (fallbacks) */
  function ensureSiteImg() {
    if (siteImg) return siteImg;
    siteImg = document.createElement('img');
    siteImg.className = 'hero-site'; siteImg.alt = ''; siteImg.decoding = 'async';
    stage.append(siteImg);
    return siteImg;
  }
  function setSiteImg(url) {
    const im = ensureSiteImg();
    if (im.getAttribute('src') !== url) im.src = url;
    return im.decode ? im.decode().catch(() => {}) : Promise.resolve();
  }
  function showSite() {   // cross-fade (the CSS transition; none with reduced motion)
    return setSiteImg(siteUrl(cur())).then(() => { stage.classList.add('is-site'); });
  }

  /* ------------------------------------------------------------ done */
  function markDone() {
    if (done) return;
    done = true; autoOn = false; clearTimeout(idleTimer);
    words();
    if (!firstSent) { firstSent = true; try { o.onFirstDone && o.onFirstDone(); } catch (e) { console.error(e); } }
    preloadNext();
  }
  function finish(ms) {
    if (done || busy) return;
    clearTimeout(idleTimer);
    if (mode === 'gl' && gl && ready) gl.finish(ms == null ? 900 : ms);
    else if (mode !== 'final') { clearTimeout(idleTimer); showSite().then(() => setTimeout(markDone, ms == null ? 900 : ms)); }
    else if (mode === 'final') markDone();
  }

  /* ------------------------------------------------------------ painting by itself */
  function armIdle() {
    clearTimeout(idleTimer);
    if (done || busy || mode === 'final' || !ready || !inView) return;
    const phone = PHONE.matches || !FINE.matches;
    if (!phone && tookOver) return;   // the visitor has taken over: nothing paints by itself again
    idleTimer = setTimeout(() => {
      if (done || busy || !inView || (!phone && tookOver)) return;
      if (mode === 'gl') { autoOn = true; gl.autoPaint(autoMs); }
      else finish(900);
    }, phone ? 300 : idleMs);
  }

  /* ------------------------------------------------------------ WebGL */
  async function startGL() {
    try {
      canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      stage.append(canvas);
      const cs = getComputedStyle(document.documentElement), v = (n, d) => (cs.getPropertyValue(n).trim() || d);
      gl = new SketchStage(canvas, {
        pointer: FINE.matches,
        paper: v('--bg-deep', '#0A101E'), ink: v('--ink', '#F1E3C6'), gold: v('--gold', '#D8AC5F'),
        onCoverage(c) { if (c >= doneAt && c < 1 && gl && !gl.done) gl.finish(350); },
        onDone: markDone,
      });
      canvas.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch' || done) return;
        if (!tookOver) { tookOver = true; autoOn = false; clearTimeout(idleTimer); }
      }, { passive: true });
      canvas.addEventListener('webglcontextlost', () => { showSite().then(markDone); });
      await gl.load(siteUrl(cur()));
      if (done) { gl.dispose(); canvas.remove(); gl = canvas = null; mode = 'fade'; ready = true; words(); return; }   // finished while WebGL was starting
      mode = 'gl'; ready = true;
      requestAnimationFrame(() => stage.classList.add('is-live'));
      if (FINE.matches) stage.classList.add('can-paint');
      words(); armIdle();
    } catch (err) {
      console.warn('Hero: falling back to a cross-fade', err);
      try { gl && gl.dispose(); } catch (e) { /* ignore */ }
      gl = null; if (canvas) canvas.remove(); canvas = null;
      mode = 'fade'; ready = true; words(); armIdle();
    }
  }
  function begin() {
    if (mode === 'final' || done) { if (done && mode !== 'final') { mode = 'fade'; ready = true; } return; }
    mode = SketchStage.supported() ? 'gl' : 'fade';
    if (mode === 'gl') { mode = 'pending-gl'; startGL(); }
    else { ready = true; words(); armIdle(); }
  }

  /* ------------------------------------------------------------ "Another site →" */
  function setStill(s) {
    const L = s.laptop || {}, P = s.phone || {};
    if (stillSource && P.sketchSrcset) stillSource.srcset = P.sketchSrcset;
    if (L.sketch) { stillImg.src = L.sketch; if (L.sketchSrcset) stillImg.srcset = L.sketchSrcset; }
  }
  async function next() {
    if (busy || sites.length < 2) return;
    busy = true; clearTimeout(idleTimer); autoOn = false;
    index = (index + 1) % sites.length;
    const s = cur();
    done = false;
    stage.classList.add('is-swapping'); stage.setAttribute('aria-busy', 'true');
    words();
    try {
      setStill(s);
      if (mode === 'gl' && gl) await gl.load(siteUrl(s));
      else if (mode === 'final') await setSiteImg(siteUrl(s));
      else { stage.classList.remove('is-site'); await (stillImg.decode ? stillImg.decode().catch(() => {}) : null); setSiteImg(siteUrl(s)); }
    } catch (err) { console.warn('Hero: could not load the next site', err); }
    stage.classList.remove('is-swapping'); stage.removeAttribute('aria-busy');
    busy = false;
    if (mode === 'final') done = true;
    words(); armIdle();
  }
  function preloadNext() {
    if (sites.length < 2) return;
    const s = sites[(index + 1) % sites.length], d = s[device()] || s.laptop;
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 300));
    idle(() => { [d.site, d.sketch].filter(Boolean).forEach((u) => { const im = new Image(); im.decoding = 'async'; im.src = u; }); });
  }

  /* ------------------------------------------------------------ events */
  buildBtn.addEventListener('click', () => { tookOver = true; finish(900); });
  nextBtn.addEventListener('click', next);
  stage.addEventListener('click', () => { if (!done) { tookOver = true; finish(700); } });   // phones: a tap finishes it

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => {
      const e = es[es.length - 1];
      inView = e.isIntersecting && e.intersectionRatio >= 0.6;
      if (inView) armIdle(); else if (!autoOn) clearTimeout(idleTimer);
      // scrolled on past it before it's finished: finish it, so the line can drop into Work
      if (!done && mode !== 'final' && e.boundingClientRect.top < 0 && e.intersectionRatio < 0.3) finish(600);
    }, { threshold: [0, 0.3, 0.6] }).observe(stage);
  } else inView = true;

  const onDevice = () => {
    if (mode === 'gl' && gl) gl.load(siteUrl(cur())).then(() => { if (done) gl.finish(0); });
    else if (siteImg) setSiteImg(siteUrl(cur()));
    words();
  };
  if (PHONE.addEventListener) PHONE.addEventListener('change', onDevice);

  // The manifest: the list of sites ("Another site →")
  Promise.resolve(o.manifest).then((m) => {
    if (m && Array.isArray(m.hero) && m.hero.length) { sites = m.hero; index = 0; }
    words();
  }).catch(() => words());

  // Start: finished at once (reduced motion, Save-Data), or WebGL after the page has loaded
  if (mode === 'final') { showSite().then(markDone); words(); }
  else {
    words();
    const later = () => { const idle = window.requestIdleCallback || ((f) => setTimeout(f, 60)); idle(begin, { timeout: 500 }); };
    if (document.readyState === 'complete') later(); else window.addEventListener('load', later, { once: true });
  }

  return {
    state: () => ({ mode, done, ready, tookOver, auto: autoOn, coverage: gl ? gl.coverage() : (done ? 1 : 0), index, id: cur().id, sites: sites.length }),
    finish: () => finish(600),
    next,
  };
}

export default { mountHero };
