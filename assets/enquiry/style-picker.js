/*
 * Style picker for the guided enquiry: "How should it look?"
 *   Like Bluebird · Like Everest · Plan it yourself
 * Each choice has a small ink-line icon that draws itself once when the step comes into view
 * (never replays; reduced motion shows them finished). "Plan it yourself" opens an optional
 * text box. Behaves as a proper radio group: Tab to reach it, arrow keys to move, Space/Enter to pick.
 *
 * Usage:
 *   <template id="style-picker">…</template>   (from style-picker.html, pasted once)
 *   var picker = StylePicker.mount(document.getElementById('step-style'), {
 *     links: { bluebird: 'https://…', everest: '' },      // empty: no "View site" link is shown
 *     onChange: function (v) { … }                         // v = { style: 'bluebird'|'everest'|'own'|'design'|null, notes: '', design: {…}|null }
 *   });
 *   picker.value()  -> { style, notes, design }   picker.set('everest')   picker.focus()   picker.destroy()
 *   picker.setDesign(d)  adds (or updates) a fourth choice, "Your design", from the playground and selects it.
 *   It also listens for the document event 'toff:design' (sent by the playground) unless listenForDesigns is false.
 */
(function () {
  'use strict';
  function clamp(x) { return Math.max(0, Math.min(1, x)); }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function mount(container, options) {
    var o = options || {}, links = o.links || {};
    var drawSeconds = o.drawSeconds == null ? 1.1 : o.drawSeconds;   // how long the three icons take to draw
    var tpl = document.getElementById('style-picker');
    var root = tpl.content.firstElementChild.cloneNode(true);
    container.appendChild(root);

    var cards = [].slice.call(root.querySelectorAll('.sp-card'));
    var own = root.querySelector('.sp-own'), text = root.querySelector('.sp-own-text');
    var state = { style: null, notes: '' }, raf = 0, io = null, drawn = false;

    // "View site" links only when an address is set
    [].slice.call(root.querySelectorAll('.sp-view')).forEach(function (a) {
      var href = links[a.getAttribute('data-link')];
      if (href) { a.href = href; a.hidden = false; } else { a.remove(); }
    });

    // unique id for the text box if the picker is used more than once
    var uid = 'sp-own-text-' + Math.random().toString(36).slice(2, 8);
    text.id = uid; root.querySelector('.sp-own-label').setAttribute('for', uid);

    var design = null;
    function current() { return { style: state.style, notes: state.style === 'own' ? state.notes.trim() : '', design: state.style === 'design' ? design : null }; }   // notes only count for "Plan it yourself"
    function emit() { if (o.onChange) o.onChange(current()); }
    function select(value, focus) {
      state.style = value;
      cards.forEach(function (c) {
        var on = c.getAttribute('data-value') === value;
        c.setAttribute('aria-checked', on ? 'true' : 'false');
        c.tabIndex = on || (!value && c === cards[0]) ? 0 : -1;
        if (on && focus) c.focus();
      });
      own.hidden = value !== 'own';
      emit();
    }
    function bind(c) {
      c.addEventListener('click', function () { select(c.getAttribute('data-value'), false); });
      c.addEventListener('keydown', function (e) {
        var i = cards.indexOf(c), k = e.key, n = cards.length, j = -1;
        if (k === 'ArrowRight' || k === 'ArrowDown') j = (i + 1) % n;
        else if (k === 'ArrowLeft' || k === 'ArrowUp') j = (i - 1 + n) % n;
        else if (k === 'Home') j = 0; else if (k === 'End') j = n - 1;
        if (j >= 0) { e.preventDefault(); select(cards[j].getAttribute('data-value'), true); }
      });
    }
    cards.forEach(function (c, i) { c.tabIndex = i === 0 ? 0 : -1; bind(c); });

    // "Your design": a fourth choice that appears when the visitor sends a design from the playground
    function esc(t) { return String(t).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); }
    function setDesign(d) {
      if (!d) return;
      design = { business: d.business, mood: d.mood, layout: d.layout, name: d.name || '', summary: d.summary || '', colours: (d.colours || []).slice(0, 3) };
      var opt = root.querySelector('.sp-option-design');
      if (!opt) {
        opt = document.createElement('div'); opt.className = 'sp-option sp-option-design';
        opt.innerHTML = '<button type="button" class="sp-card" role="radio" aria-checked="false" data-value="design">' +
          '<svg class="sp-icon sp-icon-static" viewBox="0 0 120 120" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<path d="M24 30 H96 Q100 30 100 34 V78 H20 V34 Q20 30 24 30 Z"/><path d="M10 86 H110 L104 92 H16 Z"/>' +
            '<g class="sp-design-dots" stroke="none"></g></svg>' +
          '<span class="sp-name">Your design</span><span class="sp-desc"></span></button>' +
          '<a class="sp-view sp-edit" href="#playground">Edit in the playground</a>';
        root.querySelector('.sp-options').appendChild(opt);
        var card = opt.querySelector('.sp-card'); card.tabIndex = -1; cards.push(card); bind(card);
      }
      var dots = opt.querySelector('.sp-design-dots');
      dots.innerHTML = design.colours.map(function (c, i) { return '<circle cx="' + (44 + i * 16) + '" cy="54" r="6" fill="' + esc(c) + '"/>'; }).join('');
      var desc = design.summary || (design.business + ', ' + design.mood + ', ' + design.layout);
      opt.querySelector('.sp-desc').textContent = desc.replace(/^[^(]*\(/, '').replace(/\)/, '');
      opt.querySelector('.sp-card').setAttribute('aria-label', 'Your design from the playground: ' + desc);
      select('design', false);
    }
    function onDesign(e) { setDesign(e.detail); }
    if (o.listenForDesigns !== false) document.addEventListener('toff:design', onDesign);

    text.addEventListener('input', function () { state.notes = text.value; emit(); });

    // draw the icons once (each stroke in pen order, the three icons slightly overlapping)
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var icons = cards.map(function (c) { return [].slice.call(c.querySelectorAll('.sp-icon path')); });
    function finish() { drawn = true; root.classList.add('sp-drawn'); icons.forEach(function (ps) { ps.forEach(function (p) { p.style.visibility = ''; p.style.strokeDashoffset = ''; }); }); }
    function draw() {
      if (drawn) return; drawn = true;
      if (reduce) { finish(); return; }
      var t0 = null, per = drawSeconds / (1 + 2 * 0.65);           // each icon's share; the next icon starts 65% of the way through the previous one
      function frame(now) {
        if (t0 == null) t0 = now;
        var t = (now - t0) / 1000, all = true;
        icons.forEach(function (ps, k) {
          var f = clamp((t - k * per * 0.65) / per);
          var n = ps.length;
          ps.forEach(function (p, i) {
            var a = i / n * 0.8, b = a + 1.4 / n, g = ease(clamp((f - a) / (b - a)));
            if (g <= 0) { p.style.visibility = 'hidden'; all = false; return; }
            p.style.visibility = 'visible';
            p.style.strokeDashoffset = String(1 - g);
            if (g < 1) all = false;
          });
        });
        if (all) { finish(); raf = 0; return; }
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
    }
    if ('IntersectionObserver' in window && !reduce) {
      io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); io = null; draw(); } }); }, { threshold: 0.35 });
      io.observe(root);
    } else draw();
    // safety: if it is shown but hidden from the observer (e.g. inside a step that becomes visible later), draw on first focus or click
    root.addEventListener('focusin', draw); root.addEventListener('pointerdown', draw);

    return {
      value: current,
      setDesign: setDesign,
      set: function (v) { select(v, false); },
      focus: function () { (cards.filter(function (c) { return c.tabIndex === 0; })[0] || cards[0]).focus(); },
      play: draw,
      destroy: function () { if (raf) cancelAnimationFrame(raf); if (io) io.disconnect(); document.removeEventListener('toff:design', onDesign); root.remove(); }
    };
  }

  window.StylePicker = { mount: mount };
})();
