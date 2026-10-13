/*
 * Toff Studio: motion.js (round 05). The motion rules, in one place, for every studio page.
 * Ported from the handwriting engine (assets/handwriting/handwriting.js): its on-screen start, its
 * high-water-mark pen on laptops, its self-writing parts on phones, its settle wait for Safari's late
 * scroll restore, its bfcache return and its jump detection. Same rules, same settings.
 *
 *  - Laptops (a fine pointer and at least handwriting.breakpoint px wide): a scroll-driven part starts
 *    only once it is on screen, and its progress is a high-water mark of the scroll: it never goes
 *    backwards, and it eases after the scroll (handwriting.ease) without ever rushing (minDuration).
 *  - Phones (and tablets with a finger): each part plays by itself at a natural speed when it reaches
 *    handwriting.phoneTrigger of the screen.
 *  - Once a part has started playing by itself it always finishes, even if it leaves the screen.
 *  - Reduced motion: every part is given its finished state at once (onProgress(1) / onPlay({instant})).
 *  - A fresh visit opens at the top (also done earlier by boot.js; whichever runs first).
 *  - Coming back (Back/Forward, bfcache, Safari's late scroll restore): you stay where you were; nothing
 *    starts until the page has settled (handwriting.settleMs after load, or the first wheel/touch/key);
 *    then what's on screen plays by itself, what's above plays as you scroll back up to it, and what's
 *    below follows the scroll as usual. On a bfcache return every part is reset first (onProgress(0) /
 *    onReset) so this happens again.
 *  - Jumps (a scroll of more than handwriting.jumpScreens screens at once: section links, scrollbar
 *    drags): what you land on plays by itself; what you skipped above plays when you scroll back to it.
 *  - Reaching the bottom of the page: anything on screen that the scroll can no longer drive plays itself.
 *  - No pinning, nothing reverses, nothing replays while you stay on the page.
 *
 * API
 *   import { start, fadeUp, isLaptop, reducedMotion, tokens, ease, durationFor, finishAll } from './motion.js';
 *
 *   const h = start(el, {
 *     // EITHER a progress part (0 → 1, never backwards):
 *     onProgress(p) {},            // called whenever progress changes; p in [0, 1]
 *     start: 0.86, end: 0.56,      // laptops: progress runs while el's anchor point moves from start to end
 *     anchor: 0,                   //   of the screen height (0 = top of screen); anchor 0 = el's top, 1 = its bottom
 *     range: null,                 //   or a function (rect, viewportHeight) => raw progress, for custom mappings
 *     minDuration: 600,            // laptops: a fling never completes the whole range faster than this (ms)
 *     duration: 1400,              // playing by itself (phones, returns, jumps): ms for the whole 0 → 1
 *     ease: ease.linear,           // easing while playing by itself (constant speed, like the pen)
 *     // OR a play-once part (fade-ups, a signature, anything that animates itself):
 *     onPlay({ instant, index }) {},  // called once when reached; instant = true means show it finished, no animation;
 *                                     // index counts parts that start in the same frame (for meaningful staggers)
 *     onReset() {},                // bfcache return: put it back to its unplayed state (without it, it stays finished)
 *     // both:
 *     trigger: 0.82,               // phones / play-once parts: starts when el's top passes this fraction of the screen
 *                                  // (default handwriting.phoneTrigger on phones, 0.88 on laptops)
 *     onDone() {},                 // once, when finished
 *   });
 *   h.progress()   // current progress (0..1)
 *   h.finish()     // jump to the finished state now (e.g. the visitor tapped to finish it)
 *   h.destroy()    // stop watching it
 *
 *   fadeUp(target, { rise, trigger })  // target: selector, element or list. Marks each with data-fade and fades it up
 *                                      // 16px over 560ms (motion tokens) once, when reached; parts arriving together
 *                                      // follow each other by 60ms (at most five). Put data-fade in the HTML to
 *                                      // avoid a flash. Returns the handles.
 *
 *   isLaptop()        true while scroll-driven rules apply
 *   reducedMotion()   true when the visitor asked for reduced motion
 *   tokens            { easeOut, easeInOut, easeIn, pressMs, quickMs, baseMs, revealMs, moveMs, lineMs,
 *                       riseSmallPx, riseMediumPx, riseLargePx, staggerLinesMs, staggerRowsMs } from settings.js motion
 *   ease              { linear, out, inOut, in }: the quintic family as JS functions (t in 0..1)
 *   durationFor(px)   duration that grows with distance: 200ms + 1.2ms per px, capped at tokens.moveMs
 *   finishAll()       finish every part now (used by tests and by "show everything" switches)
 *
 * Example (a case film on the home page):
 *   const film = start(frameEl, { start: 0.9, end: 0.2, duration: 3000,
 *                                 onProgress: (p) => drawFrame(Math.round(p * (frames.length - 1))) });
 *   fadeUp('.case-notes > *');
 */

