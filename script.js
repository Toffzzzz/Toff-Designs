/* =====================================================================
   Toff Studio — the continuous ink line
   ---------------------------------------------------------------------
   One pen draws the whole page. Everything it draws (letters, joining
   lines, the style drawings, the Everest animation, the finale) is laid
   out on one timeline, in pen-seconds, at natural speeds from settings.js.

   A single pen clock moves along that timeline:
   - Laptops: scrolling sets where the clock should be; the clock follows
     smoothly, never faster than speeds.maxCatchUp × natural speed. Each
     part is placed on the scroll so it draws when it's on screen, at
     speeds.penHeight down the screen.
   - Phones: each part plays by itself, at natural speed, once it comes
     into view.
   - The clock never goes backwards, so nothing un-draws when scrolling up.
     If the pen falls behind (very fast scrolling), anything already
     scrolled off the top is completed at once.
   - Reduced motion: everything is shown finished.

   Each section has an "ink layer": two SVGs the size of the section (a
   blurred grey shadow underneath, the ink on top). Joining lines leave
   each section at its bottom edge exactly where the next section's line
   starts at its top edge, so the line is unbroken.
   ===================================================================== */
(function () {
  'use strict';

  const S = window.TOFF_SETTINGS;
  const HW = window.TOFF_HW;
  const NS = 'http://www.w3.org/2000/svg';
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(hover: none) and (pointer: coarse)');

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const clamp01 = (v) => clamp(v, 0, 1);
  const seg = (v, a, b) => clamp01((v - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
  const norm = (v) => {
    const l = Math.hypot(v[0], v[1]) || 1;
    return [v[0] / l, v[1] / l];
  };
  const fmt = (n) => Math.round(n * 100) / 100;

  /* ---------- The page always opens at the very top ---------- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) window.location.reload();
  });

  /* ---------- Settings into the page ---------- */
  function applySettings() {
    const c = S.colors;
    const set = (k, v) => root.style.setProperty(k, v);
    set('--bg', c.background);
    set('--ink', c.ink);
    set('--text', c.text);
    set('--muted', c.muted);
    set('--shadow', c.shadow);
    set('--focus', c.focus);
    set('--stroke', `${S.stroke.width}px`);
    set('--shadow-x', `${S.shadow.offsetX}px`);
    set('--shadow-y', `${S.shadow.offsetY}px`);
    set('--shadow-blur', `${S.shadow.blur}px`);
    set('--shadow-opacity', S.shadow.opacity);
    set('--pin', S.finale.pinLength);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', c.background);

    document.querySelectorAll('[data-studio-name]').forEach((el) => (el.textContent = S.studioName));
    document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = S.copyrightYear));
    const email = document.querySelector('[data-email]');
    if (S.email) {
      email.href = `mailto:${S.email}`;
      email.textContent = S.email;
      email.hidden = false;
    }

    // The phrases as real text, for screen readers and search engines
    const sentence = (t) => (/[.!?…]$/.test(t) ? t : `${t}.`);
    document.querySelector('[data-opening-title]').textContent = S.phrases.map((p) => sentence(p.text)).join(' ');
    document.querySelector('[data-finale-title]').textContent = S.finale.heading;
    document.querySelector('[data-message-label]').textContent = S.finale.heading;

    const ch = S.chat;
    document.querySelector('[data-message]').placeholder = ch.placeholder;
    document.querySelector('[data-send]').textContent = ch.sendLabel;
    document.querySelector('[data-privacy-note]').textContent = ch.privacyNote;
    document.querySelector('[data-consent-label]').textContent = ch.consentLabel.replace('{studio}', S.studioName);
    const privacy = document.querySelector('[data-privacy-link]');
    if (ch.privacyPolicyUrl) {
      privacy.href = ch.privacyPolicyUrl;
      privacy.hidden = false;
    }
    const demo = document.querySelector('[data-demo-note]');
    if (!chatIsLive()) {
      demo.textContent = ch.demoNote;
      demo.hidden = false;
    }
  }

  // Live mode needs a privacy policy and an endpoint; otherwise it stays a demo
  function chatIsLive() {
    return S.chat.mode === 'live' && !!S.chat.privacyPolicyUrl && !!S.chat.formEndpoint;
  }

  /* ---------- Style sections, from the templates ---------- */
  const styleIds = S.sectionOrder.filter((id) => S.styles[id] && S.styles[id].show);
  const stylesHost = document.querySelector('[data-styles]');
  const sections = []; // { id, kind, el, ... }

  function buildStyleSections() {
    for (const id of styleIds) {
      const st = S.styles[id];
      const tpl = document.getElementById(st.kind === 'everest-ac' ? 'tpl-everest' : 'tpl-lineart');
      const el = tpl.content.firstElementChild.cloneNode(true);
      el.id = `style-${id}`;
      el.dataset.section = id;
      el.setAttribute('aria-labelledby', `style-${id}-title`);
      const title = el.querySelector('[data-title]');
      title.id = `style-${id}-title`;
      title.textContent = st.title;
      el.querySelector('[data-subtitle]').textContent = st.subtitle;
      const link = el.querySelector('[data-link]');
      if (st.url) {
        link.href = st.url;
        link.textContent = st.linkText;
        const hint = document.createElement('span');
        hint.className = 'visually-hidden';
        hint.textContent = ' (opens in a new tab)';
        link.append(hint);
      } else {
        link.remove(); // hidden until a URL is added in settings.js
      }
      stylesHost.append(el);
      sections.push({ id, kind: st.kind, el, settings: st });
    }
  }

  /* ---------- Loading fonts and drawings ---------- */
  async function loadArtwork(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not load ${url}`);
    const doc = new DOMParser().parseFromString(await res.text(), 'image/svg+xml');
    const svg = doc.querySelector('svg');
    const vb = (svg.getAttribute('viewBox') || '0 0 100 100').split(/[\s,]+/).map(Number);
    const paths = [...svg.querySelectorAll('path')];
    const main = paths.find((p) => /-main$/.test(p.id)) || paths[0];
    const details = paths
      .filter((p) => p !== main)
      .map((p) => ({ id: p.id, d: p.getAttribute('d'), y: parseFloat(p.getAttribute('data-y')) || 0 }));
    return { vb, main: { id: main.id, d: main.getAttribute('d') }, details };
  }

  /* ---------- Ink layers ---------- */
  function createInkLayer(container) {
    const wrap = document.createElement('div');
    wrap.className = 'ink-layer';
    wrap.setAttribute('aria-hidden', 'true');
    const shadow = document.createElementNS(NS, 'svg');
    shadow.setAttribute('class', 'ink ink--shadow');
    const main = document.createElementNS(NS, 'svg');
    main.setAttribute('class', 'ink ink--main');
    for (const svg of [shadow, main]) {
      svg.setAttribute('focusable', 'false');
      svg.setAttribute('preserveAspectRatio', 'none');
    }
    wrap.append(shadow, main);
    container.prepend(wrap);
    return {
      wrap,
      main,
      shadow,
      pageTop: 0,
      clear(w, h) {
        for (const svg of [shadow, main]) {
          svg.replaceChildren();
          svg.setAttribute('viewBox', `0 0 ${fmt(w)} ${fmt(h)}`);
          svg.setAttribute('stroke-width', S.stroke.width);
        }
      },
      // A group in both SVGs (for drawings scaled from their own viewBox)
      group(transform, strokeWidth) {
        const g = [main, shadow].map((svg) => {
          const el = document.createElementNS(NS, 'g');
          el.setAttribute('transform', transform);
          el.setAttribute('stroke-width', strokeWidth);
          svg.append(el);
          return el;
        });
        return { main: g[0], shadow: g[1] };
      },
      path(d, group) {
        const els = [group ? group.main : main, group ? group.shadow : shadow].map((parent) => {
          const p = document.createElementNS(NS, 'path');
          p.setAttribute('d', d);
          if (!reduced) p.classList.add('is-waiting');
          parent.append(p);
          return p;
        });
        return { main: els[0], shadow: els[1] };
      },
    };
  }

  /* ---------- Joining lines ---------- */

  // A smooth line through points: leaves the first along d0, arrives at the
  // last travelling along dN (Catmull-Rom, as cubic Béziers)
  function route(points, d0, dN, endScale = 1) {
    const n = points.length;
    const tangents = points.map((p, i) => {
      if (i === 0) {
        const l = Math.hypot(points[1][0] - p[0], points[1][1] - p[1]);
        return [d0[0] * l * endScale, d0[1] * l * endScale];
      }
      if (i === n - 1) {
        const l = Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1]);
        return [dN[0] * l * endScale, dN[1] * l * endScale];
      }
      return [(points[i + 1][0] - points[i - 1][0]) / 2, (points[i + 1][1] - points[i - 1][1]) / 2];
    });
    let d = `M${fmt(points[0][0])} ${fmt(points[0][1])}`;
    for (let i = 0; i < n - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const c1 = [a[0] + tangents[i][0] / 3, a[1] + tangents[i][1] / 3];
      const c2 = [b[0] - tangents[i + 1][0] / 3, b[1] - tangents[i + 1][1] / 3];
      d += `C${fmt(c1[0])} ${fmt(c1[1])} ${fmt(c2[0])} ${fmt(c2[1])} ${fmt(b[0])} ${fmt(b[1])}`;
    }
    return d;
  }

  // One cubic from p0 (leaving along d0) to p1 (arriving along d1)
  function curve(p0, d0, p1, d1, h0, h1) {
    const dist = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const a = h0 ?? dist * 0.42;
    const b = h1 ?? dist * 0.42;
    return (
      `M${fmt(p0[0])} ${fmt(p0[1])}` +
      `C${fmt(p0[0] + d0[0] * a)} ${fmt(p0[1] + d0[1] * a)} ${fmt(p1[0] - d1[0] * b)} ${fmt(p1[1] - d1[1] * b)} ${fmt(p1[0])} ${fmt(p1[1])}`
    );
  }

  // Position of el inside container, ignoring transforms
  function box(el, container) {
    let x = 0;
    let y = 0;
    for (let node = el; node && node !== container; node = node.offsetParent) {
      x += node.offsetLeft;
      y += node.offsetTop;
    }
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    return { x, y, w, h, cx: x + w / 2, cy: y + h / 2, bottom: y + h, right: x + w };
  }
  const pageTopOf = (el) => el.getBoundingClientRect().top + window.scrollY;

  /* =====================================================================
     The timeline
     ===================================================================== */
  let env = null; // layout environment for the current build
  let items = []; // everything the pen does, sorted by start time
  let parts = []; // phones: groups of items that play together
  let keys = []; // laptops: { t, s } scroll position for each moment
  let clock = 0; // the pen clock (pen-seconds)
  let shadowClock = 0;
  let maxPart = -1;
  let built = false;

  function startPart(triggerY) {
    parts.push({ trigger: triggerY, t0: env.t, t1: env.t });
    env.part = parts.length - 1;
  }

  function addItem(item) {
    item.part = env.part;
    items.push(item);
    parts[env.part].t1 = Math.max(parts[env.part].t1, item.t1);
    return item;
  }

  // Scroll samples (laptops): a moment `t` should happen at scroll `s`
  function sample(t, s, opts = {}) {
    keys.push({ t, s, k: opts.k ?? env.K, max: opts.max ?? Infinity });
  }

  /**
   * Adds a stroke to the timeline.
   * opts: dur, layer, group (scaled drawing), sampling: 'path' | 'start' | 'none',
   * parallelAt (start time; doesn't move the timeline), toPage (local → page
   * point for sampling), upper (scroll upper-bound offset), finale
   */
  function addStroke(layer, d, opts) {
    const els = layer.path(d, opts.group);
    const len = els.main.getTotalLength();
    const t0 = opts.parallelAt ?? env.t;
    const dur = Math.max(opts.minDur ?? 0.05, opts.dur(len));
    const item = addItem({ main: els.main, shadow: els.shadow, len, t0, t1: t0 + dur, pm: -1, ps: -1 });
    const toPage = opts.toPage || ((p) => [p.x, p.y + layer.pageTop]);

    // Lowest point, for completing strokes scrolled off the top
    const bb = els.main.getBBox();
    const lo = toPage({ x: bb.x, y: bb.y + bb.height });
    item.yMax = opts.yMax ?? lo[1];

    if (opts.sampling === 'path') {
      const n = Math.max(2, Math.ceil((len * (opts.scale || 1)) / 40));
      for (let i = 0; i <= n; i++) {
        const l = (len * i) / n;
        const p = toPage(els.main.getPointAtLength(l));
        sample(t0 + (dur * i) / n, p[1] - env.penY);
      }
    } else if (opts.sampling === 'start') {
      const p = toPage(els.main.getPointAtLength(0));
      sample(t0, p[1] - env.penY, { max: p[1] - env.topLimit });
    }
    if (opts.parallelAt === undefined) env.t = t0 + dur;
    return item;
  }

  function addAnim(dur, onProgress, opts = {}) {
    const t0 = opts.parallelAt ?? env.t;
    const item = addItem({ anim: onProgress, t0, t1: t0 + Math.max(0.001, dur), pm: -1, ps: -1, yMax: opts.yMax ?? Infinity });
    if (opts.parallelAt === undefined) env.t = item.t1;
    return item;
  }

  const pause = (dt) => {
    env.t += dt;
  };

  /* ---------- Section 1: the phrases ---------- */
  function buildOpening(sec, exitX) {
    const { W, vh, phone } = env;
    const layer = sec.layer;
    const sp = S.speeds;
    const phrases = S.phrases.map((p) => ({ ...p, font: env.fonts[p.font] }));
    const gut = phone ? 22 : clamp(W * 0.07, 24, 110);
    const avail = W - gut * 2;

    // Sizes: as large as fits
    const baseEm = phone ? Math.min(W * 0.17, 84) : clamp(W * 0.072, 58, 124);
    const laid = phrases.map((p, k) => {
      let em = baseEm * (p.size || 1);
      let lines = [p.text];
      let m = HW.measureLine(p.font, p.text, em, p.letterSpacing);
      if (phone && m.width > avail && k === phrases.length - 1) {
        lines = HW.wrap(p.font, p.text, em, p.letterSpacing, avail);
        const widest = Math.max(...lines.map((l) => HW.measureLine(p.font, l, em, p.letterSpacing).width));
        if (widest > avail) em *= avail / widest;
      } else if (m.width > avail) {
        em *= avail / m.width;
      }
      const dry = HW.layout(p.font, p.text, { em, letterSpacing: p.letterSpacing, lines, x: 0, y: 0, lineHeight: 1.3 });
      // Natural writing time
      let dur = 0;
      for (const s of dry.strokes) dur += Math.max(0.05, HW.strokeLength(s) / (sp.writing * em)) + (s.newWord ? sp.wordGap : sp.penLift);
      return { ...p, em, lines, dry, dur };
    });

    // Desktop zigzag: each phrase starts further right; the last ends at the right margin
    if (!phone) {
      const last = laid[laid.length - 1];
      let lastW = last.dry.bbox.width;
      const minStep = W * 0.08;
      if (gut + (laid.length - 1) * minStep + lastW > W - gut) {
        const fit = W - gut * 2 - (laid.length - 1) * minStep;
        const f = fit / lastW;
        last.em *= f;
        last.dur *= 1;
        last.dry = HW.layout(last.font, last.text, { em: last.em, letterSpacing: last.letterSpacing, x: 0, y: 0 });
        lastW = last.dry.bbox.width;
      }
      const step = (W - gut * 2 - lastW) / (laid.length - 1);
      laid.forEach((p, k) => {
        p.x = gut + step * k;
        if (p.x + p.dry.bbox.width > W - gut) p.x = W - gut - p.dry.bbox.width;
      });
    } else {
      laid.forEach((p, k) => {
        const room = avail - p.dry.bbox.width;
        p.x = gut + (k % 2 ? Math.min(W * 0.1, Math.max(0, room)) : 0);
      });
    }

    // Vertical: spacious; on laptops, enough scroll for each phrase to be written
    let y = phone ? Math.max(vh * 0.3, 170) : vh * 0.45;
    laid.forEach((p, k) => {
      if (k > 0) {
        const prev = laid[k - 1];
        const visual = prev.y + prev.dry.bbox.maxY - p.dry.bbox.minY + (phone ? vh * 0.13 : vh * 0.16);
        y = Math.max(visual, prev.y + (phone ? vh * 0.2 : vh * 0.5));
      }
      p.y = y;
    });
    const lastP = laid[laid.length - 1];
    const H = Math.max(vh, lastP.y + lastP.dry.bbox.maxY + (phone ? vh * 0.22 : vh * 0.34));
    sec.el.style.height = `${H}px`;
    layer.clear(W, H);
    layer.pageTop = 0;

    // Draw: phrase, joining line, phrase, … then down to the next section
    let prevEnd = null;
    laid.forEach((p, k) => {
      const r = HW.layout(p.font, p.text, { em: p.em, letterSpacing: p.letterSpacing, lines: p.lines, x: p.x, y: p.y, lineHeight: 1.3 });
      startPart(r.bbox.minY - (k ? vh * 0.1 : 0));
      if (prevEnd) {
        const d = curve(prevEnd.point, prevEnd.dir, r.start, norm([r.startDir[0] * 0.6, r.startDir[1] * 0.6 + 0.8]));
        addStroke(layer, d, { dur: (l) => l / (sp.line * vh), minDur: 0.35, sampling: 'path' });
        pause(sp.penLift);
      }
      const tStart = env.t;
      const written = r.strokes.map((s, i) => {
        if (i > 0) pause(s.newWord ? sp.wordGap : sp.penLift);
        return addStroke(layer, s.d, { dur: (l) => l / (sp.writing * p.em), sampling: 'none' });
      });
      // Laptops: written while the phrase moves from phraseScroll[0] to [1] down the screen
      const [from, to] = sp.phraseScroll;
      const s0 = p.y - vh * from;
      const s1 = Math.max(p.y - vh * to, k === 0 ? vh * 0.22 : 0);
      const span = env.t - tStart || 1;
      for (const it of written) sample(it.t0, lerp(s0, s1, (it.t0 - tStart) / span), { k: 0 });
      sample(env.t, s1, { k: 0 });
      pause(sp.penLift * 2);
      const tiny = HW.strokeLength(r.strokes[r.strokes.length - 1]) < 10;
      // Leave heading downwards (never back up over the letters)
      prevEnd = { point: r.end, dir: tiny ? norm([0.2, 1]) : norm([r.endDir[0] * 0.35, Math.max(0, r.endDir[1]) + 1]) };
    });
    // Down to the next section, arriving straight down at exitX
    const d = curve(prevEnd.point, prevEnd.dir, [exitX, H], [0, 1], null, (H - prevEnd.point[1]) * 0.55);
    addStroke(layer, d, { dur: (l) => l / (sp.line * vh), minDur: 0.35, sampling: 'path' });
    sec.height = H;
  }

  /* ---------- Style drawings (face-line.svg and friends) ---------- */
  function prepLineart(sec) {
    const art = sec.el.querySelector('[data-art]');
    const { vb } = sec.art;
    art.style.setProperty('--art-ratio', `${vb[2]} / ${vb[3]}`);
  }

  function measureLineart(sec) {
    const art = sec.el.querySelector('[data-art]');
    const b = box(art, sec.el);
    const { vb } = sec.art;
    const s = b.w / vb[2];
    sec.geo = { b, s, tx: b.x - vb[0] * s, ty: b.y - vb[1] * s };
    // Where the main line starts and ends, in section coordinates
    const tmp = document.createElementNS(NS, 'path');
    tmp.setAttribute('d', sec.art.main.d);
    sec.layer.main.append(tmp);
    const len = tmp.getTotalLength();
    const a = tmp.getPointAtLength(0);
    const z = tmp.getPointAtLength(len);
    tmp.remove();
    const g = sec.geo;
    g.start = [g.tx + a.x * s, g.ty + a.y * s];
    g.end = [g.tx + z.x * s, g.ty + z.y * s];
    sec.entryX = g.start[0];
  }

  function buildLineart(sec, exitX) {
    const { W, vh } = env;
    const sp = S.speeds;
    const layer = sec.layer;
    const H = sec.el.offsetHeight;
    layer.clear(W, H);
    layer.pageTop = pageTopOf(sec.el);
    const g = sec.geo;
    const toPage = (p) => [g.tx + p.x * g.s, g.ty + p.y * g.s + layer.pageTop];

    startPart(layer.pageTop + g.b.y);
    // In from the top edge, straight down to where the drawing starts
    addStroke(layer, route([[sec.entryX, 0], g.start], [0, 1], [0, 1]), { dur: (l) => l / (sp.line * vh), minDur: 0.2, sampling: 'path' });

    const caption = sec.el.querySelector('[data-caption]');
    addAnim(0.001, (p) => p > 0 && caption.classList.add('is-shown'), { parallelAt: env.t, yMax: Infinity });

    const group = layer.group(`translate(${fmt(g.tx)} ${fmt(g.ty)}) scale(${g.s})`, S.stroke.width / g.s);
    const mainStart = env.t;
    const main = addStroke(layer, sec.art.main.d, {
      group,
      dur: (l) => (l * g.s) / (sp.drawing * vh),
      sampling: 'path',
      scale: g.s,
      toPage,
    });
    // Each detail starts as the main line reaches its height (data-y)
    const mainPath = main.main;
    const ys = [];
    for (let l = 0; l <= main.len; l += 2) ys.push(mainPath.getPointAtLength(l).y);
    const reachTimes = sec.art.details.map((det) => {
      let i = ys.findIndex((y) => y >= det.y);
      if (i < 0) i = ys.length - 1;
      return mainStart + (main.t1 - main.t0) * Math.min(1, (i * 2) / main.len);
    });
    sec.art.details.forEach((det, i) => {
      addStroke(layer, det.d, {
        group,
        dur: (l) => (l * g.s) / (sp.details * vh),
        minDur: 0.12,
        sampling: 'none',
        parallelAt: reachTimes[i],
        toPage,
      });
    });
    pause(sp.penLift);
    addExit(sec, g.end, exitX, H);
  }

  // From the bottom of a drawing to the next section's entry point. On phones
  // the caption sits below the drawing, so the line goes down the right margin.
  function addExit(sec, from, exitX, H) {
    const { W, vh, phone } = env;
    const sp = S.speeds;
    let d;
    if (phone) {
      const cap = box(sec.el.querySelector('[data-caption]'), sec.el);
      // Reach the margin before the caption starts, run down beside it, then on
      const x = W - 16;
      const pts = [from, [x, cap.y - 10], [x, cap.bottom + 12], [exitX, H]];
      d = route(pts, [0, 1], [0, 1], 0.8);
    } else {
      d = curve(from, [0, 1], [exitX, H], [0, 1], (H - from[1]) * 0.5, (H - from[1]) * 0.5);
    }
    addStroke(sec.layer, d, { dur: (l) => l / (sp.line * vh), minDur: 0.3, sampling: 'path' });
  }

  /* ---------- Everest ---------- */
  function measureEverest(sec) {
    const unit = sec.el.querySelector('[data-unit]');
    const readout = sec.el.querySelector('[data-readout]');
    const u = box(unit, sec.el);
    const r = box(readout, sec.el);
    sec.geo = { u, r };
    sec.entryX = u.cx;
  }

  function buildEverest(sec, exitX) {
    const { W, vh } = env;
    const sp = S.speeds;
    const layer = sec.layer;
    const H = sec.el.offsetHeight;
    layer.clear(W, H);
    layer.pageTop = pageTopOf(sec.el);
    const { u, r } = sec.geo;

    startPart(layer.pageTop + u.y);
    // The line flows in and ends where the AC unit appears
    addStroke(layer, route([[sec.entryX, 0], [u.cx, u.y]], [0, 1], [0, 1]), { dur: (l) => l / (sp.line * vh), minDur: 0.2, sampling: 'path' });

    const caption = sec.el.querySelector('[data-caption]');
    addAnim(0.001, (p) => p > 0 && caption.classList.add('is-shown'), { parallelAt: env.t });

    // The AC animation itself
    const E = S.everest;
    const unitMid = layer.pageTop + u.cy;
    const t0 = env.t;
    addAnim(E.duration, (p) => sec.ev.render(p), { yMax: layer.pageTop + r.bottom });
    sample(t0, unitMid - vh * 0.74, { k: 0 });
    sample(env.t, unitMid - vh * 0.74 + vh * E.scrollLength, { k: 0 });
    pause(sp.penLift * 2);

    // …and continues from below it
    addExit(sec, [u.cx, r.bottom + 16], exitX, H);
  }

  /* ---------- Finale ---------- */
  const finale = {
    el: document.querySelector('.finale'),
    stage: document.querySelector('[data-stage]'),
    row: document.querySelector('[data-row]'),
    headingSlot: document.querySelector('[data-heading-slot]'),
    chat: document.querySelector('[data-chat]'),
  };

  function buildPreviews() {
    finale.row.classList.toggle('has-many', sections.length > 2);
    for (const sec of sections) {
      if (sec.kind === 'everest-ac') {
        const li = document.getElementById('tpl-preview-everest').content.firstElementChild.cloneNode(true);
        li.querySelector('[data-temp-final]').textContent = `${S.everest.temperature.to}°C`;
        li.querySelector('[data-preview-label]').textContent = `${sec.settings.title}: an air conditioning unit at ${S.everest.temperature.to}°C`;
        finale.row.append(li);
      } else {
        const li = document.getElementById('tpl-preview-lineart').content.firstElementChild.cloneNode(true);
        const svg = li.querySelector('svg');
        const { vb, main, details } = sec.art;
        svg.setAttribute('viewBox', vb.join(' '));
        svg.style.setProperty('--art-ratio', `${vb[2]} / ${vb[3]}`);
        const sw = (S.stroke.width * 0.75 * vb[3]) / 120; // about 0.75 × the line at the row's size
        for (const cls of ['preview-shadow', 'preview-ink']) {
          const g = document.createElementNS(NS, 'g');
          g.setAttribute('class', cls);
          g.setAttribute('stroke-width', sw);
          if (cls === 'preview-shadow') g.setAttribute('transform', `translate(0 ${(S.shadow.offsetY * vb[3]) / 120})`);
          for (const d of [main.d, ...details.map((x) => x.d)]) {
            const p = document.createElementNS(NS, 'path');
            p.setAttribute('d', d);
            g.append(p);
          }
          svg.append(g);
        }
        li.querySelector('[data-preview-label]').textContent = sec.settings.title;
        finale.row.append(li);
      }
    }
  }

  function measureFinale() {
    const { W, vh, phone } = env;
    const stage = finale.stage;
    const H = stage.offsetHeight;
    const rowB = box(finale.row, stage);
    const slot = box(finale.headingSlot, stage);
    const chatB = box(finale.chat, stage);
    const font = env.fonts[S.finale.font || S.phrases[3].font];
    const gut = phone ? 20 : clamp(W * 0.07, 24, 110);
    let em = (phone ? Math.min(W * 0.13, 58) : clamp(W * 0.052, 46, 92)) * (S.finale.size || 1);
    const maxW = Math.min(W - gut * 2, 980);
    let lines = HW.wrap(font, S.finale.heading, em, 0, maxW);
    const widest = Math.max(...lines.map((l) => HW.measureLine(font, l, em, 0).width));
    if (widest > maxW) em *= maxW / widest;
    const dry = HW.layout(font, S.finale.heading, { em, lines, x: 0, y: 0, align: 'center', width: maxW, lineHeight: 1.25 });
    const ox = (W - maxW) / 2;
    const oy = slot.y + (slot.h - dry.bbox.height) / 2 - dry.bbox.minY;
    const heading = { font, em, lines, x: ox, y: oy, width: maxW };
    const start = [ox + dry.start[0], oy + dry.start[1]];

    // Previews: final (small) layout; the big row is the same scaled up
    const previews = [...finale.row.children].map((li) => ({ li, b: box(li, finale.row) }));
    const rowLeftFinal = rowB.x;
    const entryX = clamp(Math.min(rowLeftFinal - (phone ? 14 : W * 0.035), start[0]), 14, W - 14);
    const big = Math.min(1 / S.finale.rowScale, (W * 0.88) / rowB.w, (H * 0.42) / rowB.h);
    finale.geo = { H, rowB, slot, chatB, heading, start, previews, entryX, big };
    finale.entryX = entryX;
  }

  function buildFinale() {
    const { W, vh, phone } = env;
    const sp = S.speeds;
    const D = S.finale.durations;
    const g = finale.geo;
    const layer = finale.layer;
    layer.clear(W, g.H);
    layer.pageTop = pageTopOf(finale.el);
    const finaleTop = layer.pageTop;
    const finaleBottom = finaleTop + finale.el.offsetHeight;
    const toPage = (p) => [p.x, p.y + layer.pageTop];

    startPart(env.pinned ? finaleTop : finaleTop + vh * 0.35);
    const tf0 = env.t;

    // 1. The previews slide in from the left and right and meet in a row
    const rowCx = g.rowB.cx;
    const bigTop = g.H * (phone ? 0.36 : 0.4) - (g.rowB.h * g.big) / 2;
    const bigDx = W / 2 - rowCx;
    const bigDy = bigTop - g.rowB.y;
    const setRow = (k) => {
      const dx = bigDx * k;
      const dy = bigDy * k;
      const s = lerp(1, g.big, k);
      finale.row.style.transform = k <= 0.0001 ? 'none' : `translate3d(${fmt(dx)}px, ${fmt(dy)}px, 0) scale(${fmt(s)})`;
    };
    const n = g.previews.length;
    const stagger = n > 1 ? 0.35 / (n - 1) : 0;
    addAnim(D.slideIn, (p) => {
      setRow(1);
      g.previews.forEach(({ li, b }, i) => {
        const fromLeft = b.cx < g.rowB.w / 2 || (n === 1);
        const off = (W / 2 + b.w * g.big) / g.big + W * 0.1;
        const q = easeOut3(seg(p, i * stagger, i * stagger + 0.65));
        li.style.opacity = seg(q, 0, 0.25);
        li.style.transform = q >= 1 ? 'none' : `translate3d(${fmt((fromLeft ? -off : off) * (1 - q))}px, 0, 0)`;
      });
    }, { yMax: finaleBottom });

    // 2. The row shrinks and moves up to the top, where it stays
    addAnim(D.rowUp, (p) => setRow(1 - easeInOut(p)), { yMax: finaleBottom });
    pause(sp.penLift * 2);

    // 3. The pen comes in from the top and writes the heading
    const entry = [g.entryX, 0];
    const startDir = norm([0, 1]);
    const r = HW.layout(g.heading.font, S.finale.heading, { em: g.heading.em, lines: g.heading.lines, x: g.heading.x, y: g.heading.y, align: 'center', width: g.heading.width, lineHeight: 1.25 });
    // Straight down beside the row of previews, then into the first letter
    const clear = g.rowB.bottom + 24;
    const arrive = norm([r.startDir[0] * 0.5, r.startDir[1] * 0.5 + 0.9]);
    const dIn = clear < r.start[1] - 40
      ? route([entry, [g.entryX, clear], r.start], [0, 1], arrive, 0.7)
      : curve(entry, [0, 1], r.start, arrive, (r.start[1] - entry[1]) * 0.55, null);
    addStroke(layer, dIn, { dur: (l) => l / (sp.line * vh), minDur: 0.35, sampling: 'none', toPage, yMax: finaleBottom });
    pause(sp.penLift);
    r.strokes.forEach((s, i) => {
      if (i > 0) pause(s.newWord ? sp.wordGap : sp.penLift);
      addStroke(layer, s.d, { dur: (l) => l / (sp.writing * g.heading.em), sampling: 'none', toPage, yMax: finaleBottom });
    });
    pause(0.15);

    // 4. The chat box rises from the bottom
    const rise = g.H - g.chatB.y;
    addAnim(D.chatRise, (p) => {
      const e = easeOut3(p);
      finale.chat.style.opacity = seg(p, 0, 0.6);
      finale.chat.style.transform = p >= 1 ? 'none' : `translate3d(0, ${fmt(rise * 0.35 * (1 - e))}px, 0)`;
    }, { yMax: finaleBottom });
    const tf1 = env.t;
    finale.t1 = tf1;

    // Laptops: the finale plays across the pinned scroll
    if (env.pinned) {
      const s0 = finaleTop - vh * 0.15;
      const s1 = finaleTop + S.finale.pinLength * vh - vh * 0.12;
      for (const it of items) {
        if (it.t0 >= tf0) {
          sample(it.t0, lerp(s0, s1, (it.t0 - tf0) / (tf1 - tf0)), { k: 0 });
        }
      }
      sample(tf1, s1, { k: 0 });
      finale.scrollEnd = s1;
    } else {
      finale.scrollEnd = finaleTop;
    }
    // Starting state
    setRow(1);
  }

  /* ---------- Building everything ---------- */
  function stableVh() {
    return window.innerHeight;
  }

  function build() {
    const W = root.clientWidth;
    const vh = stableVh();
    const phone = W <= S.breakpoints.phone;
    const autoplay = phone || coarse.matches;
    const pinned = !autoplay && !reduced;
    root.classList.toggle('is-phone', phone);
    root.classList.toggle('no-pin', !pinned);

    // Keep the pen's place: which part it was in, and how far through
    let resume = null;
    if (built && parts.length) {
      const i = parts.findIndex((p) => clock < p.t1);
      resume = i < 0 ? { part: parts.length, frac: 0 } : { part: i, frac: clamp01((clock - parts[i].t0) / (parts[i].t1 - parts[i].t0 || 1)) };
    }

    env = { W, vh, phone, autoplay, pinned, t: 0, part: -1, fonts: env?.fonts || loadedFonts };
    env.K = S.speeds.scrollPerSecond * vh;
    env.penY = S.speeds.penHeight * vh;
    env.topLimit = vh * 0.1;
    items = [];
    parts = [];
    keys = [];

    // Measure everything first (each section needs the next one's entry point)
    for (const sec of sections) {
      if (sec.kind === 'everest-ac') measureEverest(sec);
      else measureLineart(sec);
    }
    measureFinale();
    const entries = [...sections.map((s) => s.entryX), finale.entryX];

    buildOpening(opening, entries[0]);
    // The opening's height changed the page; measure the rest again
    for (const sec of sections) {
      if (sec.kind === 'everest-ac') measureEverest(sec);
      else measureLineart(sec);
    }
    sections.forEach((sec, i) => {
      if (sec.kind === 'everest-ac') buildEverest(sec, entries[i + 1]);
      else buildLineart(sec, entries[i + 1]);
    });
    buildFinale();

    items.sort((a, b) => a.t0 - b.t0);
    solveScroll();

    // Resume
    if (reduced) {
      clock = shadowClock = Infinity;
    } else if (resume) {
      const p = parts[Math.min(resume.part, parts.length - 1)];
      clock = resume.part >= parts.length ? Infinity : p.t0 + resume.frac * (p.t1 - p.t0);
      shadowClock = clock;
      maxPart = Math.max(maxPart, Math.min(resume.part, parts.length - 1));
    }
    built = true;
    renderAll(true);
  }

  // Laptops: turn the samples into a scroll → pen-time map
  function solveScroll() {
    keys.sort((a, b) => a.t - b.t);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (i > 0) {
        const prev = keys[i - 1];
        k.s = Math.max(k.s, prev.s + (k.t - prev.t) * k.k);
      }
    }
    for (let i = keys.length - 1; i >= 0; i--) {
      const k = keys[i];
      k.s = Math.min(k.s, k.max);
      if (i < keys.length - 1) k.s = Math.min(k.s, keys[i + 1].s);
    }
    for (const k of keys) k.s = Math.max(0, k.s);
  }

  function timeAtScroll(s) {
    if (!keys.length) return 0;
    if (s <= keys[0].s) return keys[0].t;
    if (s >= keys[keys.length - 1].s) return keys[keys.length - 1].t;
    let lo = 0;
    let hi = keys.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (keys[mid].s <= s) lo = mid;
      else hi = mid;
    }
    const a = keys[lo];
    const b = keys[hi];
    return b.s - a.s < 0.001 ? b.t : lerp(a.t, b.t, (s - a.s) / (b.s - a.s));
  }

  /* ---------- Rendering ---------- */
  function setDash(path, len, p) {
    if (p <= 0) {
      path.classList.add('is-waiting');
      return;
    }
    path.classList.remove('is-waiting');
    if (p >= 1) {
      path.style.strokeDasharray = 'none';
      path.style.strokeDashoffset = '0';
    } else {
      path.style.strokeDasharray = `${len} ${len}`;
      path.style.strokeDashoffset = `${len * (1 - p)}`;
    }
  }

  let fromMain = 0;
  let fromShadow = 0;
  function renderAll(force) {
    if (force) {
      fromMain = 0;
      fromShadow = 0;
    }
    fromMain = renderChannel(clock, fromMain, 'pm', (it, p) => {
      if (it.anim) it.anim(p);
      else setDash(it.main, it.len, p);
    });
    fromShadow = renderChannel(shadowClock, fromShadow, 'ps', (it, p) => {
      if (it.shadow) setDash(it.shadow, it.len, p);
    });
  }

  function renderChannel(T, from, key, apply) {
    while (from < items.length && items[from][key] >= 1) from++;
    for (let j = from; j < items.length; j++) {
      const it = items[j];
      if (it.t0 > T) {
        if (it[key] < 0) {
          // Starting state, once
          it[key] = 0;
          apply(it, 0);
        }
        continue;
      }
      const p = clamp01((T - it.t0) / (it.t1 - it.t0));
      if (p !== it[key]) {
        it[key] = p;
        apply(it, p);
      }
    }
    return from;
  }

  /* ---------- The pen clock ---------- */
  let last = performance.now();
  let cueHidden = false;
  const cue = document.querySelector('[data-scroll-cue]');

  function tick() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!built || reduced) return;
    const y = window.scrollY;
    const vh = env.vh;

    if (!cueHidden && y > 30) {
      cueHidden = true;
      cue.classList.add('is-hidden');
    }

    let target;
    if (env.autoplay) {
      while (maxPart + 1 < parts.length && parts[maxPart + 1].trigger <= y + vh * 0.85) maxPart++;
      target = maxPart >= 0 ? parts[maxPart].t1 : 0;
      if (target > clock) clock = Math.min(target, clock + dt);
    } else {
      target = timeAtScroll(y);
      if (target > clock) {
        const step = Math.min((target - clock) * (1 - Math.exp(-dt / 0.1)), S.speeds.maxCatchUp * dt);
        clock = target - clock < 0.002 ? target : clock + step;
      }
    }

    // Anything scrolled off the top that the pen hasn't finished: finish it now
    for (let j = fromMain; j < items.length; j++) {
      const it = items[j];
      if (it.t0 > clock) break;
      if (it.t1 > clock && it.yMax < y - 4) clock = it.t1;
    }

    const ds = clock - shadowClock;
    shadowClock = ds < 0.0005 ? clock : shadowClock + ds * (1 - Math.exp(-dt / Math.max(0.001, S.shadow.delay)));
    renderAll(false);
  }

  /* ---------- Chat box ---------- */
  function initChat() {
    const form = finale.chat;
    const message = form.querySelector('[data-message]');
    const consent = form.querySelector('[data-consent]');
    const status = form.querySelector('[data-status]');
    const send = form.querySelector('[data-send]');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.classList.remove('is-error');
      if (!message.value.trim()) {
        status.textContent = 'Please write a few words about what you need.';
        status.classList.add('is-error');
        message.focus();
        return;
      }
      if (!consent.checked) {
        status.textContent = 'Please tick the box so we can reply to you.';
        status.classList.add('is-error');
        consent.focus();
        return;
      }
      if (!chatIsLive()) {
        // Demo mode: nothing is sent anywhere
        status.textContent = S.chat.thanks;
        form.reset();
        return;
      }
      send.disabled = true;
      try {
        const res = await fetch(S.chat.formEndpoint, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(form),
        });
        if (!res.ok) throw new Error(String(res.status));
        status.textContent = S.chat.thanks;
        form.reset();
      } catch {
        status.textContent = "Sorry, that didn't send. Please try again in a moment.";
        status.classList.add('is-error');
      } finally {
        send.disabled = false;
      }
    });

    // Reaching the chat box by keyboard (or the skip link) finishes the finale
    const finish = () => {
      if (!built || reduced || clock >= finale.t1) return;
      clock = shadowClock = finale.t1;
      maxPart = parts.length - 1;
      renderAll(false);
    };
    form.addEventListener('focusin', () => {
      const was = clock < finale.t1;
      finish();
      if (was && env.pinned) scrollToY(finale.scrollEnd);
    });
    document.querySelector('[data-skip-to-chat]').addEventListener('click', (e) => {
      e.preventDefault();
      finish();
      if (env.pinned) scrollToY(finale.scrollEnd, true);
      else message.scrollIntoView({ block: 'center' });
      message.focus({ preventScroll: true });
    });

    // Phones: keep the box comfortably above the keyboard while typing
    const keepInView = () => {
      if (!env.phone || document.activeElement !== message) return;
      const vv = window.visualViewport;
      const r = form.getBoundingClientRect();
      const visibleBottom = vv ? vv.height : window.innerHeight;
      if (r.bottom > visibleBottom - 12 || r.top < 60) {
        window.scrollBy({ top: r.bottom - visibleBottom + 16, behavior: 'smooth' });
      }
    };
    message.addEventListener('focus', () => setTimeout(keepInView, 350));
    window.visualViewport?.addEventListener('resize', () => setTimeout(keepInView, 50));
  }

  let lenis = null;
  function scrollToY(y, immediate) {
    if (lenis) lenis.scrollTo(y, { immediate: !!immediate, force: true });
    else window.scrollTo({ top: y, behavior: immediate ? 'auto' : 'smooth' });
  }

  /* ---------- Start ---------- */
  const opening = { el: document.querySelector('[data-section="opening"]') };
  let loadedFonts = {};

  async function start() {
    applySettings();
    buildStyleSections();
    opening.layer = createInkLayer(opening.el);
    for (const sec of sections) sec.layer = createInkLayer(sec.el);
    finale.layer = createInkLayer(finale.stage);

    const fontIds = [...new Set([...S.phrases.map((p) => p.font), S.finale.font || S.phrases[3].font])];
    const fontList = await Promise.all(fontIds.map((id) => HW.loadFont(id)));
    fontIds.forEach((id, i) => (loadedFonts[id] = fontList[i]));
    await Promise.all(
      sections.map(async (sec) => {
        if (sec.kind === 'everest-ac') {
          sec.ev = window.TOFF_EVEREST.init(sec.el, S.everest);
        } else {
          sec.art = await loadArtwork(sec.settings.artwork);
          prepLineart(sec);
        }
      }),
    );
    buildPreviews();
    initChat();

    if (!reduced && !(root.clientWidth <= S.breakpoints.phone || coarse.matches) && window.Lenis) {
      lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
      window.gsap.ticker.add((time) => lenis.raf(time * 1000));
      window.gsap.ticker.lagSmoothing(0);
    }
    document.querySelector('.studio-mark').addEventListener('click', (e) => {
      e.preventDefault();
      scrollToY(0);
    });

    build();
    window.gsap.ticker.add(tick);

    // Re-lay out when the size changes (phones: only when the width changes,
    // not when the address bar slides)
    let lastW = root.clientWidth;
    let lastH = window.innerHeight;
    let timer = null;
    window.addEventListener('resize', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const w = root.clientWidth;
        const h = window.innerHeight;
        const phoneNow = w <= S.breakpoints.phone || coarse.matches;
        if (w !== lastW || (!phoneNow && h !== lastH)) {
          lastW = w;
          lastH = h;
          build();
        }
      }, 180);
    });
    document.fonts?.ready.then(() => built && build());
    window.addEventListener('load', () => built && build());
  }

  start().catch((err) => {
    // If anything fails, show the page finished rather than half-drawn
    console.error(err);
    root.classList.remove('js-motion');
  });

  // For checks in the browser console
  window.TOFF_DEBUG = {
    get clock() {
      return clock;
    },
    get items() {
      return items;
    },
    get parts() {
      return parts;
    },
    get keys() {
      return keys;
    },
    get env() {
      return env;
    },
  };
})();
