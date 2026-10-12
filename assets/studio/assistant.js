/*
 * Plan with us: a planning assistant in the bottom-right corner. It asks the studio's questions in
 * order, lets the visitor point at anything on the page and pin a note to it, collects designs from
 * the playground and "Draw your site", and ends with a polished brief (download / save as PDF / send).
 *
 *   var a = Assistant.mount({
 *     mode: 'demo',                 // 'demo' sends nothing; 'live' allows sending (needs endpoint + privacyUrl)
 *     endpoint: '',                 // a form service URL that emails the brief to the studio (later)
 *     privacyUrl: '',               // privacy policy link, shown with the consent tick in live mode
 *     respond: null,                // optional async function (history, brief) -> reply text: plug a real AI in here later
 *     hideOver: ['#opening', 'footer'],   // the button hides while these are on screen
 *     snapshot: true                // take pictures of pinned things (needs snapshot.js)
 *   });
 *   a.open()  a.close()  a.brief()  a.startPointing()
 *
 * Mark things on the page with data-brief="Label" so pins get a clear name, e.g. data-brief="The ink handwriting".
 * Listens for 'toff:design' (playground) and 'toff:drawn' (Draw your site) to add designs to the brief.
 * Needs brief.js (and snapshot.js for pictures).
 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = window.matchMedia && window.matchMedia('(hover: none)').matches, CLICK = touch ? 'tap' : 'click';
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  var FEATURES = ['Online booking', 'Chat assistant', 'Online shop', 'Blog or news', 'Custom animations', 'Photos or video shoot', 'Multiple languages', 'Hosting & care'];
  var PIN_CHOICES = ['I want this', 'This style of animation', 'These colours', 'This layout', 'Not this'];

  function mount(options) {
    var o = options || {};
    var mode = o.mode === 'live' && o.endpoint ? 'live' : 'demo';
    var brief = { name: '', business: '', need: '', pages: '', features: [], timing: '', budget: '', email: '', pins: [], designs: [], notes: [], transcript: [], created: new Date().toISOString() };
    var step = 'intro', waitingText = null, pointing = false, started = false;

    // ---------- DOM ----------
    var root = el('div', 'as-root');
    root.classList.add('as-labelled'); var labelTimer = 0;   // on phones the name shows at first, then the button folds to its icon
    var fab = el('button', 'as-fab'); fab.type = 'button'; fab.setAttribute('aria-expanded', 'false'); fab.setAttribute('aria-controls', 'as-panel');
    fab.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20 L7 19 L19 7 Q20 6 19 5 L19 5 Q18 4 17 5 L5 17 Z"/><path d="M14 8 L16 10"/></svg><span>Plan with us</span><b class="as-badge" hidden></b>';
    var panel = el('section', 'as-panel'); panel.id = 'as-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Plan your site'); panel.hidden = true;
    panel.innerHTML =
      '<header class="as-head"><div><p class="as-title">Plan your site</p><p class="as-sub">Answer a few questions and point at anything you like.</p></div>' +
      '<button type="button" class="as-close" aria-label="Close the planner">×</button></header>' +
      '<div class="as-log" role="log" aria-live="polite"></div>' +
      '<div class="as-chips" role="group" aria-label="Quick replies"></div>' +
      '<div class="as-tools"><button type="button" class="as-point"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/><path d="M12 2 V6 M12 18 V22 M2 12 H6 M18 12 H22"/></svg>Point at something</button><span class="as-pincount" aria-live="polite"></span></div>' +
      '<form class="as-form"><label class="as-sr" for="as-input">Your message</label><input id="as-input" class="as-input" type="text" autocomplete="off" maxlength="300" placeholder="Type a message"><button type="submit" class="as-send" aria-label="Send">→</button></form>' +
      (mode === 'demo' ? '<p class="as-demo">Preview: nothing is sent or stored.</p>' : '');
    var pinLayer = el('div', 'as-pin-layer'); pinLayer.setAttribute('aria-hidden', 'false');
    var veil = el('div', 'as-veil'); veil.hidden = true;
    veil.innerHTML = '<div class="as-veil-bar" role="status"><span>' + (touch ? 'Tap' : 'Click') + ' anything you like on the page.</span><button type="button" class="as-veil-done">Done</button></div><div class="as-hover"></div>';
    var pop = el('div', 'as-pop'); pop.hidden = true; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Add a note to this pin');
    root.appendChild(fab); root.appendChild(panel); document.body.appendChild(pinLayer); document.body.appendChild(root); document.body.appendChild(veil); document.body.appendChild(pop);
    var log = panel.querySelector('.as-log'), chips = panel.querySelector('.as-chips'), input = panel.querySelector('.as-input');
    var badge = fab.querySelector('.as-badge'), pinCount = panel.querySelector('.as-pincount'), hoverBox = veil.querySelector('.as-hover');

    // ---------- chat ----------
    function scroll() { log.scrollTop = log.scrollHeight; }
    function say(text, who, html) {
      var m = el('div', 'as-msg as-' + (who || 'bot'));
      if (html) m.innerHTML = html; else m.textContent = text;
      log.appendChild(m); scroll();
      brief.transcript.push({ who: who === 'you' ? 'you' : 'bot', text: text });
      return m;
    }
    function bot(text, then) {
      var t = el('div', 'as-msg as-bot as-typing'); t.innerHTML = '<i></i><i></i><i></i>'; t.setAttribute('aria-label', 'Typing');
      log.appendChild(t); scroll();
      setTimeout(function () { t.remove(); say(text, 'bot'); if (then) then(); }, reduce ? 0 : 520);
    }
    function setChips(list, multi, onDone) {
      chips.innerHTML = ''; root.classList.toggle('as-offer-point', list.indexOf('Point at something') >= 0);
      var picked = [];
      list.forEach(function (c) {
        var b = el('button', 'as-chip', c); b.type = 'button';
        if (multi) b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', function () {
          if (multi) {
            var on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on ? 'true' : 'false');
            if (on) picked.push(c); else picked.splice(picked.indexOf(c), 1);
          } else { answer(c); }
        });
        chips.appendChild(b);
      });
      if (multi) {
        var d = el('button', 'as-chip as-chip-main', 'Done'); d.type = 'button';
        d.addEventListener('click', function () { onDone(picked.slice()); });
        chips.appendChild(d);
      }
    }
    function expectText(kind, placeholder) { waitingText = kind; input.placeholder = placeholder || 'Type a message'; if (!panel.hidden) input.focus(); }

    var STEPS = {
      intro: function () {
        bot('Hello. I’m Toff’s planning assistant. I’ll help you put a brief together, and you can point at anything on this page you’d like in your own site.', function () { setChips(['Let’s start', 'Just looking']); });
      },
      name: function () { bot('First, what’s your name?', function () { chips.innerHTML = ''; expectText('name', 'Your first name'); }); },
      business: function () { bot('Thanks, ' + brief.name + '. What kind of business is it?', function () { setChips(['Clinic', 'Café', 'Salon', 'Trades', 'Restaurant', 'Shop', 'Something else']); expectText('business', 'Or describe it in a few words'); }); },
      need: function () { bot('What do you need from us?', function () { setChips(['A new website', 'A redesign', 'Website and ongoing care', 'Not sure yet']); }); },
      point: function () {
        bot('If anything on this page catches your eye (a layout, a colour, an animation), tap “Point at something” and ' + CLICK + ' it. You can leave a note on each pin, then come back here.', function () {
          setChips(['Point at something', 'Skip this']);
        });
      },
      pages: function () { bot('Roughly how many pages do you think you’ll need?', function () { setChips(['Just one', '2 to 5', '6 to 10', 'More than 10', 'Not sure']); }); },
      features: function () {
        bot('Which of these would you like? Pick as many as you want.', function () {
          setChips(FEATURES, true, function (list) {
            brief.features = list; say(list.length ? list.join(', ') : 'None of these', 'you'); go('timing');
          });
        });
      },
      timing: function () { bot('When would you like it?', function () { setChips(['As soon as possible', 'In 1 to 3 months', 'Just exploring']); }); },
      budget: function () { bot('And a rough budget, so the quote fits?', function () { setChips(['£1,000 to £2,000', '£2,000 to £4,000', '£4,000+', 'Not sure yet']); }); },
      email: function () {
        bot('Where should Hy send your quote?' + (mode === 'demo' ? ' (This is a preview, so please don’t use real details yet.)' : ''), function () { chips.innerHTML = ''; expectText('email', 'you@example.com'); });
      },
      done: function () {
        bot('Thank you, ' + (brief.name || 'there') + '. Here’s your brief.', function () {
          var card = el('div', 'as-msg as-bot as-card');
          card.innerHTML = '<p class="as-card-t">Your brief</p><ul>' +
            ['business', 'need', 'pages', 'timing', 'budget'].filter(function (k) { return brief[k]; }).map(function (k) { return '<li>' + escapeHtml(brief[k]) + '</li>'; }).join('') +
            (brief.features.length ? '<li>' + escapeHtml(brief.features.join(', ')) + '</li>' : '') +
            '<li>' + brief.pins.length + ' pinned pick' + (brief.pins.length === 1 ? '' : 's') + (brief.designs.length ? ', ' + brief.designs.length + ' design' + (brief.designs.length === 1 ? '' : 's') : '') + '</li></ul>';
          log.appendChild(card); scroll();
          chips.innerHTML = '';
          var dl = el('button', 'as-chip as-chip-main', 'Download my brief'); dl.type = 'button';
          dl.addEventListener('click', function () { Brief.download(snapshotBrief()); });
          var pr = el('button', 'as-chip', 'Save as PDF'); pr.type = 'button';
          pr.addEventListener('click', function () { Brief.print(snapshotBrief()); });
          var sd = el('button', 'as-chip', mode === 'live' ? 'Send to Toff' : 'Send to Toff (switches on soon)'); sd.type = 'button';
          if (mode !== 'live') { sd.disabled = true; sd.setAttribute('aria-disabled', 'true'); }
          sd.addEventListener('click', send);
          chips.appendChild(dl); chips.appendChild(pr); chips.appendChild(sd);
          started = 'done';
        });
      }
    };
    var ORDER = ['intro', 'name', 'business', 'need', 'point', 'pages', 'features', 'timing', 'budget', 'email', 'done'];
    function go(s) { step = s; waitingText = null; input.placeholder = 'Type a message'; STEPS[s](); }
    function next() { go(ORDER[Math.min(ORDER.length - 1, ORDER.indexOf(step) + 1)]); }
    function escapeHtml(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    function answer(text) {
      say(text, 'you');
      if (step === 'intro') { if (text === 'Just looking') { bot('No problem. I’m here whenever you want me. You can still point at things you like at any time.', function () { setChips(['Let’s start']); }); step = 'intro2'; return; } return next(); }
      if (step === 'intro2') { step = 'intro'; return next(); }
      if (step === 'business') { brief.business = text; if (o.onBusiness) o.onBusiness(text); return next(); }
      if (step === 'need') { brief.need = text; return next(); }
      if (step === 'point') { if (text === 'Point at something') { startPointing(); return; } if (text === 'I’m done pointing' || text === 'Skip this') return next(); return; }
      if (step === 'pages') { brief.pages = text; return next(); }
      if (step === 'timing') { brief.timing = text; return next(); }
      if (step === 'budget') { brief.budget = text; return next(); }
    }

    function freeText(text) {
      if (waitingText === 'name') { say(text, 'you'); brief.name = text.replace(/[^\p{L}\p{M}' -]/gu, '').slice(0, 40) || text.slice(0, 40); return next(); }
      if (waitingText === 'business') { say(text, 'you'); brief.business = text.slice(0, 120); return next(); }
      if (waitingText === 'email') {
        say(text, 'you');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) { bot('That doesn’t look like an email address. Could you check it?', function () { expectText('email', 'you@example.com'); }); return; }
        brief.email = text; return next();
      }
      say(text, 'you');
      if (typeof o.respond === 'function') {           // real AI later: one function plugs in here
        Promise.resolve(o.respond(brief.transcript.slice(), JSON.parse(JSON.stringify(brief)))).then(function (reply) { if (reply) bot(String(reply)); }).catch(function () {});
        return;
      }
      var t = text.toLowerCase();
      brief.notes.push(text);
      if (/price|cost|how much|£|quote/.test(t)) bot('Every project is quoted individually once Hy has seen your brief. I’ve added your question to it.');
      else if (/how long|time|when|weeks|deadline/.test(t)) bot('Hy will give you a clear timeline with your quote. I’ve noted that timing matters to you.');
      else if (/call|phone|speak|talk|human/.test(t)) bot('Of course. Leave your email at the end and Hy will reply personally.');
      else bot('Noted. I’ve added that to your brief.');
    }

    panel.querySelector('.as-form').addEventListener('submit', function (e) {
      e.preventDefault(); var v = input.value.trim(); if (!v) return; input.value = ''; freeText(v);
    });

    // ---------- open / close ----------
    function open() {
      panel.hidden = false; fab.setAttribute('aria-expanded', 'true'); root.classList.add('as-open');
      if (!started) { started = true; go('intro'); }
      setTimeout(function () { (waitingText ? input : (chips.querySelector('button') || input)).focus(); }, 60);
    }
    function close() { panel.hidden = true; fab.setAttribute('aria-expanded', 'false'); root.classList.remove('as-open'); fab.focus(); }
    fab.addEventListener('click', function () { if (panel.hidden) open(); else close(); });
    panel.querySelector('.as-close').addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!pop.hidden) { closePop(); return; }
      if (pointing) { stopPointing(); return; }
      if (!panel.hidden) close();
    });

    // ---------- pointing and pins ----------
    function labelFor(target) {
      var b = target.closest('[data-brief]');
      if (b) {
        var lbl = b.getAttribute('data-brief');
        if (lbl === 'playground' && window.__toffDesign) lbl = 'Playground design: ' + window.__toffDesign().summary;
        return { label: lbl, anchor: b };
      }
      var sec = target.closest('section, [id]'), h = sec && sec.querySelector('h1, h2, h3');
      var what = target.closest('img, svg, canvas') ? 'Picture' : target.closest('button, a') ? 'Button' : target.closest('h1, h2, h3') ? 'Heading' : 'Detail';
      return { label: what + (h ? ' in “' + h.textContent.trim().slice(0, 50) + '”' : ''), anchor: target.closest('figure, article, .cap-tile, section > div, section') || target };
    }
    function sectionFor(target) {
      var s = target.closest('section'); var h = s && s.querySelector('h1, h2'); return h ? h.textContent.trim().slice(0, 60) : '';
    }
    var hoverTarget = null;
    function underPoint(x, y) {
      veil.style.pointerEvents = 'none';
      var t = document.elementFromPoint(x, y);
      veil.style.pointerEvents = '';
      if (!t || root.contains(t) || pinLayer.contains(t) || pop.contains(t)) return null;
      return t;
    }
    function startPointing() {
      pointing = true; veil.hidden = false; document.documentElement.classList.add('as-pointing');
      panel.hidden = true; root.classList.remove('as-open');            // step aside so nothing is covered while pointing
      veil.querySelector('.as-veil-done').focus();
    }
    function stopPointing() {
      pointing = false; veil.hidden = true; hoverBox.style.opacity = '0'; document.documentElement.classList.remove('as-pointing');
      if (panel.hidden) open();
      if (step === 'point') { bot(brief.pins.length ? 'Got them. Shall we carry on?' : 'No pins this time. Shall we carry on?', function () { setChips(['I’m done pointing', 'Point at something']); }); }
    }
    veil.querySelector('.as-veil-done').addEventListener('click', function (e) { e.stopPropagation(); stopPointing(); });
    veil.addEventListener('pointermove', function (e) {
      var t = underPoint(e.clientX, e.clientY); if (!t) { hoverBox.style.opacity = '0'; return; }
      var a = labelFor(t).anchor, r = a.getBoundingClientRect();
      hoverTarget = a;
      hoverBox.style.cssText = 'opacity:1;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px';
    });
    veil.addEventListener('click', function (e) {
      if (e.target.closest('.as-veil-bar')) return;
      var t = underPoint(e.clientX, e.clientY); if (!t) return;
      var info = labelFor(t), r = info.anchor.getBoundingClientRect();
      var shot = t.closest('.cs-stage, .cc-item, .cap-tile, .pg-preview, .sc-card, .dr-screen, .ol-stage, .dv, figure');
      if (!shot || !info.anchor.contains(shot)) shot = info.anchor;
      var pin = { n: brief.pins.length + 1, label: info.label, section: sectionFor(t), choice: '', note: '', snapshot: null,
        el: info.anchor, shot: shot, fx: (e.clientX - r.left) / Math.max(1, r.width), fy: (e.clientY - r.top) / Math.max(1, r.height) };
      if (info.label.indexOf('Playground design') === 0 && window.__toffDesign) pin.design = window.__toffDesign();
      addPin(pin);
      openPop(pin);
    });

    function placePin(p) {
      if (!p.dot) return;
      if (!p.el.isConnected) { p.dot.style.display = 'none'; return; }
      var r = p.el.getBoundingClientRect();
      p.dot.style.display = '';
      p.dot.style.left = (r.left + window.scrollX + p.fx * r.width) + 'px';   // left/top (not transform), so the drop-in animation never moves it
      p.dot.style.top = (r.top + window.scrollY + p.fy * r.height) + 'px';
    }
    function placeAll() { brief.pins.forEach(placePin); }
    window.addEventListener('resize', placeAll);
    if ('ResizeObserver' in window) new ResizeObserver(placeAll).observe(document.body);
    setInterval(placeAll, 1500);                      // things that move by themselves (layouts settling, demos)

    function addPin(p) {
      var d = el('button', 'as-pin', String(p.n)); d.type = 'button';
      d.setAttribute('aria-label', 'Pin ' + p.n + ': ' + p.label);
      d.addEventListener('click', function (e) { e.stopPropagation(); openPop(p); });
      pinLayer.appendChild(d); p.dot = d; placePin(p);
      brief.pins.push(p); updateCount();
      if (o.snapshot !== false && window.Snapshot) Snapshot.take(p.shot || p.el, { maxWidth: 520 }).then(function (s) { p.snapshot = s; });
    }
    function removePin(p) {
      brief.pins.splice(brief.pins.indexOf(p), 1); if (p.dot) p.dot.remove();
      brief.pins.forEach(function (q, i) { q.n = i + 1; q.dot.textContent = String(q.n); q.dot.setAttribute('aria-label', 'Pin ' + q.n + ': ' + q.label); });
      updateCount();
    }
    function updateCount() {
      var n = brief.pins.length;
      pinCount.textContent = n ? n + ' pin' + (n === 1 ? '' : 's') : '';
      badge.hidden = !n; badge.textContent = String(n);
    }
    var popPin = null;
    function openPop(p) {
      popPin = p;
      pop.innerHTML = '<p class="as-pop-t"><span class="as-pop-n">' + p.n + '</span>' + escapeHtml(p.label) + '</p>' +
        '<div class="as-pop-chips" role="group" aria-label="What about it?">' + PIN_CHOICES.map(function (c) { return '<button type="button" class="as-chip" aria-pressed="' + (p.choice === c) + '">' + c + '</button>'; }).join('') + '</div>' +
        '<label class="as-sr" for="as-pop-note">Note</label><textarea id="as-pop-note" class="as-pop-note" rows="2" maxlength="300" placeholder="Anything to add? e.g. this, but in green">' + escapeHtml(p.note) + '</textarea>' +
        '<div class="as-pop-actions"><button type="button" class="as-pop-del">Remove pin</button><button type="button" class="as-pop-save">Save</button></div>';
      pop.hidden = false;
      var r = p.dot.getBoundingClientRect(), pw = Math.min(320, window.innerWidth - 24);
      var left = Math.max(12, Math.min(window.innerWidth - pw - 12, r.left - pw / 2 + 13)), top = r.bottom + 10;
      if (top + 260 > window.innerHeight) top = Math.max(12, r.top - 270);
      pop.style.cssText = 'left:' + left + 'px;top:' + top + 'px;width:' + pw + 'px';
      [].slice.call(pop.querySelectorAll('.as-pop-chips .as-chip')).forEach(function (b) {
        b.addEventListener('click', function () { [].slice.call(pop.querySelectorAll('.as-pop-chips .as-chip')).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); p.choice = b.textContent; });
      });
      pop.querySelector('.as-pop-save').addEventListener('click', function () { p.note = pop.querySelector('.as-pop-note').value.trim(); closePop(); reactToPin(p); });
      pop.querySelector('.as-pop-del').addEventListener('click', function () { removePin(p); closePop(); });
      setTimeout(function () { var f = pop.querySelector('.as-pop-chips .as-chip'); if (f) f.focus(); }, 30);
    }
    function closePop() { pop.hidden = true; if (popPin && popPin.dot) popPin.dot.focus({ preventScroll: true }); popPin = null; }
    function reactToPin(p) {
      if (p._reacted) return; p._reacted = true;
      var l = p.label.toLowerCase(), msg;
      if (/case study/.test(l)) msg = 'Noted: ' + p.label + '. Screens that play like recordings work well for showing off your own work.';
      else if (/concept/.test(l)) msg = 'That concept is in your brief. We can take it in your own direction.';
      else if (/handwriting|ink line/.test(l)) msg = 'The ink line. That can write your own words, in your colours.';
      else if (/playground/.test(l)) msg = 'Your playground design is in the brief, colours and all.';
      else if (/everest|cool|ac /.test(l)) msg = 'The cooling animation. We can make a moment like that for your product or service.';
      else if (/bluebird|face/.test(l)) msg = 'The line-drawn face. We can draw anything that way, from your logo to your premises.';
      else msg = 'Noted: ' + p.label + '.';
      say(msg + (p.choice ? ' (' + p.choice.toLowerCase() + ')' : ''), 'bot');
    }

    // ---------- designs from the playground and Draw your site ----------
    function addDesign(d, source) {
      if (!d) return;
      var entry = { source: source, summary: d.summary || '', colours: d.colours || null, config: d, snapshot: null };
      brief.designs = brief.designs.filter(function (x) { return x.source !== source; });
      brief.designs.push(entry);
      var sel = source === 'drawn' ? '.dr-pagewrap' : '.pg-laptop';
      var node = document.querySelector(sel);
      if (node && window.Snapshot) Snapshot.take(node, { maxWidth: 560 }).then(function (s) { entry.snapshot = s; });
      if (started) say((source === 'drawn' ? 'Your drawn site' : 'Your playground design') + ' is in your brief.', 'bot');
    }
    document.addEventListener('toff:design', function (e) { addDesign(e.detail, 'playground'); });
    document.addEventListener('toff:drawn', function (e) { addDesign(e.detail, 'drawn'); });

    function snapshotBrief() {
      var b = JSON.parse(JSON.stringify(brief, function (k, v) { return (k === 'el' || k === 'dot' || k === 'shot') ? undefined : v; }));
      b.created = new Date().toISOString();
      return b;
    }
    function send() {
      if (mode !== 'live') return;
      var b = snapshotBrief();
      fetch(o.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ name: b.name, email: b.email, message: Brief.text(b), brief: JSON.stringify(b).slice(0, 90000) }) })
        .then(function (r) { bot(r.ok ? 'Sent. Hy will be in touch personally.' : 'That didn’t send. Please download your brief and email it instead.'); })
        .catch(function () { bot('That didn’t send. Please download your brief and email it instead.'); });
    }

    // ---------- keep the button out of the way ----------
    var hidden = {};
    (o.hideOver || ['#opening', 'footer']).forEach(function (sel) {
      var t = document.querySelector(sel); if (!t || !('IntersectionObserver' in window)) return;
      new IntersectionObserver(function (es) {
        hidden[sel] = es[0].isIntersecting && es[0].intersectionRatio > (sel === '#opening' ? 0.5 : 0.05);
        var hide = Object.keys(hidden).some(function (k) { return hidden[k]; }) && panel.hidden;
        root.classList.toggle('as-tucked', hide);
        if (!hide && !labelTimer && root.classList.contains('as-labelled')) labelTimer = setTimeout(function () { root.classList.remove('as-labelled'); }, 6000);
      }, { threshold: [0, 0.05, 0.5, 1] }).observe(t);
    });
    panel.querySelector('.as-point').addEventListener('click', function () { if (step === 'point') say('Point at something', 'you'); startPointing(); });

    return {
      open: open, close: close, startPointing: startPointing, stopPointing: stopPointing,
      brief: snapshotBrief, mode: function () { return mode; },
      _answer: answer, _free: freeText
    };
  }
  window.Assistant = { mount: mount };
})();