const S = window.TOFF_SETTINGS || {};
const HW = S.handwriting || {};
const MO = S.motion || {};
const pick = (v, d) => (v == null || v === '' ? d : v);

const CFG = {
  breakpoint: pick(HW.breakpoint, 700),
  writeStart: pick(HW.writeStart, 0.86),
  writeEnd: pick(HW.writeEnd, 0.56),
  ease: pick(HW.ease, 0.12),
  phoneTrigger: pick(HW.phoneTrigger, 0.82),
  laptopTrigger: 0.88,
  jumpScreens: pick(HW.jumpScreens, 1.2),
  settleMs: pick(HW.settleMs, 450),
};

export const tokens = {
  easeOut: pick(MO.easeOut, 'cubic-bezier(.22, 1, .36, 1)'),
  easeInOut: pick(MO.easeInOut, 'cubic-bezier(.83, 0, .17, 1)'),
  easeIn: pick(MO.easeIn, 'cubic-bezier(.64, 0, .78, 0)'),
  pressMs: pick(MO.pressMs, 100),
  quickMs: pick(MO.quickMs, 180),
  baseMs: pick(MO.baseMs, 280),
  revealMs: pick(MO.revealMs, 560),
  moveMs: pick(MO.moveMs, 900),
  lineMs: pick(MO.lineMs, 1400),
  riseSmallPx: pick(MO.riseSmallPx, 8),
  riseMediumPx: pick(MO.riseMediumPx, 16),
  riseLargePx: pick(MO.riseLargePx, 32),
  staggerLinesMs: pick(MO.staggerLinesMs, 90),
  staggerRowsMs: pick(MO.staggerRowsMs, 60),
};

export const ease = {
  linear: (t) => t,
  out: (t) => 1 - Math.pow(1 - t, 5),
  in: (t) => t * t * t * t * t,
  inOut: (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2),
};

export function durationFor(px) { return Math.min(tokens.moveMs, Math.round(200 + 1.2 * Math.abs(px))); }

const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const mqFine = window.matchMedia('(pointer: fine)');
export function reducedMotion() { return mqReduce.matches; }
export function isLaptop() { return mqFine.matches && window.innerWidth >= CFG.breakpoint; }

window.__toffMotion = true;   // boot.js's safety net: motion.js is running, fade-ups may stay hidden until reached

/* ------------------------------------------------------------------ a fresh visit opens at the top */
function navType() {
  try { const e = performance.getEntriesByType('navigation')[0]; if (e) return e.type; } catch (err) { /* old browsers */ }
  return 'navigate';
}
const NAV = navType();
if (!window.__toffOpenedAtTop) {
  window.__toffOpenedAtTop = true;
  if ((NAV === 'navigate' || NAV === 'reload') && !location.hash) {
    window.__toffFreshTop = true;
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    let touched = false;
    ['wheel', 'touchstart', 'keydown'].forEach((n) => window.addEventListener(n, () => { touched = true; }, { capture: true, passive: true, once: true }));
    const top = () => { if (!touched && window.scrollY !== 0) window.scrollTo(0, 0); };
    top();
    const back = () => { top(); setTimeout(() => { top(); if ('scrollRestoration' in history) history.scrollRestoration = 'auto'; }, 0); };
    if (document.readyState === 'complete') back(); else window.addEventListener('load', back, { once: true });
  }
}

