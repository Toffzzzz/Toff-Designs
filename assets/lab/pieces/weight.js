/*
 * Lab piece 6: Letters with weight (#weight).
 * Type a word and its letters drop, stack and can be thrown. Rapier 2D physics (self-hosted WebAssembly,
 * vendor/rapier/rapier2d, loaded only when this piece opens). Each letter is the real glyph from
 * Cormorant Garamond, given a body made of convex pieces that follow its shape (weight/glyphs.js).
 * Drag a letter and let go to throw it; click or tap empty space for another letter; on a phone, tilt it
 * to tip them (iPhone asks for permission through a visible button). Keyboard: Space drops another
 * letter, the left and right arrows tilt gravity, Down levels it, Up tosses everything.
 *
 * Contract: mount(container, { reducedMotion, lowPower, soundOn, still }) -> { title, made, goodFor, describe, pause, resume, dispose }
 */
import { loadCss, el, tokens, coarse, listeners, stillGate, makeSound } from './ink/kit.js';
import { glyph } from './weight/glyphs.js';

const TITLE = 'Letters with weight';
const MADE = 'Real physics running in your browser: every letter is cut from its own shape in our serif, so it lands, stacks and tips like an object.';
const GOOD_FOR = 'playful brands';
const PX = 100;               // pixels per metre in the physics world
const G = 30;                 // gravity, metres per second squared (brisk, so letters feel heavy rather than floaty)
const DEFAULT_WORD = 'Weight';
let uid = 0;

