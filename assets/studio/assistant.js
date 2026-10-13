/*
 * The studio's planning assistant: three parts, used by the concierge (assets/home/concierge.js) and by
 * the round 03 to 04 "Plan with us" panel (Assistant.mount, retired from the home page in round 05).
 *
 * 1. Assistant.pointer(options): point at anything on the page and pin a note to it ("I want this").
 *      var p = Assistant.pointer({
 *        onPin: function (pin) {},        // a pin was added (pin: { n, label, section, choice, note, snapshot, el })
 *        onChange: function (pin) {},     // its choice or note changed
 *        onRemove: function (pin) {},     // it was removed
 *        onStop: function (added) {},     // pointing mode ended; added = pins made this time
 *        snapshot: true                   // take a picture of each pinned thing (needs snapshot.js)
 *      });
 *      p.start(hint)  p.stop()  p.isOn()  p.pins()  p.remove(pin)  p.edit(pin)
 *    The mouse or a finger picks anything on the page; the keyboard moves through what's on screen with the
 *    arrow keys and pins it with "Pin this". Escape closes the note, then pointing. Mark things on the page
 *    with data-brief="Label" so pins get a clear name.
 *
 * 2. Assistant.script(options): the offline version of the concierge's conversation (no AI, no network).
 *      var s = Assistant.script({ timeframes: ['Discovery call: 30 minutes'], designs: true });
 *      s.reply(input, brief) -> { text, calls: [{ name, input }], chips: [..], multi: bool }
 *      s.resume(brief)       -> the next question from what the brief already holds (after the live AI stops)
 *      s.afterPins(n)        -> what to say after the visitor has pinned things
 *      s.step()              -> the current step name
 *    calls use the same tool names and inputs as the Worker's /concierge (show_work, open_design_tool,
 *    start_pointing, update_brief, finish), so the concierge carries out both the same way.
 *    Assistant.stripContact(text) -> { text, found }: emails, phone numbers (7+ digits) and stated names
 *    become "(removed)". The concierge runs everything bound for the Worker through it.
 *
 * 3. Assistant.mount(options): the round 03 to 04 corner panel (kept working; not loaded in round 05).
 *      var a = Assistant.mount({ mode: 'demo', endpoint: '', privacyUrl: '', respond: null, hideOver: ['#opening', 'footer'], snapshot: true });
 *      a.open()  a.close()  a.brief()  a.startPointing()
 *    Listens for 'toff:design' (playground) and 'toff:drawn' (Draw your site). Needs brief.js.
 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = window.matchMedia && window.matchMedia('(hover: none)').matches;
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var FEATURES = ['Online booking', 'Chat assistant', 'Online shop', 'Blog or news', 'Custom animations', 'Photos or video shoot', 'Multiple languages', 'Hosting & care'];
  var PIN_CHOICES = ['I want this', 'This style of animation', 'These colours', 'This layout', 'Not this'];

  /* =================================================================== 1. pointing and pins */
  function pointer(options) {
    var o = options || {};
    var pins = [], on = false, built = false, added = [];
    var pinLayer, veil, bar, hintEl, statusEl, pinBtn, doneBtn, hoverBox, pop, popPin = null;
    var cands = [], ci = -1, kbTarget = null, timer = 0;

    function build() {
      if (built) return; built = true;
      pinLayer = el('div', 'as-pin-layer');
      veil = el('div', 'as-veil'); veil.hidden = true;
      bar = el('div', 'as-veil-bar'); bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Pointing at the page');
      hintEl = el('p', 'as-veil-hint'); statusEl = el('p', 'as-veil-status'); statusEl.setAttribute('role', 'status');
      pinBtn = el('button', 'as-veil-pin', 'Pin this'); pinBtn.type = 'button'; pinBtn.hidden = true;
      doneBtn = el('button', 'as-veil-done', 'Done'); doneBtn.type = 'button';
      var txt = el('div', 'as-veil-text'); txt.appendChild(hintEl); txt.appendChild(statusEl);
      bar.appendChild(txt); bar.appendChild(pinBtn); bar.appendChild(doneBtn);
      hoverBox = el('div', 'as-hover'); hoverBox.setAttribute('aria-hidden', 'true');
      veil.appendChild(hoverBox);
      pop = el('div', 'as-pop'); pop.hidden = true; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Add a note to this pin');
      document.body.appendChild(pinLayer); document.body.appendChild(veil); document.body.appendChild(bar); document.body.appendChild(pop);
      bar.hidden = true;

      doneBtn.addEventListener('click', function (e) { e.stopPropagation(); stop(); });
      pinBtn.addEventListener('click', function (e) { e.stopPropagation(); if (kbTarget) pinAt(kbTarget, 0.5, 0.5, kbTarget); });
      veil.addEventListener('pointermove', function (e) {
        var t = underPoint(e.clientX, e.clientY); if (!t) { hoverBox.style.opacity = '0'; return; }
        box(labelFor(t).anchor);
      });
      veil.addEventListener('click', function (e) {
        var t = underPoint(e.clientX, e.clientY); if (!t) return;
        var a = labelFor(t).anchor, r = a.getBoundingClientRect();
        pinAt(t, (e.clientX - r.left) / Math.max(1, r.width), (e.clientY - r.top) / Math.max(1, r.height));
      });
      document.addEventListener('keydown', onKey, true);
      window.addEventListener('resize', placeAll);
      if ('ResizeObserver' in window) new ResizeObserver(placeAll).observe(document.body);
    }

    function onKey(e) {
      if (!pop.hidden && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePop(); return; }
      if (!pop.hidden && e.key === 'Tab') {                        // keep Tab inside the note while it's open
        var f = [].slice.call(pop.querySelectorAll('button, textarea')), i = f.indexOf(document.activeElement);
        if (f.length && (i === -1 || (e.shiftKey && i === 0) || (!e.shiftKey && i === f.length - 1))) { e.preventDefault(); f[e.shiftKey ? f.length - 1 : 0].focus(); }
        return;
      }
      if (!on || !pop.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); stop(); return; }
      var dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      cands = candidates();
      if (!cands.length) { statusEl.textContent = 'Nothing to pin on screen here. Scroll a little, then try again.'; return; }
      var at = kbTarget ? cands.indexOf(kbTarget) : -1;
      ci = at === -1 ? (dir > 0 ? 0 : cands.length - 1) : (at + dir + cands.length) % cands.length;
      kbTarget = cands[ci];
      var r = kbTarget.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) kbTarget.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
      box(kbTarget);
      statusEl.textContent = labelFor(kbTarget).label + ' (' + (ci + 1) + ' of ' + cands.length + ')';
      pinBtn.hidden = false;
    }

    function box(a) {
      var r = a.getBoundingClientRect();
      hoverBox.style.cssText = 'opacity:1;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px';
    }
    function mine(t) { return (pinLayer && pinLayer.contains(t)) || (pop && pop.contains(t)) || (bar && bar.contains(t)) || (o.ignore && t.closest && t.closest(o.ignore)); }
    function underPoint(x, y) {
      veil.style.pointerEvents = 'none';
      var t = document.elementFromPoint(x, y);
      veil.style.pointerEvents = '';
      if (!t || mine(t) || t === document.documentElement || t === document.body) return null;
      return t;
    }
    function candidates() {
      var seen = [], out = [], vh = window.innerHeight;
      [].slice.call(document.querySelectorAll('[data-brief], figure, h1, h2, h3, img, canvas, video, iframe, article, [role="img"]')).forEach(function (n) {
        if (mine(n)) return;
        var a = labelFor(n).anchor; if (seen.indexOf(a) >= 0) return;
        var r = a.getBoundingClientRect();
        if (r.width < 24 || r.height < 16 || r.bottom < 40 || r.top > vh - 40) return;
        if (getComputedStyle(a).visibility === 'hidden') return;
        seen.push(a); out.push(a);
      });
      return out.sort(function (a, b) { var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return (ra.top - rb.top) || (ra.left - rb.left); });
    }

    function labelFor(target) {
      var b = target.closest('[data-brief]');
      if (b) {
        var lbl = b.getAttribute('data-brief');
        if (lbl === 'playground' && window.__toffDesign) lbl = 'Playground design: ' + window.__toffDesign().summary;
        return { label: lbl, anchor: b };
      }
      var own = target.closest('h1, h2, h3'), sec = target.closest('article') || target.closest('section') || target.closest('[id]');
      var h = sec && sec.querySelector('h1, h2, h3'), say = function (n) { return '“' + n.textContent.trim().replace(/\s+/g, ' ').slice(0, 50) + '”'; };
      var what = target.closest('img, svg, canvas, video, figure, [role="img"]') ? 'Picture' : target.closest('button, a') ? 'Button' : 'Detail';
      var anchor = target.closest('figure, article, [role="img"], h1, h2, h3, img, canvas, video, iframe') || target.closest('section > div, section') || target;
      return { label: own ? 'The heading ' + say(own) : what + (h ? ' in ' + say(h) : ''), anchor: anchor };
    }
    function sectionFor(target) { var s = target.closest('section'); var h = s && s.querySelector('h1, h2'); return h ? h.textContent.trim().replace(/\s+/g, ' ').slice(0, 60) : ''; }

    function pinAt(t, fx, fy, anchorOverride) {
      var info = labelFor(t), anchor = anchorOverride || info.anchor;
      var shot = t.closest('figure, [role="img"], img, canvas, video') || anchor;
      if (!anchor.contains(shot)) shot = anchor;
      var p = { n: pins.length + 1, label: info.label, section: sectionFor(t), choice: 'I want this', note: '', snapshot: null, el: anchor, shot: shot, fx: fx, fy: fy };
      if (info.label.indexOf('Playground design') === 0 && window.__toffDesign) p.design = window.__toffDesign();
      addPin(p); added.push(p);
      if (o.onPin) o.onPin(p);
      openPop(p);
    }
    function placePin(p) {
      if (!p.dot) return;
      if (!p.el.isConnected) { p.dot.style.display = 'none'; return; }
      var r = p.el.getBoundingClientRect();
      p.dot.style.display = '';
      p.dot.style.left = (r.left + window.scrollX + p.fx * r.width) + 'px';
      p.dot.style.top = (r.top + window.scrollY + p.fy * r.height) + 'px';
    }
    function placeAll() { pins.forEach(placePin); }
    function addPin(p) {
      var d = el('button', 'as-pin', String(p.n)); d.type = 'button';
      d.setAttribute('aria-label', 'Pin ' + p.n + ': ' + p.label);
      d.addEventListener('click', function (e) { e.stopPropagation(); openPop(p); });
      pinLayer.appendChild(d); p.dot = d; placePin(p);
      pins.push(p);
      if (!timer) timer = setInterval(placeAll, 1500);              // things that move by themselves (layouts settling)
      if (o.snapshot !== false && window.Snapshot) Snapshot.take(p.shot || p.el, { maxWidth: 520 }).then(function (s) { p.snapshot = s; if (o.onChange) o.onChange(p); });
    }
    function removePin(p) {
      var i = pins.indexOf(p); if (i < 0) return;
      pins.splice(i, 1); if (p.dot) p.dot.remove();
      pins.forEach(function (q, k) { q.n = k + 1; q.dot.textContent = String(q.n); q.dot.setAttribute('aria-label', 'Pin ' + q.n + ': ' + q.label); });
      if (!pins.length && timer) { clearInterval(timer); timer = 0; }
      if (o.onRemove) o.onRemove(p);
    }
    function openPop(p) {
      build(); popPin = p;
      pop.innerHTML = '<p class="as-pop-t"><span class="as-pop-n" aria-hidden="true">' + p.n + '</span><span>' + escapeHtml(p.label) + '</span></p>' +
        '<div class="as-pop-chips" role="group" aria-label="What about it?">' + PIN_CHOICES.map(function (c) { return '<button type="button" class="as-chip" aria-pressed="' + (p.choice === c) + '">' + c + '</button>'; }).join('') + '</div>' +
        '<label class="as-pop-label" for="as-pop-note">A note, if you like</label><textarea id="as-pop-note" class="as-pop-note" rows="2" maxlength="300" placeholder="For example: this, but in green">' + escapeHtml(p.note) + '</textarea>' +
        '<div class="as-pop-actions"><button type="button" class="as-pop-del">Remove pin</button><button type="button" class="as-pop-save">Save</button></div>';
      pop.hidden = false;
      var r = p.dot.getBoundingClientRect(), pw = Math.min(340, window.innerWidth - 24);
      var left = Math.max(12, Math.min(window.innerWidth - pw - 12, r.left - pw / 2 + 13)), top = r.bottom + 10;
      pop.style.cssText = 'left:' + left + 'px;top:' + top + 'px;width:' + pw + 'px';
      var ph = pop.offsetHeight;
      if (top + ph > window.innerHeight - 12) pop.style.top = Math.max(12, Math.min(window.innerHeight - ph - 12, r.top - ph - 10)) + 'px';
      [].slice.call(pop.querySelectorAll('.as-pop-chips .as-chip')).forEach(function (b) {
        b.addEventListener('click', function () { [].slice.call(pop.querySelectorAll('.as-pop-chips .as-chip')).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); p.choice = b.textContent; });
      });
      pop.querySelector('.as-pop-save').addEventListener('click', function () { p.note = pop.querySelector('.as-pop-note').value.trim(); closePop(); if (o.onChange) o.onChange(p); });
      pop.querySelector('.as-pop-del').addEventListener('click', function () { var i = added.indexOf(p); if (i >= 0) added.splice(i, 1); removePin(p); closePop(true); });
      setTimeout(function () { var f = pop.querySelector('.as-pop-chips .as-chip[aria-pressed="true"]') || pop.querySelector('.as-chip'); if (f) f.focus(); }, 30);
    }
    function closePop(removed) {
      pop.hidden = true;
      var back = on ? (pinBtn.hidden ? doneBtn : pinBtn) : (!removed && popPin && popPin.dot);
      if (back) back.focus({ preventScroll: true });
      popPin = null;
    }

    function start(hint) {
      build(); if (on) return;
      on = true; added = []; kbTarget = null; pinBtn.hidden = true; statusEl.textContent = '';
      hintEl.textContent = hint || ((touch ? 'Tap' : 'Click') + ' anything you like on the page.');
      if (!touch) statusEl.textContent = 'Or use the arrow keys to choose, then Pin this.';
      veil.hidden = false; bar.hidden = false; document.documentElement.classList.add('as-pointing');
      doneBtn.focus();
    }
    function stop() {
      if (!on) return;
      on = false; veil.hidden = true; bar.hidden = true; hoverBox.style.opacity = '0';
      document.documentElement.classList.remove('as-pointing');
      if (!pop.hidden) { pop.hidden = true; popPin = null; }
      if (o.onStop) o.onStop(added.slice());
    }
    return {
      start: start, stop: stop, isOn: function () { return on; }, pins: function () { return pins.slice(); },
      remove: removePin, edit: function (p) { if (p && p.dot) openPop(p); }, place: placeAll
    };
  }

  /* =================================================================== 2. the offline conversation */
  var KIND_WORDS = [
    ['cafe', /caf[eé]|coffee|bakery|bakehouse|patisserie|tea ?room/],
    ['restaurant', /restaurant|bistro|kitchen|takeaway|pizzeria|\bbar\b|\bpub\b|deli|catering/],
    ['clinic', /clinic|\bgp\b|doctor|dental|dentist|physio|osteo|therap|health|medical|pharmac|vet/],
    ['salon', /salon|hair|barber|beauty|nails?\b|\bspa\b|lash|brow|tattoo/],
    ['trades', /plumb|electric|builder|trade|heating|boiler|roof|carpent|joiner|decorat|clean|garden|locksmith|air con/],
    ['boutique', /shop|boutique|store|clothing|fashion|ceramic|gift|retail|jewel|florist|maker/]
  ];
  function kindOf(text) { var t = String(text || '').toLowerCase(); for (var i = 0; i < KIND_WORDS.length; i++) if (KIND_WORDS[i][1].test(t)) return KIND_WORDS[i][0]; return ''; }
  var WORK_FOR = { cafe: ['morrow', 'saltmarsh'], restaurant: ['saltmarsh', 'morrow'], clinic: ['bluebird'], salon: ['atelier-wren', 'bluebird'],
    trades: ['hart-and-sons', 'everest'], boutique: ['hollis-and-pine'], '': ['bluebird', 'everest', 'saltmarsh'] };
  var MOOD_LOOK = { Calm: 'Calm: soft colours and serif headings', Bold: 'Bold: strong contrast and heavy type', Classic: 'Classic: warm tones and italic serif type', Fresh: 'Fresh: white space, clean type and a bright accent' };
  var MOOD_KEY = { Calm: 'calm', Bold: 'bold', Classic: 'classic', Fresh: 'fresh' };
  var TIMING = ['As soon as possible', 'In 1 to 3 months', 'Just exploring'];
  var BUDGET = ['£1,000 to £2,000', '£2,000 to £4,000', '£4,000+', 'Not sure yet'];
  var GOAL_CHIPS = ['Take bookings', 'Sell online', 'Help people find us', 'Answer customers’ questions', 'Show our work'];
  var MUST_CHIPS = ['Online booking', 'Ordering ahead', 'An online shop', 'An AI assistant', 'A blog or news', 'Photos or video', 'More than one language'];
  var QUOTE = 'Every project is quoted personally after a short call.';
  // Contact details never go to the AI: anything that looks like an email address, a phone number (seven or more
  // digits) or a stated name is replaced with "(removed)". Assistant.stripContact(text) -> { text, found }.
  var EMAIL_RE = /[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[a-z]{2,}/gi;
  var EMAIL_WORDS_RE = /\b[\w.+-]+\s*(?:\(at\)|\[at\]|\sat\s)\s*[\w-]+\s*(?:\(dot\)|\[dot\]|\sdot\s)\s*[a-z]{2,}(?:\s*(?:\(dot\)|\[dot\]|\sdot\s|\.)\s*[a-z]{2,})?\b/gi;
  var PHONE_RE = /(?:\+\s?)?\(?\d[\d\s().\/-]{5,}\d/g;
  var NAME_RE = /\b(my name is|my name's|my name’s|call me|i'm called|i’m called|i am called|name:)\s+([A-Z\u00C0-\u024F][\w'’-]*(?:\s+[A-Z\u00C0-\u024F][\w'’-]*)?)/gi;
  var IAM_RE = /\b([Ii]'m|[Ii]’m|[Ii] am)\s+([A-Z\u00C0-\u024F][a-z\u00C0-\u024F'’-]+)(?=\s*(?:[,.!?;]|$|\s(?:and|from|here|at)\b))/g;
  function stripContact(input) {
    var found = false, hit = function () { found = true; return '(removed)'; };
    var t = String(input == null ? '' : input).replace(EMAIL_RE, hit).replace(EMAIL_WORDS_RE, hit)
      .replace(PHONE_RE, function (m) { if ((m.match(/\d/g) || []).length >= 7) { found = true; return '(removed)'; } return m; })
      .replace(NAME_RE, function (m, a) { found = true; return a + ' (removed)'; })
      .replace(IAM_RE, function (m, a, n) { if (/^(Looking|Opening|Starting|Running|Planning|Hoping|Thinking|Just|Not|Interested|Based|From|In|On|After|Trying|After|Here|Happy|Keen|Sure|Unsure|The|A|An)$/.test(n)) return m; found = true; return a + ' (removed)'; });
    return { text: t, found: found };
  }

  function script(options) {
    var o = options || {}, step = 'kind', lookDone = false;
    var Q = {
      business: { text: 'What does your business do, and where is it?', chips: [] },
      goals: { text: 'What should the website do for you? For example, take bookings, sell online, or help people find you.', chips: GOAL_CHIPS },
      must: { text: 'Is there anything it must have? Pick any that apply.', chips: MUST_CHIPS, multi: true },
      look: { text: 'How would you like it to look? Here’s some of our work, in case it helps.', chips: ['Calm', 'Bold', 'Classic', 'Fresh', 'Point at something', 'Show my business as a website'] },
      timing: { text: 'When would you like it?', chips: TIMING },
      budget: { text: 'Which budget range do you have in mind? ' + QUOTE, chips: BUDGET },
      notes: { text: 'Is there anything else Toff should know?', chips: ['No, that’s everything'] }
    };
    var ORDER = ['business', 'goals', 'must', 'look', 'timing', 'budget', 'notes'];
    function filled(b, s) {
      if (!b) return false;
      if (s === 'business') return !!b.business; if (s === 'goals') return !!(b.goals && b.goals.length);
      if (s === 'must') return !!(b.must_haves && b.must_haves.length); if (s === 'look') return !!b.look || lookDone;
      if (s === 'timing') return !!b.timing; if (s === 'budget') return !!b.budget; return false;
    }
    function ask(s, b, lead) {
      step = s;
      var q = Q[s], out = { text: (lead ? lead + ' ' : '') + q.text, calls: [], chips: q.chips.slice(), multi: !!q.multi };
      if (s === 'look') out.calls.push({ name: 'show_work', input: { projects: WORK_FOR[kindOf(b && b.business)] || WORK_FOR[''] } });
      return out;
    }
    function nextAfter(s, b, lead) {
      for (var i = ORDER.indexOf(s) + 1; i < ORDER.length; i++) if (!filled(b, ORDER[i]) || ORDER[i] === 'notes') return ask(ORDER[i], b, lead);
      return finish(lead);
    }
    function finish(lead) { step = 'done'; return { text: (lead ? lead + ' ' : '') + 'Thank you. Your summary is ready to check.', calls: [{ name: 'finish', input: {} }], chips: [] }; }
    function upd(field, value) { return { name: 'update_brief', input: { field: field, value: value } }; }
    function reAsk(lead, b) { var r = step === 'kind' || step === 'kind2' || step === 'done' ? { text: lead, calls: [], chips: [] } : ask(step, b, lead); if (step === 'look') r.calls = []; return r; }

    function reply(input, b) {
      var raw = String(input == null ? '' : input).trim(), text = raw, lead = '';
      var sc = stripContact(raw);
      if (sc.found) {
        text = sc.text.split(/(?<=[.!?])\s+/).map(function (sen) {
          if (sen.indexOf('(removed)') < 0) return sen;
          var clean = sen.replace(/\s*\(removed\)/g, '')
            .replace(/\b(my name is|my name's|my name’s|call me|i'm called|i’m called|i am called|name:|i'm|i’m|i am)\s*(?=[,.!?;]|$)/gi, '')
            .replace(/[,;]?\s*(?:and\s+|or\s+)?(?:you can\s+)?(?:my\s+|our\s+)?(?:email|e-mail|number|phone|mobile|contact)(?:\s+(?:address|number|details))?(?:\s+(?:is|me))?\s*:?\s*(?:at|on)?\s*(?=[,.;!?]|$)/gi, '')
            .replace(/\s+/g, ' ').replace(/^[\s,.;:!?-]+/, '').replace(/[\s,;:-]+([.!?]?)$/, '$1').trim();
          var words = clean.toLowerCase().replace(/\b(you|can|me|at|on|or|and|call|email|e-mail|text|ring|phone|reach|contact|whatsapp|is|my|our|hi|hello|thanks|please|i|i'm|i’m|am)\b/g, ' ').match(/[a-z\u00C0-\u024F]{2,}/g);
          return words && words.length >= 2 ? clean : '';
        }).filter(Boolean).join(' ').trim();
        lead = 'You’ll be asked for contact details at the very end, so I’ve left those out.';
        if (text.replace(/[^a-z]/gi, '').length < 3) return reAsk(lead, b);
      }
      var t = text.toLowerCase();
      if (/\b(price|prices|cost|costs|how much|expensive|cheap|charge|fee|fees|rates?)\b/.test(t)) return reAsk(QUOTE, b);
      if (/how long|how quickly|how soon can|timeline|timeframe|turnaround|deadline|how many weeks/.test(t)) {
        var tf = (o.timeframes || []).filter(Boolean);
        return reAsk(tf.length ? 'As a guide: ' + tf.join('; ') + '. ' + QUOTE : QUOTE + ' That includes the timing.', b);
      }
      if (/are you (a |an )?(real|human|person|bot|robot|ai)|talk to (a |an )?(real |actual )?(human|person|someone)|speak to (a |an )?(human|person|someone)/.test(t)) {
        return reAsk('I’m an AI assistant, not a person. Toff reads every brief personally, and you can leave your details at the end.', b);
      }

      if (step === 'kind' || step === 'kind2') {
        if (raw === 'Just looking') { step = 'kind2'; return { text: 'No problem. Have a look around. If anything on this site catches your eye, point at it and I’ll keep it in your brief.', calls: [], chips: ['Point at something', 'Plan a website'] }; }
        if (raw === 'Point at something') return { text: 'Point at anything you like, then come back here.', calls: [{ name: 'start_pointing', input: { hint: (touch ? 'Tap' : 'Click') + ' anything you’d like on your own site.' } }], chips: ['Plan a website'] };
        if (raw === 'Plan a website' || raw === 'Carry on') return filled(b, 'business') ? nextAfter('business', b) : ask('business', b);
        var calls = [];
        if (raw === 'A new website') calls.push(upd('notes', 'Looking for a new website'));
        else if (raw === 'A redesign') calls.push(upd('notes', 'Looking to redesign their current website'));
        else if (raw === 'An AI assistant') calls.push(upd('must_haves', 'An AI assistant that answers their customers'));
        else if (text.split(/\s+/).length >= 3) { calls.push(upd('business', text.slice(0, 200))); var n0 = nextAfter('business', b, lead); n0.calls = calls.concat(n0.calls); return n0; }
        var r0 = filled(b, 'business') ? nextAfter('business', b, lead) : ask('business', b, lead); r0.calls = calls.concat(r0.calls); return r0;
      }
      if (raw === 'Carry on') return nextAfter(step, b);
      if (step === 'business') {
        if (!text) return reAsk(lead, b);
        var r1 = nextAfter('business', b, lead); r1.calls.unshift(upd('business', text.slice(0, 200))); return r1;
      }
      if (step === 'goals') { var r2 = nextAfter('goals', b, lead); if (text) r2.calls.unshift(upd('goals', text.slice(0, 140))); return r2; }
      if (step === 'must') {
        var items = Array.isArray(input) ? input : (text && text !== 'Nothing in particular' ? [text.slice(0, 80)] : []);
        var r3 = nextAfter('must', b, lead); r3.calls = items.map(function (x) { return upd('must_haves', x); }).concat(r3.calls); return r3;
      }
      if (step === 'look') {
        if (MOOD_LOOK[raw]) { lookDone = true; var r4 = nextAfter('look', b); r4.calls.unshift(upd('look', MOOD_LOOK[raw])); return r4; }
        if (raw === 'Point at something') return { text: 'Point at anything on this site you’d like, then come back here.', calls: [{ name: 'start_pointing', input: { hint: (touch ? 'Tap' : 'Click') + ' anything you’d like on your own site.' } }], chips: ['Carry on'] };
        if (raw === 'Show my business as a website') {
          return { text: 'I’ve opened Design yours with your business. When you like it, press “Send this to Toff” and it’ll join your brief.',
            calls: [{ name: 'open_design_tool', input: { way: 'pick', business: kindOf(b && b.business), mood: '', layout: '', words: '' } }], chips: ['Carry on'] };
        }
        if (text) { lookDone = true; var r5 = nextAfter('look', b, lead); r5.calls.unshift(upd('look', text.slice(0, 300))); return r5; }
        return reAsk(lead, b);
      }
      if (step === 'timing') {
        var tv = TIMING.indexOf(raw) >= 0 ? raw : /soon|asap|urgent|now|quick/.test(t) ? TIMING[0] : /month|summer|spring|autumn|winter|year/.test(t) ? TIMING[1] : /explor|look|unsure|not sure|no rush/.test(t) ? TIMING[2] : '';
        var r6 = nextAfter('timing', b, lead);
        if (tv) r6.calls.unshift(upd('timing', tv)); else if (text) r6.calls.unshift(upd('notes', 'Timing: ' + text.slice(0, 180)));
        return r6;
      }
      if (step === 'budget') {
        var bv = BUDGET.indexOf(raw) >= 0 ? raw : /not sure|unsure|don.t know|no idea/.test(t) ? BUDGET[3] : '';
        var r7 = nextAfter('budget', b, lead);
        r7.calls.unshift(upd('budget', bv || BUDGET[3]));
        return r7;
      }
      if (step === 'notes') {
        var r8 = finish(lead);
        if (text && raw !== 'No, that’s everything') r8.calls.unshift(upd('notes', text.slice(0, 200)));
        return r8;
      }
      // after the end: anything else becomes a note
      if (text) return { text: (lead ? lead + ' ' : '') + 'I’ve added that to your brief.', calls: [upd('notes', text.slice(0, 200))], chips: [] };
      return { text: lead || 'I’m here if you need me.', calls: [], chips: [] };
    }
    function resume(b) {
      for (var i = 0; i < ORDER.length; i++) if (!filled(b, ORDER[i])) return ask(ORDER[i], b);
      return ask('notes', b);
    }
    function afterPins(n) {
      if (!n) return { text: 'No pins this time. Shall we carry on?', calls: [], chips: ['Carry on', 'Point at something'] };
      return { text: (n === 1 ? 'Your pin is' : 'Your ' + n + ' pins are') + ' in your brief. Shall we carry on?', calls: [], chips: ['Carry on', 'Point at something'] };
    }
    return { reply: reply, resume: resume, afterPins: afterPins, step: function () { return step; }, kindOf: kindOf };
  }

  /* =================================================================== 3. the round 03 to 04 corner panel */
  function mount(options) {
    var o = options || {};
    var mode = o.mode === 'live' && o.endpoint ? 'live' : 'demo';
    var CLICK = touch ? 'tap' : 'click';
    var brief = { name: '', business: '', need: '', pages: '', features: [], timing: '', budget: '', email: '', pins: [], designs: [], notes: [], transcript: [], created: new Date().toISOString() };
    var step = 'intro', waitingText = null, started = false;

    var root = el('div', 'as-root');
    root.classList.add('as-labelled'); var labelTimer = 0;
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
    root.appendChild(fab); root.appendChild(panel); document.body.appendChild(root);
    var log = panel.querySelector('.as-log'), chips = panel.querySelector('.as-chips'), input = panel.querySelector('.as-input');
    var badge = fab.querySelector('.as-badge'), pinCount = panel.querySelector('.as-pincount');

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
    var pt = pointer({
      snapshot: o.snapshot, ignore: '.as-root',
      onPin: function (p) { brief.pins.push(p); updateCount(); },
      onChange: function (p) { if (p.note || p.choice) reactToPin(p); },
      onRemove: function (p) { brief.pins.splice(brief.pins.indexOf(p), 1); updateCount(); },
      onStop: function () {
        if (panel.hidden) open();
        if (step === 'point') bot(brief.pins.length ? 'Got them. Shall we carry on?' : 'No pins this time. Shall we carry on?', function () { setChips(['I’m done pointing', 'Point at something']); });
      }
    });

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
      intro: function () { bot('Hello. I’m Toff’s planning assistant. I’ll help you put a brief together, and you can point at anything on this page you’d like in your own site.', function () { setChips(['Let’s start', 'Just looking']); }); },
      name: function () { bot('First, what’s your name?', function () { chips.innerHTML = ''; expectText('name', 'Your first name'); }); },
      business: function () { bot('Thanks, ' + brief.name + '. What kind of business is it?', function () { setChips(['Clinic', 'Café', 'Salon', 'Trades', 'Restaurant', 'Shop', 'Something else']); expectText('business', 'Or describe it in a few words'); }); },
      need: function () { bot('What do you need from us?', function () { setChips(['A new website', 'A redesign', 'Website and ongoing care', 'Not sure yet']); }); },
      point: function () { bot('If anything on this page catches your eye (a layout, a colour, an animation), tap “Point at something” and ' + CLICK + ' it. You can leave a note on each pin, then come back here.', function () { setChips(['Point at something', 'Skip this']); }); },
      pages: function () { bot('Roughly how many pages do you think you’ll need?', function () { setChips(['Just one', '2 to 5', '6 to 10', 'More than 10', 'Not sure']); }); },
      features: function () { bot('Which of these would you like? Pick as many as you want.', function () { setChips(FEATURES, true, function (list) { brief.features = list; say(list.length ? list.join(', ') : 'None of these', 'you'); go('timing'); }); }); },
      timing: function () { bot('When would you like it?', function () { setChips(['As soon as possible', 'In 1 to 3 months', 'Just exploring']); }); },
      budget: function () { bot('And a rough budget, so the quote fits?', function () { setChips(['£1,000 to £2,000', '£2,000 to £4,000', '£4,000+', 'Not sure yet']); }); },
      email: function () { bot('Where should Hy send your quote?' + (mode === 'demo' ? ' (This is a preview, so please don’t use real details yet.)' : ''), function () { chips.innerHTML = ''; expectText('email', 'you@example.com'); }); },
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
      if (typeof o.respond === 'function') {
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
    panel.querySelector('.as-form').addEventListener('submit', function (e) { e.preventDefault(); var v = input.value.trim(); if (!v) return; input.value = ''; freeText(v); });

    function open() {
      panel.hidden = false; fab.setAttribute('aria-expanded', 'true'); root.classList.add('as-open');
      if (!started) { started = true; go('intro'); }
      setTimeout(function () { (waitingText ? input : (chips.querySelector('button') || input)).focus(); }, 60);
    }
    function close() { panel.hidden = true; fab.setAttribute('aria-expanded', 'false'); root.classList.remove('as-open'); fab.focus(); }
    fab.addEventListener('click', function () { if (panel.hidden) open(); else close(); });
    panel.querySelector('.as-close').addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pt.isOn() && !panel.hidden) close(); });
    function startPointing() { panel.hidden = true; root.classList.remove('as-open'); pt.start(); }
    function updateCount() { var n = brief.pins.length; pinCount.textContent = n ? n + ' pin' + (n === 1 ? '' : 's') : ''; badge.hidden = !n; badge.textContent = String(n); }

    function addDesign(d, source) {
      if (!d) return;
      var entry = { source: source, summary: d.summary || '', colours: d.colours || null, config: d, snapshot: null };
      brief.designs = brief.designs.filter(function (x) { return x.source !== source; });
      brief.designs.push(entry);
      var node = document.querySelector(source === 'drawn' ? '.dr-pagewrap' : '.pg-laptop');
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

    return { open: open, close: close, startPointing: startPointing, stopPointing: pt.stop, brief: snapshotBrief, mode: function () { return mode; }, _answer: answer, _free: freeText };
  }

  window.Assistant = { mount: mount, pointer: pointer, script: script, kindOf: kindOf, stripContact: stripContact, PIN_CHOICES: PIN_CHOICES };
})();
