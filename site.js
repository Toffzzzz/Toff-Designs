/*
 * Toff Studio — puts the page together.
 *
 *  - Fills in what comes from settings.js: studio name, process timeframes,
 *    testimonials, reply time, email, footer extras (placeholders while
 *    showPlaceholders is true, hidden when it's false).
 *  - Mounts the pre-built parts (assets/): the opening page, the handwriting
 *    line with its showcase pictures, the finale's "Tell us what you need"
 *    (the same handwriting engine), and the enquiry's style picker.
 *  - The header (hides on the way down, returns on the way up), the phone
 *    menu, the gentle fade-ups, and the six-step enquiry (demo by default:
 *    it sends and stores nothing).
 *
 * The engines in assets/ look after their own motion (scroll-driven on laptops,
 * self-playing on phones, Back/bfcache/late scroll restore, reduced motion).
 * Nothing here forces the scroll position or touches history.scrollRestoration.
 */
(function () {
  'use strict';

  var S = window.TOFF_SETTINGS || {};
  var doc = document;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var showPH = S.showPlaceholders !== false;
  var site = (window.TOFF_SITE = {});

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return [].slice.call((ctx || doc).querySelectorAll(sel)); }
  function filled(v) { return typeof v === 'string' ? v.trim() !== '' : !!v; }
  function el(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function debounce(fn, ms) { var t = 0; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }
  function merge(a, b) {                       // deep merge of plain objects (b wins)
    var o = {}, k;
    for (k in a) o[k] = a[k];
    for (k in (b || {})) o[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') ? merge(a[k], b[k]) : b[k];
    return o;
  }
  // A clearly marked placeholder: a tiny gold "Placeholder" tag and wording nobody could take for real content.
  function placeholder(target, text) {
    target.classList.add('ph');
    target.textContent = '';
    target.appendChild(el('span', 'ph-tag', 'Placeholder'));
    target.appendChild(doc.createTextNode(text));
  }

  /* ================================================================ content from settings.js */
  function fillContent() {
    var studio = S.studioName || 'Toff Studio';
    $$('[data-studio-name]').forEach(function (e) { e.textContent = studio; });
    $$('[data-year]').forEach(function (e) { if (S.copyrightYear) e.textContent = S.copyrightYear; });
    var loc = $('[data-location]'); if (loc) { if (filled(S.location)) loc.textContent = S.location; else loc.hidden = true; }

    // How we work: timeframes
    var tf = (S.process && S.process.timeframes) || [];
    $$('[data-timeframe]').forEach(function (e) {
      var v = tf[+e.getAttribute('data-timeframe')];
      if (filled(v)) e.textContent = v;
      else if (showPH) placeholder(e, 'Timeframe to be added');
      else e.hidden = true;
    });

    // Kind words: real testimonials only, never invented
    var box = $('[data-quotes]'), shown = 0;
    (S.testimonials || []).forEach(function (t) {
      var fig = el('figure', 'quote reveal');
      if (filled(t.quote)) {
        var q = String(t.quote).trim().replace(/^["“”']+|["“”']+$/g, '');
        fig.appendChild(el('blockquote', 'quote-text', '“' + q + '”'));
        var by = [t.name, t.business].filter(filled).join(' · ');
        if (by) fig.appendChild(el('figcaption', 'quote-by', by));
      } else if (showPH) {
        fig.classList.add('ph');
        fig.appendChild(el('span', 'ph-tag', 'Placeholder'));
        fig.appendChild(el('p', 'quote-text', 'A short quote from ' + t.project + ' will go here.'));
        fig.appendChild(el('p', 'quote-by', 'Client name · ' + t.project));
      } else return;
      box.appendChild(fig); shown++;
    });
    var sec = $('[data-testimonials-section]'); if (sec) sec.hidden = shown === 0;

    // Enquiry: reply time
    var rt = (S.contact || {}).replyTime, rtEl = $('[data-reply-time]');
    if (filled(rt)) rtEl.textContent = String(rt).trim().replace(/\.$/, '') + '.';
    else if (showPH) placeholder(rtEl, 'reply time to be added');
    else $('[data-reply]').hidden = true;

    // Footer: email
    var em = $('[data-email]');
    if (filled(S.email)) { var a = el('a', null, S.email.trim()); a.href = 'mailto:' + S.email.trim(); em.appendChild(a); }
    else if (showPH) placeholder(em, 'Email address to be added');
    else em.hidden = true;

    // Footer: social links, legal pages, company details (only when set; never placeholders)
    function linkList(ul, items) {
      items.forEach(function (it) {
        var li = el('li'), a = el('a', null, it.label); a.href = it.url;
        if (it.external) { a.target = '_blank'; a.rel = 'noopener noreferrer'; a.appendChild(el('span', 'visually-hidden', ' (opens in a new tab)')); }
        li.appendChild(a); ul.appendChild(li);
      });
      ul.hidden = items.length === 0;
    }
    linkList($('[data-social]'), (S.social || []).filter(function (s) { return s && filled(s.url) && filled(s.label); })
      .map(function (s) { return { label: s.label, url: s.url, external: true }; }));
    var L = S.legal || {};
    linkList($('[data-legal]'), [['Privacy policy', L.privacyPolicyUrl], ['Terms', L.termsUrl], ['Cookie policy', L.cookiesUrl]]
      .filter(function (x) { return filled(x[1]); }).map(function (x) { return { label: x[0], url: x[1] }; }));
    var C = S.company || {}, parts = [];
    if (filled(C.name)) parts.push(C.name);
    if (filled(C.number)) parts.push('Company no. ' + C.number);
    if (filled(C.address)) parts.push('Registered office: ' + C.address);
    if (filled(C.vat)) parts.push('VAT no. ' + C.vat);
    var co = $('[data-company]'); co.textContent = parts.join(' · '); co.hidden = parts.length === 0;
  }

  /* ================================================================ fade-ups (once; reduced motion: shown) */
  function initReveal() {
    var els = $$('.reveal');
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      var n = 0;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var t = en.target; io.unobserve(t);
        t.style.transitionDelay = Math.min(n++, 5) * 90 + 'ms';           // parts arriving together follow one another
        t.classList.add('is-in');
        setTimeout(function () { t.style.transitionDelay = ''; }, 1400);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    els.forEach(function (e) { io.observe(e); });
    // Back with bfcache: what's on screen plays again, what's above plays as you scroll back up to it
    window.addEventListener('pageshow', function (e) {
      if (!e.persisted) return;
      els.forEach(function (x) { x.style.transition = 'none'; x.classList.remove('is-in'); });
      void doc.body.offsetHeight;
      els.forEach(function (x) { x.style.transition = ''; io.observe(x); });
    });
  }

  /* ================================================================ header */
  var header = { show: function () {} };
  function initHeader() {
    var h = $('[data-header]'); if (!h) return;
    var lastY = window.scrollY, hidden = false, ticking = false, hold = false;
    function set(hide) { if (hide !== hidden) { hidden = hide; h.classList.toggle('is-hidden', hide); } }
    function onScroll() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var y = window.scrollY, dy = y - lastY;
        if (hold) { hold = false; lastY = y; set(false); return; }            // just jumped from a header link: stay
        if (y <= h.offsetHeight || h.contains(doc.activeElement)) { set(false); lastY = y; return; }
        if (dy > 6) { set(true); lastY = y; }
        else if (dy < -6) { set(false); lastY = y; }
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    h.addEventListener('focusin', function () { set(false); });
    header = { show: function () { hold = true; set(false); }, el: h };
  }

  /* ================================================================ in-page links */
  // Jumps straight there (no smooth scroll: the line engines then draw what you land on)
  // and lands just below the header. The address bar keeps no #fragment, so a
  // reload still opens at the top.
  function jumpTo(id) {
    var t = doc.getElementById(id); if (!t) return;
    var hh = header.el ? header.el.offsetHeight : 0, y;
    if (id === 'main') y = 0;
    else if (id === 'contact') {
      var rep = $('[data-reprise] .hw-ink'), fh = $('.fin-heading');
      var top = rep ? rep.getBoundingClientRect().top : fh.getBoundingClientRect().top;
      y = top + window.scrollY - hh - 40;
    } else {
      var land = t.querySelector('[data-land]');
      y = land ? land.getBoundingClientRect().top + window.scrollY - hh - 40 : t.getBoundingClientRect().top + window.scrollY - hh;
    }
    header.show();
    window.scrollTo(0, Math.max(0, Math.round(y)));
    if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
    t.focus({ preventScroll: true });
  }
  function initJumps() {
    doc.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[data-jump]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var id = (a.getAttribute('href') || '').replace(/^#/, ''); if (!id || !doc.getElementById(id)) return;
      e.preventDefault();
      if (menu.isOpen()) menu.close(false);
      jumpTo(id);
    });
  }

  /* ================================================================ phone menu */
  var menu = { isOpen: function () { return false; }, close: function () {} };
  function initMenu() {
    var m = $('[data-menu]'), openBtn = $('[data-menu-open]'), closeBtn = $('[data-menu-close]'); if (!m || !openBtn) return;
    var open = false;
    function focusables() { return $$('a[href], button:not([disabled])', m).filter(function (x) { return x.offsetParent !== null; }); }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(true); return; }
      if (e.key !== 'Tab') return;
      var f = focusables(), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    function show() {
      open = true; m.hidden = false; openBtn.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(function () { m.classList.add('is-open'); });
      doc.addEventListener('keydown', onKey);
      var f = focusables(); (f[1] || f[0]).focus();
    }
    function close(restoreFocus) {
      if (!open) return;
      open = false; m.classList.remove('is-open'); m.hidden = true; openBtn.setAttribute('aria-expanded', 'false');
      doc.removeEventListener('keydown', onKey);
      if (restoreFocus) openBtn.focus();
    }
    openBtn.addEventListener('click', show);
    closeBtn.addEventListener('click', function () { close(true); });
    window.addEventListener('resize', debounce(function () { if (open && window.innerWidth >= 700) close(false); }, 150));
    menu = { isOpen: function () { return open; }, close: close };
  }

  /* ================================================================ the opening, handwriting, showcase */
  var hwOpts = merge(merge((window.Handwriting && Handwriting.defaults) || {}, { basePath: 'assets/handwriting/', introOnLoad: false }), S.handwriting || {});
  hwOpts.introOnLoad = false;

  function mountEngines() {
    var op = doc.getElementById('opening');
    if (op && window.Opening) site.opening = Opening.mount(op, S.opening || {});
    if (!window.Handwriting) return;
    Handwriting.mount(doc.getElementById('hw'), hwOpts).then(function (hw) {
      site.hw = hw;
      site.showcase = Showcase.mount(doc.getElementById('showcase'), hw, { assetBase: 'assets/showcase/', links: S.links || {}, ease: (S.showcase || {}).ease });
      return mountFinale();
    });
  }

  /* ================================================================ finale: "Tell us what you need" */
  // The handwriting engine reads its line from window.HANDWRITING_DATA. The finale is a
  // second copy of the same engine, so while it loads its line (now, and again after a
  // resize that switches between the phone and laptop layouts) the data points at the
  // finale's line (assets/finale/finale-data.js) and straight back afterwards. The
  // resize listeners are registered around the engine's own, so they run in this order:
  // main line, point at finale, finale line, point back.
  function mountFinale() {
    var box = doc.getElementById('fin-line'), FD = window.FINALE_LINE_DATA;
    if (!box || !FD) return;
    var MAIN = window.HANDWRITING_DATA, wait = 150, tIn = 0, tOut = 0;   // 150ms: the engine's own resize wait
    window.addEventListener('resize', function () { clearTimeout(tIn); tIn = setTimeout(function () { window.HANDWRITING_DATA = FD; }, wait); });
    var p;
    window.HANDWRITING_DATA = FD;
    try { p = Handwriting.mount(box, merge(hwOpts, { basePath: 'assets/finale/' })); }
    finally { window.HANDWRITING_DATA = MAIN; }
    return p.then(function (fin) {
      window.addEventListener('resize', function () { clearTimeout(tOut); tOut = setTimeout(function () { window.HANDWRITING_DATA = MAIN; }, wait); });
      site.finale = fin;
      return fin;
    });
  }

  // "So... what will it be?" above it, already written: the same cursive, ink and gold under-shadow, not animated.
  function renderReprise() {
    var box = $('[data-reprise]'), R = window.FINALE_REPRISE; if (!box || !R) return;
    var o = hwOpts, layout = null;
    function draw() {
      var want = window.innerWidth < o.breakpoint ? 'mobile' : 'desktop';
      if (want !== layout) { layout = want; box.innerHTML = R[want].svg; }
      var svg = box.querySelector('svg'), s = box.getBoundingClientRect().width / svg.viewBox.baseVal.width; if (!s) return;
      var w = (want === 'mobile' ? o.strokePx.mobile : o.strokePx.desktop) / s;
      var ink = svg.querySelector('.hw-ink'), sh = svg.querySelector('.hw-shadow');
      ink.setAttribute('stroke', o.color); ink.setAttribute('stroke-width', w);
      sh.setAttribute('stroke', o.shadow.color); sh.setAttribute('stroke-width', w + o.shadow.extraWidthPx / s);
      sh.setAttribute('transform', 'translate(0,' + (o.shadow.offsetPx / s) + ')');
    }
    draw();
    window.addEventListener('resize', debounce(draw, 150));
  }

  /* ================================================================ the guided enquiry */
  var STYLE_NAMES = { bluebird: 'Bluebird’s style', everest: 'Everest’s style', own: 'Your own idea' };

  function initEnquiry() {
    var form = $('[data-enquiry]'); if (!form) return;
    var steps = $$('.eq-step', form), N = steps.length, cur = 1;
    var next = $('[data-next]', form), back = $('[data-back]', form), count = $('[data-count]', form);
    var bar = $('[data-progress]', form), err = $('[data-error]', form), thanks = $('[data-thanks]');
    var L = S.legal || {};
    var live = S.chatMode === 'live' && filled(S.formEndpoint) && filled(L.privacyPolicyUrl);
    var style = { style: null, notes: '' };

    $('[data-demo-note]').hidden = live;
    var pl = $('[data-privacy-link]', form);
    if (filled(L.privacyPolicyUrl)) { pl.href = L.privacyPolicyUrl; pl.hidden = false; }
    $('[data-consent-text]', form).textContent = 'I agree to ' + (S.studioName || 'Toff Studio') + ' using these details to reply to my enquiry.';

    var picker = site.picker = StylePicker.mount($('[data-picker]', form), {
      links: S.links || {},
      drawSeconds: (S.stylePicker || {}).drawSeconds,
      onChange: function (v) { style = v; update(); }
    });

    function choice(name) { var r = form.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ''; }
    function answered(n) {
      if (n === 1) return form.elements.business.value.trim() !== '';
      if (n === 2) return !!choice('need');
      if (n === 3) return !!style.style;
      if (n === 4) return !!choice('timing');
      if (n === 5) return !!choice('budget');
      return true;                                   // step 6 is checked when sending
    }
    function setNextLabel(text, arrow) {
      next.textContent = text + (arrow ? ' ' : '');
      if (arrow) { var s = el('span', null, '→'); s.setAttribute('aria-hidden', 'true'); next.appendChild(s); }
    }
    function update() {
      var ok = answered(cur);
      next.disabled = !ok;
      if (ok && cur < N) err.textContent = '';
    }
    function keepInView() {
      var r = form.getBoundingClientRect(), hh = header.el ? header.el.offsetHeight : 0;
      if (r.top < hh) window.scrollTo(0, Math.round(r.top + window.scrollY - hh - 24));
    }
    function show(n, focus) {
      cur = n;
      steps.forEach(function (s) { s.hidden = +s.getAttribute('data-step') !== n; });
      count.textContent = 'Step ' + n + ' of ' + N;
      bar.style.width = (n / N * 100) + '%';
      back.hidden = n === 1;
      setNextLabel(n === N ? 'Send' : 'Continue', n !== N);
      err.textContent = '';
      update();
      if (n === 3) picker.play();                   // shown by code, not by scrolling: draw the icons now (once)
      if (focus) { keepInView(); steps[n - 1].focus({ preventScroll: true }); }
    }

    form.addEventListener('input', update);
    form.addEventListener('change', update);
    back.addEventListener('click', function () { if (cur > 1) show(cur - 1, true); });

    function invalid(input, bad) { input.setAttribute('aria-invalid', bad ? 'true' : 'false'); return bad; }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (cur < N) { if (answered(cur)) show(cur + 1, true); return; }
      var f = form.elements, missing = [], first = null;
      if (invalid(f.name, f.name.value.trim() === '')) { missing.push('your name'); first = first || f.name; }
      if (invalid(f.email, !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim()))) { missing.push('an email address we can reply to'); first = first || f.email; }
      if (invalid(f.consent, !f.consent.checked)) { missing.push('a tick in the box'); first = first || f.consent; }
      if (missing.length) {
        err.textContent = 'Please add ' + missing.join(', ').replace(/, ([^,]*)$/, ' and $1') + '.';
        first.focus();
        return;
      }
      err.textContent = '';
      var answers = {
        business: f.business.value.trim(), need: choice('need'),
        style: style.style ? STYLE_NAMES[style.style] : '', styleNotes: style.style === 'own' ? style.notes : '',
        timing: choice('timing'), budget: choice('budget'),
        name: f.name.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim()
      };
      if (!live) { done(answers, false); return; }  // demo: nothing is sent or stored
      next.disabled = true; setNextLabel('Sending…', false);
      fetch(S.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(answers) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); done(answers, true); })
        .catch(function () {
          next.disabled = false; setNextLabel('Send', false);
          err.textContent = 'Sorry, that didn’t go through. Please try again in a moment' + (filled(S.email) ? ', or email ' + S.email.trim() : '') + '.';
        });
    });

    function done(a, sent) {
      var dl = $('[data-summary]'); dl.textContent = '';
      function row(label, value) {
        var r = el('div', 'eq-row'), dt = el('dt', null, label), dd = el('dd');
        if (typeof value === 'string') dd.textContent = value; else dd.appendChild(value);
        r.appendChild(dt); r.appendChild(dd); dl.appendChild(r);
      }
      row('Your business', a.business);
      row('You need', a.need);
      var sp = doc.createDocumentFragment(); sp.appendChild(doc.createTextNode(a.style));
      if (a.styleNotes) sp.appendChild(el('span', 'eq-notes', 'Your notes: “' + a.styleNotes + '”'));
      row('Starting point', sp);
      row('When', a.timing);
      row('Budget', a.budget);
      row('Your details', [a.name, a.email, a.phone].filter(filled).join(' · '));
      $('[data-sent-note]').hidden = sent;
      form.hidden = true; thanks.hidden = false;
      var r = thanks.getBoundingClientRect(), hh = header.el ? header.el.offsetHeight : 0;
      if (r.top < hh) window.scrollTo(0, Math.round(r.top + window.scrollY - hh - 24));
      thanks.focus({ preventScroll: true });
    }

    // Phones: keep the field you're typing in clear of the keyboard
    form.addEventListener('focusin', function (e) {
      if (!e.target.matches || !e.target.matches('input[type=text], input[type=email], input[type=tel], textarea') || !window.visualViewport) return;
      setTimeout(function () {
        var vv = window.visualViewport, r = e.target.getBoundingClientRect(), room = vv.height - 24;
        if (r.bottom > room) window.scrollBy(0, Math.round(r.bottom - room));
      }, 320);
    });

    show(1, false);
  }

  /* ================================================================ start */
  fillContent();
  initReveal();
  initHeader();
  initMenu();
  initJumps();
  renderReprise();
  initEnquiry();
  mountEngines();
  // Once the web fonts have loaded, the sections above the finale have their final
  // height: let the line engines measure again (they do this on resize).
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { window.dispatchEvent(new Event('resize')); });
  site.jumpTo = jumpTo;
})();
