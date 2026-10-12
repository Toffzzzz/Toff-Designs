/*
 * AI assistants demo: a chat assistant for a made-up business, with the facts it has been taught shown beside it.
 * Visitors can edit any fact and ask again, so they see that the answers come from what the business tells it.
 *
 *   AIAssist.mount(document.getElementById('ai-assistants'), { endpoint: 'https://…/chat' })
 *
 * With no endpoint (or if the AI doesn't answer), answers are worked out on the page from the facts, and the
 * header says so. With an endpoint, each question goes to Claude through the studio's Cloudflare Worker, at most
 * a few per visit; the facts travel with the question, so edits still count.
 */
(function () {
  'use strict';

  var DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  // The made-up businesses. hours rows cover days (0 = Sunday); everything in "value" can be edited by the visitor.
  var BUSINESSES = {
    clinic: {
      tab: 'Clinic', name: 'Linden Clinic', kind: 'a private GP clinic in Notting Hill',
      hours: [{ days: 'Monday to Friday', covers: [1, 2, 3, 4, 5], value: '8am to 7pm' }, { days: 'Saturday', covers: [6], value: '9am to 1pm' }, { days: 'Sunday', covers: [0], value: 'Closed' }],
      prices: [{ item: 'GP appointment', value: '£95 for 30 minutes', words: 'gp appointment doctor consultation see' }, { item: 'Video appointment', value: '£75', words: 'video online call remote' }, { item: 'Health check', value: 'from £245', words: 'health check checkup check-up blood test' }],
      facts: [
        { id: 'book', label: 'Booking', value: 'Book online with the Book button, usually for the same or next day.', words: /book|appointment|available|slot|anything|space|see (a|the) doctor/ },
        { id: 'where', label: 'Finding us', value: 'Ten minutes’ walk from Notting Hill Gate station. Paid street parking nearby.', words: /where|address|park|find you|located|station|directions/ },
        { id: 'limits', label: 'Limits', value: 'Never gives medical advice. Suggests booking, NHS 111, or 999 in an emergency.', limits: true }
      ],
      medical: /symptom|pain|hurt|ache|rash|fever|temperature|dizzy|bleed|lump|should i (take|be worried)|is it serious|diagnos|medicine|medication|dose|pregnan|chest|breath/,
      opener: 'Do you have anything on Saturday?', chips: ['Do you have anything on Saturday?', 'How much is a GP appointment?', 'I’ve had a headache for a week, what should I take?', 'Is there parking?']
    },
    cafe: {
      tab: 'Café', name: 'Morrow Coffee', kind: 'a neighbourhood café',
      hours: [{ days: 'Monday to Friday', covers: [1, 2, 3, 4, 5], value: '7.30am to 4pm' }, { days: 'Saturday and Sunday', covers: [6, 0], value: '8.30am to 4pm' }],
      prices: [{ item: 'Flat white', value: '£3.40', words: 'flat white coffee latte cappuccino' }, { item: 'Pastries', value: 'from £2.80', words: 'pastry pastries croissant cake bun' }, { item: 'Sourdough toast', value: '£4.50', words: 'toast sourdough breakfast food' }],
      facts: [
        { id: 'diet', label: 'Milk and allergies', value: 'Oat, almond and soy milk at no extra cost. Gluten-free brownie. Our kitchen uses nuts.', words: /oat|almond|soy|milk|vegan|dairy|gluten|allerg|nut|coeliac/ },
        { id: 'seats', label: 'Seating', value: '24 seats inside, a bench outside. Dogs welcome. No bookings, just walk in.', words: /seat|table|book|reserv|dog|outside|\bsit\b|group/ },
        { id: 'limits', label: 'Limits', value: 'Only talks about the café. Never guesses about allergies; suggests asking the team in person.', limits: true }
      ],
      opener: 'Do you have oat milk, and are you open on Sunday?', chips: ['Do you have oat milk, and are you open on Sunday?', 'How much is a flat white?', 'Can I book a table for six?', 'Are dogs allowed?']
    },
    salon: {
      tab: 'Salon', name: 'Atelier Wren', kind: 'a hair studio',
      hours: [{ days: 'Tuesday, Wednesday and Friday', covers: [2, 3, 5], value: '9am to 6pm' }, { days: 'Thursday', covers: [4], value: '9am to 8pm' }, { days: 'Saturday', covers: [6], value: '9am to 5pm' }, { days: 'Sunday and Monday', covers: [0, 1], value: 'Closed' }],
      prices: [{ item: 'Cut and finish', value: 'from £58', words: 'cut haircut trim finish style' }, { item: 'Full colour', value: 'from £85', words: 'colour color dye highlights balayage tint' }, { item: 'Blow-dry', value: '£35', words: 'blow dry blowdry blow-dry' }],
      facts: [
        { id: 'book', label: 'Booking', value: 'Book online. Please give 24 hours’ notice to cancel or move an appointment.', words: /book|appointment|cancel|move|resched|available|slot|can i (get|come)/ },
        { id: 'patch', label: 'Colour patch test', value: 'A quick patch test at least 48 hours before your first colour with us.', words: /patch|test|first colour|first color|allerg|sensitive/ },
        { id: 'limits', label: 'Limits', value: 'Only talks about the salon. Hands over to the team for anything it isn’t sure of.', limits: true }
      ],
      opener: 'Can I get a cut on Thursday evening?', chips: ['Can I get a cut on Thursday evening?', 'How much is a full colour?', 'Do I need a patch test?', 'Are you open on Monday?']
    },
    trades: {
      tab: 'Trades', name: 'Hart & Sons Plumbing', kind: 'a plumbing and heating firm',
      hours: [{ days: 'Monday to Saturday', covers: [1, 2, 3, 4, 5, 6], value: '8am to 6pm' }, { days: 'Sunday', covers: [0], value: 'Emergency call-outs only' }],
      prices: [{ item: 'Boiler service', value: '£95', words: 'boiler service annual servicing' }, { item: 'Emergency call-out', value: '£120, then £60 an hour', words: 'emergency call out callout urgent leak burst' }, { item: 'Quote visit', value: 'Free', words: 'quote estimate visit price bathroom install new' }],
      facts: [
        { id: 'area', label: 'Area we cover', value: 'West London, from Paddington out to Ealing.', words: /area|cover|\bcome to\b|travel|postcode|ealing|paddington|where/ },
        { id: 'urgent', label: 'Emergencies', value: 'Call any time for leaks, no heating or no hot water. If you smell gas, call the gas emergency line first.', words: /emergenc|leak|burst|flood|no heat|no hot water|gas|smell|urgent|tonight/ },
        { id: 'limits', label: 'Limits', value: 'Gives prices from the list only. Anything bigger gets a free quote visit.', limits: true }
      ],
      opener: 'My boiler needs a service, how much is it?', chips: ['My boiler needs a service, how much is it?', 'I’ve got a leak, can someone come tonight?', 'Do you cover Ealing?', 'Can you quote for a new bathroom?']
    }
  };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function lower(s) { return String(s || '').toLowerCase().replace(/[’']/g, "'"); }
  function lc1(s) { s = String(s); return /^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s; }   // "Closed" → "closed", but "GP" stays

  // ---------------------------------------------------------------- answers worked out from the facts (no AI)
  function dayIn(q, now) {
    var t = lower(q);
    if (/\btoday\b|\bnow\b|\bthis (morning|afternoon|evening)\b|\btonight\b/.test(t)) return now.getDay();
    if (/\btomorrow\b/.test(t)) return (now.getDay() + 1) % 7;
    for (var d = 0; d < 7; d++) if (t.indexOf(DAYS[d]) >= 0 || new RegExp('\\b' + DAYS[d].slice(0, 3) + '\\b').test(t)) return d;
    if (/weekend/.test(t)) return 6;
    return -1;
  }
  function rowFor(b, d) { for (var i = 0; i < b.hours.length; i++) if (b.hours[i].covers.indexOf(d) >= 0) return b.hours[i]; return null; }
  function closed(v) { return /closed|shut/i.test(v); }
  function hoursAll(b) { return b.hours.map(function (r) { return r.days + ': ' + lc1(r.value); }).join('. ') + '.'; }
  function dayName(d) { return DAYS[d].charAt(0).toUpperCase() + DAYS[d].slice(1); }
  function hoursFor(b, d, today) {
    var r = rowFor(b, d), name = dayName(d);
    if (today && r) return closed(r.value) ? 'We’re closed today.' : /emergenc/i.test(r.value) ? 'Today it’s ' + lc1(r.value) + '.' : 'Today we’re open ' + lc1(r.value) + '.';
    if (!r) return 'I don’t have our hours for ' + name + ' yet.';
    if (closed(r.value)) return 'We’re closed on ' + name + '.';
    if (/emergenc/i.test(r.value)) return 'On ' + name + ' it’s ' + lc1(r.value) + '.';
    return 'On ' + name + ' we’re open ' + lc1(r.value) + '.';
  }
  function priceMatch(b, q) {
    var t = lower(q), best = null, bestScore = 0;
    b.prices.forEach(function (p) { var s = 0; (p.words + ' ' + lower(p.item)).split(/\s+/).forEach(function (w) { if (w.length > 2 && t.indexOf(w) >= 0) s++; }); if (s > bestScore) { bestScore = s; best = p; } });
    return best;
  }

  function answer(key, b, q, now) {
    var t = lower(q), parts = [], src = [], lim = b.facts.filter(function (f) { return f.limits; })[0];
    function use(text, label) { parts.push(text); if (label && src.indexOf(label) < 0) src.push(label); }
    if (b.medical && b.medical.test(t)) {
      return { text: 'I’m sorry, I can’t give medical advice, but one of our doctors can. You can book a GP appointment with the Book button. If it’s urgent call NHS 111, and in an emergency call 999.', src: [lim.label] };
    }
    if (/^\s*(hi|hello|hey|good (morning|afternoon|evening))\b/.test(t) && t.length < 24) {
      return { text: 'Hello. I’m ' + b.name + '’s AI assistant. Ask me about opening times, prices or anything else about us.', src: [] };
    }
    var d = dayIn(q, now), named = DAYS.some(function (x) { return t.indexOf(x) >= 0; }) || /weekend/.test(t);
    var wantsHours = /open|close|hours|what time|when|until|late|early/.test(t) || (named && !/price|cost|how much/.test(t));
    var p = priceMatch(b, q), wantsPrice = /price|cost|how much|charge|fee|£|expensive|cheap/.test(t);
    b.facts.forEach(function (f) { if (!f.limits && f.words && f.words.test(t) && !(wantsPrice && p && f.id === 'book')) use(f.value, f.label); });
    if (p && (wantsPrice || !parts.length)) use(p.item + ' is ' + lc1(p.value) + '.', 'Prices');
    else if (wantsPrice) use('Our prices: ' + b.prices.map(function (x) { return lc1(x.item) + ' ' + lc1(x.value); }).join('; ') + '.', 'Prices');
    if (wantsHours) {
      if (d >= 0) use(hoursFor(b, d, !named && d === now.getDay()), 'Opening hours');
      else use('Our opening hours are: ' + hoursAll(b), 'Opening hours');
    }
    if (!parts.length) return { text: 'I haven’t been taught that, so I won’t guess. Would you like to leave a message for the team?', src: [lim.label] };
    return { text: parts.join(' '), src: src };
  }

  // ---------------------------------------------------------------- the section
  function mount(root, options) {
    var o = options || {}, endpoint = o.endpoint || '', liveLeft = o.maxLive || 8, now = o.now ? o.now() : new Date();
    var bizBox = root.querySelector('.aa-biz'), log = root.querySelector('.aa-log'), chips = root.querySelector('.aa-chips');
    var form = root.querySelector('.aa-form'), input = root.querySelector('.aa-input'), send = root.querySelector('.aa-send');
    var factsBox = root.querySelector('.aa-facts'), nameEl = root.querySelector('.aa-name'), modeEl = root.querySelector('.aa-mode');
    var state = { key: o.start || 'cafe', history: [], last: '', busy: false, edited: {} };
    var data = JSON.parse(JSON.stringify(BUSINESSES, function (k, v) { return v instanceof RegExp ? { __re: v.source } : v; }), function (k, v) { return v && v.__re ? new RegExp(v.__re) : v; });   // a copy the visitor can edit

    modeEl.textContent = endpoint ? 'Answered live by Claude, an AI. Your questions are sent to Anthropic to be answered and aren’t stored.'
      : 'Preview: these answers are put together from what it’s been taught. On your website, a live AI replies.';

    Object.keys(data).forEach(function (k) {
      var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'aa-tab'; bt.textContent = data[k].tab; bt.setAttribute('data-k', k);
      bt.setAttribute('aria-pressed', k === state.key ? 'true' : 'false');
      bt.addEventListener('click', function () { choose(k); });
      bizBox.appendChild(bt);
    });

    function biz() { return data[state.key]; }
    function factInput(label, value, onChange, id) {
      var row = document.createElement('label'); row.className = 'aa-fact'; row.setAttribute('data-src', id);
      row.innerHTML = '<span class="aa-fact-label">' + esc(label) + '</span>';
      var long = value.length > 34, inp = document.createElement(long ? 'textarea' : 'input');   // long facts wrap onto more lines
      if (long) { inp.rows = 2; } else inp.type = 'text';
      inp.value = value; inp.maxLength = 160; inp.className = 'aa-fact-input';
      function fit() { if (long) { inp.style.height = 'auto'; inp.style.height = inp.scrollHeight + 'px'; } }
      inp.addEventListener('input', function () { onChange(inp.value); fit(); row.classList.add('is-edited'); state.edited[state.key] = true; offerAgain(); });
      inp.addEventListener('keydown', function (e) { if (long && e.key === 'Enter') e.preventDefault(); });   // one fact, one paragraph
      setTimeout(fit, 0);
      row.appendChild(inp); return row;
    }
    function group(title, id) { var g = document.createElement('div'); g.className = 'aa-group'; g.setAttribute('data-group', id); g.innerHTML = '<p class="aa-group-title">' + esc(title) + '</p>'; factsBox.appendChild(g); return g; }
    function renderFacts() {
      var b = biz(); factsBox.innerHTML = '';
      var g1 = group('Opening hours', 'Opening hours');
      b.hours.forEach(function (r) { g1.appendChild(factInput(r.days, r.value, function (v) { r.value = v; }, 'Opening hours')); });
      var g2 = group('Prices', 'Prices');
      b.prices.forEach(function (p) { g2.appendChild(factInput(p.item, p.value, function (v) { p.value = v; }, 'Prices')); });
      b.facts.forEach(function (f) { var g = group(f.label, f.label); g.appendChild(factInput(f.label, f.value, function (v) { f.value = v; }, f.label)); g.querySelector('.aa-fact-label').classList.add('visually-hidden'); });
    }
    function flash(labels) {
      [].slice.call(factsBox.querySelectorAll('.aa-group')).forEach(function (g) { g.classList.toggle('is-used', labels.indexOf(g.getAttribute('data-group')) >= 0); });
    }
    function bubble(who, text, src, note) {
      var li = document.createElement('li'); li.className = 'aa-msg aa-' + who;
      li.innerHTML = '<p class="aa-text">' + esc(text) + '</p>' + (src && src.length ? '<p class="aa-src">From: ' + src.map(esc).join(', ') + '</p>' : '') + (note ? '<p class="aa-src aa-fallback">' + esc(note) + '</p>' : '');
      log.appendChild(li); log.scrollTop = log.scrollHeight; return li;
    }
    function renderChips(extra) {
      chips.innerHTML = '';
      var asked = [biz().opener, biz().chips.filter(function (c) { return c !== biz().opener; })[0]];
      var list = biz().chips.filter(function (c) { return asked.indexOf(c) < 0; });
      if (extra) list = [extra].concat(list.filter(function (c) { return c !== extra; }));
      list.slice(0, 4).forEach(function (c, i) {
        var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'aa-chip' + (extra && i === 0 ? ' aa-chip-again' : ''); bt.textContent = extra && i === 0 ? 'Ask that again: ' + c : c;
        bt.addEventListener('click', function () { ask(c); }); chips.appendChild(bt);
      });
    }
    function offerAgain() { if (state.last) renderChips(state.last); }
    function choose(k) {
      state.key = k; state.history = []; state.last = '';
      [].slice.call(bizBox.children).forEach(function (bt) { bt.setAttribute('aria-pressed', bt.getAttribute('data-k') === k ? 'true' : 'false'); });
      var b = biz(); nameEl.textContent = b.name + ' assistant';
      renderFacts(); log.innerHTML = '';
      bubble('bot', 'Hello. I’m ' + b.name + '’s AI assistant, here to help with times, prices and booking.');
      [b.opener, b.chips.filter(function (c) { return c !== b.opener; })[0]].forEach(function (q) {   // two questions already asked, so nobody faces an empty box
        var a = answer(k, b, q, now); bubble('you', q); bubble('bot', a.text, a.src); flash(a.src); state.last = q;
        state.history.push({ role: 'user', content: q }, { role: 'assistant', content: a.text });
      });
      renderChips();
    }

    function live(q) {
      var b = biz(), lines = [];
      b.hours.forEach(function (r) { lines.push({ label: 'Opening hours', text: r.days + ': ' + r.value }); });
      b.prices.forEach(function (p) { lines.push({ label: 'Prices', text: p.item + ': ' + p.value }); });
      b.facts.forEach(function (f) { lines.push({ label: f.label, text: f.value }); });
      var ctl = window.AbortController ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 12000);
      return fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl ? ctl.signal : undefined,
        body: JSON.stringify({ business: b.name, kind: b.kind, clinic: state.key === 'clinic', facts: lines, history: state.history.slice(-6), question: q }) })
        .then(function (r) { clearTimeout(timer); if (!r.ok) throw new Error('status ' + r.status); return r.json(); })
        .then(function (j) { if (!j || typeof j.reply !== 'string' || !j.reply.trim()) throw new Error('empty'); return { text: j.reply.trim().slice(0, 700), src: Array.isArray(j.sources) ? j.sources.slice(0, 3).map(String) : [] }; });
    }

    function ask(q) {
      q = String(q || '').trim().slice(0, 200); if (!q || state.busy) return;
      state.busy = true; send.disabled = true; input.value = ''; state.last = q;
      bubble('you', q);
      var wait = bubble('bot aa-wait', 'Thinking'); wait.setAttribute('aria-label', 'The assistant is answering');
      var local = answer(state.key, biz(), q, now);
      function done(a, note) {
        wait.remove(); bubble('bot', a.text, a.src, note); flash(a.src);
        state.history.push({ role: 'user', content: q }, { role: 'assistant', content: a.text });
        state.busy = false; send.disabled = false; renderChips();
      }
      if (endpoint && liveLeft > 0) {
        liveLeft--;
        live(q).then(function (a) { done(a, liveLeft === 0 ? 'That’s the last live answer for this visit. From here on, answers are worked out from what it’s been taught.' : ''); },
          function () { done(local, 'The live AI didn’t answer this time, so this answer was worked out from the facts.'); });
      } else setTimeout(function () { done(local); }, 450);
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); });

    choose(state.key);
    return { ask: ask, choose: choose, state: function () { return { key: state.key, busy: state.busy, live: !!endpoint, liveLeft: liveLeft }; }, data: data, _answer: answer };
  }

  window.AIAssist = { mount: mount, BUSINESSES: BUSINESSES, answer: answer };
})();