export async function mount(container, { reducedMotion = false, lowPower = false, soundOn = false, still } = {}) {
  const base = new URL('./weight/', import.meta.url);
  const id = 'lp-weight-' + (++uid);
  const root = el('div', { class: 'lp lp-weight' });
  container.appendChild(root);
  const fontUrl = new URL('../../../fonts/cormorant-garamond/cormorant-garamond-400.woff2', import.meta.url).href;
  const face = new FontFace('Toff Weight Serif', `url(${fontUrl}) format("woff2")`, { weight: '400', style: 'normal' });
  await Promise.all([
    loadCss(root, new URL('../ink/kit.css', base).href), loadCss(root, new URL('weight.css', base).href),
    face.load().then(() => document.fonts.add(face)).catch(() => {}),
  ]);
  const FAMILY = '"Toff Weight Serif", "Cormorant Garamond", Georgia, serif';

  const ev = listeners(), sound = makeSound(!!soundOn);
  const status = el('p', { class: 'lp-sr', 'aria-live': 'polite' });
  root.appendChild(status);
  let word = DEFAULT_WORD, raf = 0, paused = false, disposed = false, gate = null, live = null, world = null, queue = null;
  let tiltDeg = 0, letterCount = 0;

  function describe() {
    const n = letterCount;
    const tilt = Math.abs(tiltDeg) > 1 ? ` Gravity is tilted ${Math.round(Math.abs(tiltDeg))} degrees to the ${tiltDeg < 0 ? 'left' : 'right'}.` : '';
    return `${TITLE}. Large cream serif letters with a fine gold shadow, ${n ? `${n} of them, from the word “${word}”,` : ''} dropped onto a thin gold floor where they lie stacked and tipped against each other like heavy objects.${tilt} ` +
      'Type a word and choose Drop it to drop its letters. Drag a letter and let go to throw it; click or tap empty space for another letter. With the keyboard, focus the letters: Space drops another letter, the left and right arrow keys tilt gravity, Down levels it and Up tosses the letters into the air.';
  }

  function paintStill(c, d) {
    const k = c.getContext('2d'), T = tokens(root), W = c.width / d, H = c.height / d;
    k.scale(d, d); k.fillStyle = T.bg; k.fillRect(0, 0, W, H);
    const floor = H - T.safeBottom - Math.max(24, Math.min(64, H * 0.06));
    k.fillStyle = T.hairline; k.fillRect(0, floor, W, 1);
    const px = Math.round(Math.max(64, Math.min(240, W < 700 ? W * 0.26 : Math.min(W, H) * 0.25)));
    k.font = `400 ${px}px ${FAMILY}`; k.textBaseline = 'alphabetic';
    // the letters as they might come to rest: some upright, one leaning, one on its side
    const pose = [0, 0.04, -0.3, 0, 0.02, -Math.PI / 2];
    const items = DEFAULT_WORD.split('').map((ch, i) => {
      const m = k.measureText(ch), l = m.actualBoundingBoxLeft || 0, r = m.actualBoundingBoxRight || m.width, a = m.actualBoundingBoxAscent || px * 0.7, b = m.actualBoundingBoxDescent || 0;
      const cx = (r - l) / 2, cy = (b - a) / 2, hw = (r + l) / 2, hh = (a + b) / 2, rot = pose[i % pose.length];
      const ex = Math.abs(Math.cos(rot)) * hw + Math.abs(Math.sin(rot)) * hh, ey = Math.abs(Math.sin(rot)) * hw + Math.abs(Math.cos(rot)) * hh;
      return { ch, cx, cy, rot, ex, ey };
    });
    const gap = px * 0.06, total = items.reduce((t, it) => t + it.ex * 2 + gap, -gap);
    let x = W / 2 - total / 2;
    items.forEach((it) => {
      const X = x + it.ex, Y = floor - it.ey - 1;
      x += it.ex * 2 + gap;
      [[T.lineShadow, 3.5], [T.ink, 0]].forEach(([fill, dy]) => {
        k.save(); k.translate(X, Y + dy); k.rotate(it.rot); k.fillStyle = fill; k.fillText(it.ch, -it.cx, -it.cy); k.restore();
      });
    });
  }

  const api = {
    title: TITLE, made: MADE, goodFor: GOOD_FOR, describe,
    pause() { paused = true; if (raf) cancelAnimationFrame(raf); raf = 0; },
    resume() { if (disposed) return; paused = false; if (live) live.wake(); },
    dispose() {
      if (disposed) return; disposed = true;
      if (raf) cancelAnimationFrame(raf); raf = 0;
      ev.clear(); if (live) live.stop();
      if (queue) { queue.free(); queue = null; }
      if (world) { world.free(); world = null; }
      try { document.fonts.delete(face); } catch (e) { /* already gone */ }
      sound.dispose(); if (gate) gate.remove(); root.remove();
    },
  };

  if (reducedMotion || lowPower) {
    gate = stillGate(root, {
      still, draw: paintStill,
      message: reducedMotion ? 'Your device asks for less motion, so this is a still. Press Play to drop the letters yourself.' : 'This one runs a physics engine. Press Play to start a lighter version.',
      label: 'Play: start the falling letters', place: 'top',
    });
    gate.played.then(async () => { if (!disposed) { await start(lowPower); gate.leave(); } });
    return api;
  }
  await start(false);
  return api;

  // ---------------------------------------------------------------- the live piece
  async function start(light) {
    const loading = el('p', { class: 'lp-weight-loading', text: 'Loading the physics…' });
    root.appendChild(loading);
    let R;
    try {
      R = await import('../../../vendor/rapier/rapier2d/rapier.mjs');
      await R.init();
    } catch (e) {
      loading.remove();
      const c = el('canvas', { class: 'lp-canvas', role: 'img', 'aria-label': describe() });
      root.insertBefore(c, root.firstChild);
      const r = root.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.round(r.width * d); c.height = Math.round(r.height * d); paintStill(c, d);
      root.appendChild(el('p', { class: 'lp-weight-note', text: 'The physics couldn’t start in this browser, so here is a still of the letters.' }));
      return;
    }
    loading.remove();
    if (disposed) return;

    const T = tokens(root);
    const canvas = el('canvas', { class: 'lp-canvas', tabindex: '0', role: 'img', 'aria-label': describe() });
    const stage = el('div', { class: 'lp-live' }, [canvas]);
    root.insertBefore(stage, root.firstChild);
    const ctx = canvas.getContext('2d');

    // ---- the panel
    const input = el('input', { id: id + '-word', class: 'lp-input', type: 'text', maxlength: '14', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', enterkeyhint: 'go', placeholder: 'A word' });
    const dropBtn = el('button', { type: 'submit', class: 'lp-btn lp-btn--line', text: 'Drop it' });
    const clearBtn = el('button', { type: 'button', class: 'lp-btn lp-btn--quiet', text: 'Clear the floor' });
    const actions = el('div', { class: 'lp-actions' }, [clearBtn]);
    const touch = coarse();
    const form = el('form', { class: 'lp-panel', 'aria-label': 'Drop a word' }, [
      el('div', {}, [el('label', { class: 'lp-label', for: input.id, text: 'Type a word' }), el('div', { class: 'lp-row' }, [input, dropBtn])]),
      el('p', { class: 'lp-hint', text: touch ? 'Drag a letter and let go to throw it. Tap empty space for another.' : 'Drag a letter and let go to throw it. Click empty space for another. Space drops one; the arrow keys tilt gravity.' }),
      actions,
    ]);
    root.appendChild(form);

    // tilt on phones (iPhone asks first, so it's always a button the visitor presses)
    const DOE = window.DeviceOrientationEvent;
    let tiltOn = false, tiltBtn = null;
    if (touch && DOE) {
      tiltBtn = el('button', { type: 'button', class: 'lp-btn lp-btn--quiet', 'aria-pressed': 'false', text: 'Tilt to tip them' });
      actions.insertBefore(tiltBtn, clearBtn);
      ev.on(tiltBtn, 'click', async () => {
        if (tiltOn) { tiltOn = false; window.removeEventListener('deviceorientation', onTilt); tiltBtn.setAttribute('aria-pressed', 'false'); setTilt(0); return; }
        try {
          if (typeof DOE.requestPermission === 'function') {
            const r = await DOE.requestPermission();
            if (r !== 'granted') { say('Motion access wasn’t allowed, so tilting is off. You can still drag and throw the letters.'); return; }
          }
        } catch (e) { say('This phone didn’t allow motion access. You can still drag and throw the letters.'); return; }
        tiltOn = true; ev.on(window, 'deviceorientation', onTilt); tiltBtn.setAttribute('aria-pressed', 'true');
        say('Tilting is on: tip the phone to tip the letters.');
      });
    }
    function onTilt(e) {
      if (e.gamma == null) return;
      const a = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
      const t = a === 90 ? -e.beta : (a === -90 || a === 270) ? e.beta : a === 180 ? -e.gamma : e.gamma;
      setTilt(Math.max(-70, Math.min(70, t || 0)), true);
    }

    // ---- the world
    const dpr = Math.min(light ? 1 : 2, window.devicePixelRatio || 1);
    let W = 1, H = 1, floorY = 1;
    world = new R.World({ x: 0, y: G });
    queue = new R.EventQueue(true);
    const walls = world.createRigidBody(R.RigidBodyDesc.fixed());
    let wallColliders = [];
    function size() {
      const r = canvas.getBoundingClientRect();
      W = Math.max(2, r.width); H = Math.max(2, r.height);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      floorY = H - T.safeBottom - Math.max(24, Math.min(64, H * 0.06));
      wallColliders.forEach((c) => world.removeCollider(c, false));
      const t = 2, w = W / PX, f = floorY / PX, top = -3 * H / PX;
      wallColliders = [
        R.ColliderDesc.cuboid(w * 2, t).setTranslation(w / 2, f + t),                // floor
        R.ColliderDesc.cuboid(t, (f - top) / 2 + t).setTranslation(-t, (f + top) / 2), // left
        R.ColliderDesc.cuboid(t, (f - top) / 2 + t).setTranslation(w + t, (f + top) / 2), // right
        R.ColliderDesc.cuboid(w * 2, t).setTranslation(w / 2, top - t),              // ceiling, well above the screen
      ].map((d) => world.createCollider(d.setFriction(0.8).setRestitution(0.1), walls));
      letters.forEach((L) => {                                                         // keep everything inside after a resize
        const p = L.body.translation();
        const x = Math.max(L.g.w / 2 / PX, Math.min(w - L.g.w / 2 / PX, p.x)), y = Math.min(p.y, f - L.g.h / 2 / PX);
        if (x !== p.x || y !== p.y) { L.body.setTranslation({ x, y }, true); L.body.setLinvel({ x: 0, y: 0 }, true); }
      });
    }
    function fontPx() { return Math.round(Math.max(64, Math.min(240, W < 700 ? W * 0.26 : Math.min(W, H) * 0.25))); }

    const letters = [], MAX = light ? 24 : 44;
    let next = 0;
    function makeLetter(ch, x, y, rot) {
      const g = glyph(ch, { px: fontPx(), family: FAMILY, dpr, fill: T.ink, shadow: T.lineShadow });
      if (!g || !g.parts.length) return null;
      const body = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(x / PX, y / PX).setRotation(rot)
        .setLinearDamping(0.05).setAngularDamping(0.35).setCcdEnabled(true).setCanSleep(true));
      g.parts.forEach((poly) => {
        const pts = new Float32Array(poly.length * 2);
        poly.forEach(([px, py], i) => { pts[i * 2] = px / PX; pts[i * 2 + 1] = py / PX; });
        let d = R.ColliderDesc.convexHull(pts);
        if (!d) return;
        d = d.setDensity(1).setFriction(0.62).setRestitution(0.12);
        if (soundOn) d = d.setActiveEvents(R.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(40);
        world.createCollider(d, body);
      });
      const L = { ch, g, body, born: performance.now(), fade: 0 };
      letters.push(L); letterCount = letters.filter((l) => !l.fade).length;
      // too many: the oldest fades away
      const alive = letters.filter((l) => !l.fade);
      if (alive.length > MAX) alive[0].fade = performance.now();
      return L;
    }
    function removeLetter(L) { world.removeRigidBody(L.body); letters.splice(letters.indexOf(L), 1); letterCount = letters.filter((l) => !l.fade).length; }

    // ---- dropping words and letters
    const timers = new Set();
    function later(fn, ms) { const t = setTimeout(() => { timers.delete(t); if (!disposed) fn(); }, ms); timers.add(t); }
    function dropWord(text) {
      const chars = Array.from(text).filter((c) => c.trim());
      if (!chars.length) return false;
      word = text; next = 0;
      // the whole word falls together, each letter in its own space (spaced by its real ink), in rows if it's long
      const fp = fontPx(), gap = fp * 0.12, avail = W - 2 * Math.max(16, W * 0.05);
      const items = chars.map((c) => ({ c, g: glyph(c, { px: fp, family: FAMILY, dpr, fill: T.ink, shadow: T.lineShadow }) })).filter((it) => it.g);
      const rows = [];
      let row = [], rw = 0;
      items.forEach((it) => { const w = it.g.w + gap; if (row.length && rw + w > avail) { rows.push({ row, rw }); row = []; rw = 0; } row.push(it); rw += w; });
      if (row.length) rows.push({ row, rw });
      rows.forEach((r, ri) => {
        let x = W / 2 - (r.rw - gap) / 2;
        const y = -fp * 0.8 - ri * fp * 1.5;
        r.row.forEach((it) => {
          const cx = x + it.g.w / 2; x += it.g.w + gap;
          makeLetter(it.c, cx, y - Math.random() * fp * 0.18, (Math.random() - 0.5) * 0.16);
        });
      });
      wake();
      say(`Dropping “${text}”.`);
      later(() => canvas.setAttribute('aria-label', describe()), 2000);
      return true;
    }
    let lastDrop = null;
    function dropOne(x) {
      const chars = Array.from(word).filter((c) => c.trim());
      if (!chars.length) return;
      const c = chars[next++ % chars.length], fp = fontPx(), now = performance.now();
      const px = x == null ? W * (0.25 + Math.random() * 0.5) : Math.max(fp * 0.4, Math.min(W - fp * 0.4, x));
      // a quick second drop in the same place starts higher, so letters never appear inside each other
      const stack = lastDrop && now - lastDrop.t < 600 && Math.abs(px - lastDrop.x) < fp ? lastDrop.n + 1 : 0;
      lastDrop = { x: px, t: now, n: stack };
      makeLetter(c, px, -fp * 0.7 - stack * fp * 1.5, (Math.random() - 0.5) * 0.6);
      wake();
    }
    function setTilt(deg, quiet) {
      tiltDeg = deg;
      const a = deg * Math.PI / 180;
      world.gravity = { x: Math.sin(a) * G, y: Math.cos(a) * G };
      letters.forEach((L) => L.body.wakeUp());
      if (!quiet) say(Math.abs(deg) < 1 ? 'Gravity is level again.' : `Gravity tilted ${Math.abs(deg)} degrees to the ${deg < 0 ? 'left' : 'right'}.`);
      wake();
    }
    function toss() {
      letters.forEach((L) => { const m = L.body.mass(); L.body.applyImpulse({ x: (Math.random() - 0.5) * 3 * m, y: -(9 + Math.random() * 4) * m }, true); L.body.applyTorqueImpulse((Math.random() - 0.5) * 0.6 * m, true); });
      say('Up they go.'); wake();
    }

    // ---- grabbing and throwing
    let grab = null;
    function local(e) { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    function hit(p) {
      let found = null;
      world.intersectionsWithPoint({ x: p[0] / PX, y: p[1] / PX }, (col) => { const b = col.parent(); if (b && b.isDynamic()) { found = b; return false; } return true; });
      return found ? letters.find((L) => L.body.handle === found.handle) : null;
    }
    ev.on(canvas, 'pointerdown', (e) => {
      if (paused) return;
      const p = local(e), L = hit(p);
      if (!L) { dropOne(p[0]); return; }
      const t = L.body.translation(), a = L.body.rotation(), dx = p[0] / PX - t.x, dy = p[1] / PX - t.y;
      grab = { L, id: e.pointerId, local: [Math.cos(-a) * dx - Math.sin(-a) * dy, Math.sin(-a) * dx + Math.cos(-a) * dy], target: p };
      L.body.wakeUp(); L.body.setAngularDamping(2.5);
      canvas.setAttribute('data-dragging', '');
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
      wake();
    });
    ev.on(canvas, 'pointermove', (e) => {
      if (grab && e.pointerId === grab.id) { grab.target = local(e); wake(); return; }
      if (e.pointerType === 'mouse') { if (hit(local(e))) canvas.setAttribute('data-over', ''); else canvas.removeAttribute('data-over'); }
    });
    const release = (e) => {
      if (!grab || (e && e.pointerId !== grab.id)) return;
      grab.L.body.setAngularDamping(0.35); grab = null; canvas.removeAttribute('data-dragging');
    };
    ev.on(canvas, 'pointerup', release); ev.on(canvas, 'pointercancel', release); ev.on(canvas, 'lostpointercapture', release);
    function pull() {
      if (!grab) return;
      const b = grab.L.body; if (!world || !b) return;
      const t = b.translation(), a = b.rotation(), c = Math.cos(a), s = Math.sin(a);
      const ax = t.x + c * grab.local[0] - s * grab.local[1], ay = t.y + s * grab.local[0] + c * grab.local[1];
      const v = b.linvel(), w = b.angvel();
      const vx = v.x - w * (ay - t.y), vy = v.y + w * (ax - t.x);
      const ex = grab.target[0] / PX - ax, ey = grab.target[1] / PX - ay;
      const k = 22, m = b.mass(), cap = 40;
      let tx = ex * k, ty = ey * k; const sp = Math.hypot(tx, ty); if (sp > cap) { tx *= cap / sp; ty *= cap / sp; }
      b.applyImpulseAtPoint({ x: (tx - vx) * m * 0.35, y: (ty - vy) * m * 0.35 - world.gravity.y * m / 60 }, { x: ax, y: ay }, true);
    }

    // ---- keyboard on the letters
    ev.on(canvas, 'keydown', (e) => {
      if (paused) return;
      if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); dropOne(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setTilt(Math.max(-60, tiltDeg - 15)); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); setTilt(Math.min(60, tiltDeg + 15)); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setTilt(0); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); toss(); }
    });
    ev.on(form, 'submit', (e) => {
      e.preventDefault();
      const v = input.value.trim().replace(/\s+/g, ' ').slice(0, 14);
      if (!dropWord(v)) { input.focus(); say('Type a word first.'); }
    });
    ev.on(clearBtn, 'click', () => {
      letters.slice().forEach((L) => { if (!L.fade) L.fade = performance.now(); });
      say('The floor is clear.'); wake();
    });

    // ---- drawing
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = T.bg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = T.hairline; ctx.fillRect(0, Math.round(floorY), W, 1);
      const now = performance.now();
      for (const pass of [0, 1]) {
        for (const L of letters) {
          const t = L.body.translation(), a = L.body.rotation(), g = L.g;
          const alpha = L.fade ? Math.max(0, 1 - (now - L.fade) / 320) : 1;
          if (alpha <= 0) continue;
          ctx.globalAlpha = alpha;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.translate(t.x * PX, t.y * PX + (pass === 0 ? 3.5 : 0)); ctx.rotate(a);
          ctx.drawImage(pass === 0 ? g.shadowSprite : g.sprite, -g.sw / 2, -g.shh / 2, g.sw, g.shh);
        }
      }
      ctx.globalAlpha = 1;
    }

    // ---- the loop: fixed steps, and it sleeps once everything has come to rest
    let lastT = 0, acc = 0;
    function frame(now) {
      raf = 0;
      if (paused || disposed || !world) return;
      const dt = Math.min(0.1, ((now - (lastT || now)) / 1000) || 1 / 60);
      lastT = now; acc += dt;
      let steps = 0;
      while (acc >= 1 / 60 && steps < 4) {
        pull(); world.step(queue); steps++; acc -= 1 / 60;
        if (soundOn) queue.drainContactForceEvents((evt) => sound.tock(Math.min(1, evt.totalForceMagnitude() / 900)));
      }
      if (steps === 4) acc = 0;
      letters.slice().forEach((L) => {
        if (L.fade && now - L.fade > 340) removeLetter(L);
        else if (L.body.translation().y * PX > H * 3) removeLetter(L);
      });
      draw();
      const moving = grab || timers.size || letters.some((L) => L.fade || !L.body.isSleeping());
      if (!moving) { canvas.setAttribute('aria-label', describe()); return; }
      raf = requestAnimationFrame(frame);
    }
    function wake() { if (!raf && !paused && !disposed) { lastT = 0; raf = requestAnimationFrame(frame); } }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; timers.forEach(clearTimeout); timers.clear(); ro.disconnect(); }
    function say(t) { status.textContent = t; }
    live = { wake, stop };

    const ro = new ResizeObserver(() => { if (!disposed && world) { size(); draw(); wake(); } });
    size();
    ro.observe(canvas);
    draw();
    requestAnimationFrame(() => stage.setAttribute('data-in', ''));
    dropWord(DEFAULT_WORD);
    await new Promise((res) => requestAnimationFrame(() => res()));
  }
}
