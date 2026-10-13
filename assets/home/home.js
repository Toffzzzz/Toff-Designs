/*
 * Toff Studio: the home page (round 05). Builder HOME.
 *
 * Puts the page together:
 *  - the shell (top bar, footer, skip link) with the old #addresses landing on the nearest new part;
 *  - what comes from settings.js: the live-site links, How we work's timeframes, Kind words (real quotes
 *    only) and About (placeholder text: shown only while showPlaceholders is on or with ?unfinished);
 *  - the hero (hero.js) and, when its painting finishes, the line that drops from the stage into Work;
 *  - the pen (assets/handwriting/) writing the clients' names, loaded on the first scroll or when Work is
 *    near; the case films (films.js) and the concept list (concepts.js) when near;
 *  - the three mount points other modules fill, each imported when its section is within about 1.5
 *    screens and given mount(el, { settings, shell }): agent.js (#ai), design-yours.js (#design-yours)
 *    and concierge.js (#contact, also on the first 'toff:concierge-open', or the first scroll past the hero);
 *  - "Tell us what you need", written by InkWriter once the heading is 70% on screen;
 *  - How we work's process line (forward only: scroll-driven on laptops, by itself on phones).
 * Nothing here loads the Lab or three.js.
 */
import { mount as mountShell } from '../shared/shell.js';
import { start, fadeUp, reducedMotion, ease } from '../shared/motion.js';
import { mountHero } from './hero.js';

const S = window.TOFF_SETTINGS || {};
const doc = document, root = doc.documentElement;
const HW = S.handwriting || {};
const filled = (v) => (typeof v === 'string' ? v.trim() !== '' : !!v);
const showPH = root.classList.contains('show-unfinished');
const PHONE = window.matchMedia('(max-width: ' + ((HW.breakpoint || 700) - 1) + 'px)');
const $ = (s, c) => (c || doc).querySelector(s);
const $$ = (s, c) => [...(c || doc).querySelectorAll(s)];

/* ---------------------------------------------------------------- the pen's look, from settings.js */
if (HW.color) root.style.setProperty('--pen-ink', HW.color);
if (HW.shadow && HW.shadow.color) root.style.setProperty('--pen-shadow', HW.shadow.color);
if (HW.strokePx) {
  if (HW.strokePx.mobile) root.style.setProperty('--pen-w-mobile', HW.strokePx.mobile + 'px');
  if (HW.strokePx.desktop) root.style.setProperty('--pen-w-desktop', HW.strokePx.desktop + 'px');
}
root.classList.add('has-pen', 'has-ink');   // the pen writes the names and the contact heading (their text stays for screen readers)

