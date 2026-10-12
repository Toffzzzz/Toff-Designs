/*
 * MiniSite: renders a small but real, responsive website for a (fictional) business.
 * One generator powers the playground, the resize demo, the colour demo and the concept projects.
 *
 *   var site = MiniSite.render(el, { business: 'clinic', mood: 'calm', layout: 'split' });
 *   site.update({ mood: 'bold' });          // change any part; the rest stays
 *   site.config()                            // -> { business, mood, layout }
 *
 * The site is responsive through container queries, so it re-flows to whatever width its
 * container has (that is what the resize demo shows). Photos: set MiniSite.photos = { clinic:
 * 'path/playground-clinic.jpg', ... } for the businesses that have one; the others show an ink drawing.
 * No requests are made for photos that aren't listed (so there are never 404s).
 */
(function () {
  'use strict';

  var BUSINESSES = {
    clinic: {
      label: 'Clinic', name: 'Linden Clinic', place: 'Private GP · Notting Hill',
      h1: 'A GP appointment this week, in Notting Hill.', sub: 'Unhurried appointments with experienced GPs, in clinic or by video.',
      cta: 'Book an appointment', ctaShort: 'Book',
      services: [['GP appointments', 'Thirty minutes, never rushed.'], ['Health checks', 'Bloods, results and a plan.'], ['Travel clinic', 'Vaccines and advice before you go.']],
      strip: 'Same-week appointments, six days a week.', foot: 'Linden Clinic · London'
    },
    cafe: {
      label: 'Café', name: 'Morrow Coffee', place: 'Coffee & bakery · Hackney',
      h1: 'Slow mornings, very good coffee.', sub: 'Single-origin espresso, bread baked at dawn and a long table by the window.',
      cta: 'See the menu', ctaShort: 'Menu',
      services: [['Coffee', 'Roasted in small batches.'], ['Bakery', 'Out of the oven at seven.'], ['Lunch', 'Soup, salads, toasties.']],
      strip: 'Open from 7am, every day but Monday.', foot: 'Morrow Coffee · London'
    },
    salon: {
      label: 'Salon', name: 'Atelier Wren', place: 'Hair studio · Marylebone',
      h1: 'Hair, cut and coloured with care.', sub: 'A quiet, four-chair studio for precise cuts and colour that grows out beautifully.',
      cta: 'Book a chair', ctaShort: 'Book',
      services: [['Cut & finish', 'Shaped to how you live.'], ['Colour', 'Balayage, gloss and grey blending.'], ['Treatments', 'Repair for tired hair.']],
      strip: 'Late appointments on Thursdays.', foot: 'Atelier Wren · London'
    },
    trades: {
      label: 'Trades', name: 'Calder Climate', place: 'Air conditioning · North London',
      h1: 'Quiet air conditioning, fitted in a day.', sub: 'Air conditioning designed for your home, installed neatly and serviced every year.',
      cta: 'Get a quote', ctaShort: 'Quote',
      services: [['Installation', 'Surveyed, fitted and tidied up.'], ['Servicing', 'Yearly checks that keep it efficient.'], ['Repairs', 'Fast call-outs across London.']],
      strip: 'Free home survey within the week.', foot: 'Calder Climate · London'
    },
    restaurant: {
      label: 'Restaurant', name: 'Saltmarsh', place: 'Seasonal kitchen · Bermondsey',
      h1: 'Seasonal cooking in a small Bermondsey dining room.', sub: 'A short menu that changes with the coast and the market, and a wine list worth lingering over.',
      cta: 'Reserve a table', ctaShort: 'Reserve',
      services: [['Dinner', 'Tuesday to Saturday.'], ['Sunday lunch', 'Long, slow and shared.'], ['Private dining', 'The back room seats twelve.']],
      strip: 'Walk-ins welcome at the bar.', foot: 'Saltmarsh · London'
    },
    boutique: {
      label: 'Boutique', name: 'Hollis & Pine', place: 'Clothing & ceramics · Islington',
      h1: 'Clothing and ceramics from small makers.', sub: 'Natural-fibre clothing and hand-thrown ceramics from small makers we know by name.',
      cta: 'Visit the shop', ctaShort: 'Shop',
      services: [['New in', 'Arrivals every Friday.'], ['Clothing', 'Linen, wool and cotton.'], ['Homeware', 'Ceramics, glass and textiles.']],
      strip: 'Free delivery across London.', foot: 'Hollis & Pine · London'
    }
  };

  var MOODS = { calm: 'Calm', bold: 'Bold', classic: 'Classic', fresh: 'Fresh' };
  var LAYOUTS = { split: 'Side by side', story: 'Centred story', full: 'Full-bleed photo' };

  // Simple ink drawings used until a business has a photo (viewBox 0 0 120 120, stroke only).
  var ART = {
    clinic: '<rect x="30" y="30" width="60" height="60" rx="16"/><path d="M60 44 V76 M44 60 H76"/>',
    cafe: '<path d="M34 50 H82 V70 Q82 88 64 88 H52 Q34 88 34 70 Z"/><path d="M82 56 Q96 56 96 66 Q96 76 82 74"/><path d="M28 96 H90"/><path d="M50 40 Q46 34 50 28 M60 40 Q56 34 60 28 M70 40 Q66 34 70 28"/>',
    salon: '<circle cx="40" cy="84" r="11"/><circle cx="80" cy="84" r="11"/><path d="M47 76 L82 26 M73 76 L38 26"/><circle cx="60" cy="51" r="2"/>',
    trades: '<path d="M22 40 H98 Q106 40 106 48 V64 Q106 70 100 70 H20 Q14 70 14 64 V48 Q14 40 22 40 Z"/><path d="M22 62 H98"/><path d="M90 48 H98"/><path d="M38 82 Q44 77 50 82 T62 82"/><path d="M58 92 Q64 87 70 92 T82 92"/>',
    restaurant: '<circle cx="60" cy="62" r="26"/><circle cx="60" cy="62" r="16"/><path d="M22 36 V56 M18 36 V48 Q18 56 22 56 Q26 56 26 48 V36 M22 56 V92"/><path d="M98 36 Q90 46 92 60 L98 62 V92"/>',
    boutique: '<path d="M60 34 Q60 26 66 26 Q72 26 72 32 Q72 38 60 42 L22 70 Q18 74 24 76 H96 Q102 74 98 70 L60 42"/><path d="M32 84 H88"/>'
  };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function media(business, extraClass) {
    var photo = (MiniSite.photos || {})[business];
    var art = '<svg class="ms-art" viewBox="0 0 120 120" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ART[business] + '</svg>';
    return '<div class="ms-media ' + (extraClass || '') + (photo ? ' ms-has-photo' : '') + '">' +
      (photo ? '<img class="ms-photo" src="' + esc(photo) + '" alt="" loading="lazy" decoding="async">' : art) + '</div>';
  }

  function html(c) {
    var b = Object.assign({}, BUSINESSES[c.business]);
    if (c.name) { b.name = c.name; b.foot = c.name + ' · London'; }
    var svc = b.services.map(function (s) { return '<div class="ms-card"><span class="ms-rule"></span><h3 class="ms-h3">' + esc(s[0]) + '</h3><p class="ms-p">' + esc(s[1]) + '</p></div>'; }).join('');
    return '' +
      '<header class="ms-nav">' +
        '<span class="ms-logo"><i class="ms-mark"></i>' + esc(b.name) + '</span>' +
        '<span class="ms-links"><span>Services</span><span>About</span><span>Contact</span></span>' +
        '<span class="ms-btn ms-btn-sm">' + esc(b.ctaShort) + '</span>' +
        '<span class="ms-burger" aria-hidden="true"><i></i><i></i></span>' +
      '</header>' +
      '<section class="ms-hero">' +
        '<div class="ms-hero-text">' +
          '<p class="ms-eyebrow">' + esc(b.place) + '</p>' +
          '<h1 class="ms-h1">' + esc(b.h1) + '</h1>' +
          '<p class="ms-sub">' + esc(b.sub) + '</p>' +
          '<span class="ms-btn">' + esc(b.cta) + '</span>' +
        '</div>' + media(c.business, 'ms-hero-media') +
      '</section>' +
      '<section class="ms-services">' + svc + '</section>' +
      '<section class="ms-strip"><p class="ms-statement">' + esc(b.strip) + '</p><span class="ms-btn ms-btn-ghost">' + esc(b.cta) + '</span></section>' +
      '<footer class="ms-foot"><span>' + esc(b.foot) + '</span><span>Privacy · Terms</span></footer>';
  }

  function render(el, cfg) {
    var c = { business: 'clinic', mood: 'calm', layout: 'split', name: '' };
    var root = document.createElement('div');
    root.className = 'ms';
    root.setAttribute('aria-hidden', 'true');           // a picture of a website: screen readers get the label on the frame
    el.appendChild(root);
    function apply(next) {
      var rebuild = !root.firstChild || (next.business && next.business !== c.business) || (next.name !== undefined && next.name !== c.name);
      for (var k in next) if (next[k] != null) c[k] = k === 'name' ? String(next[k]).slice(0, 40) : next[k];
      root.setAttribute('data-mood', c.mood);
      root.setAttribute('data-layout', c.layout);
      root.setAttribute('data-business', c.business);
      if (rebuild) root.innerHTML = html(c);
    }
    apply(cfg || {});
    return {
      el: root,
      update: apply,
      config: function () { return { business: c.business, mood: c.mood, layout: c.layout, name: c.name }; },
      describe: function () { return (c.name || BUSINESSES[c.business].name) + ' (' + BUSINESSES[c.business].label.toLowerCase() + '), ' + MOODS[c.mood].toLowerCase() + ' mood, ' + LAYOUTS[c.layout].toLowerCase() + ' layout'; }
    };
  }

  var MiniSite = { render: render, BUSINESSES: BUSINESSES, MOODS: MOODS, LAYOUTS: LAYOUTS, photos: {} };
  window.MiniSite = MiniSite;
})();