/* ------------------------------------------------------------------ parts */
const parts = new Set();
let settled = false, raf = 0, last = 0, lastY = window.scrollY, inFrame = 0;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
function rectOf(part) { return part.el.getBoundingClientRect(); }
function shown(r) { return r.width > 0 || r.height > 0; }
function inView(part, frac) {
  const r = rectOf(part);
  return shown(r) && r.bottom > 0 && r.top < window.innerHeight * (frac == null ? 1 : frac);
}
function isAbove(part) { const r = rectOf(part); return shown(r) && r.bottom <= 0; }
function atBottom() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return window.scrollY >= max - 2;
}
function rawProgress(part) {
  const r = rectOf(part), vh = window.innerHeight, o = part.o;
  if (!shown(r)) return 0;
  if (typeof o.range === 'function') return clamp01(o.range(r, vh));
  const y = r.top + r.height * part.anchor, a = part.startAt * vh, b = part.endAt * vh;
  return clamp01((a - y) / Math.max(1, a - b));
}
function trigger(part) { return part.o.trigger != null ? part.o.trigger : (isLaptop() ? CFG.laptopTrigger : CFG.phoneTrigger); }

function emit(part) {
  if (part.kind !== 'progress' || part.p === part.sent) return;
  part.sent = part.p;
  try { part.o.onProgress(part.p); } catch (e) { console.error(e); }
}
function complete(part) {
  part.p = 1; emit(part); part.done = true; part.playing = false;
  if (part.o.onDone) { try { part.o.onDone(); } catch (e) { console.error(e); } }
}
function startAuto(part) {
  part.mode = 'auto'; part.playing = true; part.p0 = part.p; part.t = 0;
  part.dur = Math.max(250, part.duration * (1 - part.p0));
}
function play(part, instant) {
  part.p = 1; part.done = true;
  try { part.o.onPlay({ instant: !!instant, index: instant ? 0 : inFrame++ }); } catch (e) { console.error(e); }
  if (part.o.onDone) { try { part.o.onDone(); } catch (e) { console.error(e); } }
}

// Where a part stands when the page settles (or when it is registered after that): the engine's startFromHere.
function place(part) {
  if (part.done || part.kind !== 'progress') return;
  if (!isLaptop()) { part.mode = 'auto'; return; }
  const raw = rawProgress(part);
  part.mode = raw > 0 && (inView(part) || isAbove(part)) ? 'auto' : 'scroll';
}

// One frame of one part; returns true while it still needs frames.
function step(part, dt, laptop) {
  if (part.done || !settled) return false;
  if (part.kind === 'play') {
    if (inView(part, trigger(part)) || (atBottom() && inView(part))) play(part, false);
    return false;
  }
  let active = false;
  const scrollDriven = laptop && part.mode === 'scroll' && !part.playing;
  if (scrollDriven) {
    if (atBottom() && (inView(part) || isAbove(part)) && part.target < 1) startAuto(part);   // the scroll can't drive it any further
    else {
      part.target = Math.max(part.target, rawProgress(part));   // the high-water mark: never backwards
      const gap = part.target - part.p;
      if (gap > 0.0005) {
        const inc = Math.min(gap * (1 - Math.exp(-dt / CFG.ease)), dt * 1000 / part.minDuration);
        part.p = gap - inc < 0.001 ? part.target : part.p + inc;
        emit(part); active = true;
      }
    }
  }
  if (!scrollDriven || part.playing) {
    if (!part.playing) {
      const ready = inView(part, trigger(part)) || part.p > 0 || (atBottom() && inView(part));   // once started, always finish
      if (ready) startAuto(part);
    }
    if (part.playing) {
      part.t = Math.min(1, part.t + dt * 1000 / part.dur);
      part.p = Math.max(part.p, part.p0 + (1 - part.p0) * part.ease(part.t));
      emit(part); active = true;
      if (part.t >= 1) part.p = 1;
    }
  }
  if (part.p >= 0.9995) { complete(part); return false; }
  return active;
}

// Big jumps on laptops: what you land on (or skipped above) plays by itself. The engine's onJump.
function onJump() {
  parts.forEach((part) => {
    if (part.done || part.kind !== 'progress' || part.mode !== 'scroll' || part.playing) return;
    if (rawProgress(part) > 0 && (inView(part) || isAbove(part))) part.mode = 'auto';
  });
}

function frame(now) {
  raf = 0;
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60; last = now;
  const y = window.scrollY, laptop = isLaptop();
  if (settled && laptop && Math.abs(y - lastY) > CFG.jumpScreens * window.innerHeight) onJump();
  lastY = y; inFrame = 0;
  let active = false;
  parts.forEach((part) => { if (step(part, dt, laptop)) active = true; });
  if (active) raf = requestAnimationFrame(frame); else last = 0;
}
function wake() { if (!raf && parts.size) raf = requestAnimationFrame(frame); }
window.addEventListener('scroll', wake, { passive: true });
window.addEventListener('resize', wake);
if ('ResizeObserver' in window) new ResizeObserver(wake).observe(document.documentElement);   // content above grew or shrank

