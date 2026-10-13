/*
 * Lab piece 4: Shape a vase (#vase).
 * Draw the right half of a vase's outline (pointer or finger) on the sketchbook; the stroke is tidied
 * into a profile a potter could throw (vase/profile.js) and turned on Hollis & Pine's lathe
 * (work/hollis-and-pine/js/vase.js, imported, not copied) in a midnight studio (vase/studio.js).
 * Four glazes, drag or arrow keys to turn, "Save a product shot" downloads a 1600 x 2000 PNG.
 * Presets give keyboard users (and the first visit) a shape to start from.
 *
 * Motion: the pot turns by itself only for three seconds after each new shape, and never with
 * reduced motion; dragging, the arrow keys or pause() stop it for good.
 *
 * Contract (rounds/round-05-plan.md section 6):
 *   mount(container, { reducedMotion, lowPower, soundOn, still }) -> { title, made, goodFor, describe, pause, resume, dispose }
 */
import { createVase, GLAZES } from '../../../work/hollis-and-pine/js/vase.js';
import { loadCss, el, tokens, coarse, listeners, makeSound, easeOut } from './ink/kit.js';
import { PRESETS, fromStroke, normalise, sampleOutline, radiusAt, shapeWords } from './vase/profile.js';
import { footprint, paintStudio } from './vase/studio.js';

const TITLE = 'Shape a vase';
const MADE = 'Your drawn outline is smoothed into a potter’s profile and turned on a three.js lathe, with physically based glazes and soft studio light.';
const GOOD_FOR = 'makers and shops';
const GLAZE_WORDS = {
  matte: 'a chalk-white matte glaze', satin: 'a sage-green satin glaze',
  gloss: 'a glossy terracotta glaze', speckled: 'an oatmeal glaze speckled with iron',
};
const BEST_ANGLE = 0.5;          // the turn Hollis & Pine shows its pots at
const TURN = { by: 1.0, ms: 3000 };
const SHOT = { w: 1600, h: 2000, lightW: 1200, lightH: 1500 };
const LINE = { w: 2.25, shadowDy: 3.5 };
let uid = 0;

/* three.js reads devicePixelRatio once, when the renderer is made. Until vase.js takes a pixelRatio
   option (asked of the lead), low-power devices get a lighter canvas by lowering it for that moment. */
function withPixelRatio(pr, fn) {
  if (!pr) return fn();
  const own = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
  try { Object.defineProperty(window, 'devicePixelRatio', { value: pr, configurable: true, writable: true }); } catch (e) { return fn(); }
  try { return fn(); }
  finally { if (own) Object.defineProperty(window, 'devicePixelRatio', own); else delete window.devicePixelRatio; }
}