/* ---------------------------------------------------------------- content from settings.js */
function fillContent() {
  const L = S.links || {};
  // Live sites: Bluebird links out; Everest says "Live site coming soon" until links.everest is set
  $$('a[data-link]').forEach((a) => {
    const url = L[a.getAttribute('data-link')];
    if (filled(url)) { a.href = url.trim(); a.hidden = false; } else { a.removeAttribute('href'); a.hidden = true; }
  });
  $$('[data-soon]').forEach((s) => { s.hidden = filled(L[s.getAttribute('data-soon')]); });

  // How we work: how long each step takes (hidden until set; "to be added" with placeholders on)
  const tf = (S.process && S.process.timeframes) || [];
  $$('[data-timeframe]').forEach((e) => {
    const v = tf[+e.getAttribute('data-timeframe')];
    if (filled(v)) { e.textContent = 'How long: ' + String(v).trim(); e.removeAttribute('data-unfinished'); e.hidden = false; }
  });

  // Kind words: real testimonials only, never invented; the section stays hidden until there's one
  const box = $('[data-quotes]');
  if (box) {
    let shown = 0;
    (S.testimonials || []).forEach((t) => {
      const fig = doc.createElement('figure'); fig.className = 'kw-quote';
      if (filled(t.quote)) {
        const q = String(t.quote).trim().replace(/^["“”']+|["“”']+$/g, '');
        const bq = doc.createElement('blockquote'); bq.textContent = '“' + q + '”'; fig.append(bq);
        const by = [t.name, t.business].filter(filled).join(', ');
        if (by) { const c = doc.createElement('figcaption'); c.textContent = by; fig.append(c); }
      } else if (showPH) {
        const n = doc.createElement('p'); n.className = 'ph-note'; n.textContent = 'Placeholder';
        const bq = doc.createElement('blockquote'); bq.textContent = 'A short quote from ' + t.project + ' will go here.';
        const c = doc.createElement('figcaption'); c.textContent = 'Client name, ' + t.project;
        fig.append(n, bq, c);
      } else return;
      box.append(fig); shown++;
    });
    $('[data-testimonials-section]').hidden = shown === 0;
  }
  // About: its text is still a placeholder, so it shows only with placeholders on
  const about = $('[data-about]'); if (about) about.hidden = !showPH;
}
fillContent();

/* ---------------------------------------------------------------- the shell, and old addresses */
const aliases = {
  opening: 'hero', 'ai-assistants': 'ai', 'selected-work': 'work', 'try-it': 'design-yours', playground: 'design-yours',
  'draw-your-site': 'design-yours', 'one-line': 'lab', 'what-we-build': 'concepts', 'lab-teaser': 'lab',
  'how-it-works': 'how-we-work', enquiry: 'contact',
};
if ($('#testimonials').hidden) aliases.testimonials = 'contact';
if ($('#about').hidden) aliases.about = 'contact';
const shell = mountShell({ aliases });
const ctx = () => ({ settings: window.TOFF_SETTINGS, shell: window.ToffShell || shell });

/* ---------------------------------------------------------------- helpers */
// The pictures: Phase 4's captures index (assets/home/captures/captures.json, made by tools/capture/), over
// manifest.json, which now holds only the case films' fallbacks (used while a film has no frames).
const getJSON = (u) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const manifest = Promise.all([getJSON('assets/home/captures/captures.json'), getJSON('assets/home/captures/manifest.json')])
  .then(([c, m]) => withCaptures(m || {}, c));
function withCaptures(m, c) {
  if (!c || typeof c !== 'object') return m;
  const src = (v) => (v && typeof v === 'object' ? v.src : v) || '';
  const dev = (d, old) => (d ? { site: src(d.site) || (old && old.site), siteSrcset: d.site && d.site.srcset, sketch: src(d.sketch) || (old && old.sketch),
    sketchSrcset: (d.sketch && d.sketch.srcset) || (old && old.sketchSrcset), w: (d.site && d.site.w) || (old && old.w), h: (d.site && d.site.h) || (old && old.h) } : old);
  if (Array.isArray(c.hero) && c.hero.length) {
    const before = {}; (m.hero || []).forEach((h) => { before[h.id] = h; });
    m.hero = c.hero.filter((h) => h && h.id).map((h) => {
      const o = before[h.id] || {};
      return { id: h.id, name: h.name || o.name, kind: h.kind || o.kind, caption: h.caption || o.caption, laptop: dev(h.laptop, o.laptop), phone: dev(h.phone, o.phone) };
    });
  }
  const seq = (d, fps) => (d && Array.isArray(d.frames) && d.frames.length ? { frames: d.frames, count: d.frames.length, w: d.w, h: d.h, fps: d.fps || fps } : null);
  if (c.films) {
    m.films = m.films || {};
    Object.keys(c.films).forEach((k) => {
      const f = m.films[k] = m.films[k] || {};
      ['laptop', 'phone'].forEach((d) => { const s = seq(c.films[k] && c.films[k][d]); if (s) f[d] = s; });
    });
  }
  if (c.concepts) {
    m.concepts = m.concepts || {};
    Object.keys(c.concepts).forEach((k) => {
      const n = c.concepts[k] || {}, o = m.concepts[k] = m.concepts[k] || {};
      if (n.still && n.still.src) o.still = n.still;
      if (n.phoneStill && n.phoneStill.src) o.phoneStill = n.phoneStill;
      const s = seq(n, 24); if (s) o.preview = s;
    });
  }
  return m;
}
const scripts = {};
function loadScript(src) {
  if (!scripts[src]) {
    scripts[src] = new Promise((res, rej) => {
      const done = doc.querySelector('script[src="' + src + '"]');
      if (done && done.dataset.loaded) { res(); return; }
      const sc = doc.createElement('script'); sc.src = src;
      sc.onload = () => { sc.dataset.loaded = '1'; res(); }; sc.onerror = () => rej(new Error('Could not load ' + src));
      doc.head.append(sc);
    });
  }
  return scripts[src];
}
// Call fn once when el comes within `screens` screens of the viewport
function near(el, screens, fn) {
  if (!el) return;
  if (!('IntersectionObserver' in window)) { fn(); return; }
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); fn(); } }, { rootMargin: Math.round(screens * 100) + '% 0px ' + Math.round(screens * 100) + '% 0px' });
  io.observe(el);
}
function afterLoad(fn) {
  const go = () => (window.requestIdleCallback || ((f) => setTimeout(f, 200)))(fn, { timeout: 1200 });
  if (doc.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
}
function quiet(el, err) {   // a module that didn't arrive: say so plainly, keep the page working
  console.warn(err);
  if (!el || el.childElementCount) return;
  const p = doc.createElement('p');
  p.className = 'wrap t-small t-quiet mount-error';
  p.textContent = 'This part of the page didn’t load. Refreshing the page usually brings it back.';
  el.append(p);
}

/* ---------------------------------------------------------------- the hero, and the line it drops into Work */
const drop = $('[data-hero-drop]');
let dropState = 'idle', dropTick = 0;
function placeDrop() {
  dropTick = 0;
  const main = $('#main'), mr = main.getBoundingClientRect(), sr = $('[data-hero-stage]').getBoundingClientRect();
  const w = parseFloat(getComputedStyle(drop).width) || 3;
  const x = sr.left + sr.width / 2 - mr.left;
  let y0, y1;
  if (PHONE.matches) {   // phones: from under the caption and buttons to just above "Recent work"
    y0 = $('.hero-row').getBoundingClientRect().bottom - mr.top + 16;
    y1 = $('#work-title').getBoundingClientRect().top - mr.top - 28;
  } else {               // laptops and tablets: from the stage's bottom centre to where the pen starts writing
    y0 = sr.bottom - mr.top;
    y1 = $('[data-pen="bluebird"]').getBoundingClientRect().top - mr.top + 1;
  }
  drop.style.left = (x - w / 2).toFixed(1) + 'px';
  drop.style.top = y0.toFixed(1) + 'px';
  drop.style.height = Math.max(0, y1 - y0).toFixed(1) + 'px';
}
function dropLine() {
  if (dropState !== 'idle') return;
  placeDrop();
  if (reducedMotion()) { dropState = 'down'; drop.classList.add('is-down'); return; }
  dropState = 'dropping';
  requestAnimationFrame(() => {
    drop.classList.add('is-dropping');
    const ms = (S.motion && S.motion.lineMs) || 1400;
    setTimeout(() => { dropState = 'down'; drop.classList.replace('is-dropping', 'is-down'); }, ms + 50);
  });
}
if ('ResizeObserver' in window) new ResizeObserver(() => { if (dropState !== 'idle' && !dropTick) dropTick = requestAnimationFrame(placeDrop); }).observe(doc.body);
window.addEventListener('resize', () => { if (dropState !== 'idle' && !dropTick) dropTick = requestAnimationFrame(placeDrop); });

const hero = mountHero($('#hero'), { settings: S, manifest, onFirstDone: dropLine });

/* ---------------------------------------------------------------- the pen writes the clients' names */
let pens = null, penP = null;
function loadPens() {
  if (penP) return penP;
  const opt = {};
  ['color', 'strokePx', 'shadow', 'writeStart', 'writeEnd', 'tailTip', 'ease', 'maxSpeedPx', 'autoSpeedPx', 'phoneSpeedPx', 'phoneTrigger',
    'breakpoint', 'jumpScreens', 'settleMs', 'minLinkScroll', 'entryTip'].forEach((k) => { if (HW[k] != null) opt[k] = HW[k]; });
  opt.introOnLoad = false;   // the hero sits above: the first name writes as you scroll to it
  // The pen arrives after the page has loaded (often while the visitor is already scrolling): the browser has
  // long since restored the scroll position, so start from where the page is now instead of waiting.
  if (doc.readyState === 'complete') opt.settleMs = 0;
  penP = loadScript('assets/handwriting/line-data.js')
    .then(() => loadScript('assets/handwriting/handwriting.js'))
    .then(() => {
      const D = window.HANDWRITING_DATA || {};
      return Promise.all(['bluebird', 'everest'].map((k) => {
        const el = $('[data-pen="' + k + '"]');
        if (!D[k + '-desktop'] || !D[k + '-mobile']) throw new Error('No handwriting layout for ' + k);
        return window.Handwriting.mount(el, Object.assign({}, opt, { data: { desktop: D[k + '-desktop'], mobile: D[k + '-mobile'] } }));
      }));
    })
    .then((h) => { pens = h; return h; })
    .catch((err) => { console.warn('The pen could not load; showing the names as text', err); root.classList.remove('has-pen'); });
  return penP;
}
window.addEventListener('scroll', function first() { window.removeEventListener('scroll', first); loadPens(); }, { passive: true });
near($('#work'), 1.5, () => afterLoad(loadPens));

/* ---------------------------------------------------------------- the case films and the concept list */
let films = null;
near($('#work'), 1.5, () => {
  Promise.all([import('./films.js'), manifest]).then(([mod, m]) => { films = mod.mountFilms($('#work'), { manifest: m || {} }); })
    .catch((err) => console.warn('The case films could not load', err));
});
near($('#concepts'), 1, () => {
  Promise.all([import('./concepts.js'), manifest]).then(([mod, m]) => mod.mountConcepts($('#concepts'), { manifest: m || {} }))
    .catch((err) => console.warn('The concept list could not load its pictures', err));
});

/* ---------------------------------------------------------------- the modules other builders make */
const MODULES = { agent: './agent.js', 'design-yours': './design-yours.js' };
$$('[data-mount]').forEach((el) => {
  const key = el.getAttribute('data-mount'), path = MODULES[key];
  if (!path) return;
  near(el, 1.5, () => {
    el.setAttribute('aria-busy', 'true');
    import(path).then((mod) => { el.removeAttribute('aria-busy'); return mod.mount(el, ctx()); })
      .catch((err) => { el.removeAttribute('aria-busy'); quiet(el, err); });
  });
});

// The concierge: on the first 'toff:concierge-open', the first scroll past the hero, or when #contact is near
let conciergeP = null, conciergeReady = false;
const conciergeEl = $('[data-mount="concierge-inline"]');
function loadConcierge() {
  if (!conciergeP) {
    conciergeP = import('./concierge.js').then((mod) => {
      if (typeof mod.mount === 'function') mod.mount(conciergeEl, ctx());
      conciergeReady = true;
      return mod;
    });
    conciergeP.catch((err) => quiet(conciergeEl, err));
  }
  return conciergeP;
}
doc.addEventListener('toff:concierge-open', (e) => {
  if (conciergeReady || e.defaultPrevented) return;   // once it's here, the concierge answers for itself
  e.preventDefault();                                  // claim it while the concierge loads
  const detail = Object.assign({}, e.detail);
  loadConcierge().then((mod) => {
    if (shell.openConcierge(detail)) return;           // handed over: the concierge has opened
    if (typeof mod.open === 'function') mod.open({ topic: detail.topic });
    else shell.jumpTo('contact');
  }, () => shell.jumpTo('contact'));
});
window.addEventListener('scroll', function past() {
  const h = $('#hero'); if (!h || window.scrollY < h.offsetTop + h.offsetHeight) return;
  window.removeEventListener('scroll', past); loadConcierge();
}, { passive: true });
near($('#contact'), 1.5, loadConcierge);

/* ---------------------------------------------------------------- "Tell us what you need", written by the pen */
near($('#contact'), 1.5, () => {
  loadScript('assets/studio/inkwriter-data.js').then(() => loadScript('assets/studio/inkwriter.js')).then(() => {
    window.InkWriter.mount($('[data-ink-heading]'), { phrase: 'finale-wide', narrow: 'finale-narrow', narrowBelow: 560, speed: 150, threshold: 0.7 });
  }).catch((err) => { console.warn(err); root.classList.remove('has-ink'); });
});

/* ---------------------------------------------------------------- How we work: the process line */
function processLine() {
  const box = $('[data-process]'); if (!box) return null;
  const NS = 'http://www.w3.org/2000/svg', svg = $('.hww-ink', box), steps = $$('.hww-step', box);
  let path = null, shadow = null, circles = [], stops = [], k = 0;
  function rand(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 - 0.5; }; }
  function build() {
    const b = box.getBoundingClientRect(); if (!b.width) return;
    const R = steps.map((s) => {
      const r = s.getBoundingClientRect(), d = $('.hww-dot', s).getBoundingClientRect(), n = $('.hww-name', s).getBoundingClientRect();
      return { x: d.left - b.left, y: d.top - b.top, top: r.top - b.top, bottom: r.bottom - b.top, left: r.left - b.left, right: r.right - b.left, nameTop: n.top - b.top };
    });
    const two = R.length > 1 && Math.abs(R[1].x - R[0].x) > 40, pts = [];
    if (!two) {   // one column: down the left, past each dot
      pts.push([R[0].x, R[0].y - 44]);
      R.forEach((r, i) => { pts.push([r.x, r.y]); const n = R[i + 1]; if (n) pts.push([r.x + (i % 2 ? -5 : 5), (r.y + n.y) / 2]); });
      const last = R[R.length - 1]; pts.push([last.x, last.bottom + 24]);
    } else {      // two columns at staggered heights: over each name, down the gutter between them, across under the step above
      const gx = (R[0].right + R[1].left) / 2;
      pts.push([R[0].x - 40, R[0].y + 14]);   // the pen comes in from the left
      pts.push([R[0].x, R[0].y]);
      for (let i = 0; i < R.length - 1; i++) {
        const a = R[i], n = R[i + 1];
        if (n.x > a.x) {   // left to right: rise over a's name, then down the gutter into n
          pts.push([a.x + (gx - a.x) * 0.5, a.nameTop - 30]);
          pts.push([gx, a.nameTop + 6]);
          pts.push([gx, n.y - 26]);
        } else {           // right to left: down the gutter, across between the step above and n, into n
          const above = R[i - 1] || a;
          const clear = (above.bottom + n.top) / 2;
          pts.push([gx, a.y + 40]);
          pts.push([gx, clear - 12]);
          pts.push([(gx + n.x) / 2, clear + 4]);
          pts.push([n.x + 10, n.nameTop - 24]);
        }
        pts.push([n.x, n.y]);
      }
      const last = R[R.length - 1]; pts.push([last.x - 2, last.bottom + 26]);
    }
    let d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (let i = 0; i < pts.length - 1; i++) {   // Catmull-Rom with short handles: a loose, hand-made curve
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2, t = 0.16;
      d += ' C' + (p1[0] + (p2[0] - p0[0]) * t).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) * t).toFixed(1) + ' ' +
        (p2[0] - (p3[0] - p1[0]) * t).toFixed(1) + ' ' + (p2[1] - (p3[1] - p1[1]) * t).toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    // a hand-drawn feel: let the pen drift a little along the curve
    svg.replaceChildren();
    const tmp = doc.createElementNS(NS, 'path'); tmp.setAttribute('d', d); svg.append(tmp);
    const TL = tmp.getTotalLength(), n = Math.max(12, Math.round(TL / 9)), q = [], r = rand(7);
    for (let s = 0; s <= n; s++) {
      const at = TL * s / n, a = tmp.getPointAtLength(at), c = tmp.getPointAtLength(Math.min(TL, at + 1)), ang = Math.atan2(c.y - a.y, c.x - a.x);
      const off = Math.sin(s * 0.37 + 1.7) * 0.8 + Math.sin(s * 0.11) * 1.1 + r() * 0.4;
      q.push([a.x - Math.sin(ang) * off, a.y + Math.cos(ang) * off]);
    }
    let dd = 'M' + q[0][0].toFixed(1) + ' ' + q[0][1].toFixed(1);
    for (let m = 1; m < q.length - 1; m++) dd += ' Q' + q[m][0].toFixed(1) + ' ' + q[m][1].toFixed(1) + ' ' + ((q[m][0] + q[m + 1][0]) / 2).toFixed(1) + ' ' + ((q[m][1] + q[m + 1][1]) / 2).toFixed(1);
    dd += ' L' + q[q.length - 1][0].toFixed(1) + ' ' + q[q.length - 1][1].toFixed(1);
    svg.replaceChildren();
    svg.setAttribute('viewBox', '0 0 ' + Math.round(b.width) + ' ' + Math.round(b.height));
    shadow = doc.createElementNS(NS, 'path'); shadow.setAttribute('class', 'hww-shadow'); shadow.setAttribute('d', dd); shadow.setAttribute('transform', 'translate(1.5 2)');
    path = doc.createElementNS(NS, 'path'); path.setAttribute('d', dd);
    svg.append(shadow, path);
    const L = path.getTotalLength();
    [path, shadow].forEach((p) => { p.style.strokeDasharray = L + ' ' + (L + 2); });
    circles = R.map((p) => { const c = doc.createElementNS(NS, 'circle'); c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.setAttribute('r', 6); svg.append(c); return c; });
    stops = R.map((p) => { let best = 0, bd = 1e9; for (let s = 0; s <= 240; s++) { const pt = path.getPointAtLength(L * s / 240), dist = Math.hypot(pt.x - p.x, pt.y - p.y); if (dist < bd) { bd = dist; best = s / 240; } } return best; });
    set(k);
  }
  function set(v) {
    k = v; if (!path) return;
    const L = path.getTotalLength();
    [path, shadow].forEach((p) => { p.style.strokeDashoffset = (L * (1 - v)).toFixed(1); p.style.visibility = v > 0 ? 'visible' : 'hidden'; });
    circles.forEach((c, i) => { const on = v >= stops[i] - 0.004; c.style.visibility = on ? 'visible' : 'hidden'; steps[i].classList.toggle('is-reached', on); });
    if (v >= 1) box.classList.add('is-drawn');
  }
  build();
  let lastW = box.clientWidth, t = 0;
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (Math.abs(box.clientWidth - lastW) < 2 && path) return; lastW = box.clientWidth; clearTimeout(t); t = setTimeout(build, 60); }).observe(box);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(build);
  const h = start(box, { anchor: 0.5, start: 1, end: 0.5, duration: 2600, ease: ease.inOut, onProgress: set });
  return { progress: () => h.progress(), rebuild: build };
}
const proc = processLine();

/* ---------------------------------------------------------------- fade-ups (once, never replayed) */
fadeUp('[data-fade]');

/* ---------------------------------------------------------------- for the tests */
window.__home = { hero, shell, pens: () => pens, films: () => films, drop: () => dropState, process: proc, loadPens, loadConcierge };
