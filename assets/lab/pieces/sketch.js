/*
 * Lab piece 1: Sketch to site (#sketch).
 * The home page's hero shader as a toy (assets/shared/sketch-shader.js, SketchStage). Pick one of our
 * sites, or drop in, paste or choose a screenshot of any website (it never leaves the device): the real
 * page is shown for a beat, then a gold line sweeps across and turns it into a cream pen-and-pencil
 * sketch. Paint it back with the pointer (a mouse paints as it moves; a finger or pen paints as it
 * drags; the arrow keys paint from the keyboard), or let "Paint it for me" do it. "Save the sketch"
 * downloads the pure sketch as a PNG.
 *
 * The picture fills the width of the screen and sits on paper the colour of the page, so wide
 * screenshots are never cropped at the sides; tall ones are cropped at the bottom, top first.
 *
 * Contract (rounds/round-05-plan.md section 6):
 *   mount(container, { reducedMotion, lowPower, soundOn, still }) -> { title, made, goodFor, describe, pause, resume, dispose }
 * Reduced motion and low power: the still with Play (low power then runs a lighter version: 1x pixels,
 * smaller textures). Reduced motion after Play: no sweep, no flood; the sketch is simply there.
 * Without WebGL 2: the pre-drawn sketch of each of our sites, with "Show the finished site".
 */
import { SketchStage } from '../../shared/sketch-shader.js';
import { loadCss, el, tokens, coarse, listeners, stillGate, makeSound } from './ink/kit.js';

const TITLE = 'Sketch to site';
const MADE = 'The hero shader from our home page, as a toy: your graphics card redraws any screenshot as a pen-and-pencil sketch, and your brush paints the real site back.';
const GOOD_FOR = 'showing a redesign';
const ROOT = new URL('../../../', import.meta.url);
const FALLBACK_SITES = [{
  id: 'bluebird', name: 'Bluebird Wellness', short: 'Bluebird',
  laptop: { site: 'assets/studio/cases/bluebird-laptop.webp', sketch: '' },
  phone: { site: 'assets/studio/cases/bluebird-phone.webp', sketch: '' },
}];
const CURSOR = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='26' height='26'%3E%3Ccircle cx='13' cy='13' r='10' fill='none' stroke='%23F1E3C6' stroke-width='1.5'/%3E%3Ccircle cx='13' cy='13' r='1.2' fill='%23F1E3C6'/%3E%3C/svg%3E\") 13 13, crosshair";
let uid = 0;

const abs = (p) => (p ? new URL(p, ROOT).href : '');
const shortName = (n) => n.replace(/\s+(Wellness|Coffee|Plumbing)$/, '');

async function ourSites() {
  try {
    // The home page's hero list: captures.json (tools/capture/hero.py); each picture is { src, srcset, w, h }
    const r = await fetch(new URL('assets/home/captures/captures.json', ROOT), { cache: 'no-cache' });
    if (!r.ok) throw new Error(r.status);
    const m = await r.json();
    const src = (v) => (v && typeof v === 'object' ? v.src : v) || '';
    const list = (m.hero || []).filter((h) => h && h.laptop && src(h.laptop.site)).map((h) => ({
      id: h.id, name: h.name, short: shortName(h.name || h.id),
      laptop: { site: src(h.laptop.site), sketch: src(h.laptop.sketch) },
      phone: { site: src(h.phone && h.phone.site) || src(h.laptop.site), sketch: src(h.phone && h.phone.sketch) },
    }));
    // Bluebird: the real client's full screenshots from the case study
    const bb = list.find((s) => s.id === 'bluebird');
    if (bb) { bb.laptop.site = FALLBACK_SITES[0].laptop.site; bb.phone.site = FALLBACK_SITES[0].phone.site; }
    return list.length ? list : FALLBACK_SITES;
  } catch (e) { return FALLBACK_SITES; }
}