export async function mount(container, { reducedMotion = false, lowPower = false, soundOn = false, still } = {}) {
  reducedMotion = reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const id = 'lp-vase-' + (++uid);
  const root = el('div', { class: 'lp lp-vase' });
  container.appendChild(root);
  await Promise.all([
    loadCss(root, new URL('./ink/kit.css', import.meta.url).href),
    loadCss(root, new URL('./vase/vase.css', import.meta.url).href),
  ]);

  const ev = listeners(), sound = makeSound(!!soundOn);
  const T = tokens(root);
  const touch = coarse();
  let disposed = false, paused = false;
  let vase = null, shotVase = null, flat = false;
  let preset = 'moon', profile = PRESETS.find((p) => p.id === preset).profile, drawn = false;
  let glaze = 'satin';
  const urls = new Set(), timers = new Set();
  let ro = null, rto = 0;
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (!disposed) fn(); }, ms); timers.add(t); return t; };

  /* ---------------------------------------------------------------- the page */
  const studio = el('canvas', { class: 'lv-studio', 'aria-hidden': 'true' });
  const status = el('p', { class: 'lv-status', id: id + '-status' });
  const live = el('p', { class: 'lp-sr', 'aria-live': 'polite' });
  const pad = el('canvas', { class: 'lv-pad', role: 'img', 'aria-describedby': id + '-status' });
  const again = el('button', { type: 'button', class: 'lp-btn lp-btn--quiet lv-again', text: 'Draw another' });
  const presetBtns = PRESETS.map((p) => el('button', { type: 'button', class: 'lp-btn lp-btn--quiet', 'data-id': p.id, 'aria-pressed': 'false', text: p.label }));
  const draw = el('section', { class: 'lv-draw', 'aria-label': 'Draw half a vase' }, [
    el('p', { class: 'lp-label', id: id + '-presets', text: 'Start from a shape, or draw your own' }),
    el('div', { class: 'lv-presets', role: 'group', 'aria-labelledby': id + '-presets' }, presetBtns),
    el('div', { class: 'lv-surface' }, [pad, status, again]),
  ]);
  const gl = el('canvas', {
    class: 'lv-gl', tabindex: '0', role: 'slider', 'aria-label': 'Turn the vase', 'aria-describedby': id + '-desc',
    'aria-valuemin': '0', 'aria-valuemax': '359', 'aria-valuenow': '0', 'aria-orientation': 'horizontal',
  });
  const view = el('div', { class: 'lv-view' }, [gl]);
  const glazeInputs = [];
  const glazes = el('fieldset', { class: 'lv-glazes' }, [el('legend', { class: 'lp-sr', text: 'Glaze' })].concat(Object.keys(GLAZES).map((k) => {
    const input = el('input', { type: 'radio', name: id + '-glaze', value: k });
    if (k === glaze) input.checked = true;
    glazeInputs.push(input);
    const i = el('i', { 'aria-hidden': 'true' }); i.style.setProperty('--c', GLAZES[k].colour);
    return el('label', { class: 'lv-glaze' }, [input, i, GLAZES[k].label]);
  })));
  const save = el('button', { type: 'button', class: 'lp-btn lp-btn--line lv-save', text: 'Save a product shot' });
  const desc = el('p', { class: 'lp-sr', id: id + '-desc' });
  const stage = el('section', { class: 'lv-stage', 'aria-label': 'Your vase' }, [view, el('div', { class: 'lv-tools' }, [glazes, save]), desc]);
  const wrap = el('div', { class: 'lv' }, [draw, stage]);
  root.append(studio, wrap, live);

  const hint = touch ? 'Draw the right half of a vase with your finger, from the foot up to the rim.' : 'Draw the right half of a vase, from the foot up to the rim.';
  // the visible line stays short (it sits over the sketch); screen readers hear the whole sentence
  function say(t, full) { status.textContent = t; live.textContent = full || t; }
  function shapeName() { return drawn ? 'a vase of your own' : PRESETS.find((p) => p.id === preset).words; }
  function describe() {
    return `${TITLE}. On one side, a sketchbook with half a vase’s outline drawn in cream ink, mirrored faintly to show the whole shape. ` +
      `Beside it, the vase thrown in 3D in a dark studio: ${shapeName()}, ${shapeWords(profile)}, in ${GLAZE_WORDS[glaze]}, with a band of bare clay at the foot. ` +
      'Draw a new outline with the pointer or a finger, or choose one of the shapes; choose a glaze; drag the vase or use the arrow keys to turn it; and save a product shot as a picture.';
  }
  function refreshText() {
    desc.textContent = describe();
    pad.setAttribute('aria-label', `Sketchbook: the outline of ${shapeName()}. Drawing needs a pointer or a finger; the shape buttons above do the same from the keyboard.`);
  }
  function markPreset() { presetBtns.forEach((b) => b.setAttribute('aria-pressed', String(!drawn && b.dataset.id === preset))); }

  /* ---------------------------------------------------------------- the studio backdrop */
  let box = null;
  function layoutStudio() {
    const r = root.getBoundingClientRect(), v = view.getBoundingClientRect();
    const d = Math.min(2, window.devicePixelRatio || 1) * (lowPower ? 0.75 : 1);
    const W = Math.max(1, Math.round(r.width * d)), H = Math.max(1, Math.round(r.height * d));
    if (studio.width !== W || studio.height !== H) { studio.width = W; studio.height = H; }
    box = v.width > 2 && v.height > 2 ? { x: v.left - r.left, y: v.top - r.top, w: v.width, h: v.height, fp: footprint(v.width / v.height, profile) } : null;
    const ctx = studio.getContext('2d');
    ctx.setTransform(d, 0, 0, d, 0, 0);
    paintStudio(ctx, r.width, r.height, box, T);
    if (flat) paintFlat(ctx);
  }
  /* without WebGL: the pot as a flat silhouette in its glaze, so drawing still shows something */
  function paintFlat(ctx) {
    if (!box) return;
    const P = sampleOutline(profile, 12), f = box.fp;
    const fx = box.x + f.cx * box.w, fy = box.y + f.cy * box.h, top = box.y + f.top * box.h, s = fy - top;
    ctx.beginPath();
    P.forEach(([rr, y], i) => (i ? ctx.lineTo(fx + rr * s, fy - y * s) : ctx.moveTo(fx + rr * s, fy - y * s)));
    for (let i = P.length - 1; i >= 0; i--) ctx.lineTo(fx - P[i][0] * s, fy - P[i][1] * s);
    ctx.closePath();
    const g = ctx.createLinearGradient(fx - s * 0.6, 0, fx + s * 0.6, 0);
    g.addColorStop(0, GLAZES[glaze].colour); g.addColorStop(1, 'rgba(10,16,30,1)');
    ctx.fillStyle = GLAZES[glaze].colour; ctx.fill();
    ctx.globalAlpha = 0.5; ctx.fillStyle = g; ctx.fill(); ctx.globalAlpha = 1;
  }

  /* ---------------------------------------------------------------- the sketchbook */
  const pctx = pad.getContext('2d');
  let PW = 0, PH = 0, pd = 1;
  let shown = null;        // { pts: [[x, y]] right half in px, from foot to rim, scale, baseline }
  let stroke = null;       // points while drawing
  let morph = null, rings = null, praf = 0;
  const RING_LEVELS = [0.14, 0.32, 0.5, 0.68, 0.86, 1];

  function geom() {
    const phone = PW < 520;
    const top = phone ? 70 : 64, bottom = phone ? 62 : 72;
    const axis = PW / 2, baseline = PH - bottom;
    return { axis, baseline, top, availH: Math.max(40, baseline - top), half: Math.max(40, PW / 2 - (phone ? 16 : 28)) };
  }
  function fit(prof) {
    const g = geom(), P = sampleOutline(prof, 14);
    const maxR = Math.max(...P.map((p) => p[0]));
    const scale = Math.min(g.availH, g.half / (maxR + 0.035));
    return { pts: P.map(([r, y]) => [g.axis + r * scale, g.baseline - y * scale]), norm: P, scale, baseline: g.baseline };
  }
  function sizePad() {
    const r = pad.getBoundingClientRect();
    pd = Math.min(2, window.devicePixelRatio || 1);
    PW = Math.max(1, r.width); PH = Math.max(1, r.height);
    pad.width = Math.round(PW * pd); pad.height = Math.round(PH * pd);
    shown = fit(profile); morph = null;
    paintPad(performance.now());
  }

  function line(pts, colour, width, alpha, dy = 0, dash = null) {
    if (!pts || pts.length < 2) return;
    pctx.globalAlpha = alpha; pctx.strokeStyle = colour; pctx.lineWidth = width;
    pctx.setLineDash(dash || []);
    pctx.beginPath();
    pts.forEach(([x, y], i) => (i ? pctx.lineTo(x, y + dy) : pctx.moveTo(x, y + dy)));
    pctx.stroke();
    pctx.globalAlpha = 1; pctx.setLineDash([]);
  }
  const mirror = (pts, axis) => pts.map(([x, y]) => [2 * axis - x, y]);
  function penLine(pts) {
    line(pts, T.lineShadow, LINE.w, 1, LINE.shadowDy);
    line(pts, T.ink, LINE.w, 1);
  }
  function paintPad(now) {
    const g = geom();
    pctx.setTransform(pd, 0, 0, pd, 0, 0);
    pctx.clearRect(0, 0, PW, PH);
    pctx.lineCap = 'round'; pctx.lineJoin = 'round';
    // the wheel and the centre line
    line([[g.axis - g.half, g.baseline + 0.5], [g.axis + g.half, g.baseline + 0.5]], T.hairline, 1, 1);
    line([[g.axis, g.top - 18], [g.axis, g.baseline]], T.gold, 1, 0.42, 0, [3, 6]);
    if (stroke) {
      const pts = stroke.pts.map((p) => [g.axis + Math.abs(p[0] - g.axis), p[1]]);
      line(mirror(pts, g.axis), T.ink, LINE.w, 0.32);
      penLine(pts);
      const last = pts[pts.length - 1];
      dot(last[0], last[1], 3.2, T.gold);
      return;
    }
    if (!shown) return;
    let pts = shown.pts;
    if (morph) {
      const t = paused || reducedMotion ? 1 : easeOut((now - morph.t0) / morph.dur);
      pts = morph.to.map(([x, y], i) => [morph.from[i][0] + (x - morph.from[i][0]) * t, morph.from[i][1] + (y - morph.from[i][1]) * t]);
      if (t >= 1) { morph = null; pts = shown.pts; }
    }
    // the lathe rings, sweeping round from the drawn side
    if (!morph) {
      RING_LEVELS.forEach((v, i) => {
        let p = 1;
        if (rings && !paused && !reducedMotion) p = Math.max(0, Math.min(1, (now - rings.t0 - i * 90) / 640));
        if (p <= 0) return;
        const r = radiusAt(shown.norm, v) * shown.scale, y = shown.baseline - v * shown.scale, ry = Math.max(2, r * 0.14);
        const e = easeOut(p) * Math.PI * 2;
        pctx.lineWidth = 1; pctx.strokeStyle = T.ink;
        pctx.globalAlpha = v === 1 ? 0.5 : 0.26;
        pctx.beginPath(); pctx.ellipse(g.axis, y, r, ry, 0, 0, Math.min(Math.PI, e)); pctx.stroke();
        if (e > Math.PI) {
          pctx.globalAlpha = v === 1 ? 0.3 : 0.13; pctx.setLineDash([2, 4]);
          pctx.beginPath(); pctx.ellipse(g.axis, y, r, ry, 0, Math.PI, e); pctx.stroke(); pctx.setLineDash([]);
        }
        pctx.globalAlpha = 1;
      });
      if (rings && (paused || reducedMotion || now - rings.t0 > (RING_LEVELS.length - 1) * 90 + 640)) rings = null;
    }
    line(mirror(pts, g.axis), T.ink, LINE.w, 0.34);
    penLine(pts);
    const a = pts[0], b = pts[pts.length - 1];
    dot(a[0], a[1], 2.6, T.gold); dot(b[0], b[1], 2.6, T.gold);
  }
  function dot(x, y, r, c) { pctx.fillStyle = c; pctx.beginPath(); pctx.arc(x, y, r, 0, Math.PI * 2); pctx.fill(); }
  function animatePad() {
    if (praf || disposed) return;
    const step = (now) => {
      praf = 0;
      paintPad(now);
      if (!paused && (morph || rings)) praf = requestAnimationFrame(step);
    };
    praf = requestAnimationFrame(step);
  }

  function resampleArc(pts, n) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = cum[cum.length - 1] || 1, out = [];
    let j = 1;
    for (let k = 0; k < n; k++) {
      const s = (L * k) / (n - 1);
      while (j < cum.length - 1 && cum[j] < s) j++;
      const f = (s - cum[j - 1]) / Math.max(1e-9, cum[j] - cum[j - 1]);
      const a = pts[j - 1] || pts[0], b = pts[j] || a;
      out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
    }
    return out;
  }

  /* ---------------------------------------------------------------- making a pot from a profile */
  function show(prof, { fromPts = null, animate = true } = {}) {
    profile = prof;
    const next = fit(prof);
    const still = reducedMotion || !animate || paused;
    morph = null; rings = null;
    if (fromPts && !still) morph = { from: resampleArc(fromPts, 120), to: resampleArc(next.pts, 120), t0: performance.now(), dur: 440 };
    shown = next;
    if (!still) rings = { t0: performance.now() + (morph ? morph.dur : 0) };
    animatePad(); paintPad(performance.now());
    refreshText();
    throwPot(still ? 0 : (morph ? 300 : 120), !still);
  }
  function throwPot(delay, turn) {
    if (!vase) { layoutStudio(); return; }
    stopTurn();
    if (!delay) { vase.setProfile(profile); vase.setAngle(BEST_ANGLE); layoutStudio(); onAngle(BEST_ANGLE); return; }
    gl.setAttribute('data-out', '');
    later(() => {
      vase.setProfile(profile);
      vase.setAngle(BEST_ANGLE - TURN.by);
      layoutStudio();
      requestAnimationFrame(() => { if (disposed) return; gl.removeAttribute('data-out'); if (turn) startTurn(); else vase.setAngle(BEST_ANGLE); });
    }, delay + 170);
  }

  /* ---------------------------------------------------------------- the presentation turn (3 s, never more) */
  let turn = null, traf = 0;
  function startTurn() {
    if (!vase || reducedMotion || paused) return;
    turn = { a0: vase.getAngle(), t0: performance.now() };
    const step = (now) => {
      traf = 0;
      if (!turn || paused || disposed) return;
      const t = Math.min(1, (now - turn.t0) / TURN.ms);
      vase.setAngle(turn.a0 + TURN.by * easeOut(t)); onAngle(vase.getAngle());
      if (t < 1) traf = requestAnimationFrame(step); else turn = null;
    };
    traf = requestAnimationFrame(step);
  }
  function stopTurn() { turn = null; if (traf) cancelAnimationFrame(traf); traf = 0; }
  function onAngle(a) {
    const deg = Math.round(((a * 180) / Math.PI % 360 + 360) % 360);
    gl.setAttribute('aria-valuenow', String(deg));
    gl.setAttribute('aria-valuetext', `Turned ${deg} degrees`);
  }

  /* ---------------------------------------------------------------- drawing */
  function local(e) { const r = pad.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  ev.on(pad, 'pointerdown', (e) => {
    if (e.button && e.button !== 0) return;
    e.preventDefault();
    stopTurn(); morph = null; rings = null;
    stroke = { id: e.pointerId, pts: [local(e)] };
    try { pad.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
    paintPad(performance.now());
  });
  ev.on(pad, 'pointermove', (e) => {
    if (!stroke || e.pointerId !== stroke.id) return;
    const list = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    (list.length ? list : [e]).forEach((c) => {
      const p = local(c), last = stroke.pts[stroke.pts.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) >= 1.5) stroke.pts.push(p);
    });
    sound.scratch();
    if (!praf) praf = requestAnimationFrame((now) => { praf = 0; paintPad(now); });
  });
  ev.on(pad, 'pointerup', (e) => { if (stroke && e.pointerId === stroke.id) finish(); });
  ev.on(pad, 'pointercancel', () => { stroke = null; paintPad(performance.now()); });
  function finish() {
    const s = stroke; stroke = null;
    const g = geom();
    const res = fromStroke(s.pts, g.axis, { minHeight: Math.max(44, g.availH * 0.22) });
    if (res.error) {
      say(res.error === 'short' ? 'Draw a little taller: one line from the foot up to the rim.' : hint);
      paintPad(performance.now());
      return;
    }
    // the stroke, foot first and mirrored onto the right, is where the tidy line grows from
    let pts = s.pts.map((p) => [g.axis + Math.abs(p[0] - g.axis), p[1]]);
    if (pts[0][1] < pts[pts.length - 1][1]) pts = pts.reverse();
    drawn = true; markPreset();
    show(res.profile, { fromPts: pts });
    say('Thrown. Drag the vase to turn it, or draw again.', `Thrown: a vase ${shapeWords(res.profile)}. Drag it or use the arrow keys to turn it.`);
    sound.tock(0.5);
  }

  /* ---------------------------------------------------------------- controls */
  presetBtns.forEach((b) => ev.on(b, 'click', () => {
    const p = PRESETS.find((x) => x.id === b.dataset.id);
    preset = p.id; drawn = false; markPreset();
    show(p.profile, { fromPts: shown ? shown.pts.slice() : null });
    say(`${p.label}. Draw over it to make it your own.`, `${p.label}: ${shapeWords(p.profile)}.`);
  }));
  ev.on(again, 'click', () => {
    stopTurn(); morph = null; rings = null; shown = null; stroke = null;
    paintPad(performance.now());
    say(touch ? 'A clean page. Draw the right half with your finger, from the foot up to the rim.' : 'A clean page. Draw the right half, from the foot up to the rim.');
  });
  glazeInputs.forEach((inp) => ev.on(inp, 'change', () => {
    if (!inp.checked) return;
    glaze = inp.value;
    if (vase) vase.setGlaze(glaze, { instant: reducedMotion || paused });
    if (flat) layoutStudio();
    refreshText();
    say(`${GLAZES[glaze].label}: ${GLAZE_WORDS[glaze]}.`);
  }));
  ev.on(save, 'click', () => { saveShot(); });
  ev.on(gl, 'keydown', (e) => {
    if (!vase) return;
    const step = { ArrowLeft: -Math.PI / 12, ArrowDown: -Math.PI / 12, ArrowRight: Math.PI / 12, ArrowUp: Math.PI / 12, PageDown: -Math.PI / 4, PageUp: Math.PI / 4 }[e.key];
    if (e.key === 'Home') { e.preventDefault(); stopTurn(); vase.setAngle(BEST_ANGLE); onAngle(BEST_ANGLE); return; }
    if (step === undefined) return;
    e.preventDefault(); stopTurn(); vase.turnBy(step);
  });

  /* ---------------------------------------------------------------- the product shot */
  async function saveShot() {
    if (!vase || shotVase || disposed) return;
    save.disabled = true; save.textContent = 'Making the shot…';
    say('Making your product shot…');
    const W = lowPower ? SHOT.lightW : SHOT.w, H = lowPower ? SHOT.lightH : SHOT.h;
    const pr = Math.min(2, window.devicePixelRatio || 1);
    const c = el('canvas', { class: 'lv-shot', 'aria-hidden': 'true', width: String(W), height: String(H) });
    c.style.width = W / pr + 'px'; c.style.height = H / pr + 'px';
    root.appendChild(c);
    let blob = null;
    try {
      shotVase = createVase(c, { profile, glaze, angle: vase.getAngle(), plinth: false, pixelRatio: pr });
      await shotVase.ready;
      if (disposed) return;
      const shot = await shotVase.snapshot('image/png');
      if (disposed || !shot) return;
      const out = document.createElement('canvas'); out.width = W; out.height = H;
      const ctx = out.getContext('2d');
      paintStudio(ctx, W, H, { x: 0, y: 0, w: W, h: H, fp: footprint(W / H, profile) }, T);
      const img = await loadImage(shot);
      if (disposed) return;
      ctx.drawImage(img, 0, 0, W, H);
      blob = await new Promise((res) => out.toBlob(res, 'image/png'));
    } catch (err) {
      blob = null;
    } finally {
      if (shotVase) { shotVase.dispose(); shotVase = null; }
      c.remove();
    }
    if (disposed) return;
    save.disabled = false; save.textContent = 'Save a product shot';
    if (!blob) { say('The shot couldn’t be made on this device. Try a screenshot instead.'); return; }
    const url = URL.createObjectURL(blob); urls.add(url);
    const a = el('a', { href: url, download: `vase-${glaze}-glaze.png` });
    root.appendChild(a); a.click(); a.remove();
    later(() => { URL.revokeObjectURL(url); urls.delete(url); }, 8000);
    say('Saved: your product shot is in your downloads.', `Saved: a ${W} by ${H} picture of your vase, vase-${glaze}-glaze.png.`);
  }
  function loadImage(blob) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(blob); urls.add(url);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); urls.delete(url); res(img); };
      img.onerror = (e) => { URL.revokeObjectURL(url); urls.delete(url); rej(e); };
      img.src = url;
    });
  }

  /* ---------------------------------------------------------------- start */
  refreshText(); markPreset();
  say(hint);
  sizePad();
  try {
    vase = withPixelRatio(lowPower ? 1 : 0, () => createVase(gl, {
      profile, glaze, angle: reducedMotion ? BEST_ANGLE : BEST_ANGLE - TURN.by, plinth: false,
      pixelRatio: lowPower ? 1 : undefined,
      onInteract() { stopTurn(); },
      onChange: onAngle,
      onLost() { toFlat('The 3D view stopped (the graphics card was needed elsewhere), so here is a flat view of your vase.'); },
    }));
    await vase.ready;
  } catch (err) {
    vase = null;
    toFlat('This browser doesn’t offer the 3D view, so here is a flat view of your vase.');
  }
  function toFlat(note) {
    if (disposed || flat) return;
    flat = true; stopTurn();
    gl.remove(); save.disabled = true;
    if (still && !vase) view.appendChild(el('img', { class: 'lv-still', src: still, alt: '' }));
    view.appendChild(el('p', { class: 'lv-note', text: note }));
    if (vase) { try { vase.dispose(); } catch (e) { /* already gone */ } vase = null; }
    layoutStudio();
  }
  if (disposed) return api();
  layoutStudio(); onAngle(vase ? vase.getAngle() : BEST_ANGLE);
  ro = new ResizeObserver(() => { cancelAnimationFrame(rto); rto = requestAnimationFrame(() => { if (!disposed) { sizePad(); layoutStudio(); } }); });
  ro.observe(root); ro.observe(pad);
  if (vase && !reducedMotion) startTurn();
  return api();

  function api() {
    return {
      title: TITLE, made: MADE, goodFor: GOOD_FOR, moves: true, describe,
      pause() {
        paused = true;
        stopTurn();                                         // the turn stops for good
        if (praf) cancelAnimationFrame(praf); praf = 0;
        morph = null; rings = null;                         // the sketch shows its finished state
        if (!disposed) paintPad(performance.now());
        if (vase) vase.setAngle(vase.getAngle());           // no drift after a fling
      },
      resume() { if (disposed) return; paused = false; paintPad(performance.now()); },
      dispose() {
        if (disposed) return; disposed = true;
        stopTurn();
        if (praf) cancelAnimationFrame(praf); praf = 0;
        cancelAnimationFrame(rto);
        timers.forEach((t) => clearTimeout(t)); timers.clear();
        if (ro) ro.disconnect();
        ev.clear(); sound.dispose();
        if (shotVase) { shotVase.dispose(); shotVase = null; }
        if (vase) { vase.dispose(); vase = null; }       // loses the WebGL context
        urls.forEach((u) => URL.revokeObjectURL(u)); urls.clear();
        studio.width = studio.height = 0; pad.width = pad.height = 0;
        root.remove();
      },
    };
  }
}