/* ------------------------------------------------------------------ settling (Safari's late scroll restore) */
function settle() {
  if (settled) return;
  settled = true; lastY = window.scrollY;
  parts.forEach(place);
  wake();
}
function armSettle() {
  settled = false;
  let done = false;
  const evs = ['wheel', 'touchstart', 'keydown'];
  const go = () => { if (done) return; done = true; evs.forEach((e) => window.removeEventListener(e, go, true)); settle(); };
  evs.forEach((e) => window.addEventListener(e, go, true));
  const wait = () => setTimeout(go, CFG.settleMs);
  if (document.readyState === 'complete') {
    const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    const since = nav && nav.loadEventEnd ? performance.now() - nav.loadEventEnd : Infinity;
    if (since > CFG.settleMs) go(); else setTimeout(go, CFG.settleMs - since);
  } else window.addEventListener('load', wait, { once: true });
}
if (window.__toffFreshTop) requestAnimationFrame(() => settle());   // a fresh visit opens at the top: nothing to wait for
else armSettle();

// bfcache: the page comes back exactly as it was left; reset every part so what's on screen plays again
window.addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  if (!reducedMotion()) {
    parts.forEach((part) => {
      if (part.o.replayOnReturn === false) return;
      if (part.kind === 'progress') { part.p = part.target = 0; part.sent = -1; part.done = part.playing = false; part.mode = 'scroll'; emit(part); }
      else if (part.o.onReset) { part.p = 0; part.done = false; try { part.o.onReset(); } catch (err) { console.error(err); } }
    });
  }
  settled = false; last = 0;
  settle();
});

/* ------------------------------------------------------------------ public */
export function start(el, options) {
  const o = options || {};
  if (!el) throw new Error('motion.start: no element');
  const kind = typeof o.onProgress === 'function' ? 'progress' : 'play';
  if (kind === 'play' && typeof o.onPlay !== 'function') throw new Error('motion.start: give onProgress or onPlay');
  const part = {
    el, o, kind, p: 0, sent: -1, target: 0, mode: 'scroll', playing: false, done: false, p0: 0, t: 0, dur: 0,
    startAt: o.start != null ? o.start : CFG.writeStart,
    endAt: o.end != null ? o.end : CFG.writeEnd,
    anchor: o.anchor != null ? o.anchor : 0,
    minDuration: o.minDuration != null ? o.minDuration : 600,
    duration: o.duration != null ? o.duration : tokens.lineMs,
    ease: o.ease || ease.linear,
  };
  const handle = {
    el,
    progress: () => part.p,
    finish() {
      if (part.done) return;
      if (part.kind === 'play') play(part, true); else complete(part);
    },
    destroy() { parts.delete(part); },
  };
  if (reducedMotion()) {   // the finished state, at once, without animation
    if (kind === 'play') play(part, true); else complete(part);
    return handle;
  }
  parts.add(part);
  if (settled) place(part);
  wake();
  return handle;
}

export function fadeUp(target, opts) {
  const o = opts || {};
  const els = typeof target === 'string' ? Array.from(document.querySelectorAll(target))
    : target instanceof Element ? [target] : Array.from(target || []);
  return els.map((el) => {
    if (!el.hasAttribute('data-fade')) el.setAttribute('data-fade', '');
    if (o.rise != null) el.style.setProperty('--fade-rise', o.rise + 'px');
    const snap = (on) => { el.style.transition = 'none'; el.classList.toggle('is-in', on); void el.offsetWidth; el.style.transition = ''; };
    return start(el, {
      trigger: o.trigger,
      onPlay({ instant, index }) {
        if (instant) { snap(true); return; }
        const delay = Math.min(index, 4) * tokens.staggerRowsMs;
        el.style.transitionDelay = delay ? delay + 'ms' : '';
        el.classList.add('is-in');
        if (delay) setTimeout(() => { el.style.transitionDelay = ''; }, delay + tokens.revealMs + 50);
      },
      onReset() { snap(false); },
    });
  });
}

export function finishAll() { parts.forEach((part) => { if (!part.done) (part.kind === 'play' ? play(part, true) : complete(part)); }); }

export default { start, fadeUp, isLaptop, reducedMotion, tokens, ease, durationFor, finishAll };