export async function mount(container, { reducedMotion = false, lowPower = false, soundOn = false, still } = {}) {
  const id = 'lp-sketch-' + (++uid);
  const root = el('div', { class: 'lp lp-sketch' });
  container.appendChild(root);
  const [sites] = await Promise.all([
    ourSites(),
    loadCss(root, new URL('./ink/kit.css', import.meta.url).href),
    loadCss(root, new URL('./sketch/sketch.css', import.meta.url).href),
  ]);

  const ev = listeners(), sound = makeSound(!!soundOn);
  const status = el('p', { class: 'lp-sr', 'aria-live': 'polite' });
  root.appendChild(status);
  let disposed = false, paused = false, gate = null, stage = null, live = null;
  let pick = sites.find((x) => x.id === 'atelier-wren') || sites[0], ownFile = null, coverage = 0, done = false;
  const say = (t) => { status.textContent = t; if (live && live.note) live.note.textContent = t; };
  const portrait = () => { const r = root.getBoundingClientRect(); return r.height > r.width * 1.05; };
  const srcFor = (s) => abs(portrait() ? s.phone.site : s.laptop.site);
  const sketchFor = (s) => abs(portrait() ? s.phone.sketch : s.laptop.sketch);
  const nameNow = () => (ownFile ? 'Your screenshot' : pick.name);

  function describe() {
    const what = ownFile ? 'your own screenshot' : `the ${pick.name} website`;
    const state = done ? 'It has been painted back to full colour.' : coverage > 0.02 ? `About ${Math.round(coverage * 100)} percent has been painted back to full colour.` : 'None of it has been painted back yet.';
    return `${TITLE}. A screenshot of ${what}, redrawn as a cream pen-and-pencil sketch on midnight paper. ${state} ` +
      'Move the pointer over the sketch, or drag a finger across it, to paint the real site back; with the keyboard, focus the sketch and use the arrow keys. ' +
      'Choose one of our sites, or use a screenshot of your own (choose a file, drop it here or paste it; it never leaves your device). Paint it for me paints it all back; Save the sketch downloads the sketch as a picture.';
  }

  const api = {
    title: TITLE, made: MADE, goodFor: GOOD_FOR, moves: false, describe,
    pause() { paused = true; if (live) live.pause(); },
    resume() { if (disposed) return; paused = false; if (live) live.resume(); },
    dispose() {
      if (disposed) return; disposed = true;
      ev.clear();
      if (live) live.stop();
      if (stage) { stage.dispose(); stage = null; }
      sound.dispose();
      if (gate) gate.remove();
      root.remove();
    },
  };

  const gated = reducedMotion || lowPower;
  if (gated) {
    gate = stillGate(root, {
      still: still || sketchFor(pick) || undefined,
      message: reducedMotion
        ? 'Your device asks for less motion, so this is a still. Press Play to paint a sketch back into a website yourself.'
        : 'This one works the graphics card. Press Play to start a lighter version.',
      label: 'Play: start Sketch to site',
    });
    gate.played.then(() => { if (!disposed) { start({ light: lowPower, instant: reducedMotion }); gate.leave(); gate = null; } });
    return api;
  }
  await start({ light: false, instant: false });
  return api;

  /* ================================================================== the live piece */
  async function start({ light, instant }) {
    const supported = SketchStage.supported();
    const screen = el('div', { class: 'sk-screen' });
    const canvas = el('canvas', { class: 'sk-canvas', tabindex: '0', role: 'img', 'aria-label': describe() });
    const photo = el('img', { class: 'sk-photo', alt: '', decoding: 'async', 'aria-hidden': 'true' });
    const line = el('div', { class: 'sk-line', 'aria-hidden': 'true' });
    const ring = el('div', { class: 'sk-ring', 'aria-hidden': 'true' });
    screen.append(canvas, photo, line, ring);
    const holder = el('div', { class: 'lp-live sk-live' }, [screen]);
    root.insertBefore(holder, root.firstChild);

    /* ---- the panel */
    const fileId = id + '-file';
    const chips = sites.map((s) => {
      const b = el('button', { type: 'button', class: 'sk-chip', 'aria-pressed': s === pick ? 'true' : 'false', 'data-site': s.id }, [s.short]);
      if (s.short !== s.name) b.setAttribute('aria-label', s.name);
      return b;
    });
    const file = el('input', { id: fileId, class: 'sk-file', type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif,image/avif' });
    const ownBtn = el('label', { class: 'lp-btn lp-btn--quiet sk-own', for: fileId }, [el('span', { class: 'sk-long' }, ['Use your screenshot']), el('span', { class: 'sk-short' }, ['Use yours'])]);
    const paintBtn = el('button', { type: 'button', class: 'lp-btn lp-btn--quiet sk-paint' }, [el('span', { class: 'sk-long' }, ['Paint it for me']), el('span', { class: 'sk-short' }, ['Paint it'])]);
    const againBtn = el('button', { type: 'button', class: 'lp-btn lp-btn--quiet sk-again', hidden: true }, [el('span', { class: 'sk-long' }, ['Sketch it again']), el('span', { class: 'sk-short' }, ['Again'])]);
    const saveBtn = el('button', { type: 'button', class: 'lp-btn lp-btn--line sk-save' }, [el('span', { class: 'sk-long' }, ['Save the sketch']), el('span', { class: 'sk-short' }, ['Save'])]);
    const note = el('p', { class: 'lp-status sk-note' });
    const panel = el('div', { class: 'lp-panel sk-panel' }, [
      el('div', { class: 'sk-pick' }, [
        el('p', { class: 'lp-label', id: id + '-pick' }, ['Pick one of our sites']),
        el('div', { class: 'sk-chips', role: 'group', 'aria-labelledby': id + '-pick' }, chips),
      ]),
      el('div', { class: 'sk-yours' }, [file, ownBtn, el('p', { class: 'lp-hint' }, [coarse() ? 'or paste one. It stays on your device.' : 'or drop or paste one. It never leaves your device.'])]),
      el('div', { class: 'lp-actions' }, [saveBtn, paintBtn, againBtn]),
      note,
    ]);
    root.appendChild(panel);
    const drop = el('div', { class: 'sk-drop', 'aria-hidden': 'true' }, [el('p', {}, ['Drop your screenshot to sketch it'])]);
    root.appendChild(drop);

    if (!supported) return startStill({ screen, canvas, photo, panel, note, chips, ownBtn, file, paintBtn, againBtn, saveBtn });

    /* ---- the stage */
    stage = new SketchStage(canvas, {
      ...(light ? { dprCap: 1, maxTexWidth: 1600 } : {}),
      onCoverage: (c) => { coverage = c; },
      onDone: () => {
        done = true; coverage = 1;
        paintBtn.hidden = true; againBtn.hidden = false;
        say(`${nameNow()} is painted back. Save the sketch, sketch it again, or try another site.`);
        canvas.setAttribute('aria-label', describe());
      },
    });

    /* ---- where the picture sits: full width on page-coloured paper, centred in the space left
       below the panel when it fits, never under the caption bar */
    let aspect = 1.6;
    function place() {
      const T = tokens(root), rr = root.getBoundingClientRect();
      const W = rr.width, top0 = T.safeTop, bottom = rr.height - T.safeBottom, avail = Math.max(1, bottom - top0);
      let h = W / aspect;
      let top = top0;
      const pb = panel.getBoundingClientRect().bottom - rr.top;
      if (rr.height > W * 1.05) {   // portrait (phones): the picture starts under the panel
        top = Math.min(bottom - 120, pb + 10);
        h = Math.min(bottom - top, h);
        if (W / aspect < bottom - top) top = Math.max(top, bottom - h);
      } else if (h >= avail) h = avail;
      else {
        top = Math.max(top0 + (avail - h) / 2, Math.min(pb + 16, bottom - h));
      }
      Object.assign(screen.style, { top: Math.round(top) + 'px', height: Math.round(h) + 'px' });
    }

    /* ---- the sweep: the real page, then a gold line turns it into the sketch */
    let anims = [], beat = 0, sweeping = false, sweepDone = null;
    function sweep() {
      endSweep(false);
      if (instant) { photo.hidden = true; return Promise.resolve(); }
      sweeping = true;
      photo.hidden = false; line.hidden = false;
      photo.style.clipPath = 'inset(0 0 0 0)'; line.style.transform = 'translateX(-2px)';
      return new Promise((res) => {
        sweepDone = res;
        beat = setTimeout(() => {
          beat = 0;
          const w = screen.clientWidth, o = { duration: 1400, easing: 'cubic-bezier(.83, 0, .17, 1)', fill: 'forwards' };
          anims = [
            photo.animate([{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 0 100%)' }], o),
            line.animate([{ transform: 'translateX(-2px)', opacity: 1 }, { transform: `translateX(${w}px)`, opacity: 1 }], o),
          ];
          anims[0].finished.then(() => endSweep(true)).catch(() => {});
        }, 650);
        if (paused) endSweep(false);
      });
    }
    function endSweep(natural) {
      if (beat > 0) clearTimeout(beat);
      beat = 0;
      anims.forEach((a) => { try { a.cancel(); } catch (e) { /* gone */ } });
      anims = [];
      photo.hidden = true; line.hidden = true; photo.style.clipPath = '';
      const was = sweeping; sweeping = false;
      if (sweepDone) { const r = sweepDone; sweepDone = null; r(); }
      if (was && natural) say(coarse() ? 'Now paint the real site back with a finger.' : 'Now paint the real site back: move over the sketch.');
    }

    /* ---- loading a picture (one of ours, or the visitor's) */
    let loadId = 0, objectUrl = '';
    async function show(src, label) {
      const my = ++loadId;
      done = false; coverage = 0;
      paintBtn.hidden = false; againBtn.hidden = true; paintBtn.disabled = true; saveBtn.disabled = true;
      say(`Opening ${label}.`);
      let url = src;
      if (src instanceof Blob) { if (objectUrl) URL.revokeObjectURL(objectUrl); url = objectUrl = URL.createObjectURL(src); }
      photo.hidden = false; line.hidden = true; photo.style.clipPath = 'inset(0 0 0 0)';
      photo.src = url;
      try {
        await photo.decode();
        if (my !== loadId || disposed) return;
        aspect = Math.max(0.2, Math.min(5, photo.naturalWidth / Math.max(1, Math.min(photo.naturalHeight, photo.naturalWidth * 2.5))));
        place();
        await new Promise((r) => requestAnimationFrame(r));
        stage.resize();
        await stage.load(src instanceof Blob ? src : url);
      } catch (e) {
        if (my !== loadId || disposed) return;
        photo.hidden = true;
        say('That picture couldn’t be opened. Try a PNG, JPEG or WebP screenshot.');
        paintBtn.disabled = false; saveBtn.disabled = !stage || !stage._srcTex;
        return;
      }
      if (my !== loadId || disposed) return;
      paintBtn.disabled = false; saveBtn.disabled = false;
      canvas.setAttribute('aria-label', describe());
      say(`${label}, as a sketch.`);
      await sweep();
    }
    function choose(s) {
      pick = s; ownFile = null;
      chips.forEach((c) => c.setAttribute('aria-pressed', c.getAttribute('data-site') === s.id ? 'true' : 'false'));
      show(srcFor(s), s.name);
    }
    function useFile(f) {
      if (!f || !/^image\//.test(f.type)) { say('That isn’t a picture. Try a PNG, JPEG or WebP screenshot.'); return; }
      ownFile = f;
      chips.forEach((c) => c.setAttribute('aria-pressed', 'false'));
      takeOver();
      show(f, 'Your screenshot');
    }

    /* ---- painting */
    function takeOver() { if (sweeping) endSweep(false); }
    const local = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    let dragging = false, lastSound = 0;
    function paint(e) {
      if (paused || !stage || done) return;
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      (evs.length ? evs : [e]).forEach((c) => { const [x, y] = local(c); stage.paintAt(x, y); });
      const now = performance.now(); if (now - lastSound > 60) { lastSound = now; sound.scratch(); }
    }
    ev.on(canvas, 'pointerdown', (e) => {
      takeOver();
      if (e.pointerType !== 'mouse') { dragging = true; try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* fine */ } }
      paint(e);
    });
    ev.on(canvas, 'pointermove', (e) => {
      if (e.pointerType === 'mouse' || dragging) { takeOver(); paint(e); }
    });
    const up = () => { dragging = false; };
    ev.on(canvas, 'pointerup', up); ev.on(canvas, 'pointercancel', up);
    canvas.style.cursor = CURSOR;

    // the keyboard: a brush you steer with the arrow keys
    let kb = null;
    ev.on(canvas, 'keydown', (e) => {
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (!d) return;
      e.preventDefault(); takeOver();
      const w = canvas.clientWidth, h = canvas.clientHeight, stepPx = Math.max(24, Math.min(w, h) * 0.05);
      if (!kb) kb = [w / 2, h / 2];
      kb = [Math.max(0, Math.min(w, kb[0] + d[0] * stepPx)), Math.max(0, Math.min(h, kb[1] + d[1] * stepPx))];
      ring.style.transform = `translate(${kb[0]}px, ${kb[1]}px)`; ring.hidden = false;
      if (stage && !done && !paused) stage.paintAt(kb[0], kb[1]);
    });
    ev.on(canvas, 'blur', () => { ring.hidden = true; });
    ring.hidden = true;

    /* ---- controls */
    chips.forEach((c, i) => ev.on(c, 'click', () => { takeOver(); choose(sites[i]); }));
    ev.on(file, 'change', () => { const f = file.files && file.files[0]; file.value = ''; if (f) useFile(f); });
    ev.on(paintBtn, 'click', () => { if (!stage || done) return; takeOver(); say('Painting it back.'); stage.autoPaint(instant ? 0 : 2000); if (instant) stage.finish(0); });
    ev.on(againBtn, 'click', async () => {
      if (!stage) return;
      done = false; coverage = 0; paintBtn.hidden = false; againBtn.hidden = true;
      stage.reset();
      canvas.setAttribute('aria-label', describe());
      say(`${nameNow()}, as a sketch again.`);
      sweep();
    });
    ev.on(saveBtn, 'click', async () => {
      if (!stage) return;
      try {
        const blob = await stage.toBlob('image/png');
        const slug = (ownFile ? 'your-site' : pick.id) || 'site';
        const a = el('a', { href: URL.createObjectURL(blob), download: `sketch-${slug}.png` });
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        say(`Saved the sketch as sketch-${slug}.png.`);
      } catch (e) { say('The sketch couldn’t be saved in this browser.'); }
    });
    // drop and paste anywhere in the piece
    let depth = 0;
    const isFiles = (e) => e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files');
    ev.on(root, 'dragenter', (e) => { if (!isFiles(e)) return; e.preventDefault(); depth++; drop.setAttribute('data-on', ''); });
    ev.on(root, 'dragover', (e) => { if (!isFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    ev.on(root, 'dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) drop.removeAttribute('data-on'); });
    ev.on(root, 'drop', (e) => {
      if (!isFiles(e)) return;
      e.preventDefault(); depth = 0; drop.removeAttribute('data-on');
      useFile([...e.dataTransfer.files].find((f) => /^image\//.test(f.type)) || e.dataTransfer.files[0]);
    });
    ev.on(document, 'paste', (e) => {
      const items = [...((e.clipboardData && e.clipboardData.items) || [])];
      const it = items.find((i) => i.kind === 'file' && /^image\//.test(i.type));
      if (!it) return;
      e.preventDefault(); useFile(it.getAsFile());
    });

    /* ---- size changes */
    let rt = 0;
    const ro = new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { if (!disposed) place(); }, 60); });
    ro.observe(root); ro.observe(panel);

    live = {
      note,
      pause() { if (beat > 0) endSweep(false); anims.forEach((a) => a.pause()); },
      resume() { anims.forEach((a) => a.play()); },
      stop() { endSweep(false); ro.disconnect(); clearTimeout(rt); if (objectUrl) URL.revokeObjectURL(objectUrl); objectUrl = ''; },
    };

    place();
    requestAnimationFrame(() => holder.setAttribute('data-in', ''));
    say(`${pick.name}, as a sketch.`);
    await show(srcFor(pick), pick.name).catch(() => {});
  }

  /* ================================================================== no WebGL 2: the drawn sketches */
  function startStill({ screen, canvas, photo, panel, note, chips, ownBtn, file, paintBtn, againBtn, saveBtn }) {
    canvas.remove();
    const img = el('img', { class: 'sk-still', alt: '' });
    screen.prepend(img);
    ownBtn.remove(); file.remove(); againBtn.remove(); saveBtn.remove();
    const yours = panel.querySelector('.sk-yours'); if (yours) yours.remove();
    paintBtn.replaceChildren('Show the finished site');
    paintBtn.setAttribute('aria-pressed', 'false');
    let finished = false;
    function render() {
      const sk = sketchFor(pick);
      img.src = sk || srcFor(pick);
      photo.src = srcFor(pick);
      photo.hidden = !finished;
      img.alt = `${pick.name}, drawn as a cream pen-and-pencil sketch`;
      root.querySelector('.sk-screen').style.cssText = 'top:0;bottom:var(--lab-safe-bottom, 0px);height:auto';
    }
    chips.forEach((c, i) => c.addEventListener('click', () => { pick = sites[i]; chips.forEach((x) => x.setAttribute('aria-pressed', x === c ? 'true' : 'false')); render(); }));
    paintBtn.addEventListener('click', () => { finished = !finished; paintBtn.setAttribute('aria-pressed', finished ? 'true' : 'false'); render(); });
    note.textContent = 'Painting needs WebGL 2, which this browser doesn’t offer, so here are our sketches.';
    live = { note, pause() {}, resume() {}, stop() {} };
    render();
    requestAnimationFrame(() => root.querySelector('.sk-live').setAttribute('data-in', ''));
  }
}
