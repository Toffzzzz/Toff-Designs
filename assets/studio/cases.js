/*
 * Selected work: case panels (real screenshots in a laptop and phone, a Sketch / Site switch,
 * gentle tilt) and concept studies (live MiniSites that open in the playground).
 *
 *   Cases.mount(document.getElementById('selected-work'), {
 *     links:    { bluebird: 'https://…', everest: '' },        // empty: "Live site coming soon", no dead link
 *     sketches: { bluebird: 'assets/cases/sketch-bluebird.jpg' }, // missing: a sketch drawn in code is shown
 *     acImage:  'assets/showcase/ac-open.png',                   // used by the Everest concept screen
 *     assetBase: 'assets/studio/',                                // folder that holds cases/… (the screenshots)
 *     onOpenConcept: function (cfg) { … }                         // called by "Open in the playground"
 *   });
 * Needs devices.js (and minisite.js for the concept studies).
 */
(function () {
  'use strict';

  // ---- sketches drawn in code (placeholders until real sketch images are set) ----
  var ROUGH = '<filter id="cs-rough-ID" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="SEED"/><feDisplacementMap in="SourceGraphic" scale="7"/></filter>';
  function paper(id, seed, body) {
    return '<svg class="cs-sketch-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<defs>' + ROUGH.replace('ID', id).replace('SEED', seed) + '</defs>' +
      '<rect width="1440" height="900" fill="#F3EDE1"/>' +
      '<g fill="none" stroke="#B9C7D9" stroke-width="1" opacity=".55">' + Array.from({ length: 22 }, function (_, i) { return '<path d="M0 ' + (40 + i * 40) + ' H1440"/>'; }).join('') + '</g>' +
      '<g filter="url(#cs-rough-' + id + ')" fill="none" stroke="#2A2722" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">' + body + '</g></svg>';
  }
  var SKETCH = {
    bluebird: function () {
      return paper('bb', 3,
        '<path d="M90 70 q20 -26 44 -6 q-10 20 -40 14" /><path d="M150 72 H300"/>' +
        '<path d="M900 70 H960 M1000 70 H1060 M1100 70 H1160"/><rect x="1210" y="52" width="130" height="38" rx="16"/>' +
        '<path d="M120 112 H1320" stroke-width="2"/>' +
        '<path d="M470 190 q120 -10 250 0 q130 8 250 -2" stroke-width="7"/><path d="M540 250 q100 -8 190 0 q90 6 180 -2" stroke-width="7"/>' +
        '<path d="M600 300 H840" stroke-width="2.4"/><rect x="640" y="330" width="80" height="34" rx="16"/><rect x="740" y="330" width="80" height="34" rx="16"/>' +
        '<path d="M720 380 V430" stroke="#4A7BD0" stroke-width="16" opacity=".35"/><path d="M720 380 V440"/>' +
        '<path d="M690 440 h60 v70 q0 22 -30 22 q-30 0 -30 -22 z"/><path d="M720 532 V600"/>' +
        '<path d="M720 600 V900" stroke="#4A7BD0" stroke-width="16" opacity=".35"/><path d="M720 600 V640"/>' +
        '<path d="M720 640 q40 20 30 60 q-6 20 10 30 q-10 12 -4 22 q-8 6 -2 16 q20 30 -34 40 V900"/>' +
        '<path d="M300 470 q60 -6 120 0 M300 500 q50 -5 100 0 M300 530 q55 -4 110 0"/>' +
        '<path d="M1000 690 q60 -6 120 0 M1000 720 q50 -5 100 0 M1000 750 q55 -4 110 0"/>' +
        '<path d="M470 480 q60 -40 150 -10" stroke-width="2"/><path d="M612 462 l10 8 l-12 6" stroke-width="2"/>'
      ) + '<p class="cs-sketch-note" style="left:27%;top:43%">one line draws each treatment</p>';
    },
    everest: function () {
      return paper('ev', 7,
        '<path d="M90 86 L118 46 L134 66 L146 52 L170 86 Z"/><path d="M186 70 H360"/>' +
        '<path d="M920 70 H980 M1020 70 H1080 M1120 70 H1180"/><rect x="1220" y="52" width="120" height="38" rx="10"/>' +
        '<path d="M120 112 H1320" stroke-width="2"/>' +
        '<path d="M150 230 q120 -8 260 0 q120 6 220 -2" stroke-width="7"/><path d="M150 292 q110 -6 220 0" stroke-width="7"/>' +
        '<path d="M150 340 H520" stroke-width="2.4"/><rect x="150" y="372" width="150" height="40" rx="10"/>' +
        '<rect x="760" y="190" width="520" height="150" rx="26"/><path d="M790 300 H1250"/><path d="M1200 220 H1240"/>' +
        '<path d="M820 420 q40 -22 80 0 t80 0 t80 0 t80 0 t80 0" stroke="#4A7BD0" stroke-width="14" opacity=".35"/><path d="M820 420 q40 -22 80 0 t80 0 t80 0 t80 0 t80 0"/>' +
        '<path d="M160 560 h300 v190 h-300 z M570 560 h300 v190 h-300 z M980 560 h300 v190 h-300 z"/>' +
        '<path d="M200 610 H360 M610 610 H770 M1020 610 H1180" stroke-width="2.4"/>'
      ) + '<p class="cs-sketch-temp" style="left:66%;top:51%">32° → 26°</p>';
    }
  };

  // ---- Everest concept screen (placeholder until real screenshots are added) ----
  function everestMock(phone, ac) {
    var peak = '<svg viewBox="0 0 40 26" width="30" height="20" aria-hidden="true"><path d="M2 24 L14 4 L21 14 L26 7 L38 24 Z" fill="#0F2D52"/></svg>';
    return '<div class="evm' + (phone ? ' evm-phone' : '') + '">' +
      '<header class="evm-nav">' + peak + '<b>Everest Climate Solutions</b>' + (phone ? '<span class="evm-burger"></span>' : '<span class="evm-links"><span>Services</span><span>Projects</span><span>Contact</span></span><span class="evm-btn evm-btn-sm">Get a quote</span>') + '</header>' +
      '<section class="evm-hero"><p class="evm-eyebrow">Air conditioning · London</p><h1>Cool, quiet comfort.</h1>' +
      '<div class="evm-unit">' + (ac ? '<img src="' + ac + '" alt="">' : '') + '</div>' +
      '<p class="evm-label">Room temperature</p><p class="evm-temp">26<sup>°C</sup></p><span class="evm-btn">Get a quote</span></section>' +
      '<section class="evm-svc"><div><b>Installation</b><span>Designed for your home.</span></div><div><b>Servicing</b><span>Yearly checks.</span></div><div><b>Repairs</b><span>Fast call-outs.</span></div></section>' +
      '<section class="evm-band"><b>Free home survey</b><span class="evm-btn evm-btn-light">Book a survey</span></section>' +
      '<footer class="evm-foot">Everest Climate Solutions · London</footer></div>';
  }

  function mount(root, options) {
    var o = options || {}, links = o.links || {}, sketches = o.sketches || {};
    var base = o.assetBase == null ? 'assets/studio/' : o.assetBase;
    [].slice.call(root.querySelectorAll('img[data-src]')).forEach(function (im) { im.src = base + im.getAttribute('data-src'); });

    [].slice.call(root.querySelectorAll('.cs')).forEach(function (cs) {
      var key = cs.getAttribute('data-case');
      // link: real address, or "coming soon" with no dead link
      var a = cs.querySelector('.cs-go'), soon = cs.querySelector('.cs-soon');
      if (links[key]) { a.href = links[key]; a.hidden = false; if (soon) soon.hidden = true; }
      else if (links.hasOwnProperty(key)) { a.removeAttribute('href'); a.hidden = true; if (soon) soon.hidden = false; }
      // mocks
      [].slice.call(cs.querySelectorAll('[data-mock]')).forEach(function (c) {
        c.innerHTML = everestMock(c.getAttribute('data-mock') === 'everest-phone', o.acImage || '');
      });
      // sketch layer
      var sk = cs.querySelector('[data-sketch]');
      if (sk) {
        var src = sketches[key];
        sk.innerHTML = src ? '<img class="cs-sketch-img" src="' + src + '" alt="" loading="lazy" decoding="async">' : SKETCH[key]() + '<span class="r3-placeholder-tag cs-sketch-tag">Placeholder sketch</span>';
      }
      // scale + record every screen
      var recs = [];
      [].slice.call(cs.querySelectorAll('.cs-layer-site .dv-content, .cs-phone .dv-content')).forEach(function (c) {
        var screen = c.closest('.dv-screen');
        Devices.fit(screen, c, +c.getAttribute('data-design'));
        var img = c.querySelector('img');
        if (img && !img.complete) img.addEventListener('load', function () { Devices.fit(screen, c, +c.getAttribute('data-design')); });
        recs.push(Devices.record(screen, c, { speed: c.closest('.cs-phone') ? 120 : 150 }));
      });
      // Sketch / Site switch
      var btns = [].slice.call(cs.querySelectorAll('.cs-switch-btn'));
      var site = cs.querySelector('.cs-layer-site');
      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          var v = b.getAttribute('data-view');
          btns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
          if (v === 'sketch') { sk.removeAttribute('data-off'); site.setAttribute('data-off', ''); }
          else { site.removeAttribute('data-off'); sk.setAttribute('data-off', ''); }
          cs.setAttribute('data-view', v);
        });
      });
      Devices.tilt(cs.querySelector('.cs-stage'), cs.querySelector('.cs-devices'), { maxX: 4, maxY: 6 });
    });

    // concept studies: live MiniSites in laptops
    [].slice.call(root.querySelectorAll('.cc-item')).forEach(function (it) {
      var cfg = { business: it.getAttribute('data-business'), mood: it.getAttribute('data-mood'), layout: it.getAttribute('data-layout') };
      var c = it.querySelector('.dv-content'), screen = it.querySelector('.dv-screen');
      if (window.MiniSite) MiniSite.render(c, cfg);
      Devices.fit(screen, c, 1280);
      Devices.record(screen, c, { speed: 170, holdTop: 1800 });
      var btn = it.querySelector('.cc-open');
      btn.setAttribute('aria-label', 'Open ' + it.querySelector('.cc-name').textContent + ' in the playground');
      btn.addEventListener('click', function () {
        if (o.onOpenConcept) o.onOpenConcept(cfg);
        document.dispatchEvent(new CustomEvent('toff:open-concept', { detail: cfg }));
      });
    });
    return {};
  }

  window.Cases = { mount: mount };
})();
