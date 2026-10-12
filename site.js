/*
 * Toff Studio — puts the page together (index.html, and the footer of lab.html).
 *
 *  - Fills in what comes from settings.js: studio name, the "How it works"
 *    timeframes, testimonials, reply time, email, privacy policy, footer extras
 *    (placeholders while showPlaceholders is true, hidden when it's false).
 *  - Mounts the pre-built parts of the first screens (assets/): the opening page
 *    and the handwriting line with its showcase pictures.
 *  - In-page links (the top bar, the footer): they land just below the top bar
 *    and leave no #fragment in the address, so a reload still opens at the top.
 *  - The gentle fade-ups, and the six-step enquiry (demo by default: it sends
 *    and stores nothing).
 *
 * The Round 03 sections (assets/studio) are mounted by the short script at the
 * bottom of index.html, as in the preview (assets/studio/site.html).
 * The engines look after their own motion (scroll-driven on laptops, self-playing
 * on phones, Back/bfcache/late scroll restore, reduced motion).
 * Nothing here touches history.scrollRestoration.
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
  function merge(a, b) {                       // deep merge of plain objects (b wins)
    var o = {}, k;
    for (k in a) o[k] = a[k];
    for (k in (b || {})) o[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') ? merge(a[k], b[k]) : b[k];
    return o;
  }
  // A clearly marked placeholder: a quiet italic "Placeholder" note and wording nobody could take for real content.
  function placeholder(target, text) {
    target.classList.add('ph');
    target.textContent = '';
    target.appendChild(el('span', 'ph-tag', 'Placeholder'));
    target.appendChild(doc.createTextNode(text));
  }
  function link(text, href, external) {
    var a = el('a', null, text); a.href = href;
    if (external) { a.target = '_blank'; a.rel = 'noopener noreferrer'; a.appendChild(el('span', 'visually-hidden', ' (opens in a new tab)')); }
    return a;
  }

  /* ================================================================ content from settings.js */
  function fillContent() {
    var studio = S.studioName || 'Toff Studio';
    $$('[data-studio-name]').forEach(function (e) { e.textContent = studio; });
    $$('[data-year]').forEach(function (e) { if (S.copyrightYear) e.textContent = S.copyrightYear; });
    $$('[data-location]').forEach(function (e) { if (filled(S.location)) e.textContent = S.location; });

    // Anything the studio still has to write is marked data-placeholder; it disappears with showPlaceholders: false
    if (!showPH) {
      $$('[data-placeholder]').forEach(function (e) { e.hidden = true; });
      var about = doc.getElementById('about'); if (about) about.hidden = true;   // the About text itself is a placeholder
    }

    // How it works: how long each step takes ("How long: to be added" until set)
    var tf = (S.process && S.process.timeframes) || [];
    $$('[data-timeframe]').forEach(function (e) {
      var v = tf[+e.getAttribute('data-timeframe')];
      if (filled(v)) { e.textContent = 'How long: ' + String(v).trim(); e.hidden = false; }
      else if (!showPH) e.hidden = true;
    });

    // Kind words: real testimonials only, never invented
    var box = $('[data-quotes]');
    if (box) {
      var shown = 0;
      (S.testimonials || []).forEach(function (t) {
        var fig = el('figure', 'quote reveal');
        if (filled(t.quote)) {
          var q = String(t.quote).trim().replace(/^["“”']+|["“”']+$/g, '');
          fig.appendChild(el('blockquote', 'quote-text', '“' + q + '”'));
          var by = [t.name, t.business].filter(filled).join(', ');
          if (by) fig.appendChild(el('figcaption', 'quote-by', by));
        } else if (showPH) {
          fig.classList.add('ph');
          fig.appendChild(el('span', 'ph-tag', 'Placeholder'));
          fig.appendChild(el('p', 'quote-text', 'A short quote from ' + t.project + ' will go here.'));
          fig.appendChild(el('p', 'quote-by', 'Client name, ' + t.project));
        } else return;
        box.appendChild(fig); shown++;
      });
      var sec = $('[data-testimonials-section]'); if (sec) sec.hidden = shown === 0;
    }

    // Enquiry: reply time
    var rt = (S.contact || {}).replyTime, rtEl = $('[data-reply-time]');
    if (rtEl) {
      if (filled(rt)) rtEl.textContent = String(rt).trim().replace(/\.$/, '') + '.';
      else if (showPH) placeholder(rtEl, 'reply time to be added');
      else $('[data-reply]').hidden = true;
    }

    // Footer: email (the placeholder note stays until it's set)
    var em = $('[data-email]');
    if (em) {
      if (filled(S.email)) { em.textContent = 'Email '; em.appendChild(link(S.email.trim(), 'mailto:' + S.email.trim())); }
      else if (!showPH) em.hidden = true;
    }

    // Footer: privacy policy ("coming soon" until it exists), other legal pages, social links, company details
    var L = S.legal || {}, pv = $('[data-privacy]');
    if (pv && filled(L.privacyPolicyUrl)) { pv.textContent = ''; pv.appendChild(link('Privacy policy', L.privacyPolicyUrl)); }
    var lg = $('[data-legal]');
    if (lg) {
      [['Terms', L.termsUrl], ['Cookie policy', L.cookiesUrl]].filter(function (x) { return filled(x[1]); })
        .forEach(function (x) { lg.appendChild(link(x[0], x[1])); });
      lg.hidden = !lg.children.length;
    }
    var so = $('[data-social]');
    if (so) {
      (S.social || []).filter(function (s) { return s && filled(s.url) && filled(s.label); })
        .forEach(function (s, i) { if (i) so.appendChild(doc.createTextNode(' · ')); so.appendChild(link(s.label, s.url, true)); });
      so.hidden = !so.children.length;
    }
    var C = S.company || {}, parts = [];
    if (filled(C.name)) parts.push(C.name);
    if (filled(C.number)) parts.push('Company no. ' + C.number);
    if (filled(C.address)) parts.push('Registered office: ' + C.address);
    if (filled(C.vat)) parts.push('VAT no. ' + C.vat);
    var co = $('[data-company]'); if (co) { co.textContent = parts.join(' · '); co.hidden = parts.length === 0; }
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

  /* ================================================================ in-page links */
  // Jumps straight there (no smooth scroll: the line engines then draw what you land on)
  // and lands just below the top bar. The address bar keeps no #fragment, so a
  // reload still opens at the top.
  function barHeight() { var b = $('.tb-inner'); return b ? b.offsetHeight : 0; }
  function jumpTo(id) {
    if (id === 'top' || id === 'main') {
      window.scrollTo(0, 0);
      if (id === 'main') $('#main').focus({ preventScroll: true });
      return;
    }
    var t = doc.getElementById(id); if (!t) return;
    window.scrollTo(0, Math.max(0, Math.round(t.getBoundingClientRect().top + window.scrollY - barHeight() - 12)));
    if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
    t.focus({ preventScroll: true });
  }
  function initJumps() {
    doc.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var id = a.getAttribute('href').slice(1); if (!id || !doc.getElementById(id)) return;
      e.preventDefault();
      jumpTo(id);
    });
  }

  /* ================================================================ the opening, handwriting, showcase */
  var hwOpts = merge(merge((window.Handwriting && Handwriting.defaults) || {}, { basePath: 'assets/handwriting/', introOnLoad: false }), S.handwriting || {});
  hwOpts.introOnLoad = false;

  function mountEngines() {
    var op = doc.getElementById('opening');
    if (op && window.Opening) site.opening = window.__op = Opening.mount(op, S.opening || {});
    if (!window.Handwriting || !doc.getElementById('hw')) return;
    Handwriting.mount(doc.getElementById('hw'), hwOpts).then(function (hw) {
      site.hw = window.__hw = hw;
      site.showcase = window.__sc = Showcase.mount(doc.getElementById('showcase'), hw, { assetBase: 'assets/showcase/', links: S.links || {}, ease: (S.showcase || {}).ease });
    });
  }

  /* ================================================================ the guided enquiry */
  var STYLE_NAMES = { bluebird: 'Bluebird’s style', everest: 'Everest’s style', own: 'Your own idea', design: 'Your design from the playground' };
  var WAIT_HINT = { 1: 'Add a sentence to continue' };          // the note beside a greyed-out Continue; otherwise "Pick one to continue"

  function initEnquiry() {
    var form = $('[data-enquiry]'); if (!form || !window.StylePicker) return;
    var steps = $$('.eq-step', form), N = steps.length, cur = 1;
    var next = $('[data-next]', form), back = $('[data-back]', form), count = $('[data-count]', form), pick = $('[data-pick]', form);
    var bar = $('[data-progress]', form), err = $('[data-error]', form), thanks = $('[data-thanks]');
    var L = S.legal || {};
    var live = S.chatMode === 'live' && filled(S.formEndpoint) && filled(L.privacyPolicyUrl);
    var style = { style: null, notes: '', design: null };

    $('[data-demo-note]').hidden = live;
    var pl = $('[data-privacy-link]', form);
    if (filled(L.privacyPolicyUrl)) { pl.href = L.privacyPolicyUrl; pl.hidden = false; }
    $('[data-consent-text]', form).textContent = 'I agree to ' + (S.studioName || 'Toff Studio') + ' using these details to reply to my enquiry.';

    var picker = site.picker = window.__picker = StylePicker.mount($('[data-picker]', form), {
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
    function keepInView(box) {
      var r = box.getBoundingClientRect(), hh = barHeight();
      if (r.top < hh) window.scrollTo(0, Math.round(r.top + window.scrollY - hh - 24));
    }
    function show(n, focus) {
      cur = n;
      steps.forEach(function (s) { s.hidden = +s.getAttribute('data-step') !== n; });
      count.textContent = 'Step ' + n + ' of ' + N;
      bar.style.width = (n / N * 100) + '%';
      back.hidden = n === 1;
      setNextLabel(n === N ? 'Send' : 'Continue', n !== N);
      pick.textContent = WAIT_HINT[n] || 'Pick one to continue';
      err.textContent = '';
      update();
      if (n === 3) picker.play();                   // shown by code, not by scrolling: draw the icons now (once)
      if (focus) { keepInView(form); steps[n - 1].focus({ preventScroll: true }); }
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
        style: style.style ? STYLE_NAMES[style.style] : '', styleNotes: style.style === 'own' ? style.notes : (style.style === 'design' && style.design ? style.design.summary || '' : ''),
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
      if (a.styleNotes) sp.appendChild(el('span', 'eq-notes', (style.style === 'own' ? 'Your notes: “' + a.styleNotes + '”' : a.styleNotes)));
      row('Starting point', sp);
      row('When', a.timing);
      row('Budget', a.budget);
      row('Your details', [a.name, a.email, a.phone].filter(filled).join(' · '));
      $('[data-sent-note]').hidden = sent;
      form.hidden = true; thanks.hidden = false;
      keepInView(thanks);
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
  initJumps();
  initEnquiry();
  mountEngines();
  // Once the web fonts have loaded, the sections have their final height:
  // let the line engines measure again (they do this on resize).
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { window.dispatchEvent(new Event('resize')); });
  site.jumpTo = jumpTo;
})();
