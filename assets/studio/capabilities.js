/*
 * What we build: five small working demos.
 *   Capabilities.mount(document.getElementById('what-we-build'));
 * Needs minisite.js, devices.js and craft.js.
 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  /* ---------- 1. Drag to resize ---------- */
  function resize(tile) {
    var frame = tile.querySelector('.cap-resize-frame'), stage = tile.querySelector('.cap-resize-stage');
    var handle = tile.querySelector('.cap-resize-handle'), site = tile.querySelector('.cap-resize-site');
    var dev = tile.querySelector('.cap-resize-device'), px = tile.querySelector('.cap-resize-px');
    MiniSite.render(site, { business: 'clinic', mood: 'calm', layout: 'split' });
    // The site has a virtual width from 300 px (phone) to 1100 px (laptop), shown scaled to fit the tile,
    // so even on a phone you can drag from the laptop layout down to the phone layout.
    var sizes = [].slice.call(tile.querySelectorAll('.cap-sizes button'));
    var MIN = 300, MAX = 1100, w = MAX, s = 1, hinted = false, full = true, touched = false;
    function label(v) { return v < 560 ? 'Phone' : v < 820 ? 'Tablet' : 'Laptop'; }
    function layout() {
      s = Math.min(1, stage.clientWidth / MAX);
      site.style.width = w + 'px'; site.style.height = (stage.clientHeight / s) + 'px';
      site.style.transform = 'scale(' + s + ')';
      frame.style.width = (w * s) + 'px';
    }
    function set(v, user) {
      w = Math.round(Math.max(MIN, Math.min(MAX, v)));
      layout();
      handle.setAttribute('aria-valuemin', String(MIN)); handle.setAttribute('aria-valuemax', String(MAX));
      handle.setAttribute('aria-valuenow', String(w));
      handle.setAttribute('aria-valuetext', w + ' pixels wide, ' + label(w).toLowerCase() + ' layout');
      dev.textContent = label(w).toLowerCase(); px.textContent = w + ' px';
      sizes.forEach(function (b) { b.setAttribute('aria-pressed', label(+b.getAttribute('data-size')) === label(w) ? 'true' : 'false'); });
      if (user) { hinted = true; touched = true; }
    }
    set(MAX);
    if ('ResizeObserver' in window) new ResizeObserver(function () { layout(); }).observe(stage);
    else window.addEventListener('resize', layout);
    var dragging = false, startX = 0, startW = 0;
    handle.addEventListener('pointerdown', function (e) { dragging = true; full = false; startX = e.clientX; startW = w; handle.setPointerCapture(e.pointerId); frame.classList.add('cap-dragging'); e.preventDefault(); });
    handle.addEventListener('pointermove', function (e) { if (dragging) set(startW + (e.clientX - startX) / s, true); });
    function end() { if (dragging) { dragging = false; frame.classList.remove('cap-dragging'); full = w >= MAX; } }
    handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', end);
    handle.addEventListener('keydown', function (e) {
      var k = e.key, step = e.shiftKey ? 100 : 25, v = null;
      if (k === 'ArrowLeft' || k === 'ArrowDown') v = w - step; else if (k === 'ArrowRight' || k === 'ArrowUp') v = w + step;
      else if (k === 'PageDown') v = w - 150; else if (k === 'PageUp') v = w + 150; else if (k === 'Home') v = MIN; else if (k === 'End') v = MAX;
      if (v != null) { e.preventDefault(); full = false; set(v, true); full = w >= MAX; }
    });
    // one gentle hint the first time it's seen: the handle slides in towards a phone width and back
    if (!reduce && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting || hinted) return;
        io.disconnect(); hinted = true;
        var from = MAX, to = 420, t0 = null;
        frame.classList.add('cap-hinting');
        function f(now) {
          if (t0 == null) t0 = now;
          var t = Math.min(1, (now - t0) / 2600), k = t < 0.5 ? t * 2 : (1 - t) * 2;
          k = k * k * (3 - 2 * k);
          if (touched) { frame.classList.remove('cap-hinting'); return; }   // the visitor took over: stop for good
          set(from + (to - from) * k);
          if (t < 1) requestAnimationFrame(f); else frame.classList.remove('cap-hinting');
        }
        setTimeout(function () { requestAnimationFrame(f); }, 500);
      }, { threshold: 0.6 });
      io.observe(stage);
    }
    sizes.forEach(function (b) {                       // tap a size: the handle glides there (easier than dragging on a phone)
      b.addEventListener('click', function () {
        var target = +b.getAttribute('data-size'), from = w, t0 = null; touched = true; hinted = true; full = false;
        if (reduce) { set(target, true); full = w >= MAX; return; }
        function f(now) { if (t0 == null) t0 = now; var t = Math.min(1, (now - t0) / 450), k = t * t * (3 - 2 * t); set(from + (target - from) * k, true); if (t < 1) requestAnimationFrame(f); else full = w >= MAX; }
        requestAnimationFrame(f);
      });
    });
    return { width: function () { return w; }, scale: function () { return s; }, set: function (v) { full = false; set(v, true); } };
  }

  /* ---------- 2. Booking ---------- */
  function booking(tile) {
    var days = tile.querySelector('.bk-days'), times = tile.querySelector('.bk-times'), confirm = tile.querySelector('.bk-confirm');
    var done = tile.querySelector('.bk-done'), doneText = tile.querySelector('.bk-done-text'), again = tile.querySelector('.bk-again');
    var SLOTS = ['09:00', '10:30', '12:00', '14:30', '16:00', '17:30'];
    var dayFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short' }), numFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric' });
    var longFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    var list = [], d = new Date(); d.setHours(12, 0, 0, 0);
    while (list.length < 5) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0) list.push(new Date(d)); }   // the next five days, closed on Sundays
    var picked = { day: null, time: null };
    function press(group, btn) { [].slice.call(group.querySelectorAll('button')).forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); }); }
    list.forEach(function (date, i) {
      var b = el('button', 'bk-day'); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
      b.innerHTML = '<span class="bk-dow">' + dayFmt.format(date) + '</span><span class="bk-num">' + numFmt.format(date) + '</span>';
      b.setAttribute('aria-label', longFmt.format(date));
      b.addEventListener('click', function () {
        picked.day = date; picked.time = null; press(days, b);
        times.innerHTML = '';
        SLOTS.forEach(function (s, j) {
          var taken = (i * 7 + j * 3) % 5 === 0;               // a few slots already gone, so it feels real
          var t = el('button', 'bk-time', s); t.type = 'button'; t.disabled = taken; t.setAttribute('aria-pressed', 'false');
          if (taken) t.setAttribute('aria-label', s + ', already booked');
          t.addEventListener('click', function () { picked.time = s; press(times, t); confirm.hidden = false; confirm.textContent = 'Book ' + dayFmt.format(date) + ' ' + numFmt.format(date) + ' at ' + s; });
          times.appendChild(t);
        });
        times.hidden = false; confirm.hidden = true;
      });
      days.appendChild(b);
    });
    confirm.addEventListener('click', function () {
      doneText.textContent = longFmt.format(picked.day) + ' at ' + picked.time + '. A confirmation would be on its way now.';
      days.hidden = true; times.hidden = true; confirm.hidden = true; done.hidden = false; again.focus();
    });
    again.addEventListener('click', function () {
      picked = { day: null, time: null }; press(days, null); days.hidden = false; times.hidden = true; done.hidden = true;
      var first = days.querySelector('button'); if (first) first.focus();
    });
    return { picked: function () { return picked; } };
  }

  /* ---------- 3. Chat that follows a format ---------- */
  var SCRIPT = {
    start: { say: 'Hello. What would you like help with today?', opts: [['Book an appointment', 'book'], ['Ask a question', 'ask'], ['Something else', 'other']] },
    book: { say: 'Lovely. Is this your first visit with us?', opts: [['Yes, first time', 'book2'], ['I’ve been before', 'book2']] },
    book2: { say: 'When suits you best?', opts: [['This week', 'book3'], ['Next week', 'book3'], ['I’m flexible', 'book3']] },
    book3: { say: 'Perfect. A member of the team will call you to confirm a time, so nothing is booked until you’re happy.', end: true },
    ask: { say: 'Of course. Is it about prices, aftercare, or something medical?', opts: [['Prices', 'prices'], ['Aftercare', 'after'], ['Something medical', 'med']] },
    prices: { say: 'Every service lists its full price on its own page, with no hidden fees.', end: true },
    after: { say: 'You’ll get written aftercare by email, and you can call us any time in the first week.', end: true },
    med: { say: 'That’s one for a doctor rather than me. Shall we arrange a short call?', opts: [['Yes, please', 'medyes'], ['Not right now', 'medno']] },
    medyes: { say: 'Done. A doctor will call you back, usually the same day.', end: true },
    medno: { say: 'No problem. You can ask again whenever you like.', end: true },
    other: { say: 'Tell us roughly what it’s about and we’ll pass it to the right person.', opts: [['Feedback', 'thanks'], ['Working together', 'thanks']] },
    thanks: { say: 'Thank you. Someone from the team will reply by email.', end: true }
  };
  function chat(tile) {
    var log = tile.querySelector('.ch-log'), choices = tile.querySelector('.ch-choices');
    var started = false;
    function bubble(text, who) { var b = el('p', 'ch-msg ch-' + who, text); log.appendChild(b); log.scrollTop = log.scrollHeight; return b; }
    function step(key) {
      var node = SCRIPT[key]; choices.innerHTML = '';
      var typing = el('p', 'ch-msg ch-bot ch-typing'); typing.setAttribute('aria-label', 'Typing'); typing.innerHTML = '<i></i><i></i><i></i>';
      log.appendChild(typing); log.scrollTop = log.scrollHeight;
      setTimeout(function () {
        typing.remove(); bubble(node.say, 'bot');
        if (node.end) {
          var r = el('button', 'ch-opt ch-restart', 'Start again'); r.type = 'button';
          r.addEventListener('click', function () { log.innerHTML = ''; step('start'); });
          choices.appendChild(r);
        } else node.opts.forEach(function (o) {
          var b = el('button', 'ch-opt', o[0]); b.type = 'button';
          b.addEventListener('click', function () { bubble(o[0], 'you'); step(o[1]); });
          choices.appendChild(b);
        });
      }, reduce ? 0 : 650);
    }
    function begin() { if (!started) { started = true; step('start'); } }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); begin(); } }, { threshold: 0.4 });
      io.observe(tile);
    } else begin();
    return { begin: begin };
  }

  /* ---------- 4. Speed ---------- */
  function speed(tile) {
    Craft.measure(function (m) {
      tile.querySelector('[data-stat="load"]').textContent = Craft.seconds(m.loadMs) + ' s';
      tile.querySelector('[data-stat="weight"]').textContent = m.kb + ' KB';
      tile.querySelector('[data-stat="external"]').textContent = m.external === 0 ? 'None' : String(m.external);
      tile.querySelector('[data-stat="note"]').textContent = m.external === 0
        ? 'No tracking and nothing loaded from other websites.'
        : m.external + ' file' + (m.external === 1 ? ' was' : 's were') + ' loaded from other websites.';
      tile.setAttribute('data-measured', '1');
    });
  }

  /* ---------- 5. Colours ---------- */
  function colours(tile) {
    var c = tile.querySelector('.dv-content'), screen = tile.querySelector('.dv-screen'), sw = tile.querySelector('.cap-swatches');
    var site = MiniSite.render(c, { business: 'cafe', mood: 'calm', layout: 'story' });
    Devices.fit(screen, c, 390);
    var MOODS = [['calm', 'Calm', ['#EEF1EC', '#2F4A3E', '#8FAF96']], ['bold', 'Bold', ['#121212', '#FF5A36', '#FAFAF7']], ['classic', 'Classic', ['#F6EFE6', '#5A1E2C', '#B08D57']], ['fresh', 'Fresh', ['#FFFFFF', '#12355B', '#3FB6A8']]];
    MOODS.forEach(function (m, i) {
      var b = el('button', 'cap-swatch'); b.type = 'button'; b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      b.innerHTML = '<span class="cap-swatch-dots" aria-hidden="true">' + m[2].map(function (h) { return '<i style="background:' + h + '"></i>'; }).join('') + '</span><span class="cap-swatch-name">' + m[1] + '</span>';
      b.addEventListener('click', function () {
        site.update({ mood: m[0] });
        [].slice.call(sw.children).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      });
      sw.appendChild(b);
    });
    return site;
  }

  function mount(root) {
    var api = {};
    api.resize = resize(root.querySelector('.cap-resize'));
    api.booking = booking(root.querySelector('.cap-booking'));
    var chatTile = root.querySelector('.cap-chat'); api.chat = chatTile ? chat(chatTile) : null;   // the chat demo now lives in the AI assistants section
    var sp = root.querySelector('.cap-speed'); if (sp) speed(sp);
    api.colours = colours(root.querySelector('.cap-colours'));
    return api;
  }
  window.Capabilities = { mount: mount };
})();
