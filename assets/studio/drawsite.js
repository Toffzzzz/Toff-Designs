/*
 * Sketch your homepage: visitors drag blocks onto a sheet of paper (a menu bar, headings and text they type into,
 * buttons, pictures, cards, a gallery, a map, a contact form) and can add pen strokes too. Nothing is built while
 * they work. When they press "I'm done", the sketch is turned into a static picture of a homepage to scroll through.
 *
 *   var dr = DrawSite.mount(document.getElementById('draw-your-site'), {
 *     getStyle: function () { return { business: 'clinic', mood: 'calm', name: '' }; },      // e.g. from the playground
 *     ai: { endpoint: 'https://your-worker.workers.dev/read-sketch' }                       // optional: Claude builds it
 *   });
 *   dr.done()  dr.example()  dr.undo()  dr.clear()  dr.result()  dr.blocks()  dr.strokes()
 *
 * With the AI option, the sketch (pen lines as a picture, plus the placed blocks and their text) is sent to your
 * Worker, which asks Claude to read it. Placed blocks always stay exactly where they were put. Without the AI, or if
 * it doesn't answer, simple shape rules read the pen strokes instead, so the visitor always gets a page.
 * Pen marks it understands: a wide box at the top = menu bar; a box with an X = picture; a small box = button; a bigger
 * box = card; lines = a heading then text; a zig-zag = a paragraph; a circle = logo. Fires 'toff:drawn' after each build.
 *
 * Round 05 (Design yours, assets/home/design-yours.js): pass onBuilt and DrawSite feeds SiteKit instead of drawing its
 * own picture. Only the paper, the palette, the tools and .dr-status are then needed in the markup (the preview
 * elements .dr-screen, .dr-scroll, .dr-page, .dr-foot, .dr-fold, .dr-empty, .dr-more and .dr-building are optional).
 *   DrawSite.mount(el, {
 *     getStyle, ai,                                          // as above; /read-sketch is used exactly as before
 *     onBusy: function (busy, message) {},                   // reading the sketch (message says by whom), or finished
 *     onBuilt: function (r) {}                               // r = { elements, description, how: 'ai'|'rules'|'fallback', unread }
 *   });                                                      // elements are dr.blocks()-style: { kind, x, y, w, h, text }
 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PAPER = 0.8;                                    // the paper (and the page) is 4 wide by 5 tall
  var MOODS = {
    calm: { bg: '#EEF1EC', surface: '#E1E8DF', text: '#22332B', muted: '#5D6B63', btn: '#2F4A3E', btnText: '#fff', accent: '#8FAF96', display: "'Cormorant Garamond', Georgia, serif", weight: 500, radius: '14px', caps: 'none' },
    bold: { bg: '#121212', surface: '#1D1D1D', text: '#FAFAF7', muted: '#A9A9A4', btn: '#FF5A36', btnText: '#121212', accent: '#FF5A36', display: 'Inter, sans-serif', weight: 800, radius: '4px', caps: 'uppercase' },
    classic: { bg: '#F6EFE6', surface: '#ECE1D2', text: '#2B1A1E', muted: '#6E5A5E', btn: '#5A1E2C', btnText: '#F6EFE6', accent: '#B08D57', display: "'Cormorant Garamond', Georgia, serif", weight: 500, radius: '2px', caps: 'none', italic: true },
    fresh: { bg: '#FFFFFF', surface: '#EAF4F6', text: '#0F2A44', muted: '#557086', btn: '#12355B', btnText: '#fff', accent: '#3FB6A8', display: 'Inter, sans-serif', weight: 650, radius: '14px', caps: 'none' }
  };
  var LABELS = { header: 'menu bar', image: 'picture', button: 'button', card: 'card', logo: 'logo', avatar: 'round photo', nav: 'link', heading: 'heading', text: 'text', para: 'paragraph', map: 'map', form: 'form', gallery: 'gallery', video: 'video', reviews: 'reviews' };
  var AI_KINDS = Object.keys(LABELS);
  var TITLES = ['What we offer', 'Why choose us', 'Come and say hello', 'How it works'];


  function rect(x0, y0, x1, y1) { return [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]; }
  function line(x0, y, x1) { return [[x0, y], [x1, y]]; }
  function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
  function bbox(pts) { var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; pts.forEach(function (p) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; }
  function len(pts) { var L = 0; for (var i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i]); return L; }
  function inside(a, b, pad) { pad = pad || 0.01; return a.x >= b.x - pad && a.y >= b.y - pad && a.x + a.w <= b.x + b.w + pad && a.y + a.h <= b.y + b.h + pad; }

  // classify one stroke (coordinates as fractions of the paper; aspect = paper width / height)
  function classify(pts, aspect) {
    var b = bbox(pts), L = len(pts.map(function (p) { return [p[0] * aspect, p[1]]; })), W = b.w * aspect, H = b.h, diag = Math.hypot(W, H) || 1e-6;   // measure in true proportions
    var ends = dist([pts[0][0] * aspect, pts[0][1]], [pts[pts.length - 1][0] * aspect, pts[pts.length - 1][1]]);
    var closed = ends / diag, straight = ends / (L || 1e-6);
    if (diag < 0.02) return { kind: 'dot', b: b };
    if (H / Math.max(W, 1e-6) < 0.2 && straight > 0.75) return { kind: 'line', b: b };
    if (W / Math.max(H, 1e-6) < 0.2 && straight > 0.75) return { kind: 'vline', b: b };
    if (straight > 0.8 && H > 0.03 && W > 0.03) return { kind: 'diag', b: b };
    if (closed < 0.3) {
      var ratio = L / (W + H);                           // a circle is about 1.57, a rectangle about 2
      if (ratio < 1.8 && Math.abs(W - H) / Math.max(W, H) < 0.45) return { kind: 'circle', b: b };
      return { kind: 'box', b: b };
    }
    var turns = 0;                                       // a zig-zag reads as a paragraph
    for (var i = 2; i < pts.length; i++) { var a1 = Math.atan2(pts[i - 1][1] - pts[i - 2][1], pts[i - 1][0] - pts[i - 2][0]), a2 = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]); var d = Math.abs(a2 - a1); if (d > Math.PI) d = 2 * Math.PI - d; if (d > 1.6) turns++; }
    if (turns >= 3) return { kind: 'scribble', b: b };
    return { kind: H < W * 0.35 ? 'line' : 'box', b: b };
  }

  // turn classified strokes into parts of the page (y is a fraction of the page height, x of its width)
  function interpret(shapes) {
    var els = [], used = {};
    shapes.forEach(function (s, i) { s.i = i; });
    var diags = shapes.filter(function (s) { return s.kind === 'diag'; });
    shapes.filter(function (s) { return s.kind === 'box'; }).forEach(function (bx) {
      var b = bx.b, xs = diags.filter(function (d) { return inside(d.b, b, 0.03); });
      xs.forEach(function (d) { used[d.i] = 1; });
      var kind = xs.length ? 'image' : (b.y < 0.09 && b.w > 0.55 && b.h < 0.13) ? 'header' : (b.w < 0.32 && b.h < 0.075) ? 'button' : 'card';
      els.push({ kind: kind, b: b, src: bx }); used[bx.i] = 1;
    });
    var header = els.filter(function (e) { return e.kind === 'header'; })[0];
    shapes.forEach(function (s) {
      if (s.kind === 'circle') { els.push({ kind: header && inside(s.b, header.b, 0.02) ? 'logo' : 'avatar', b: s.b, src: s }); used[s.i] = 1; }
      if (s.kind === 'scribble') { els.push({ kind: 'para', b: s.b, src: s }); used[s.i] = 1; }
    });
    var lines = shapes.filter(function (s) { return s.kind === 'line'; }).sort(function (a, b) { return a.b.y - b.b.y; });
    var groups = [], cur = null;
    lines.forEach(function (l) {
      used[l.i] = 1;
      if (header && inside(l.b, header.b, 0.02)) { els.push({ kind: 'nav', b: l.b, src: l }); return; }
      var host = els.filter(function (e) { return e.kind === 'card' && inside(l.b, e.b, 0.02); })[0];
      if (host) { (host.lines = host.lines || []).push(l); return; }
      if (cur && l.b.y - cur.last.b.y < 0.06 && Math.abs(l.b.x - cur.last.b.x) < 0.12) { cur.items.push(l); cur.last = l; }
      else { cur = { items: [l], last: l }; groups.push(cur); }
    });
    groups.forEach(function (g, gi) {
      var first = g.items[0], widest = g.items.reduce(function (m, l) { return l.b.w > m.b.w ? l : m; }, first), heads = 0;
      if (g.items.length >= 2 && first.b.w >= widest.b.w * 0.8) {
        heads = 1;
        if (g.items.length >= 4 && g.items[1].b.w >= widest.b.w * 0.75) heads = 2;   // a two-line headline
      } else if (g.items.length === 1 && first.b.w > 0.3) heads = 1;
      g.items.forEach(function (l, i) { els.push({ kind: i < heads ? 'heading' : 'text', b: l.b, src: l, group: gi, row: i, lastHead: i === heads - 1, lastRow: i === g.items.length - 1 }); });
    });
    els.sort(function (a, b) { return Math.abs(a.b.y - b.b.y) < 0.02 ? a.b.x - b.b.x : a.b.y - b.b.y; });   // reading order
    var unread = shapes.filter(function (s) { return !used[s.i]; });
    return { els: els, unread: unread };
  }

  function describe(els) {
    var c = {}; els.forEach(function (e) { c[e.kind] = (c[e.kind] || 0) + 1; });
    var NAMES = { header: ['a menu bar', 'menu bars'], logo: ['a logo', 'logos'], nav: ['a menu link', 'menu links'], heading: ['a heading', 'headings'], text: ['a line of text', 'lines of text'], para: ['a block of text', 'blocks of text'], button: ['a button', 'buttons'], image: ['a picture', 'pictures'], card: ['a card', 'cards'], avatar: ['a round photo', 'round photos'], map: ['a map', 'maps'], form: ['a contact form', 'contact forms'], gallery: ['a photo gallery', 'photo galleries'], video: ['a video', 'videos'], reviews: ['a reviews strip', 'reviews strips'] };
    var words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    var parts = Object.keys(NAMES).filter(function (k) { return c[k]; }).map(function (k) { return c[k] === 1 ? NAMES[k][0] : (words[c[k]] || c[k]) + ' ' + NAMES[k][1]; });
    if (!parts.length) return '';
    return parts.length === 1 ? parts[0] : parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
  }

  function endpointRecogniser(cfg) {
    return function (payload) {
      var ctl = window.AbortController ? new AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); }, cfg.timeout || 9000);
      return fetch(cfg.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctl ? ctl.signal : undefined })
        .then(function (r) { clearTimeout(t); if (!r.ok) throw new Error('AI ' + r.status); return r.json(); });
    };
  }
  function clamp(d, fs, ph) {                         // show whole lines only, ending with … if the words don't all fit
    d.style.display = '-webkit-box'; d.style.webkitBoxOrient = 'vertical'; d.style.lineHeight = '1.5'; d.style.overflow = 'hidden';
    d.style.webkitLineClamp = String(Math.max(1, Math.floor(ph / (fs * 1.5))));
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // Blocks a visitor can drag onto the paper (sizes are fractions of the paper; text = what the box asks for)
  var BLOCKS = {
    header: { label: 'Menu bar', w: 0.92, h: 0.06 },
    logo: { label: 'Logo', w: 0.075, h: 0.06 },
    heading: { label: 'Heading', w: 0.5, h: 0.08, text: 'Type a heading', max: 70 },
    text: { label: 'Text', w: 0.44, h: 0.1, text: 'Type some text', max: 280 },
    button: { label: 'Button', w: 0.22, h: 0.05, text: 'Button label', max: 28 },
    image: { label: 'Picture', w: 0.4, h: 0.24 },
    card: { label: 'Card', w: 0.28, h: 0.15, text: 'Card title', max: 40 },
    gallery: { label: 'Gallery', w: 0.88, h: 0.2 },
    map: { label: 'Map', w: 0.88, h: 0.18 },
    form: { label: 'Contact form', w: 0.44, h: 0.24 }
  };
  var ORDER = ['header', 'logo', 'heading', 'text', 'button', 'image', 'card', 'gallery', 'map', 'form'];
  var RENDER_KIND = { header: 'header', logo: 'logo', heading: 'heading', text: 'para', button: 'button', image: 'image', card: 'card', gallery: 'gallery', map: 'map', form: 'form' };
  // "Draw one for me": a few blocks dropped in, then a little pen sketch at the bottom
  var EXAMPLE_BLOCKS = [
    ['header', 0.04, 0.025, 0.92, 0.06], ['logo', 0.065, 0.03, 0.075, 0.05], ['heading', 0.06, 0.14, 0.42, 0.11], ['text', 0.06, 0.26, 0.4, 0.07],
    ['button', 0.06, 0.35, 0.2, 0.045], ['image', 0.53, 0.13, 0.41, 0.27], ['card', 0.04, 0.5, 0.28, 0.16], ['card', 0.36, 0.5, 0.28, 0.16], ['card', 0.68, 0.5, 0.28, 0.16]
  ];
  var EXAMPLE_STROKES = [
    rect(.06, .74, .46, .93), [[.06, .74], [.46, .93]], [[.46, .74], [.06, .93]],
    line(.54, .77, .9), line(.54, .82, .92), line(.54, .85, .84), rect(.54, .88, .72, .925)
  ];

  function mount(root, options) {
    var o = options || {};
    var paper = root.querySelector('.dr-paper'), canvas = root.querySelector('.dr-canvas'), layer = root.querySelector('.dr-blocks'), hint = root.querySelector('.dr-hint'), fold = root.querySelector('.dr-fold');
    var palette = root.querySelector('.dr-palette-chips'), screen = root.querySelector('.dr-screen'), scroller = root.querySelector('.dr-scroll'), page = root.querySelector('.dr-page'), foot = root.querySelector('.dr-foot');
    var empty = root.querySelector('.dr-empty'), more = root.querySelector('.dr-more'), status = root.querySelector('.dr-status'), busyEl = root.querySelector('.dr-building');
    var btnDone = root.querySelector('.dr-done'), btnExample = root.querySelector('.dr-example'), btnUndo = root.querySelector('.dr-undo'), btnClear = root.querySelector('.dr-clear');
    var ctx = canvas.getContext('2d'), strokes = [], blocks = [], history = [], current = null, dpr = 1, built = null, playing = false, building = false, stale = false, ver = 0, seen = new Map(), uid = 0;
    var aiFn = o.recognise || (o.ai && o.ai.endpoint ? endpointRecogniser(o.ai) : null);
    var toKit = typeof o.onBuilt === 'function';         // round 05: SiteKit draws the picture, not render() below
    var keyAi = root.querySelector('.dr-key-ai'), aiNote = root.querySelector('.dr-ai-privacy');
    function syncAiBits() { if (keyAi) keyAi.hidden = !aiFn; if (aiNote) aiNote.hidden = !aiFn; }
    syncAiBits();

    // ---------- the paper and the pen ----------
    function sizePaper() {
      var r = paper.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(2, Math.round(r.width * dpr)); canvas.height = Math.max(2, Math.round(r.height * dpr));
      redraw();
    }
    function drawStroke(g, pts, W, H, width, colour) {
      if (pts.length < 2) return;
      g.strokeStyle = colour; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(pts[0][0] * W, pts[0][1] * H);
      for (var i = 1; i < pts.length - 1; i++) { var mx = (pts[i][0] + pts[i + 1][0]) / 2 * W, my = (pts[i][1] + pts[i + 1][1]) / 2 * H; g.quadraticCurveTo(pts[i][0] * W, pts[i][1] * H, mx, my); }
      g.lineTo(pts[pts.length - 1][0] * W, pts[pts.length - 1][1] * H); g.stroke();
    }
    function redraw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      strokes.forEach(function (s) { drawStroke(ctx, s, canvas.width, canvas.height, 2.4 * dpr, 'rgba(42, 39, 34, .92)'); });
      if (current) drawStroke(ctx, current, canvas.width, canvas.height, 2.4 * dpr, 'rgba(42, 39, 34, .92)');
    }
    function local(e) { var r = paper.getBoundingClientRect(); return [Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))]; }
    canvas.addEventListener('pointerdown', function (e) {
      if (playing) return;
      if (document.activeElement && layer.contains(document.activeElement)) document.activeElement.blur();
      current = [local(e)]; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} e.preventDefault();
    });
    canvas.addEventListener('pointermove', function (e) { if (!current) return; var p = local(e); if (dist(p, current[current.length - 1]) > 0.003) { current.push(p); redraw(); } });
    function endStroke() { if (!current) return; var s = current; current = null; if (s.length > 1) { strokes.push(s); history.push({ type: 'stroke', ref: s }); changed(); } redraw(); }
    canvas.addEventListener('pointerup', endStroke); canvas.addEventListener('pointercancel', endStroke);

    // ---------- blocks: drag them in, move, resize, type ----------
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function place(bk) {
      bk.w = clamp(bk.w, 0.05, 1); bk.h = clamp(bk.h, 0.025, 1); bk.x = clamp(bk.x, 0, 1 - bk.w); bk.y = clamp(bk.y, 0, 1 - bk.h);
      var el = bk.el; el.style.left = (bk.x * 100) + '%'; el.style.top = (bk.y * 100) + '%'; el.style.width = (bk.w * 100) + '%'; el.style.height = (bk.h * 100) + '%';
      var px = bk.h * (paper.clientHeight || 500); el.classList.toggle('dr-b-small', px < 46);   // small boxes: no room for a label above the words
    }
    function nextSpot(kind, w, h) {                      // tapping a block adds it below everything that's already there
      var header = blocks.filter(function (b) { return b.kind === 'header'; })[0];
      if (kind === 'header' && !header) return { x: 0.04, y: 0.02 };
      if (kind === 'logo' && header && !blocks.some(function (b) { return b.kind === 'logo'; })) return { x: header.x + 0.025, y: header.y + (header.h - h) / 2 };
      var bottom = 0.02;
      blocks.forEach(function (b) { bottom = Math.max(bottom, b.y + b.h); });
      strokes.forEach(function (s) { s.forEach(function (p) { bottom = Math.max(bottom, p[1]); }); });
      return { x: w > 0.8 ? 0.06 : 0.06, y: Math.min(bottom + 0.025, 0.98 - h) };
    }
    function addBlock(kind, b, text, opts) {
      var def = BLOCKS[kind]; if (!def) return null;
      var w = b && b.w || def.w, h = b && b.h || def.h, at = b && b.x != null ? b : nextSpot(kind, w, h);
      var bk = { id: ++uid, kind: kind, x: at.x, y: at.y, w: w, h: h, text: text || '' };
      var el = document.createElement('div'); el.className = 'dr-block dr-b-' + kind; el.tabIndex = 0; el.setAttribute('role', 'group');
      el.setAttribute('aria-label', def.label + ' on the page. Drag to move. Arrow keys move it, Shift and arrows resize it, Delete removes it.');
      el.innerHTML = '<span class="dr-b-tag" aria-hidden="true">' + def.label + '</span>' +
        (def.text ? '<span class="dr-b-text" role="textbox" aria-label="' + def.label + ' text" data-ph="' + def.text + '"></span>' : '') +
        '<button type="button" class="dr-b-del" aria-label="Remove this ' + def.label.toLowerCase() + '">×</button><span class="dr-b-size" aria-hidden="true"></span>';
      bk.el = el; layer.appendChild(el); place(bk); blocks.push(bk); history.push({ type: 'block', ref: bk });
      var txt = el.querySelector('.dr-b-text');
      if (txt) {
        try { txt.contentEditable = 'plaintext-only'; } catch (err) {}
        if (txt.contentEditable !== 'plaintext-only') txt.contentEditable = 'true';
        txt.textContent = bk.text;
        txt.addEventListener('paste', function (e) { e.preventDefault(); var t = (e.clipboardData || window.clipboardData).getData('text'); document.execCommand('insertText', false, t.replace(/\s+/g, ' ')); });
        txt.addEventListener('keydown', function (e) { if (e.key === 'Enter' && kind !== 'text') { e.preventDefault(); txt.blur(); } e.stopPropagation(); });
        txt.addEventListener('input', function () {
          var v = txt.innerText.replace(/\s+/g, ' ').replace(/^\s+/, '');
          if (v.length > def.max) { v = v.slice(0, def.max); txt.textContent = v; }
          bk.text = v.trim(); txt.classList.toggle('dr-b-empty', !bk.text); changed();
        });
        txt.classList.toggle('dr-b-empty', !bk.text);
      }
      el.querySelector('.dr-b-del').addEventListener('click', function (e) { e.stopPropagation(); removeBlock(bk, true); });
      el.addEventListener('pointerdown', function (e) { startDrag(e, bk, e.target.closest('.dr-b-size') ? 'size' : 'move'); });
      el.addEventListener('keydown', function (e) {
        if (e.target !== el) return;
        var step = 0.01, k = e.key;
        if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); removeBlock(bk, true); return; }
        if (k === 'Enter' && txt) { e.preventDefault(); txt.focus(); return; }
        var dx = k === 'ArrowLeft' ? -step : k === 'ArrowRight' ? step : 0, dy = k === 'ArrowUp' ? -step : k === 'ArrowDown' ? step : 0;
        if (!dx && !dy) return; e.preventDefault();
        if (e.shiftKey) { bk.w += dx; bk.h += dy; } else { bk.x += dx; bk.y += dy; }
        place(bk); changed();
      });
      if (!(opts && opts.quiet)) changed();
      return bk;
    }
    function removeBlock(bk, focusNext) {               // focusNext: the visitor pressed × (so Undo can bring it back)
      blocks = blocks.filter(function (b) { return b !== bk; });
      if (focusNext) history.push({ type: 'remove', ref: bk }); else history = history.filter(function (h) { return h.ref !== bk; });
      bk.el.remove(); changed();
      if (focusNext) { var last = blocks[blocks.length - 1]; (last ? last.el : btnDone).focus(); }
    }
    var drag = null;
    function startDrag(e, bk, mode) {
      if (playing || e.button > 0) return;
      if (e.target.closest('.dr-b-del')) return;
      if (e.target.closest('.dr-b-text') && document.activeElement === e.target.closest('.dr-b-text')) return;   // already typing: let the cursor move
      var r = paper.getBoundingClientRect();
      drag = { bk: bk, mode: mode, sx: e.clientX, sy: e.clientY, x: bk.x, y: bk.y, w: bk.w, h: bk.h, W: r.width, H: r.height, moved: false, onText: !!e.target.closest('.dr-b-text') };
      try { bk.el.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault(); e.stopPropagation();
    }
    layer.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = (e.clientX - drag.sx) / drag.W, dy = (e.clientY - drag.sy) / drag.H;
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 4) return;
      drag.moved = true; drag.bk.el.classList.add('dr-dragging');
      if (drag.mode === 'size') { drag.bk.w = drag.w + dx; drag.bk.h = drag.h + dy; } else { drag.bk.x = drag.x + dx; drag.bk.y = drag.y + dy; }
      place(drag.bk);
    });
    function endDrag() {
      if (!drag) return; var d = drag; drag = null; d.bk.el.classList.remove('dr-dragging');
      if (d.moved) changed();
      else if (d.onText) { var t = d.bk.el.querySelector('.dr-b-text'); t.focus(); }           // a tap on the words: start typing
      else d.bk.el.focus();
    }
    layer.addEventListener('pointerup', endDrag); layer.addEventListener('pointercancel', endDrag);

    // the palette: tap to add, or drag a chip onto the paper
    var ghost = null, chipDrag = null;
    ORDER.forEach(function (kind) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'dr-chip'; b.setAttribute('data-kind', kind); b.textContent = BLOCKS[kind].label;
      b.setAttribute('aria-label', 'Add a ' + BLOCKS[kind].label.toLowerCase() + ' to the page');
      palette.appendChild(b);
      b.addEventListener('pointerdown', function (e) { if (playing || e.button > 0) return; chipDrag = { kind: kind, sx: e.clientX, sy: e.clientY, moved: false }; try { b.setPointerCapture(e.pointerId); } catch (err) {} });
      b.addEventListener('pointermove', function (e) {
        if (!chipDrag) return;
        if (!chipDrag.moved && Math.hypot(e.clientX - chipDrag.sx, e.clientY - chipDrag.sy) < 6) return;
        if (!chipDrag.moved) { chipDrag.moved = true; ghost = document.createElement('div'); ghost.className = 'dr-ghost'; ghost.textContent = BLOCKS[kind].label; document.body.appendChild(ghost); }
        ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px';
        var r = paper.getBoundingClientRect(); paper.classList.toggle('dr-drop', e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom);
      });
      function finish(e, cancelled) {
        if (!chipDrag) return; var cd = chipDrag; chipDrag = null; paper.classList.remove('dr-drop');
        if (ghost) { ghost.remove(); ghost = null; }
        if (cancelled || !cd.moved) return;                // a plain tap is handled by "click"
        var r = paper.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
        var def = BLOCKS[kind], p = local(e);
        var bk = addBlock(kind, { x: p[0] - def.w / 2, y: p[1] - def.h / 2, w: def.w, h: def.h });
        cd.added = true; b._justDragged = true; setTimeout(function () { b._justDragged = false; }, 50);
        focusNew(bk);
      }
      b.addEventListener('pointerup', function (e) { finish(e, false); });
      b.addEventListener('pointercancel', function (e) { finish(e, true); });
      b.addEventListener('click', function () { if (playing || b._justDragged) return; focusNew(addBlock(kind)); });
    });
    function focusNew(bk) { if (!bk) return; var t = bk.el.querySelector('.dr-b-text'); (t || bk.el).focus({ preventScroll: true }); }

    // ---------- turning the sketch into page elements ----------
    function style() { var s = (o.getStyle && o.getStyle()) || {}; return { business: s.business || 'clinic', mood: MOODS[s.mood] ? s.mood : 'calm', name: s.name || '' }; }
    function take(arr, c, n, wrap) { var out = []; while (c.i < arr.length || wrap) { if (c.i >= arr.length) { if (!arr.length) break; c.i = 0; } var w = arr[c.i]; if (out.join(' ').length + w.length + 1 > n && out.length) break; out.push(w); c.i++; if (out.join(' ').length >= n) break; } return out.join(' '); }
    function blockEls() {
      return blocks.map(function (bk) { return { kind: RENDER_KIND[bk.kind], b: { x: bk.x, y: bk.y, w: bk.w, h: bk.h }, text: bk.text, box: true, placed: true, src: { pts: 'b' + bk.id } }; });
    }
    function strokeShapes() { return strokes.map(function (s) { var c = classify(s, canvas.width / Math.max(1, canvas.height) || PAPER); c.pts = s; return c; }); }
    function overlap(a, b) {                             // how much of the smaller box the two share
      var x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)), y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
      return (x * y) / Math.max(1e-6, Math.min(a.w * a.h, b.w * b.h));
    }
    function merge(placedEls, others) {                  // placed blocks are exact; anything else that lands on top of one is dropped
      var keep = others.filter(function (e) { return !placedEls.some(function (p) { return overlap(p.b, e.b) > 0.6; }); });
      var all = placedEls.concat(keep);
      all.sort(function (a, b) { return Math.abs(a.b.y - b.b.y) < 0.02 ? a.b.x - b.b.x : a.b.y - b.b.y; });
      return all;
    }
    function serial(e) { var r = { kind: e.kind, x: +e.b.x.toFixed(3), y: +e.b.y.toFixed(3), w: +e.b.w.toFixed(3), h: +e.b.h.toFixed(3) }; if (e.text) r.text = e.text; return r; }
    function sketchImage() {                             // what the model looks at: the pen lines, plus each placed block as a labelled box
      var W = 640, H = Math.round(W / PAPER), c = document.createElement('canvas'), g = c.getContext('2d'); c.width = W; c.height = H;
      g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
      blocks.forEach(function (bk) {
        g.strokeStyle = '#888'; g.lineWidth = 2; g.setLineDash([6, 4]); g.strokeRect(bk.x * W, bk.y * H, bk.w * W, bk.h * H); g.setLineDash([]);
        g.fillStyle = '#666'; g.font = '14px sans-serif'; g.fillText(BLOCKS[bk.kind].label.toUpperCase() + (bk.text ? ': ' + bk.text.slice(0, 30) : ''), bk.x * W + 6, bk.y * H + 17);
      });
      strokes.forEach(function (s) { drawStroke(g, s, W, H, 3, '#000'); });
      return c.toDataURL('image/png');
    }

    // ---------- "I'm done": build the homepage ----------
    function done() {
      if (building || playing || (!blocks.length && !strokes.length)) return Promise.resolve(built);
      var busyMsg = aiFn && strokes.length ? 'Claude is reading your sketch…' : 'Laying it out…';
      building = true; buttons(); if (busyEl) { busyEl.hidden = false; busyEl.querySelector('span').textContent = busyMsg; }
      if (o.onBusy) o.onBusy(true, busyMsg);
      var my = ++ver, st = style(), placedEls = blockEls(), shapes = strokeShapes(), rules = interpret(shapes), quick = merge(placedEls, rules.els);
      if (!aiFn || !strokes.length) { finish(quick, 'rules', my, rules.unread.length); return Promise.resolve(built); }   // only blocks: nothing for the AI to read
      var payload = { image: sketchImage(), page: { width: 4, height: 5 }, business: st.business, mood: st.mood,
        placed: placedEls.map(serial), rules: rules.els.map(serial), marks: shapes.map(function (sh) { return { kind: sh.kind, x: +sh.b.x.toFixed(3), y: +sh.b.y.toFixed(3), w: +sh.b.w.toFixed(3), h: +sh.b.h.toFixed(3) }; }) };
      var p; try { p = Promise.resolve(aiFn(payload)); } catch (err) { p = Promise.reject(err); }
      return p.then(function (r) { return fromAi(r); }).catch(function () { return null; }).then(function (aiEls) {
        if (aiEls) finish(merge(placedEls, aiEls.filter(function (e) { return !e.placed; })), 'ai', my, 0);
        else finish(quick, 'fallback', my, rules.unread.length);
        return built;
      });
    }
    function finish(els, how, my, unreadCount) {
      building = false; if (busyEl) busyEl.hidden = true;
      if (o.onBusy) o.onBusy(false, '');
      if (!toKit) render(els, true);
      built = { elements: els.map(serial), description: describe(els), how: how, _els: els };
      stale = my !== ver;
      if (empty) empty.hidden = !!els.length;
      if (screen) screen.classList.toggle('dr-stale', stale);
      var msg = els.length ? (how === 'ai' ? 'Built by Claude from your sketch: ' : 'Built from your sketch: ') + '<em>' + esc(built.description) + '</em>.' : 'Nothing on the paper could be turned into a page yet.';
      if (how === 'fallback') msg += ' <span class="dr-ai-note">The AI didn’t answer this time, so this is the quick version.</span>';
      if (how !== 'ai' && unreadCount) msg += ' ' + (unreadCount === 1 ? 'One pen mark' : unreadCount + ' pen marks') + ' couldn’t be read; the blocks above the paper are the surest way.';
      if (status) status.innerHTML = msg;
      btnDone.textContent = 'Update my site';
      buttons(); placeFold(); if (scroller) scroller.scrollTop = 0; cue();
      if (els.length) announce();
      if (toKit) o.onBuilt({ elements: built.elements.slice(), description: built.description, how: how, unread: unreadCount });
    }
    function changed() {
      ver++;
      hint.hidden = !!(blocks.length || strokes.length);
      paper.classList.toggle('dr-has-strokes', !!(blocks.length || strokes.length));
      if (built && !building) { stale = true; if (screen) screen.classList.add('dr-stale'); if (status) status.innerHTML = 'You’ve changed your sketch. Press <em>Update my site</em> to rebuild it.'; }
      if (!blocks.length && !strokes.length) reset();
      buttons();
    }
    function reset() {
      built = null; stale = false;
      if (screen) screen.classList.remove('dr-stale');
      if (page) { page.innerHTML = ''; page.style.background = ''; }
      if (foot) foot.hidden = true;
      if (empty) empty.hidden = false;
      if (more) more.hidden = true;
      if (status) status.textContent = '';
      seen = new Map(); btnDone.textContent = 'I’m done: build my site';
    }

    // ---------- the picture of the page ----------
    function render(els, fresh) {
      var st = style(), m = MOODS[st.mood], B = (window.MiniSite && MiniSite.BUSINESSES[st.business]) || { name: 'Your business', h1: 'Your headline here', sub: 'A short line about what you do.', cta: 'Get in touch', ctaShort: 'Contact', services: [['Service', 'What it is'], ['Service', 'What it is'], ['Service', 'What it is']], foot: 'Your business' };
      var name = st.name || B.name, photo = window.MiniSite && MiniSite.photos && MiniSite.photos[st.business];
      var P = page.clientWidth || 400, PH = P / PAPER, serif = m.display.indexOf('Cormorant') >= 0;
      var heroWords = B.h1.split(' '), textWords = (B.sub + ' ' + (B.strip || '') + ' ' + B.services.map(function (x) { return x[1]; }).join(' ')).split(/\s+/).filter(Boolean);
      var hc = { i: 0 }, tc = { i: 0 }, pools = [B.sub, B.strip || B.sub, B.services.map(function (x) { return x[1]; }).join(' ')].map(function (t) { return t.split(/\s+/).filter(Boolean); }), gc = {}, navI = 0, cardI = 0, imgI = 0, NAV = ['Services', 'About', 'Contact', 'Journal'], later = [], newOnes = [];
      page.innerHTML = ''; page.style.background = m.bg; page.style.color = m.text;
      // text lines are filled with whole sentences that fit, so nothing stops mid-thought
      var SENT = ((B.sub + ' ' + (B.strip || '') + ' ' + B.services.map(function (x) { return x[1]; }).join(' ')).match(/[^.!?]+[.!?]/g) || [B.sub]).map(function (t) { return t.trim(); });
      var tFs = Math.max(8.5, P * 0.021), tGroups = {}, si = 0;
      els.forEach(function (e) { if (e.kind === 'text' && !e.text) (tGroups[e.group] = tGroups[e.group] || []).push(e); });
      Object.keys(tGroups).forEach(function (g) {
        var rows = tGroups[g], caps = rows.map(function (e) { return Math.max(4, Math.floor(e.b.w * P / (tFs * 0.52))); }), total = caps.reduce(function (a, b) { return a + b; }, 0) * 0.92;
        var picked = [], k = 0;
        while (k < SENT.length) { var sn = SENT[(si + k) % SENT.length]; if (!picked.length || (picked.join(' ') + ' ' + sn).length <= total) { picked.push(sn); k++; } else break; }
        si = (si + Math.max(1, k)) % SENT.length;
        var ws = picked.join(' ').split(' ');
        if (ws.join(' ').length > total) { var keep = []; ws.some(function (w) { if ((keep.join(' ') + ' ' + w).trim().length > total) return true; keep.push(w); }); ws = keep.length ? keep : ws.slice(0, 2); ws[ws.length - 1] = ws[ws.length - 1].replace(/[,;:]$/, ''); }
        var c = { i: 0 };
        rows.forEach(function (e, ri) { e._txt = ri === rows.length - 1 ? ws.slice(c.i).join(' ') : take(ws, c, caps[ri], false); });
      });
      function em(fs) { return fs * (m.caps === 'uppercase' ? 0.66 : serif ? 0.47 : 0.55); }
      els.forEach(function (e) {
        var b = e.b, d = document.createElement('div'), x = b.x, y = b.y, w = b.w, h = b.h;
        d.className = 'dr-el dr-' + e.kind;
        var fs = 0;
        if (e.kind === 'heading') fs = Math.max(11, Math.min(46, P * (e.group === 0 ? 0.05 : 0.04)));
        else if (e.kind === 'text') fs = Math.max(8.5, P * 0.021);
        else if (e.kind === 'nav') fs = Math.max(8, P * 0.019);
        if (fs && !e.box) { var lh = fs * 1.25 / PH; y = b.y + b.h / 2 - lh / 2; h = lh; }   // a drawn line becomes one line of text; a placed box keeps its size
        d.style.left = (x * 100) + '%'; d.style.top = (y * 100) + '%'; d.style.width = (w * 100) + '%'; d.style.height = (h * 100) + '%';
        var px = w * P, ph = h * PH;
        if (e.kind === 'header') { d.style.background = m.surface; d.style.borderRadius = m.radius === '14px' ? '10px' : m.radius; }
        else if (e.kind === 'logo' || e.kind === 'avatar') {
          var side = Math.min(px, ph); d.style.width = side + 'px'; d.style.height = side + 'px';
          d.style.left = 'calc(' + (x * 100) + '% + ' + ((px - side) / 2) + 'px)'; d.style.top = 'calc(' + (y * 100) + '% + ' + ((ph - side) / 2) + 'px)';
          d.style.borderRadius = '50%'; d.style.background = m.accent;
          if (e.kind === 'avatar' && photo) { d.className += ' dr-image'; d.innerHTML = '<img src="' + esc(photo) + '" alt="">'; }
          if (e.kind === 'logo') {
            var nm = document.createElement('div'); nm.className = 'dr-el dr-name'; nm.textContent = name;
            nm.style.cssText = 'left:calc(' + ((x + w) * 100) + '% + ' + Math.max(4, side * 0.3) + 'px);top:' + (y * 100) + '%;height:' + (h * 100) + '%;color:' + m.text + ';font-size:' + Math.max(8, Math.min(16, side * 0.5)) + 'px;';
            later.push([nm, e]);
          }
        }
        else if (e.kind === 'nav') { var lab = e.text || NAV[navI++ % NAV.length]; d.textContent = lab; d.style.color = m.muted; d.style.fontSize = Math.min(fs, px / Math.max(1, em(1) * lab.length * 1.05)) + 'px'; }
        else if (e.kind === 'button') {
          var bfs = Math.max(7.5, Math.min(P * 0.021, ph * 0.42));
          d.textContent = e.text || (B.cta.length * bfs * 0.56 < px * 0.86 ? B.cta : B.ctaShort);
          if (d.textContent.length * bfs * 0.56 > px * 0.9) bfs = Math.max(6.5, px * 0.9 / (d.textContent.length * 0.56));
          d.style.background = m.btn; d.style.color = m.btnText; d.style.borderRadius = m.radius === '14px' ? '999px' : m.radius; d.style.fontSize = bfs + 'px';
        }
        else if (e.kind === 'image') {
          d.style.borderRadius = m.radius === '14px' ? '10px' : m.radius; d.style.background = m.surface;
          if (photo) d.innerHTML = '<img src="' + esc(photo) + '" alt="" style="object-position:' + ['50% 50%', '25% 40%', '75% 60%'][imgI++ % 3] + '">';
        }
        else if (e.kind === 'card') {
          d.style.background = m.surface; d.style.borderRadius = m.radius === '14px' ? '10px' : m.radius;
          var sv = B.services[cardI++ % B.services.length]; if (e.text) sv = [e.text, sv[1]]; var cfs = Math.max(7, Math.min(P * 0.018, ph / 6.5, px / 13));
          d.style.fontSize = cfs + 'px';
          if (px < 125) { d.innerHTML = '<b style="font-size:' + (serif ? '1.45em' : '1.1em') + ';font-family:' + m.display + ';font-weight:' + m.weight + ';text-transform:' + m.caps + (m.italic ? ';font-style:italic' : '') + '">' + esc(sv[0]) + '</b>'; d.style.fontSize = Math.max(7.5, Math.min(P * 0.022, px / 8)) + 'px'; }   // too narrow for a description
          else d.innerHTML = '<b style="font-size:' + (serif ? '1.5em' : '1.15em') + ';font-family:' + m.display + ';font-weight:' + m.weight + ';text-transform:' + m.caps + (m.italic ? ';font-style:italic' : '') + '">' + esc(sv[0]) + '</b><span style="color:' + m.muted + '">' + esc(sv[1]) + '</span>';
        }
        else if (e.kind === 'heading' && e.box) {          // a heading block the visitor placed (and maybe typed into)
          var htxt = e.text || B.h1, hf = Math.max(11, Math.min(P * 0.055, ph * 0.5));
          while (hf > 9 && Math.ceil(htxt.length * em(hf) / Math.max(1, px)) * hf * 1.15 > ph) hf *= 0.92;
          d.textContent = htxt; d.style.fontSize = hf + 'px'; d.style.whiteSpace = 'normal'; d.style.alignItems = 'flex-start'; d.style.lineHeight = '1.12';
          d.style.fontFamily = m.display; d.style.fontWeight = m.weight; d.style.textTransform = m.caps; if (m.italic) d.style.fontStyle = 'italic';
        }
        else if (e.kind === 'heading') {
          var chars = Math.max(5, Math.floor(px / em(fs))), txt;
          if (e.text) txt = e.text;
          else if (e.group === 0) {
            if (e.lastHead) { txt = heroWords.slice(hc.i).join(' '); hc.i = heroWords.length; }   // the last headline line takes the rest of the sentence
            else txt = take(heroWords, hc, chars, false);
          } else if (e.row === 0) txt = TITLES[(e.group - 1) % TITLES.length];
          if (!txt) txt = take(textWords, tc, chars, true);
          if (txt.length > chars) {                      // too long for the line: shrink a little, or end at a word that fits
            var fitFs = px / (txt.length * em(1));
            if (fitFs >= fs * 0.72) fs = fitFs;
            else { fs = Math.max(9, fs * 0.8); var room = Math.floor(px / em(fs)), cut = []; txt.split(' ').some(function (wd) { if ((cut.join(' ') + ' ' + wd).trim().length > room) return true; cut.push(wd); }); txt = (cut.join(' ') || txt.slice(0, room)).replace(/[,;:.]$/, ''); }
          }
          d.textContent = txt; d.setAttribute('data-g', e.group); d.style.fontSize = fs + 'px'; d.style.fontFamily = m.display; d.style.fontWeight = m.weight; d.style.textTransform = m.caps; if (m.italic) d.style.fontStyle = 'italic';
        }
        else if (e.kind === 'text' && e.text) { d.textContent = e.text; d.style.color = m.muted; d.style.fontSize = fs + 'px'; }
        else if (e.kind === 'text' && e._txt != null) { var tf = Math.min(fs, Math.max(6.5, px / Math.max(1, e._txt.length * 0.52))); d.textContent = e._txt; d.style.color = m.muted; d.style.fontSize = tf + 'px'; }
        else if (e.kind === 'text') { var pool = pools[(e.group || 0) % pools.length], pc = gc[e.group] = gc[e.group] || { i: 0 }; var tt = take(pool, pc, Math.max(4, Math.floor(px / (fs * 0.52))), !e.lastRow && pc.i < pool.length ? false : pc.i === 0);
          if (!tt) { pc.i = 0; tt = take(pool, pc, Math.max(4, Math.floor(px / (fs * 0.52))), false); }
          if (e.lastRow && pc.i < pool.length && tt.indexOf(' ') > 0) tt = tt.replace(/\s+\S+$/, '').replace(/[,;:.]$/, '') + '…';   // a sentence that doesn't fit ends neatly
          d.textContent = tt; d.style.color = m.muted; d.style.fontSize = fs + 'px'; }
        else if (e.kind === 'para' && e.text) {             // text the visitor typed into a text block
          var tfs = Math.max(8, P * 0.02);
          while (tfs > 6.5 && Math.ceil(e.text.length * tfs * 0.52 / Math.max(1, px)) * tfs * 1.5 > ph) tfs *= 0.92;
          d.textContent = e.text; d.style.color = m.muted; d.style.fontSize = tfs + 'px'; clamp(d, tfs, ph);
        }
        else if (e.kind === 'para') {
          var pfs = Math.max(8, P * 0.019), n = Math.floor(px / (pfs * 0.52)) * Math.max(1, Math.floor(ph / (pfs * 1.5)));
          d.textContent = take(textWords, tc, n, true); d.style.color = m.muted; d.style.fontSize = pfs + 'px'; clamp(d, pfs, ph);
        }
        else if (e.kind === 'map') {
          d.style.background = m.surface; d.style.borderRadius = m.radius === '14px' ? '10px' : m.radius;
          d.innerHTML = '<svg viewBox="0 0 100 60" preserveAspectRatio="none" style="width:100%;height:100%" aria-hidden="true"><path d="M0 40 C30 34 40 52 100 30 M22 0 L34 60 M64 0 C60 24 72 40 66 60 M0 14 L100 20" fill="none" stroke="' + m.muted + '" stroke-opacity=".45" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg><span style="position:absolute;left:50%;top:46%;width:14px;height:14px;margin:-14px 0 0 -7px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:' + m.btn + '"></span>';
        }
        else if (e.kind === 'form') {
          var ffs = Math.max(7, Math.min(P * 0.019, ph / 9)); d.style.fontSize = ffs + 'px'; d.style.flexDirection = 'column'; d.style.alignItems = 'stretch'; d.style.justifyContent = 'center'; d.style.gap = '6%';
          d.innerHTML = ['Name', 'Email', 'Message'].map(function (f) { return '<span style="border:1px solid ' + m.muted + ';border-radius:6px;padding:.5em .7em;color:' + m.muted + ';opacity:.8">' + f + '</span>'; }).join('') + '<span style="align-self:flex-start;background:' + m.btn + ';color:' + m.btnText + ';border-radius:999px;padding:.5em 1.2em">Send</span>';
        }
        else if (e.kind === 'gallery') {
          d.style.display = 'grid'; d.style.gridTemplateColumns = 'repeat(3, 1fr)'; d.style.gap = '4%';
          d.innerHTML = [0, 1, 2, 3, 4, 5].slice(0, ph > px * 0.5 ? 6 : 3).map(function (k) { return '<span style="border-radius:6px;overflow:hidden;background:' + m.surface + '">' + (photo ? '<img src="' + esc(photo) + '" alt="" style="width:100%;height:100%;object-fit:cover;object-position:' + (15 + k * 15) + '% ' + (30 + (k % 3) * 20) + '%">' : '') + '</span>'; }).join('');
        }
        else if (e.kind === 'video') {
          d.style.borderRadius = m.radius === '14px' ? '10px' : m.radius; d.style.background = m.text; d.style.justifyContent = 'center';
          d.innerHTML = (photo ? '<img src="' + esc(photo) + '" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.7">' : '') + '<span style="position:relative;width:18%;aspect-ratio:1;border-radius:50%;background:rgba(255,255,255,.88);display:grid;place-items:center"><span style="margin-left:12%;border-left:.9em solid ' + m.text + ';border-top:.55em solid transparent;border-bottom:.55em solid transparent"></span></span>';
        }
        else if (e.kind === 'reviews') {                 // a placeholder only: real reviews are never made up
          var rfs = Math.max(7.5, Math.min(P * 0.02, ph / 3.5)); d.style.fontSize = rfs + 'px'; d.style.flexDirection = 'column'; d.style.justifyContent = 'center'; d.style.gap = '.3em'; d.style.background = m.surface; d.style.borderRadius = m.radius === '14px' ? '10px' : m.radius;
          d.innerHTML = '<span style="color:' + m.accent + ';letter-spacing:.15em;font-size:1.3em">★★★★★</span><span style="color:' + m.muted + '">Your real reviews go here</span>';
        }
        if (fresh && seen.get(e.src.pts) !== e.kind) { d.classList.add('dr-new'); newOnes.push(d); }
        page.appendChild(d);
      });
      later.forEach(function (p) { if (fresh && seen.get(p[1].src.pts) !== p[1].kind) p[0].classList.add('dr-new'); page.appendChild(p[0]); });
      var heads0 = [].slice.call(page.querySelectorAll('.dr-heading[data-g="0"]'));   // the headline lines share one size
      if (heads0.length > 1) { var hm = Math.min.apply(null, heads0.map(function (n) { return parseFloat(n.style.fontSize); })); heads0.forEach(function (n) { n.style.fontSize = hm + 'px'; }); }
      var navs = [].slice.call(page.querySelectorAll('.dr-nav'));            // menu links share one size, like a real menu
      if (navs.length) { var mn = Math.min.apply(null, navs.map(function (n) { return parseFloat(n.style.fontSize); })); navs.forEach(function (n) { n.style.fontSize = mn + 'px'; }); }
      foot.hidden = !els.length; foot.style.background = m.surface; foot.style.color = m.muted;
      foot.innerHTML = '<span>' + esc(B.foot || name) + '</span><span>© ' + new Date().getFullYear() + ' · Privacy · Contact</span>';
      seen = new Map(); els.forEach(function (e) { seen.set(e.src.pts, e.kind); });
      return newOnes;
    }

    function announce() {
      if (!built || !built.elements.length) return;
      var st = style(), m = MOODS[st.mood];
      built.summary = 'Hand-drawn homepage with ' + built.description + ' (' + st.mood + ' mood' + (built.how === 'ai' ? ', built by Claude' : '') + ')';
      built.colours = [m.bg, m.btn, m.accent];
      document.dispatchEvent(new CustomEvent('toff:drawn', { detail: { summary: built.summary, colours: built.colours, elements: built.elements, mood: st.mood, business: st.business } }));
    }
    function fromAi(r) {                                 // only accept a well-formed answer; anything odd means the quick version is used
      var list = r && r.elements; if (!Array.isArray(list) || list.length > 80) return null;
      if (!list.length) return [];                       // a clear answer that the pen marks hold nothing more
      var out = [];
      for (var i = 0; i < list.length; i++) {
        var e = list[i] || {}, nums = [e.x, e.y, e.w, e.h];
        if (AI_KINDS.indexOf(e.kind) < 0 || nums.some(function (n) { return typeof n !== 'number' || !isFinite(n) || n < -0.02 || n > 1.02; }) || e.w <= 0 || e.h <= 0) continue;
        var b = { x: Math.max(0, e.x), y: Math.max(0, e.y), w: Math.min(e.w, 1 - Math.max(0, e.x)), h: Math.min(e.h, 1 - Math.max(0, e.y)) };
        out.push({ kind: e.kind, b: b, text: typeof e.text === 'string' ? e.text.replace(/\s+/g, ' ').trim().slice(0, 80) : '', src: { pts: 'ai:' + e.kind + ':' + b.x.toFixed(2) + ':' + b.y.toFixed(2) } });
      }
      if (!out.length) return null;                      // everything it sent was malformed
      out.sort(function (a, b) { return Math.abs(a.b.y - b.b.y) < 0.02 ? a.b.x - b.b.x : a.b.y - b.b.y; });
      var g = -1, prev = null;                           // group headings and text lines the same way the rules do
      out.forEach(function (e) {
        if (e.kind !== 'heading' && e.kind !== 'text') return;
        var near = prev && e.b.y - prev.b.y < 0.06 && Math.abs(e.b.x - prev.b.x) < 0.12;
        if (!near || (e.kind === 'heading' && prev.kind === 'text')) g++;
        e.group = g; e.row = near && prev.group === g ? prev.row + 1 : 0; prev = e;
      });
      out.forEach(function (e) {
        if (e.group == null) return;
        var rest = out.filter(function (x) { return x.group === e.group; });
        e.lastRow = rest[rest.length - 1] === e; var hs = rest.filter(function (x) { return x.kind === 'heading'; }); e.lastHead = hs[hs.length - 1] === e;
      });
      return out;
    }
    function placeFold() {                               // how much of the page a visitor sees before scrolling
      if (!fold) return;
      if (!page || !scroller) { fold.hidden = true; return; }
      var P = page.clientWidth || 1, frac = scroller.clientHeight / (P / PAPER);
      fold.style.top = (Math.max(0.15, Math.min(0.98, frac)) * 100) + '%'; fold.hidden = frac >= 0.98;
    }
    function cue() { if (!more || !scroller) return; more.hidden = !(built && built.elements.length && scroller.scrollHeight > scroller.clientHeight + 10 && scroller.scrollTop < 24); }
    if (scroller) scroller.addEventListener('scroll', cue, { passive: true });
    function buttons() {
      var any = !!(blocks.length || strokes.length);
      btnDone.disabled = !any || building || playing; btnUndo.disabled = !history.length || playing || building; btnClear.disabled = !any || playing || building; btnExample.disabled = playing || building;
      [].slice.call(palette.querySelectorAll('button')).forEach(function (b) { b.disabled = playing; });
    }

    function undo() {
      if (playing || building || !history.length) return;
      var h = history.pop();
      if (h.type === 'stroke') { strokes = strokes.filter(function (s) { return s !== h.ref; }); redraw(); changed(); }
      else if (h.type === 'remove') { layer.appendChild(h.ref.el); blocks.push(h.ref); place(h.ref); changed(); }      // put a removed block back
      else removeBlock(h.ref, false);
    }
    function clear() {
      if (playing || building) return;
      blocks.forEach(function (b) { b.el.remove(); }); blocks = []; strokes = []; history = []; redraw(); if (scroller) scroller.scrollTop = 0; changed();
    }

    function example() {
      if (playing || building) return Promise.resolve(null);
      clear();
      var seed = 3; function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 - 0.5; }
      var queue = EXAMPLE_STROKES.map(function (s) {      // a little hand wobble, and enough points to draw smoothly
        var out = []; for (var i = 1; i < s.length; i++) { var a = s[i - 1], b = s[i], n = Math.max(2, Math.round(dist(a, b) / 0.012)); for (var k = 0; k < n; k++) { var t = k / n; out.push([a[0] + (b[0] - a[0]) * t + rnd() * 0.003, a[1] + (b[1] - a[1]) * t + rnd() * 0.003]); } }
        out.push(s[s.length - 1]); return out;
      });
      function addExampleBlock(spec) { addBlock(spec[0], { x: spec[1], y: spec[2], w: spec[3], h: spec[4] }, '', { quiet: true }); }
      if (reduce) {
        EXAMPLE_BLOCKS.forEach(addExampleBlock); queue.forEach(function (s) { strokes.push(s); history.push({ type: 'stroke', ref: s }); }); redraw(); changed();
        return done();
      }
      playing = true; buttons();
      return new Promise(function (resolve) {
        var bi = 0, si = 0, pi = 0, last = 0;
        function frame(now) {
          if (!playing) return resolve(null);
          if (bi < EXAMPLE_BLOCKS.length) { if (now - last > 230) { addExampleBlock(EXAMPLE_BLOCKS[bi++]); changed(); last = now; } return requestAnimationFrame(frame); }
          if (si < queue.length) {
            var s = queue[si]; if (!current) current = [];
            for (var k = 0; k < 4 && pi < s.length; k++) current.push(s[pi++]);
            redraw();
            if (pi >= s.length) { strokes.push(current); history.push({ type: 'stroke', ref: current }); current = null; si++; pi = 0; changed(); }
            return requestAnimationFrame(frame);
          }
          playing = false; buttons(); done().then(resolve);
        }
        requestAnimationFrame(frame);
      });
    }

    btnDone.addEventListener('click', function () { done(); });
    btnExample.addEventListener('click', function () { example(); });
    btnUndo.addEventListener('click', undo);
    btnClear.addEventListener('click', clear);
    root.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z') && !/INPUT|TEXTAREA/.test(e.target.tagName) && !e.target.isContentEditable) { e.preventDefault(); undo(); } });
    if (!toKit) document.addEventListener('toff:design', function () { if (built && !building) render(built._els, false); });   // new playground colours
    var rq = 0;
    function relayout() { cancelAnimationFrame(rq); rq = requestAnimationFrame(function () { sizePaper(); placeFold(); blocks.forEach(place); if (built && !toKit) render(built._els, false); }); }
    if ('ResizeObserver' in window) { var ro = new ResizeObserver(relayout); ro.observe(paper); if (screen) ro.observe(screen); } else window.addEventListener('resize', relayout);
    sizePaper(); placeFold(); buttons();
    return {
      done: done, example: example, undo: undo, clear: clear, build: done, playing: function () { return playing; }, building: function () { return building; }, stale: function () { return stale; },
      result: function () { return built && built.elements.length ? { elements: built.elements, description: built.description, summary: built.summary, colours: built.colours, how: built.how } : null; },
      strokes: function () { return strokes; }, blocks: function () { return blocks.map(function (b) { return { kind: b.kind, x: b.x, y: b.y, w: b.w, h: b.h, text: b.text }; }); },
      addBlock: function (kind, b, text) { var bk = addBlock(kind, b, text); if (bk && text) { var t = bk.el.querySelector('.dr-b-text'); if (t) { t.textContent = text; t.classList.remove('dr-b-empty'); } } return !!bk; },
      setAI: function (fn) { aiFn = fn || null; syncAiBits(); }, _classify: classify, _interpret: interpret
    };
  }

  window.DrawSite = { mount: mount, classify: classify, interpret: interpret, describe: describe, endpoint: endpointRecogniser, BLOCKS: BLOCKS };
})();
