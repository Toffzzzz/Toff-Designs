/*
 * AI assistants demo: a chat assistant for a made-up business, with the facts it has been taught shown beside it.
 * Visitors can edit any fact and ask again, so they see that the answers come from what the business tells it.
 *
 * Round 05: the home page's AI chapter (assets/home/agent.js) uses this file as its on-page engine:
 *   AIAssist.BUSINESSES             the four made-up businesses and their facts (the concept sites match them)
 *   AIAssist.answer(key, b, q, now)  -> { text, src, lang }      an answer worked out from the facts (no AI)
 *   AIAssist.act(key, b, q, ctx)     -> Promise<{ text, src, lang, offer } | null>
 *       the same actions the live AI takes, from on-page rules: "a flat white and a cardamom bun for 9am",
 *       "a cut on Thursday evening", "book a video appointment", "boiler service next week, how much".
 *       ctx = { today: 'YYYY-MM-DD' (London, from the frame), call(action, args) -> Promise<result>, offer }
 *       call() is Contract A's frame.call (rejects with { code, message }). null means "not an action".
 *       offer is the previous answer's offer ({ label, kind, … }), carried out when the visitor says yes.
 *   AIAssist.isSpanish(q)            true for a question written in Spanish (answers then come in Spanish)
 *
 * Round 04's section (kept working while its old markup is still on a page):
 *   AIAssist.mount(document.getElementById('ai-assistants'), { endpoint: 'https://…/chat' })
 * With no endpoint (or if the AI doesn't answer), answers are worked out on the page from the facts, and the
 * header says so. With an endpoint, each question goes to Claude through the studio's Cloudflare Worker, at most
 * a few per visit; the facts travel with the question, so edits still count.
 */
