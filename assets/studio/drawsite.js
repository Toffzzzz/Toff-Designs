/*
 * Draw your site: the visitor sketches a homepage on a sheet of paper; each mark is recognised as it is drawn
 * (and labelled on the paper), and a static picture of that homepage builds up beside it in a browser window,
 * ready to scroll. It is a preview, not a working site: nothing in it is clickable.
 *
 *   var dr = DrawSite.mount(document.getElementById('draw-your-site'), {
 *     getStyle: function () { return { business: 'clinic', mood: 'calm', name: '' }; }   // e.g. from the playground
 *   });
 *   dr.example()   dr.undo()   dr.clear()   dr.result()   dr.strokes()
 *
 * What it understands: a wide box at the top = menu bar (lines inside it are menu links, a circle is the logo);
 * a box with an X = picture; a small box = button; a bigger empty box = card; lines = a heading then text;
 * a zig-zag = a paragraph; a circle elsewhere = a round photo. Marks it can't read are shown faded.
 * Fires document event 'toff:drawn' (a moment after the drawing stops changing). Needs minisite.js for words and photos.
 *
 * Optional AI second look (off unless configured): once the visitor pauses, the whole sketch is sent to a model
 * (e.g. Claude Haiku, through your own small server so the key stays secret) which can fix misread marks and read
 * written words such as MAP, GALLERY or FORM. The instant rules stay in charge until a valid answer arrives, and
 * if the AI is slow, busy or switched off, nothing changes.
 *   DrawSite.mount(el, { ai: { endpoint: 'https://your-worker.example.workers.dev/read-sketch' } })
 *   or { recognise: function (payload) { return Promise.resolve({ elements: [...] }); } }   // bring your own
 *   The answer: { elements: [{ kind, x, y, w, h, text? }] } with x/y/w/h as fractions of the page.
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

  // An example homepage (fractions of the paper), drawn by itself for visitors who'd rather watch
  function rect(x0, y0, x1, y1) { return [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]; }
  function line(x0, y, x1) { return [[x0, y], [x1, y]]; }
  function ring(cx, cy, r) { var p = []; for (var i = 0; i <= 16; i++) { var a = i / 16 * Math.PI * 2; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * PAPER]); } return p; }
  var EXAMPLE = [
    rect(.04, .025, .96, .085), ring(.09, .055, .02), line(.56, .055, .64), line(.68, .055, .76), rect(.81, .04, .93, .07),
    line(.06, .155, .48), line(.06, .2, .42), line(.06, .255, .44), line(.06, .285, .36), rect(.06, .325, .25, .37),
    rect(.54, .13, .94, .4), [[.54, .13], [.94, .4]], [[.94, .13], [.54, .4]],
    line(.3, .47, .7), rect(.04, .52, .32, .7), rect(.36, .52, .64, .7), rect(.68, .52, .96, .7),
    rect(.06, .77, .46, .94), [[.06, .77], [.46, .94]], [[.46, .77], [.06, .94]],
    line(.54, .79, .9), line(.54, .835, .92), line(.54, .865, .84), rect(.54, .895, .72, .935)
  ];

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
    var NAMES = { header: ['a menu bar', 'menu bars'], logo: ['a logo', 'logos'], nav: ['a menu link', 'menu links'], heading: ['a heading line', 'heading lines'], text: ['a line of text', 'lines of text'], para: ['a paragraph', 'paragraphs'], button: ['a button', 'buttons'], image: ['a picture', 'pictures'], card: ['a card', 'cards'], avatar: ['a round photo', 'round photos'], map: ['a map', 'maps'], form: ['a contact form', 'contact forms'], gallery: ['a photo gallery', 'photo galleries'], video: ['a video', 'videos'], reviews: ['a reviews strip', 'reviews strips'] };
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
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function mount(root, options) {
    var o = options || {};
    var paper = root.querySelector('.dr-paper'), canvas = root.querySelector('.dr-canvas'), hint = root.querySelector('.dr-hint'), fold = root.querySelector('.dr-fold');
    var screen = root.querySelector('.dr-screen'), scroller = root.querySelector('.dr-scroll'), page = root.querySelector('.dr-page'), foot = root.querySelector('.dr-foot');
    var empty = root.querySelector('.dr-empty'), more = root.querySelector('.dr-more'), status = root.querySelector('.dr-status');
    var btnExample = root.querySelector('.dr-example'), btnUndo = root.querySelector('.dr-undo'), btnClear = root.querySelector('.dr-clear');
    var ctx = canvas.getContext('2d'), strokes = [], current = null, dpr = 1, built = null, playing = false, lastShapes = [], lastUnread = [], seen = new Map(), evT = 0;
    var aiFn = o.recognise || (o.ai && o.ai.endpoint ? endpointRecogniser(o.ai) : null), aiDelay = (o.ai && o.ai.delay) || 2000, aiT = 0, ver = 0, aiEls = null, aiBusy = false;
    var keyAi = root.querySelector('.dr-key-ai'); if (keyAi) keyAi.hidden = !aiFn;

    // ---------- the paper ----------
    function sizePaper() {
      var r = paper.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(2, Math.round(r.width * dpr)); canvas.height = Math.max(2, Math.round(r.height * dpr));
      redraw();
    }
    function drawStroke(pts, colour) {
      if (pts.length < 2) return;
      var W = canvas.width, H = canvas.height;
      ctx.strokeStyle = colour; ctx.lineWidth = 2.4 * dpr; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(pts[0][0] * W, pts[0][1] * H);
      for (var i = 1; i < pts.length - 1; i++) { var mx = (pts[i][0] + pts[i + 1][0]) / 2 * W, my = (pts[i][1] + pts[i + 1][1]) / 2 * H; ctx.quadraticCurveTo(pts[i][0] * W, pts[i][1] * H, mx, my); }
      ctx.lineTo(pts[pts.length - 1][0] * W, pts[pts.length - 1][1] * H); ctx.stroke();
    }
    function tag(text, x, y, faint) {                    // a small label next to a recognised mark
      var W = canvas.width, H = canvas.height, fs = 11 * dpr;
      ctx.font = '600 ' + fs + 'px Inter, -apple-system, sans-serif'; var tw = ctx.measureText(text).width, pad = 4 * dpr;
      var px = Math.min(Math.max(2 * dpr, x * W), W - tw - pad * 2 - 2 * dpr), py = Math.min(Math.max(fs + pad, y * H), H - pad);
      ctx.fillStyle = 'rgba(243, 237, 225, .92)'; ctx.fillRect(px, py - fs - pad * 0.6, tw + pad * 2, fs + pad * 1.4);
      ctx.fillStyle = faint ? '#9B3D2A' : '#7A5520'; ctx.fillText(text, px + pad, py - pad * 0.1);
    }
    function redraw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var unreadSet = new Set(lastUnread.map(function (s) { return s.pts; }));
      strokes.forEach(function (s) { drawStroke(s, unreadSet.has(s) ? 'rgba(155, 61, 42, .38)' : 'rgba(42, 39, 34, .92)'); });
      if (current) drawStroke(current, 'rgba(42, 39, 34, .92)');
      if (built) built._els.forEach(function (e) {
        var b = e.b, lbl = LABELS[e.kind]; if (!lbl) return;
        if (e.kind === 'heading' || e.kind === 'text' || e.kind === 'nav') tag(lbl, b.x, b.y - 0.006);
        else if (e.kind === 'logo' || e.kind === 'avatar') tag(lbl, b.x + b.w + 0.01, b.y + b.h * 0.8);
        else if (e.kind === 'header') tag(lbl, b.x + b.w * 0.3, b.y + b.h * 0.72);
        else tag(lbl, b.x + 0.008, b.y + 0.03);
      });
      lastUnread.forEach(function (s) { tag('?', s.b.x, s.b.y - 0.006, true); });
    }

    // ---------- drawing ----------
    function local(e) { var r = canvas.getBoundingClientRect(); return [Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))]; }
    canvas.addEventListener('pointerdown', function (e) {
      if (playing) return;
      current = [local(e)]; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} hint.hidden = true; e.preventDefault();
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!current) return;
      var p = local(e); if (dist(p, current[current.length - 1]) > 0.003) { current.push(p); redraw(); }
    });
    function end() { if (!current) return; var s = current; current = null; if (s.length > 1) { strokes.push(s); changed(); update(true); } else redraw(); }
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

    // ---------- the picture of the page ----------
    function style() { var s = (o.getStyle && o.getStyle()) || {}; return { business: s.business || 'clinic', mood: MOODS[s.mood] ? s.mood : 'calm', name: s.name || '' }; }
    function take(arr, c, n, wrap) { var out = []; while (c.i < arr.length || wrap) { if (c.i >= arr.length) { if (!arr.length) break; c.i = 0; } var w = arr[c.i]; if (out.join(' ').length + w.length + 1 > n && out.length) break; out.push(w); c.i++; if (out.join(' ').length >= n) break; } return out.join(' '); }

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
        if (fs) { var lh = fs * 1.25 / PH; y = b.y + b.h / 2 - lh / 2; h = lh; }
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
        else if (e.kind === 'para') {
          var pfs = Math.max(8, P * 0.019), n = Math.floor(px / (pfs * 0.52)) * Math.max(1, Math.floor(ph / (pfs * 1.5)));
          d.textContent = take(textWords, tc, n, true); d.style.color = m.muted; d.style.fontSize = pfs + 'px';
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

    function update(fresh) {
      var shapes = strokes.map(function (s) { var c = classify(s, canvas.width / Math.max(1, canvas.height) || PAPER); c.pts = s; return c; });
      var res = interpret(shapes), els = res.els, byAi = !!(aiEls && aiEls.ver === ver);
      if (byAi) { els = aiEls.els; res.unread = []; }
      lastShapes = shapes; lastUnread = res.unread; paper.classList.toggle('dr-has-strokes', strokes.length > 0);
      if (!strokes.length) { built = null; page.innerHTML = ''; page.style.background = ''; foot.hidden = true; empty.hidden = false; more.hidden = true; status.textContent = ''; seen = new Map(); redraw(); buttons(); return; }
      var newOnes = render(els, fresh);
      built = els.length ? { elements: els.map(function (e) { return { kind: e.kind, x: +e.b.x.toFixed(3), y: +e.b.y.toFixed(3), w: +e.b.w.toFixed(3), h: +e.b.h.toFixed(3) }; }), description: describe(els), _els: els } : { elements: [], description: '', _els: [] };
      empty.hidden = !!els.length;
      var msg = els.length ? 'Your homepage has <em>' + esc(built.description) + '</em>.' : 'Nothing I can turn into a page yet.';
      if (res.unread.length) msg += ' I couldn’t read ' + (res.unread.length === 1 ? 'one mark' : res.unread.length + ' marks') + ' (shown faded with a ?). The key above shows what to draw.';
      if (byAi) msg += ' <span class="dr-ai-note">Checked by AI.</span>';
      else if (aiBusy) msg += ' <span class="dr-ai-note">Taking a closer look…</span>';
      status.innerHTML = msg;
      redraw(); buttons(); placeFold(); cue();
      if (fresh && newOnes.length && !playing) showInPreview(newOnes[newOnes.length - 1]);
      if (fresh && playing && newOnes.length) showInPreview(newOnes[newOnes.length - 1]);
      clearTimeout(evT);
      if (els.length) evT = setTimeout(announce, 1200);
    }
    // ---------- the optional AI second look ----------
    function changed() { ver++; aiEls = null; clearTimeout(aiT); if (aiFn && strokes.length) aiT = setTimeout(askAI, aiDelay); }
    function sketchImage() {                             // the strokes alone, black on white, for the model to look at
      var W = 640, H = Math.round(W / PAPER), c = document.createElement('canvas'), g = c.getContext('2d'); c.width = W; c.height = H;
      g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.strokeStyle = '#000'; g.lineWidth = 3; g.lineCap = g.lineJoin = 'round';
      strokes.forEach(function (s) { g.beginPath(); s.forEach(function (p, i) { if (i) g.lineTo(p[0] * W, p[1] * H); else g.moveTo(p[0] * W, p[1] * H); }); g.stroke(); });
      return c.toDataURL('image/png');
    }
    function askAI() {
      if (!aiFn || !strokes.length || playing) { if (playing && aiFn) aiT = setTimeout(askAI, aiDelay); return; }
      var my = ver, st = style();
      var payload = { image: sketchImage(), page: { width: 4, height: 5 }, business: st.business, mood: st.mood,
        rules: built ? built.elements : [], marks: lastShapes.map(function (sh) { return { kind: sh.kind, x: +sh.b.x.toFixed(3), y: +sh.b.y.toFixed(3), w: +sh.b.w.toFixed(3), h: +sh.b.h.toFixed(3) }; }) };
      aiBusy = true; update(false);
      var p; try { p = Promise.resolve(aiFn(payload)); } catch (err) { p = Promise.reject(err); }
      p.then(function (r) {
        if (my !== ver) return;                          // the drawing changed while it was looking: ignore this answer
        var els = fromAi(r); if (els) aiEls = { ver: my, els: els };
      }).catch(function () {}).then(function () { if (my !== ver) return; aiBusy = false; update(!!aiEls); });
    }
    function fromAi(r) {                                 // only accept a well-formed answer; anything odd keeps the rules' version
      var list = r && r.elements; if (!Array.isArray(list) || !list.length || list.length > 80) return null;
      var out = [];
      for (var i = 0; i < list.length; i++) {
        var e = list[i] || {}, nums = [e.x, e.y, e.w, e.h];
        if (AI_KINDS.indexOf(e.kind) < 0 || nums.some(function (n) { return typeof n !== 'number' || !isFinite(n) || n < -0.02 || n > 1.02; }) || e.w <= 0 || e.h <= 0) continue;
        var b = { x: Math.max(0, e.x), y: Math.max(0, e.y), w: Math.min(e.w, 1 - Math.max(0, e.x)), h: Math.min(e.h, 1 - Math.max(0, e.y)) };
        out.push({ kind: e.kind, b: b, text: typeof e.text === 'string' ? e.text.replace(/\s+/g, ' ').trim().slice(0, 60) : '', src: { pts: 'ai:' + e.kind + ':' + b.x.toFixed(2) + ':' + b.y.toFixed(2) } });
      }
      if (!out.length) return null;
      out.sort(function (a, b) { return Math.abs(a.b.y - b.b.y) < 0.02 ? a.b.x - b.b.x : a.b.y - b.b.y; });
      var g = -1, prev = null;                           // group headings and text lines the same way the rules do
      out.forEach(function (e) {
        if (e.kind !== 'heading' && e.kind !== 'text') return;
        var near = prev && e.b.y - prev.b.y < 0.06 && Math.abs(e.b.x - prev.b.x) < 0.12;
        if (!near || (e.kind === 'heading' && prev.kind === 'text')) g++;
        e.group = g; e.row = near && prev.group === g ? prev.row + 1 : 0; prev = e;
      });
      out.forEach(function (e, i) {
        if (e.group == null) return;
        var rest = out.filter(function (x) { return x.group === e.group; });
        e.lastRow = rest[rest.length - 1] === e; var hs = rest.filter(function (x) { return x.kind === 'heading'; }); e.lastHead = hs[hs.length - 1] === e;
      });
      return out;
    }

    function announce() {
      if (!built || !built.elements.length) return;
      var st = style(), m = MOODS[st.mood];
      built.summary = 'Hand-drawn homepage with ' + built.description + ' (' + st.mood + ' mood)';
      built.colours = [m.bg, m.btn, m.accent];
      document.dispatchEvent(new CustomEvent('toff:drawn', { detail: { summary: built.summary, colours: built.colours, elements: built.elements, mood: st.mood, business: st.business } }));
    }
    function showInPreview(el) {                         // keep the newest part in view, so the link between paper and page is obvious
      var s = scroller.getBoundingClientRect(), r = el.getBoundingClientRect();
      if (r.top >= s.top + 8 && r.bottom <= s.bottom - 8) return;
      var target = scroller.scrollTop + (r.top - s.top) - (s.height - Math.min(r.height, s.height * 0.6)) / 2;
      scroller.scrollTo({ top: Math.max(0, target), behavior: reduce ? 'auto' : 'smooth' });
    }
    function placeFold() {                               // how much of the page a visitor sees before scrolling
      var P = page.clientWidth || 1, frac = scroller.clientHeight / (P / PAPER);
      fold.style.top = (Math.max(0.15, Math.min(0.98, frac)) * 100) + '%'; fold.hidden = frac >= 0.98;
    }
    function cue() { more.hidden = !(built && built.elements.length && scroller.scrollHeight > scroller.clientHeight + 10 && scroller.scrollTop < 24); }
    scroller.addEventListener('scroll', cue, { passive: true });
    function buttons() { btnUndo.disabled = !strokes.length || playing; btnClear.disabled = !strokes.length || playing; btnExample.disabled = playing; }

    function undo() { if (playing || !strokes.length) return; strokes.pop(); if (!strokes.length) hint.hidden = false; changed(); update(false); }
    function clear() { if (playing) return; strokes = []; hint.hidden = false; scroller.scrollTop = 0; changed(); update(false); }

    function example() {
      if (playing) return;
      strokes = []; seen = new Map(); hint.hidden = true; scroller.scrollTop = 0;
      if (reduce) { strokes = EXAMPLE.map(function (s) { return s.slice(); }); changed(); update(true); return; }
      playing = true; changed(); update(false);
      var seed = 3; function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 - 0.5; }
      var queue = EXAMPLE.map(function (s) {                 // a little hand wobble, and enough points to draw smoothly
        var out = []; for (var i = 1; i < s.length; i++) { var a = s[i - 1], b = s[i], n = Math.max(2, Math.round(dist(a, b) / 0.012)); for (var k = 0; k < n; k++) { var t = k / n; out.push([a[0] + (b[0] - a[0]) * t + rnd() * 0.003, a[1] + (b[1] - a[1]) * t + rnd() * 0.003]); } }
        out.push(s[s.length - 1]); return out;
      });
      var si = 0, pi = 0;
      function frame() {
        if (!playing) return;
        if (si >= queue.length) { current = null; playing = false; update(false); scroller.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); return; }
        var s = queue[si]; if (!current) current = [];
        for (var k = 0; k < 4 && pi < s.length; k++) current.push(s[pi++]);
        redraw();
        if (pi >= s.length) { strokes.push(current); current = null; si++; pi = 0; changed(); update(true); }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    btnExample.addEventListener('click', example);
    btnUndo.addEventListener('click', undo);
    btnClear.addEventListener('click', clear);
    root.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z') && !/INPUT|TEXTAREA/.test(e.target.tagName)) { e.preventDefault(); undo(); } });
    document.addEventListener('toff:design', function () { if (strokes.length && !playing) update(false); });   // new playground colours
    var rq = 0;
    function relayout() { cancelAnimationFrame(rq); rq = requestAnimationFrame(function () { sizePaper(); if (strokes.length) update(false); else placeFold(); }); }
    if ('ResizeObserver' in window) { var ro = new ResizeObserver(relayout); ro.observe(paper); ro.observe(screen); } else window.addEventListener('resize', relayout);
    sizePaper(); placeFold(); buttons();
    return { example: example, undo: undo, clear: clear, build: function () { update(false); return built; }, playing: function () { return playing; },
      result: function () { return built && built.elements.length ? { elements: built.elements, description: built.description, summary: built.summary, colours: built.colours } : null; },
      strokes: function () { return strokes; }, unread: function () { return lastUnread.length; },
      setAI: function (fn, delay) { aiFn = fn || null; if (delay) aiDelay = delay; if (keyAi) keyAi.hidden = !aiFn; }, aiBusy: function () { return aiBusy; }, _classify: classify, _interpret: interpret };
  }

  window.DrawSite = { mount: mount, classify: classify, interpret: interpret, describe: describe, endpoint: endpointRecogniser };
})();
