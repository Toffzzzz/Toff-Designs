/*
 * Sketch your site: pick a business, mood and layout (and type a name) and a website takes shape
 * live on a laptop and a phone. "Send this to Toff" hands the design to the enquiry.
 *
 *   var pg = Playground.mount(document.getElementById('playground'), {
 *     photos: { clinic: 'assets/playground/playground-clinic.jpg', … },   // only the ones that exist
 *     contactSelector: '#contact',                                          // scrolled to after sending
 *     onSend: function (design) { … }                                       // design = { business, mood, layout, name, summary }
 *   });
 *   pg.set({ business: 'salon', mood: 'classic', layout: 'story' });       // e.g. from "Open in the playground"
 *   pg.design()                                                            // the current design
 *
 * Also fires document event 'toff:design' (detail = design) when sent, and listens for
 * 'toff:open-concept' (from the concept studies) to load a design and scroll here.
 * Needs minisite.js and devices.js.
 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MOOD_DOTS = { calm: ['#EEF1EC', '#2F4A3E', '#8FAF96'], bold: ['#121212', '#FF5A36', '#FAFAF7'], classic: ['#F6EFE6', '#5A1E2C', '#B08D57'], fresh: ['#FFFFFF', '#12355B', '#3FB6A8'] };
  var LAYOUT_GLYPH = {
    split: '<svg viewBox="0 0 36 24" aria-hidden="true"><rect x="1" y="1" width="34" height="22" rx="3"/><path d="M5 9 H15 M5 13 H13 M5 17 H10"/><rect x="19" y="6" width="12" height="12" rx="2"/></svg>',
    story: '<svg viewBox="0 0 36 24" aria-hidden="true"><rect x="1" y="1" width="34" height="22" rx="3"/><path d="M11 6 H25 M13 9.5 H23"/><rect x="5" y="13" width="26" height="7" rx="2"/></svg>',
    full: '<svg viewBox="0 0 36 24" aria-hidden="true"><rect x="1" y="1" width="34" height="22" rx="3"/><path d="M1 16 H35" opacity=".35"/><path d="M5 12 H17 M5 15.5 H13"/></svg>'
  };

  function mount(root, options) {
    var o = options || {};
    if (o.photos) MiniSite.photos = o.photos;
    var devices = root.querySelector('.pg-devices');
    var lapC = root.querySelector('.pg-laptop .dv-content'), phC = root.querySelector('.pg-phone .dv-content');
    var state = { business: o.business || 'cafe', mood: 'calm', layout: 'split', name: '' };
    try { var saved = JSON.parse(sessionStorage.getItem('toff-playground') || 'null'); if (saved && MiniSite.BUSINESSES[saved.business]) state = saved; } catch (e) {}
    var lap = MiniSite.render(lapC, state), ph = MiniSite.render(phC, state);
    Devices.fit(root.querySelector('.pg-laptop .dv-screen'), lapC, 1280);
    Devices.fit(root.querySelector('.pg-phone .dv-screen'), phC, 390);
    Devices.tilt(root.querySelector('.pg-preview'), devices, { maxX: 3, maxY: 5 });
    var status = root.querySelector('.pg-status'), sent = root.querySelector('.pg-sent');
    root.querySelector('.pg-controls').addEventListener('submit', function (e) { e.preventDefault(); });   // Enter in the name box never reloads the page

    // build the chip groups (radio buttons, so keyboard and screen readers work naturally)
    var groups = {
      business: Object.keys(MiniSite.BUSINESSES).map(function (k) { return [k, MiniSite.BUSINESSES[k].label, '']; }),
      mood: Object.keys(MiniSite.MOODS).map(function (k) { return [k, MiniSite.MOODS[k], '<span class="pg-dots" aria-hidden="true">' + MOOD_DOTS[k].map(function (h) { return '<i style="background:' + h + '"></i>'; }).join('') + '</span>']; }),
      layout: Object.keys(MiniSite.LAYOUTS).map(function (k) { return [k, MiniSite.LAYOUTS[k], LAYOUT_GLYPH[k]]; })
    };
    var uid = Math.random().toString(36).slice(2, 7);
    Object.keys(groups).forEach(function (key) {
      var box = root.querySelector('.pg-chips[data-key="' + key + '"]');
      groups[key].forEach(function (g) {
        var id = 'pg-' + uid + '-' + key + '-' + g[0];
        var lab = document.createElement('label'); lab.className = 'pg-chip'; lab.setAttribute('for', id);
        lab.innerHTML = '<input type="radio" class="pg-radio" name="pg-' + uid + '-' + key + '" id="' + id + '" value="' + g[0] + '">' + g[2] + '<span>' + g[1] + '</span>';
        box.appendChild(lab);
        lab.querySelector('input').addEventListener('change', function (e) { var n = {}; n[key] = e.target.value; apply(n, true); });
      });
    });
    var nameInput = root.querySelector('.pg-name');
    nameInput.value = state.name || '';
    var nameTimer = 0;
    nameInput.addEventListener('input', function () { clearTimeout(nameTimer); nameTimer = setTimeout(function () { apply({ name: nameInput.value.trim() }, true); }, 120); });

    function sync() {
      ['business', 'mood', 'layout'].forEach(function (k) {
        [].slice.call(root.querySelectorAll('.pg-chips[data-key="' + k + '"] input')).forEach(function (i) { i.checked = i.value === state[k]; });
      });
      if (document.activeElement !== nameInput) nameInput.value = state.name || '';
    }
    var swapping = 0;
    function apply(next, user) {
      var structural = (next.business && next.business !== state.business) || (next.layout && next.layout !== state.layout) || (next.name !== undefined && next.name !== state.name);
      for (var k in next) state[k] = next[k];
      try { sessionStorage.setItem('toff-playground', JSON.stringify(state)); } catch (e) {}
      sync();
      sent.textContent = '';
      if (structural && !reduce) {                       // a quick dip so the new layout appears rather than jumps
        clearTimeout(swapping); devices.classList.add('pg-swap');
        swapping = setTimeout(function () { lap.update(state); ph.update(state); devices.classList.remove('pg-swap'); }, 160);
      } else { lap.update(state); ph.update(state); }    // colour changes animate on their own
      status.textContent = user ? 'Showing ' + lap.describe() + '.' : '';
    }
    sync();

    root.querySelector('.pg-shuffle').addEventListener('click', function () {
      var pick = function (obj, cur) { var ks = Object.keys(obj).filter(function (k) { return k !== cur; }); return ks[Math.floor(Math.random() * ks.length)]; };
      apply({ business: pick(MiniSite.BUSINESSES, state.business), mood: pick(MiniSite.MOODS, state.mood), layout: pick(MiniSite.LAYOUTS, state.layout) }, true);
    });

    function design() {
      var d = { business: state.business, mood: state.mood, layout: state.layout, name: state.name || '' };
      d.summary = lap.describe();
      d.colours = MOOD_DOTS[state.mood].slice();
      return d;
    }
    root.querySelector('.pg-send').addEventListener('click', function () {
      var d = design();
      if (o.onSend) o.onSend(d);
      document.dispatchEvent(new CustomEvent('toff:design', { detail: d }));
      var target = o.contactSelector && document.querySelector(o.contactSelector);
      sent.textContent = target ? 'Added to your enquiry as your starting point.' : 'Saved as your starting point for the enquiry.';
      if (target) target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });

    window.__toffDesign = design;                     // lets the planner name a pinned playground design
    document.addEventListener('toff:open-concept', function (e) {
      apply({ business: e.detail.business, mood: e.detail.mood, layout: e.detail.layout, name: '' }, true);
      root.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });

    return { set: function (cfg) { apply(cfg, true); }, design: design, state: function () { return Object.assign({}, state); } };
  }

  window.Playground = { mount: mount };
})();