(function () {
  'use strict';

  var DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  // The made-up businesses. hours rows cover days (0 = Sunday); everything in "value" can be edited by the visitor.
  // (Round 05 added Spanish keywords to "words", Spanish names ("es"), openers, suggestions and what each can do on
  //  its own site ("can"). The facts themselves are unchanged.)
  var BUSINESSES = {
    clinic: {
      tab: 'Clinic', name: 'Linden Clinic', kind: 'a private GP clinic in Notting Hill',
      hours: [{ days: 'Monday to Friday', covers: [1, 2, 3, 4, 5], value: '8am to 7pm' }, { days: 'Saturday', covers: [6], value: '9am to 1pm' }, { days: 'Sunday', covers: [0], value: 'Closed' }],
      prices: [{ item: 'GP appointment', es: 'Una cita con el médico de cabecera', value: '£95 for 30 minutes', words: 'gp appointment doctor consultation see medico cita consulta' }, { item: 'Video appointment', es: 'Una videoconsulta', value: '£75', words: 'video online call remote videoconsulta videollamada' }, { item: 'Health check', es: 'Un chequeo', value: 'from £245', words: 'health check checkup check-up blood test chequeo revision analisis' }],
      facts: [
        { id: 'book', label: 'Booking', value: 'Book online with the Book button, usually for the same or next day.', words: /book|appointment|available|slot|anything|space|see (a|the) doctor|reserv|cita|hueco|libre/ },
        { id: 'where', label: 'Finding us', value: 'Ten minutes’ walk from Notting Hill Gate station. Paid street parking nearby.', words: /where|address|park|find you|located|station|directions|donde|direccion|aparca|estacion|como llego/ },
        { id: 'limits', label: 'Limits', value: 'Never gives medical advice. Suggests booking, NHS 111, or 999 in an emergency.', limits: true }
      ],
      medical: /symptom|pain|hurt|ache|rash|fever|temperature|dizzy|bleed|lump|should i (take|be worried)|is it serious|diagnos|medicine|medication|dose|pregnan|chest|breath|sintoma|dolor|duele|fiebre|mareo|sangr|bulto|medicina|medicamento|pastilla|dosis|embaraz|pecho|respir|que tomo|que debo tomar/,
      opener: 'Do you have anything on Saturday?', chips: ['Do you have anything on Saturday?', 'How much is a GP appointment?', 'I’ve had a headache for a week, what should I take?', 'Is there parking?'],
      openers: ['How much is a GP appointment?', 'Is there parking?'],
      suggest: ['Book a video appointment', 'Do you have anything on Saturday?', 'I’ve had a headache for a week, what should I take?', '¿Puedo reservar una videoconsulta para mañana?'],
      can: ['Find free appointment times', 'Hold an appointment for 10 minutes, in the name Guest']
    },
    cafe: {
      tab: 'Café', name: 'Morrow Coffee', kind: 'a neighbourhood café',
      hours: [{ days: 'Monday to Friday', covers: [1, 2, 3, 4, 5], value: '7.30am to 4pm' }, { days: 'Saturday and Sunday', covers: [6, 0], value: '8.30am to 4pm' }],
      prices: [{ item: 'Flat white', es: 'Un flat white', value: '£3.40', words: 'flat white coffee latte cappuccino cafe' }, { item: 'Pastries', es: 'La bollería', value: 'from £2.80', words: 'pastry pastries croissant cake bun bolleria bollo bollos cruasan pastel' }, { item: 'Sourdough toast', es: 'La tostada de masa madre', value: '£4.50', words: 'toast sourdough breakfast food tostada desayuno' }],
      facts: [
        { id: 'diet', label: 'Milk and allergies', value: 'Oat, almond and soy milk at no extra cost. Gluten-free brownie. Our kitchen uses nuts.', words: /oat|almond|soy|milk|vegan|dairy|gluten|allerg|nut|coeliac|avena|almendra|soja|leche|celiac|frutos secos/ },
        { id: 'seats', label: 'Seating', value: '24 seats inside, a bench outside. Dogs welcome. No bookings, just walk in.', words: /seat|table|book|reserv|dog|outside|\bsit\b|group|mesa|perro|fuera|sentar|terraza/ },
        { id: 'limits', label: 'Limits', value: 'Only talks about the café. Never guesses about allergies; suggests asking the team in person.', limits: true }
      ],
      opener: 'Do you have oat milk, and are you open on Sunday?', chips: ['Do you have oat milk, and are you open on Sunday?', 'How much is a flat white?', 'Can I book a table for six?', 'Are dogs allowed?'],
      openers: ['Do you have oat milk, and are you open on Sunday?', 'How much is a flat white?'],
      suggest: ['A flat white and a cardamom bun for 9am', 'Two oat lattes to collect at 10.30', 'Can I book a table for six?', '¿Me pones un flat white con leche de avena para las 10?'],
      can: ['Add drinks and food to a collection order', 'Set the collection time (you pay when you collect)']
    },
    salon: {
      tab: 'Salon', name: 'Atelier Wren', kind: 'a hair studio',
      hours: [{ days: 'Tuesday, Wednesday and Friday', covers: [2, 3, 5], value: '9am to 6pm' }, { days: 'Thursday', covers: [4], value: '9am to 8pm' }, { days: 'Saturday', covers: [6], value: '9am to 5pm' }, { days: 'Sunday and Monday', covers: [0, 1], value: 'Closed' }],
      prices: [{ item: 'Cut and finish', es: 'Un corte y peinado', value: 'from £58', words: 'cut haircut trim finish style corte cortar' }, { item: 'Full colour', es: 'Un color completo', value: 'from £85', words: 'colour color dye highlights balayage tint tinte mechas' }, { item: 'Blow-dry', es: 'Un secado con brushing', value: '£35', words: 'blow dry blowdry blow-dry secado brushing peinado' }],
      facts: [
        { id: 'book', label: 'Booking', value: 'Book online. Please give 24 hours’ notice to cancel or move an appointment.', words: /book|appointment|cancel|move|resched|available|slot|can i (get|come)|reserv|cita|cancelar|cambiar|mover/ },
        { id: 'patch', label: 'Colour patch test', value: 'A quick patch test at least 48 hours before your first colour with us.', words: /patch|test|first colour|first color|allerg|sensitive|prueba|alergi/ },
        { id: 'limits', label: 'Limits', value: 'Only talks about the salon. Hands over to the team for anything it isn’t sure of.', limits: true }
      ],
      opener: 'Can I get a cut on Thursday evening?', chips: ['Can I get a cut on Thursday evening?', 'How much is a full colour?', 'Do I need a patch test?', 'Are you open on Monday?'],
      openers: ['How much is a full colour?', 'Do I need a patch test?'],
      suggest: ['Can I get a cut on Thursday evening?', 'A blow-dry on Saturday morning with Isla', 'Are you open on Monday?', '¿Tenéis hueco para un corte el sábado por la mañana?'],
      can: ['Find free times with any of the four stylists', 'Hold a booking for 10 minutes, in the name Guest']
    },
    trades: {
      tab: 'Trades', name: 'Hart & Sons Plumbing', kind: 'a plumbing and heating firm',
      hours: [{ days: 'Monday to Saturday', covers: [1, 2, 3, 4, 5, 6], value: '8am to 6pm' }, { days: 'Sunday', covers: [0], value: 'Emergency call-outs only' }],
      prices: [{ item: 'Boiler service', es: 'La revisión de la caldera', value: '£95', words: 'boiler service annual servicing caldera revision revisar' }, { item: 'Emergency call-out', es: 'Una salida de urgencia', value: '£120, then £60 an hour', words: 'emergency call out callout urgent leak burst urgencia fuga' }, { item: 'Quote visit', es: 'Una visita para dar presupuesto', value: 'Free', words: 'quote estimate visit price bathroom install new presupuesto bano' }],
      facts: [
        { id: 'area', label: 'Area we cover', value: 'West London, from Paddington out to Ealing.', words: /area|cover|\bcome to\b|travel|postcode|ealing|paddington|where|zona|cubr|codigo postal|donde/ },
        { id: 'urgent', label: 'Emergencies', value: 'Call any time for leaks, no heating or no hot water. If you smell gas, call the gas emergency line first.', words: /emergenc|leak|burst|flood|no heat|no hot water|gas|smell|urgent|tonight|urgencia|fuga|inunda|calefaccion|agua caliente|huele|olor/ },
        { id: 'limits', label: 'Limits', value: 'Gives prices from the list only. Anything bigger gets a free quote visit.', limits: true }
      ],
      opener: 'My boiler needs a service, how much is it?', chips: ['My boiler needs a service, how much is it?', 'I’ve got a leak, can someone come tonight?', 'Do you cover Ealing?', 'Can you quote for a new bathroom?'],
      openers: ['Do you cover Ealing?', 'Can you quote for a new bathroom?'],
      suggest: ['Boiler service next week, how much?', 'I’ve got a leak, can someone come today?', 'I can smell gas', '¿Cuánto cuesta revisar la caldera?'],
      can: ['Show a price from their price list', 'Request a visit for a day and a morning or afternoon, in the name Guest']
    }
  };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function lower(s) { return String(s || '').toLowerCase().replace(/[’']/g, "'"); }
  // lower case, straight apostrophes and no accents (so "sábado", "mañana" and "miércoles" match as "sabado", "manana", "miercoles")
  function norm(s) { return lower(s).normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function lc1(s) { s = String(s); return /^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s; }   // "Closed" → "closed", but "GP" stays
  function uc1(s) { s = String(s); return s.charAt(0).toUpperCase() + s.slice(1); }

  // ---------------------------------------------------------------- Spanish
  var ES_WORDS = /\b(hola|buenas|quiero|quisiera|querria|puedo|podria|podeis|puedes|pueden|teneis|tienen|tienes|tiene|hay|cuanto|cuanta|cuesta|cuestan|precio|abierto|abiertos|abris|abren|abre|cerrado|manana|tarde|noche|hoy|lunes|martes|miercoles|jueves|viernes|sabado|domingo|cita|reservar|reserva|leche|avena|corte|caldera|gracias|favor|para|una|uno|un|el|los|las|del|con|semana|que|me|mi|es|esta|son|necesito|cubris|zona|venir|alguien|perros|mesa|pones|revisar|hueco)\b/g;
  var EN_WORDS = /\b(the|a|an|is|are|do|does|you|your|can|could|i|i'm|i've|for|and|to|my|have|how|much|what|when|on|at|of|please|need|there|it|book|open|with|next|week)\b/g;
  function isSpanish(q) {
    if (/[¿¡ñÑ]/.test(q)) return true;
    var t = norm(q), es = (t.match(ES_WORDS) || []).length, en = (t.match(EN_WORDS) || []).length;
    return es >= 2 && es > en;
  }
  var ES_DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var ES_MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var ES_ROWS = { 'Monday to Friday': 'De lunes a viernes', 'Monday to Saturday': 'De lunes a sábado', 'Saturday': 'Sábado', 'Sunday': 'Domingo', 'Thursday': 'Jueves',
    'Saturday and Sunday': 'Sábado y domingo', 'Sunday and Monday': 'Domingo y lunes', 'Tuesday, Wednesday and Friday': 'Martes, miércoles y viernes' };
  // An hours or price value in Spanish, for the common shapes ("8am to 7pm", "from £58", "£120, then £60 an hour"); anything else stays as written.
  function valEs(v) {
    var s = String(v).trim();
    if (/^closed$/i.test(s)) return 'cerrado';
    if (/^emergency call-outs only$/i.test(s)) return 'solo urgencias';
    if (/^free$/i.test(s)) return 'gratis';
    var m = /^(\S+) to (\S+)$/.exec(s);
    if (m) return 'de ' + m[1] + ' a ' + m[2];
    return s.replace(/^from /i, 'desde ').replace(/ for (\d+) minutes/i, ' por $1 minutos').replace(/, then (£\d+) an hour/i, ' y luego $1 la hora');
  }
  function dayEs(date) { var p = date.split('-'); return ES_DAYS[dowIso(date)] + ' ' + (+p[2]) + ' de ' + ES_MONTHS[+p[1] - 1]; }

  // ---------------------------------------------------------------- answers worked out from the facts (no AI)
  function dayIn(q, now) {
    var t = norm(q);
    if (/\btoday\b|\bnow\b|\bthis (morning|afternoon|evening)\b|\btonight\b|\bhoy\b|\besta (tarde|noche|manana)\b|\bahora\b/.test(t)) return now.getDay();
    if (/\btomorrow\b/.test(t) || /\bmanana\b/.test(t.replace(/por la manana/g, ' '))) return (now.getDay() + 1) % 7;
    for (var d = 0; d < 7; d++) if (t.indexOf(DAYS[d]) >= 0 || new RegExp('\\b' + DAYS[d].slice(0, 3) + '\\b').test(t) || new RegExp('\\b' + norm(ES_DAYS[d]) + '\\b').test(t)) return d;
    if (/weekend|fin de semana/.test(t)) return 6;
    return -1;
  }
  function rowFor(b, d) { for (var i = 0; i < b.hours.length; i++) if (b.hours[i].covers.indexOf(d) >= 0) return b.hours[i]; return null; }
  function closed(v) { return /closed|shut/i.test(v); }
  function hoursAll(b, es) {
    if (es) return b.hours.map(function (r) { return (ES_ROWS[r.days] || r.days) + ': ' + valEs(r.value); }).join('. ') + '.';
    return b.hours.map(function (r) { return r.days + ': ' + lc1(r.value); }).join('. ') + '.';
  }
  function dayName(d) { return DAYS[d].charAt(0).toUpperCase() + DAYS[d].slice(1); }
  function hoursFor(b, d, today, es) {
    var r = rowFor(b, d), name = dayName(d);
    if (es) {
      var dn = ES_DAYS[d];
      if (today && r) return closed(r.value) ? 'Hoy está cerrado.' : /emergenc/i.test(r.value) ? 'Hoy, ' + valEs(r.value) + '.' : 'Hoy abrimos ' + valEs(r.value) + '.';
      if (!r) return 'Todavía no tengo el horario del ' + dn + '.';
      if (closed(r.value)) return 'El ' + dn + ' está cerrado.';
      if (/emergenc/i.test(r.value)) return 'El ' + dn + ', ' + valEs(r.value) + '.';
      return 'El ' + dn + ' abrimos ' + valEs(r.value) + '.';
    }
    if (today && r) return closed(r.value) ? 'We’re closed today.' : /emergenc/i.test(r.value) ? 'Today it’s ' + lc1(r.value) + '.' : 'Today we’re open ' + lc1(r.value) + '.';
    if (!r) return 'I don’t have our hours for ' + name + ' yet.';
    if (closed(r.value)) return 'We’re closed on ' + name + '.';
    if (/emergenc/i.test(r.value)) return 'On ' + name + ' it’s ' + lc1(r.value) + '.';
    return 'On ' + name + ' we’re open ' + lc1(r.value) + '.';
  }
  function priceMatch(b, q) {
    var t = norm(q), best = null, bestScore = 0;
    b.prices.forEach(function (p) { var s = 0; (p.words + ' ' + norm(p.item)).split(/\s+/).forEach(function (w) { if (w.length > 2 && t.indexOf(w) >= 0) s++; }); if (s > bestScore) { bestScore = s; best = p; } });
    return best;
  }

  var MEDICAL_EN = 'I’m sorry, I can’t give medical advice, but one of our doctors can. I can find you an appointment, or you can book one with the Book button. If it’s urgent call NHS 111, and in an emergency call 999.';
  var MEDICAL_ES = 'Lo siento, no puedo dar consejo médico, pero uno de nuestros médicos sí. Puedo buscarte una cita. Si es urgente, llama al NHS 111, y en una emergencia, al 999.';

  function answer(key, b, q, now) {
    var t = norm(q), es = isSpanish(q), parts = [], src = [], lim = b.facts.filter(function (f) { return f.limits; })[0];
    function use(text, label) { parts.push(text); if (label && src.indexOf(label) < 0) src.push(label); }
    var lang = es ? 'es' : 'en';
    if (b.medical && b.medical.test(t)) return { text: es ? MEDICAL_ES : MEDICAL_EN, src: [lim.label], lang: lang };
    if (/^\s*(hi|hello|hey|good (morning|afternoon|evening)|hola|buenas|buenos dias)\b/.test(t) && t.length < 24) {
      return { text: es ? 'Hola. Soy el asistente de IA de ' + b.name + '. Pregúntame por horarios, precios o lo que necesites.' : 'Hello. I’m ' + b.name + '’s AI assistant. Ask me about opening times, prices or anything else about us.', src: [], lang: lang };
    }
    var d = dayIn(q, now), named = DAYS.some(function (x) { return t.indexOf(x) >= 0; }) || ES_DAYS.some(function (x) { return new RegExp('\\b' + norm(x) + '\\b').test(t); }) || /weekend|fin de semana/.test(t);
    var wantsHours = /open|close|hours|what time|when|until|late|early|abiert|abris|abren|abre\b|cerra|horario|a que hora|cuando/.test(t) || (named && !/price|cost|how much|precio|cuesta|cuanto/.test(t));
    var p = priceMatch(b, q), wantsPrice = /price|cost|how much|charge|fee|£|expensive|cheap|precio|cuesta|cuestan|cuanto|cobr|caro|barato/.test(t);
    var facts = [];
    b.facts.forEach(function (f) { if (!f.limits && f.words && f.words.test(t) && !(wantsPrice && p && f.id === 'book')) facts.push(f); });
    if (es && facts.length) use('Esto es lo que me han enseñado (en inglés): ' + facts.map(function (f) { return '«' + f.value + '»'; }).join(' '), facts[0].label);
    else facts.forEach(function (f) { use(f.value, f.label); });
    facts.forEach(function (f) { if (src.indexOf(f.label) < 0) src.push(f.label); });
    if (p && (wantsPrice || !parts.length)) use(es ? (p.es || p.item) + ': ' + valEs(p.value) + '.' : p.item + ' is ' + lc1(p.value) + '.', 'Prices');
    else if (wantsPrice) use(es ? 'Nuestros precios: ' + b.prices.map(function (x) { return lc1(x.es || x.item) + ', ' + valEs(x.value); }).join('; ') + '.'
      : 'Our prices: ' + b.prices.map(function (x) { return lc1(x.item) + ' ' + lc1(x.value); }).join('; ') + '.', 'Prices');
    if (wantsHours) {
      if (d >= 0) use(hoursFor(b, d, !named && d === now.getDay(), es), 'Opening hours');
      else use((es ? 'Nuestro horario: ' : 'Our opening hours are: ') + hoursAll(b, es), 'Opening hours');
    }
    if (!parts.length) return { text: es ? 'No me han enseñado eso, así que prefiero no adivinar. ¿Quieres dejar un mensaje para el equipo?' : 'I haven’t been taught that, so I won’t guess. Would you like to leave a message for the team?', src: [lim.label], lang: lang };
    return { text: parts.join(' '), src: src, lang: lang };
  }

  // ---------------------------------------------------------------- round 05: actions on the business's own site, from rules
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function addDaysIso(date, n) { var p = date.split('-'); var t = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)); return t.getUTCFullYear() + '-' + pad2(t.getUTCMonth() + 1) + '-' + pad2(t.getUTCDate()); }
  function dowIso(date) { var p = date.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay(); }

  // The date a question asks about, from today (London): today, tomorrow, a weekday (the next one, today included), next week, the weekend.
  function whenIn(t, today) {
    var wd = dowIso(today);
    if (/\b(today|tonight|this (morning|afternoon|evening)|asap|as soon as|right now|hoy|esta (tarde|noche|manana)|cuanto antes|ahora)\b/.test(t)) return today;
    if (/\btomorrow\b/.test(t) || /\bmanana\b/.test(t.replace(/por la manana/g, ' '))) return addDaysIso(today, 1);
    for (var d = 0; d < 7; d++) {
      if (new RegExp('\\b(' + DAYS[d] + 's?|' + DAYS[d].slice(0, 3) + '|' + norm(ES_DAYS[d]) + ')\\b').test(t)) {
        var diff = (d - wd + 7) % 7;
        if (/\bnext\b/.test(t) && diff === 0) diff = 7;
        return addDaysIso(today, diff);
      }
    }
    if (/\bnext week\b|\bsemana que viene\b|\bproxima semana\b/.test(t)) return addDaysIso(today, ((1 - wd + 7) % 7) || 7);
    if (/weekend|fin de semana/.test(t)) return addDaysIso(today, (6 - wd + 7) % 7);
    return null;
  }
  function partIn(t) {
    if (/\b(evening|tonight|after work|por la noche|esta noche|noche)\b/.test(t)) return 'evening';
    if (/\b(afternoon|after lunch|lunchtime|por la tarde|esta tarde|tarde)\b/.test(t)) return 'afternoon';
    if (/\b(morning|first thing|por la manana|esta manana)\b/.test(t)) return 'morning';
    return 'any';
  }
  function partOf(time) { var h = +time.slice(0, 2); return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'; }
  // A clock time in the question ("for 9am", "at 10.30", "a las 10", "noon"), as HH:MM; an hour of 1 to 6 with no am/pm means the afternoon.
  function timeIn(t) {
    if (/\b(noon|midday|mediodia)\b/.test(t)) return '12:00';
    var re = /(\b(?:for|at|by|around|about|before|from|para|a|sobre|hacia|desde)\s+(?:las?\s+)?)?\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.|h\b)?/g, m;
    while ((m = re.exec(t))) {
      var after = t.slice(re.lastIndex, re.lastIndex + 14);
      if (!m[1] && !m[3] && !m[4]) continue;
      if (/^\s*(min|minute|hour|hora|people|person|persona|of us|seat|£|pound|day|dia|week|seman|x\b|×)/.test(after)) continue;
      var h = +m[2], mi = m[3] ? +m[3] : 0, suf = (m[4] || '').replace(/\./g, '');
      if (suf === 'pm' && h < 12) h += 12;
      else if (suf === 'am' && h === 12) h = 0;
      else if (!suf && h >= 1 && h <= 6) h += 12;
      if (h > 23 || mi > 59) continue;
      return pad2(h) + ':' + pad2(mi);
    }
    return null;
  }
  function roundUp(time, step) { var h = +time.slice(0, 2), mi = +time.slice(3); var total = Math.ceil((h * 60 + mi) / step) * step; return pad2(Math.floor(total / 60) % 24) + ':' + pad2(total % 60); }
  function errText(e) { return e && e.message ? String(e.message) : 'Their website didn’t answer just then.'; }
  function errCode(e) { return e && e.code ? String(e.code) : 'internal'; }
  var YES = /^\s*(yes|yeah|yep|yup|please|ok|okay|sure|go ahead|do it|hold it|book it|si|sí|vale|claro|perfecto|de acuerdo|adelante)\b/;
  var COUNT_WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six'];
  var NUMBERS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6 };

  // ---- Café: Morrow Coffee (add_to_order, set_collection_time)
  var CAFE_ITEMS = [
    ['flat_white', /flat ?whites?/],
    ['cappuccino', /cap+uc+h?inos?|capuchinos?/],
    ['latte', /\blattes?\b|\bcafes? con leche\b/],
    ['espresso', /\bespressos?\b|\bexpres+os?\b|\bcafes? solos?\b/],
    ['filter_coffee', /\bfilter( coffee)?s?\b|\bcafes? de filtro\b/],
    ['hot_chocolate', /hot chocolates?|chocolates? calientes?/],
    ['croissant', /croissants?|cruasan(es)?/],
    ['cardamom_bun', /(cardamom )?\bbuns?\b|\bbollos?( de cardamomo)?\b/],
    ['sourdough_toast', /\btoast\b|\btostadas?\b/],
    ['gf_brownie', /\bbrownies?\b/]
  ];
  var CAFE_RULES = {   // Contract A 10.5: what each item allows
    espresso: { sizes: ['regular'], milks: ['none'], shots: true, syrup: false, milkDefault: 'none' },
    flat_white: { sizes: ['regular'], milks: ['whole', 'oat', 'almond', 'soy'], shots: true, syrup: true, milkDefault: 'whole' },
    cappuccino: { sizes: ['regular', 'large'], milks: ['whole', 'oat', 'almond', 'soy'], shots: true, syrup: true, milkDefault: 'whole' },
    latte: { sizes: ['regular', 'large'], milks: ['whole', 'oat', 'almond', 'soy'], shots: true, syrup: true, milkDefault: 'whole' },
    filter_coffee: { sizes: ['regular', 'large'], milks: ['none', 'whole', 'oat', 'almond', 'soy'], shots: false, syrup: true, milkDefault: 'none' },
    hot_chocolate: { sizes: ['regular', 'large'], milks: ['whole', 'oat', 'almond', 'soy'], shots: false, syrup: true, milkDefault: 'whole' }
  };
  function cafeMods(seg, into) {
    if (/\boat\b|avena/.test(seg)) into.milk = 'oat';
    else if (/almond|almendra/.test(seg)) into.milk = 'almond';
    else if (/\bsoy\b|\bsoya?\b|soja/.test(seg)) into.milk = 'soy';
    else if (/whole milk|leche entera|\bwith milk\b|\bcon leche\b/.test(seg) && into.item !== 'latte') into.milk = 'whole';
    if (/\blarge\b|\bgrande\b|\bbig\b/.test(seg)) into.size = 'large';
    if (/(two|2|dos) (extra )?shots|double|doble|triple/.test(seg)) into.shots = 2;
    else if (/extra shot|shot extra|extra espresso|carga extra/.test(seg)) into.shots = Math.max(into.shots || 0, 1);
    if (/vanilla|vainilla/.test(seg)) into.syrup = 'vanilla';
    else if (/caramel/.test(seg)) into.syrup = 'caramel';
    else if (/cardamom(o)? syrup|sirope de cardamomo/.test(seg)) into.syrup = 'cardamom';
  }
  function cafeOrder(t) {
    var segs = t.split(/\s*(?:,|;|\band\b|&|\+|\bplus\b|\by\b|\be\b|\balso\b)\s*/), lines = [];
    segs.forEach(function (seg) {
      var hit = null;
      for (var i = 0; i < CAFE_ITEMS.length && !hit; i++) { var m = CAFE_ITEMS[i][1].exec(seg); if (m) hit = { item: CAFE_ITEMS[i][0], at: m.index }; }
      if (!hit) { if (lines.length) cafeMods(seg, lines[lines.length - 1]); return; }
      var before = seg.slice(0, hit.at), qty = 1, nm, nre = /\b(\d+|a|an|one|two|three|four|five|six|un|una|uno|dos|tres|cuatro|cinco|seis)\b/g;
      while ((nm = nre.exec(before))) qty = /^\d+$/.test(nm[1]) ? +nm[1] : NUMBERS[nm[1]];
      var line = { item: hit.item, quantity: Math.max(1, Math.min(6, qty || 1)) };
      cafeMods(seg, line);
      lines.push(line);
    });
    return lines.map(function (l) {
      var r = CAFE_RULES[l.item];
      if (!r) return { item: l.item, quantity: l.quantity, size: 'regular', milk: 'none', extra_shots: 0, syrup: 'none' };
      return { item: l.item, quantity: l.quantity,
        size: l.size && r.sizes.indexOf(l.size) >= 0 ? l.size : 'regular',
        milk: l.milk && r.milks.indexOf(l.milk) >= 0 ? l.milk : r.milkDefault,
        extra_shots: r.shots ? (l.shots || 0) : 0,
        syrup: r.syrup && l.syrup ? l.syrup : 'none' };
    });
  }
  function plural(label) { var parts = label.split(','); var w = parts[0]; parts[0] = /(ch|sh|s|x)$/.test(w) ? w + 'es' : w + 's'; return parts.join(','); }
  function lineWords(line) { var label = lc1(line.label || line.name || ''); return line.quantity > 1 ? (COUNT_WORDS[line.quantity] || line.quantity) + ' ' + plural(label) : 'one ' + label; }
  function listEn(items) { return items.length < 2 ? items.join('') : items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1]; }
  function listEs(items) { return items.length < 2 ? items.join('') : items.slice(0, -1).join(', ') + ' y ' + items[items.length - 1]; }
  function dayWord(r, es) {
    if (r.day_label === 'Today') return es ? 'hoy' : 'today';
    if (r.day_label === 'Tomorrow') return es ? 'mañana' : 'tomorrow';
    return es ? 'el ' + dayEs(r.date) : 'on ' + r.day_label;
  }

  async function cafeAct(b, q, t, ctx, es) {
    var order = cafeOrder(t), time = timeIn(t);
    var wantsPriceOnly = /how much|price|cost|cuanto|cuesta|precio/.test(t) && !/\b(order|i'?d like|i would like|i'?ll have|can i (get|have)|could i (get|have)|get me|to collect|collect|pick up|quiero|quisiera|me pones|ponme|pedir|para llevar|recoger)\b/.test(t);
    var timeOnly = !order.length && time && (/collect|pick|recog|para las|\bfor\b|\bat\b/.test(t) || (ctx.offer && ctx.offer.kind === 'cafe-time'));
    if (!order.length && !timeOnly) return null;
    if (order.length && !time && wantsPriceOnly) return null;
    if (order.length && !time && !/\b(order|i'?d like|i would like|i'?ll have|can i (get|have)|could i (get|have)|get me|to collect|collect|pick up|add|quiero|quisiera|me pones|ponme|pedir|para llevar|recoger|anade|añade)\b/.test(t) && !/^\s*(\d+|a|an|one|two|three|four|five|six|un|una|dos|tres)\b/.test(t)) return null;
    var src = ['Prices', b.name + '’s website'], added = [], last = null, text = [];
    for (var i = 0; i < order.length; i++) {
      try { last = await ctx.call('add_to_order', order[i]); added.push(last.line ? Object.assign({}, last.line, { quantity: order[i].quantity }) : { label: order[i].item, quantity: order[i].quantity }); }
      catch (e) { text.push(errText(e)); break; }
    }
    var basket = last && last.basket, ordering = last && last.ordering_for;
    if (added.length) {
      text.unshift(es ? 'He añadido a tu pedido: ' + listEs(added.map(function (l) { return l.quantity + ' × ' + (l.label || l.name); })) + '. Total: ' + basket.total_text + '.'
        : 'I’ve added ' + listEn(added.map(lineWords)) + ' to your order. That’s ' + basket.total_text + ' so far.');
    }
    var offer = null;
    if (time) {
      var want = roundUp(time, 5);
      try {
        var c = await ctx.call('set_collection_time', { time: want });
        text.push(es ? 'Lo tendrás listo para recoger ' + dayWord(c, true) + ' a las ' + c.time_text + '. Se paga al recogerlo.'
          : 'Collection is set for ' + c.time_text + ' ' + dayWord(c, false) + ', and you pay when you collect.');
        if (!basket) basket = c.basket;
      } catch (e) {
        var st = null;
        try { st = await ctx.call('get_state', {}); } catch (e2) { st = null; }
        var of = st && st.ordering_for;
        if (errCode(e) === 'too_soon' && of) {
          text.push(es ? 'Las ' + timeEs(want) + ' es demasiado pronto: lo antes posible es a las ' + timeEs(of.earliest) + '. ¿Lo pongo a esa hora?'
            : timeTextEn(want) + ' is too soon. The earliest collection is ' + timeTextEn(of.earliest) + '. Shall I set that?');
          offer = { kind: 'cafe-set', time: of.earliest, label: es ? 'Sí, a las ' + timeEs(of.earliest) : 'Yes, ' + timeTextEn(of.earliest) + ' please', lang: es ? 'es' : 'en' };
        } else {
          text.push(errText(e) + (of ? (es ? ' Se puede recoger de ' + timeEs(of.earliest) + ' a ' + timeEs(of.latest) + '.' : ' Collection is possible from ' + timeTextEn(of.earliest) + ' to ' + timeTextEn(of.latest) + '.') : ''));
        }
      }
    } else if (added.length && ordering) {
      text.push(es ? '¿A qué hora lo recoges? Puede ser de ' + timeEs(ordering.earliest) + ' a ' + timeEs(ordering.latest) + (ordering.day_label === 'Today' ? ' hoy.' : ' mañana.')
        : 'When would you like to collect it? Any time from ' + timeTextEn(ordering.earliest) + ' to ' + timeTextEn(ordering.latest) + (ordering.day_label === 'Today' ? ' today.' : ' tomorrow.'));
      offer = { kind: 'cafe-time' };
    }
    if (!text.length) return null;
    return { text: text.join(' '), src: src, offer: offer };
  }
  function timeTextEn(time) { var h = +time.slice(0, 2), m = +time.slice(3); return (h % 12 === 0 ? 12 : h % 12) + (m ? '.' + pad2(m) : '') + (h < 12 ? 'am' : 'pm'); }
  function timeEs(time) { return timeTextEn(time); }

  // ---- Shared: find a free time, then hold it (salon: hold_booking; clinic: book_appointment)
  async function findAndHold(o) {
    // o: { ctx, es, find: args, holdAction, holdArgs(slot), want (HH:MM or null), listOnly, what (en), whatEs, src }
    var ctx = o.ctx, es = o.es, found;
    try { found = await ctx.call('find_free_times', o.find); }
    catch (e) { return { text: errText(e), src: o.src }; }
    var slots = found.slots || [];
    if (o.want) slots = slots.filter(function (s) { return s.time === o.want; });
    var when = es ? 'el ' + dayEs(found.date) : found.day_label;
    if (!slots.length) {
      var nf = found.next_free;
      var lead = found.closed ? (es ? 'Ese día está cerrado.' : 'We’re closed on ' + found.day_label.split(' ')[0] + '.')
        : o.want ? (es ? 'A las ' + timeEs(o.want) + ' no hay hueco ' + when + '.' : timeTextEn(o.want) + ' isn’t free on ' + when + '.')
        : (es ? 'No queda nada libre ' + when + (o.find.part_of_day !== 'any' ? ' en esa franja' : '') + '.' : 'Nothing is free on ' + when + (o.find.part_of_day !== 'any' ? ' ' + partEn(o.find.part_of_day) : '') + '.');
      if (o.want && found.slots && found.slots.length) {
        var other = found.slots[0];
        return { text: lead + (es ? ' Lo más cercano es a las ' + other.time_text + slotWho(other, true) + '. ¿Te lo reservo?' : ' The nearest free time that day is ' + other.time_text + slotWho(other, false) + '. Shall I hold it?'),
          src: o.src, offer: { kind: 'hold', action: o.holdAction, args: o.holdArgs(other), label: es ? 'Sí, resérvalo' : 'Yes, hold it', lang: es ? 'es' : 'en' } };
      }
      if (!nf) return { text: lead + (es ? ' No veo nada libre en las próximas dos semanas.' : ' I can’t see anything free in the next two weeks.'), src: o.src };
      return { text: lead + (es ? ' Lo siguiente libre es el ' + dayEs(nf.date) + ' a las ' + nf.time_text + slotWho(nf, true) + '. ¿Te lo reservo?' : ' The next free time is ' + nf.day_label + ' at ' + nf.time_text + slotWho(nf, false) + '. Shall I hold it?'),
        src: o.src, offer: { kind: 'hold', action: o.holdAction, args: o.holdArgs(nf), label: es ? 'Sí, resérvalo' : 'Yes, hold it', lang: es ? 'es' : 'en' } };
    }
    if (o.listOnly) {
      var times = slots.slice(0, 4).map(function (s) { return s.time_text + slotWho(s, es); });
      return { text: es ? 'Sí, ' + when + ' hay hueco a las ' + listEs(times) + '. ¿Te reservo las ' + slots[0].time_text + '?' : 'Yes. On ' + when + ' there’s ' + listEn(times) + '. Shall I hold ' + slots[0].time_text + ' for you?',
        src: o.src, offer: { kind: 'hold', action: o.holdAction, args: o.holdArgs(slots[0]), label: es ? 'Sí, resérvalo' : 'Yes, hold ' + slots[0].time_text, lang: es ? 'es' : 'en' } };
    }
    return holdSlot(o, slots[0]);
  }
  function slotWho(s, es) { return s.stylist_name ? (es ? ' con ' : ' with ') + s.stylist_name : ''; }
  function partEn(p) { return p === 'morning' ? 'in the morning' : p === 'afternoon' ? 'in the afternoon' : p === 'evening' ? 'in the evening' : ''; }
  async function holdSlot(o, slot) {
    var es = o.es, h;
    try { h = await o.ctx.call(o.holdAction, o.holdArgs(slot)); }
    catch (e) { return { text: errText(e), src: o.src }; }
    return { text: heldText(h, es), src: o.src };
  }
  var ES_SERVICES = { gp: 'una cita con el médico de cabecera', video: 'una videoconsulta', health_check: 'un chequeo', cut_finish: 'un corte y peinado', full_colour: 'un color completo', blow_dry: 'un secado con brushing' };
  var ES_JOBS = { boiler_service: 'la revisión de la caldera', emergency_callout: 'una salida de urgencia', quote_visit: 'una visita para dar presupuesto', other: 'una visita para dar presupuesto' };
  function heldText(h, es) {
    var what = es ? (ES_SERVICES[h.service] || h.service_name || '') : 'a ' + lc1(h.service_name || '');
    if (es) return 'Hecho: te he reservado ' + what + ' el ' + dayEs(h.date) + ' a las ' + h.time_text + (h.stylist_name ? ' con ' + h.stylist_name : '') + ' (' + h.price_text + '). Queda guardado 10 minutos a nombre de «Guest» para que lo confirmes en su web.' + (h.patch_test_note ? ' Antes de un primer color hace falta una prueba de alergia con al menos 48 horas de antelación.' : '');
    return 'Done. I’ve held ' + what + ' on ' + h.day_label + ' at ' + h.time_text + (h.stylist_name ? ' with ' + h.stylist_name : '') + ', ' + h.price_text + '. It’s held for 10 minutes in the name Guest, so you can confirm it on their site.' + (h.patch_test_note ? ' ' + h.patch_test_note : '');
  }

  // ---- Salon: Atelier Wren (find_free_times, hold_booking)
  async function salonAct(b, q, t, ctx, es) {
    if (/\b(cancel|move|resched|change my|cancelar|cambiar|mover)\b/.test(t)) return null;
    var service = /colou?r|\bdye\b|tint|balayage|highlights|tinte|mechas/.test(t) ? 'full_colour' : /blow|secado|brushing|peinar/.test(t) ? 'blow_dry' : 'cut_finish';
    var hasService = /\bcut\b|haircut|trim|colou?r|\bdye\b|tint|balayage|highlights|blow|corte|cortar|tinte|mechas|secado|brushing/.test(t);
    var bookVerb = /\b(book|appointment|slot|free|available|availability|hold|get (a|my)|have (a|my)|can i (get|come|have)|could i (get|have)|i'?d like|i want|reserv\w*|cita|hueco|libre|disponible|quiero|quisiera)\b/.test(t);
    var date = whenIn(t, ctx.today), part = partIn(t), time = timeIn(t);
    var priceOnly = /how much|price|cost|cuanto|cuesta|precio/.test(t) && !bookVerb;
    if (priceOnly) return null;
    if (!(bookVerb && (hasService || date || part !== 'any')) && !(hasService && (date || part !== 'any' || time))) return null;
    var sm = /\b(ana|theo|isla|sam)\b/.exec(t), stylist = sm ? sm[1] : 'any';
    if (time) { time = roundUp(time, 30); part = partOf(time); }
    return findAndHold({ ctx: ctx, es: es, src: ['Opening hours', 'Booking', b.name + '’s website'],
      find: { service: service, stylist: stylist, date: date || ctx.today, part_of_day: part }, want: time, holdAction: 'hold_booking',
      holdArgs: function (s) { return { service: service, stylist: s.stylist, date: s.date, time: s.time }; } });
  }

  // ---- Clinic: Linden Clinic (find_free_times, book_appointment)
  async function clinicAct(b, q, t, ctx, es) {
    var service = /video|online|remote|videoconsulta|videollamada|por video/.test(t) ? 'video' : /health check|check-?up|chequeo|revision medica|analisis/.test(t) ? 'health_check' : 'gp';
    if (b.medical && b.medical.test(t)) {
      return { text: es ? MEDICAL_ES : MEDICAL_EN, src: ['Limits'],
        offer: { kind: 'find', service: 'gp', label: es ? 'Busca una cita' : 'Find me an appointment', lang: es ? 'es' : 'en' } };
    }
    var bookVerb = /\b(book|hold|make|reserv\w*|pedir|quiero|quisiera|need an?|i'?d like|can i (get|have|see)|see (a|the) doctor)\b/.test(t);
    var askFree = /\b(anything|available|availability|free|slot|space|any (time|times|appointments)|hueco|libre|disponible|algo)\b/.test(t);
    var mention = /appointment|doctor|\bgp\b|video|health check|check-?up|cita|consulta|medico|chequeo/.test(t);
    var date = whenIn(t, ctx.today), part = partIn(t), time = timeIn(t);
    var priceOnly = /how much|price|cost|cuanto|cuesta|precio/.test(t) && !bookVerb && !askFree;
    if (priceOnly) return null;
    if (!(bookVerb && (mention || date)) && !(askFree && (mention || date || part !== 'any'))) return null;
    if (time) { time = roundUp(time, 30); part = partOf(time); }
    var src = ['Opening hours', 'Booking', b.name + '’s website'];
    var o = { ctx: ctx, es: es, src: src, holdAction: 'book_appointment', want: time,
      holdArgs: function (s) { return { service: service, date: s.date, time: s.time }; },
      find: { service: service, date: date || ctx.today, part_of_day: part }, listOnly: !bookVerb };
    if (!date && bookVerb && !time) {
      // "Book a video appointment": the first free one, today or the next day that has one.
      var found;
      try { found = await ctx.call('find_free_times', o.find); } catch (e) { return { text: errText(e), src: src }; }
      var slot = (found.slots || [])[0] || found.next_free;
      if (!slot) return { text: es ? 'No veo nada libre en las próximas dos semanas.' : 'I can’t see anything free in the next two weeks.', src: src };
      return holdSlot(o, slot);
    }
    return findAndHold(o);
  }

  // ---- Plumber: Hart & Sons (quote_from_list, request_visit)
  async function tradesAct(b, q, t, ctx, es) {
    if (/\bgas\b/.test(t) && /smell|leak|olor|huele|fuga|escape/.test(t)) {
      return { text: es ? 'Si huele a gas, llama primero a la línea de emergencias del gas: 0800 111 999. Sal de la casa si puedes, no enciendas ni apagues interruptores, y luego llámanos.'
        : 'If you can smell gas, call the gas emergency line on 0800 111 999 first. Get outside if you can and don’t switch anything on or off. Then call us.', src: ['Emergencies'] };
    }
    var job = /boiler|caldera/.test(t) && !/leak|burst|no heat|no hot water|broken|fuga|averia|rota/.test(t) ? 'boiler_service'
      : /leak|burst|flood|emergenc|no heat|no hot water|urgent|fuga|inunda|urgencia|sin agua caliente|sin calefaccion/.test(t) ? 'emergency_callout'
      : /quote visit|visita para presupuesto/.test(t) ? 'quote_visit'
      : /bathroom|kitchen|install|new boiler|replace|radiator|shower|bano|cocina|instalar|nueva caldera|radiador|ducha|presupuesto|quote/.test(t) ? 'other' : null;
    if (!job) return null;
    var wantsPrice = /how much|price|cost|charge|fee|quote|cuanto|cuesta|precio|presupuesto/.test(t);
    var date = whenIn(t, ctx.today);
    var wantsVisit = !!date || /\b(come|visit|book|send|someone|engineer|out to|available|can you (do|fix)|venir|vengan|visita|reservar|alguien|cuanto antes)\b/.test(t);
    if (job === 'other') wantsVisit = wantsVisit && /\b(visit|come|book|venir|visita)\b/.test(t);
    var pm = /\b([a-z]{1,2}\d{1,2}[a-z]?)\b(?:\s*\d[a-z]{2})?/i.exec(q.replace(/\b(am|pm)\b/gi, ' ')), district = '';
    if (pm && /^[a-z]{1,2}\d/i.test(pm[1]) && !/^\d/.test(pm[1])) district = pm[1].toUpperCase();
    var src = ['Prices', b.name + '’s website'], text = [], offer = null;
    if (wantsPrice || !wantsVisit) {
      try {
        var qr = await ctx.call('quote_from_list', { job: job });
        text.push(es ? (job === 'other' ? 'Para un trabajo así, la visita para dar presupuesto es gratis.' : uc1(ES_JOBS[job] || qr.job_name) + ': ' + valEs(qr.price_text) + '. ' + (job === 'boiler_service' ? 'Es la revisión anual, con un control de seguridad completo.' : ''))
          : (job === 'other' ? 'Anything bigger, like that, gets a free quote visit.' : 'A ' + lc1(qr.job_name) + ' is ' + qr.price_text + '. ' + (qr.detail || '')));
      } catch (e) { text.push(errText(e)); }
    }
    if (wantsVisit && job !== 'other') {
      var res = await requestVisit(ctx, job === 'other' ? 'quote_visit' : job, date || (job === 'emergency_callout' ? ctx.today : addDaysIso(ctx.today, 1)), partIn(t), district, es);
      text.push(res.text);
      src.push('Area we cover');
    } else if (job === 'other' && wantsVisit) {
      var res2 = await requestVisit(ctx, 'quote_visit', date || addDaysIso(ctx.today, 1), partIn(t), district, es);
      text.push(res2.text);
    } else if (!wantsVisit) {
      offer = { kind: 'visit', job: job === 'other' ? 'quote_visit' : job, label: es ? 'Pide una visita' : (job === 'emergency_callout' ? 'Send someone today' : 'Book a visit'), lang: es ? 'es' : 'en' };
      text.push(es ? '¿Quieres que pida una visita?' : 'Would you like me to request a visit?');
    }
    if (job === 'emergency_callout' && !es) text.push('If you ever smell gas, call 0800 111 999 first.');
    return { text: text.join(' ').replace(/\s+/g, ' ').trim(), src: src, offer: offer };
  }
  // Tries the asked day and window first, then the next free window over the next week.
  async function requestVisit(ctx, job, date, part, district, es) {
    var tries = [];
    if (job === 'emergency_callout' && date === ctx.today) tries.push([date, 'asap']);
    var first = part === 'afternoon' || part === 'evening' ? ['afternoon', 'morning'] : ['morning', 'afternoon'];
    for (var d = 0; d < 8 && tries.length < 14; d++) {
      var day = addDaysIso(date, d);
      if (dowIso(day) === 0 && job !== 'emergency_callout') continue;
      first.forEach(function (w) { tries.push([day, w]); });
    }
    var lastErr = null;
    for (var i = 0; i < tries.length; i++) {
      try {
        var r = await ctx.call('request_visit', { job: job, date: tries[i][0], window: tries[i][1], postcode_district: district });
        var moved = i > 0;
        if (es) return { text: (moved ? 'Esa franja estaba ocupada, así que ' : '') + 'he pedido la visita: ' + (ES_JOBS[r.job] || lc1(r.job_name)) + ', el ' + dayEs(r.date) + ', ' + (r.window === 'asap' ? 'lo antes posible' : r.window === 'morning' ? 'de 8am a 12pm' : 'de 12pm a 6pm') + ' (' + valEs(r.price_text) + '). Queda guardada 10 minutos a nombre de «Guest» para que la confirmes en su web.' };
        return { text: (moved ? 'That window was taken, so ' : '') + 'I’ve requested a visit: ' + lc1(r.job_name) + ', ' + (r.window === 'asap' ? 'today, as soon as possible' : r.day_label + ', ' + r.window_text) + '. It’s held for 10 minutes in the name Guest, so you can confirm it on their site.' };
      } catch (e) {
        lastErr = e;
        var code = errCode(e);
        if (code !== 'not_free' && code !== 'too_soon' && code !== 'closed') break;
      }
    }
    return { text: errText(lastErr) };
  }

  // The offer from the previous answer, carried out when the visitor says yes (or taps its chip).
  async function runOffer(key, b, offer, ctx, es) {
    var src = [b.name + '’s website'];
    if (offer.kind === 'hold') {
      try { var h = await ctx.call(offer.action, offer.args); return { text: heldText(h, es), src: src }; }
      catch (e) { return { text: errText(e), src: src }; }
    }
    if (offer.kind === 'cafe-set') {
      try { var c = await ctx.call('set_collection_time', { time: offer.time }); return { text: es ? 'Hecho: recogida ' + dayWord(c, true) + ' a las ' + c.time_text + '. Se paga al recogerlo.' : 'Done. Collection is set for ' + c.time_text + ' ' + dayWord(c, false) + ', and you pay when you collect.', src: src }; }
      catch (e) { return { text: errText(e), src: src }; }
    }
    if (offer.kind === 'find') return clinicAct(b, '', es ? 'quiero una cita' : 'book an appointment', ctx, es);
    if (offer.kind === 'visit') {
      var r = await requestVisit(ctx, offer.job, offer.job === 'emergency_callout' ? ctx.today : addDaysIso(ctx.today, 1), 'any', '', es);
      return { text: r.text, src: ['Prices', 'Area we cover'].concat(src) };
    }
    return null;
  }

  async function act(key, b, q, ctx) {
    var t = norm(q), es = isSpanish(q) || !!(ctx.offer && ctx.offer.lang === 'es' && YES.test(t));
    var res = null;
    if (ctx.offer && ctx.offer.kind !== 'cafe-time' && (YES.test(t) || q === ctx.offer.label)) res = await runOffer(key, b, ctx.offer, ctx, es);
    else if (key === 'cafe') res = await cafeAct(b, q, t, ctx, es);
    else if (key === 'salon') res = await salonAct(b, q, t, ctx, es);
    else if (key === 'clinic') res = await clinicAct(b, q, t, ctx, es);
    else if (key === 'trades') res = await tradesAct(b, q, t, ctx, es);
    if (res) res.lang = es ? 'es' : 'en';
    return res;
  }

  // ---------------------------------------------------------------- round 04's section (its old markup; the home page now uses assets/home/agent.js)
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

  window.AIAssist = { mount: mount, BUSINESSES: BUSINESSES, answer: answer, act: act, isSpanish: isSpanish, norm: norm };
})();
