/*
 * Showcase cards beside the handwriting phrases.
 *   "You plan"   -> a sketched project brief whose checklist ticks itself off
 *   "We design"  -> Bluebird Wellness: its line-drawn face draws itself (links to the live site)
 *   "We deliver" -> Everest Climate Solutions: the AC opens, 32°C counts down to 26°C (links to the live site)
 *
 * Each card plays in step with its phrase: its progress IS the phrase's writing
 * progress from the handwriting engine. So on laptops it follows the scroll, on
 * phones it plays by itself, it never runs backwards, and it follows the same
 * Back / bfcache / jump / reduced-motion behaviour as the handwriting.
 * Positions come from the line layout (line-data.js), so the line never crosses a card.
 *
 * Usage:
 *   <div class="hw-wrap"><div id="hw"></div><div class="sc-layer" id="showcase"></div></div>
 *   <template id="sc-plan">…</template> <template id="sc-bluebird">…</template> <template id="sc-everest">…</template>
 *   Handwriting.mount(...).then(function (hw) { Showcase.mount(document.getElementById('showcase'), hw, { links: { bluebird: '…', everest: '…' } }); });
 */
(function () {
  'use strict';
  function clamp(x) { return Math.max(0, Math.min(1, x)); }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); }
  function mix(c1, c2, t) { return 'rgb(' + c1.map(function (v, i) { return Math.round(v + (c2[i] - v) * t); }).join(',') + ')'; }

  var EVEREST = { numFrom: [242, 166, 90], numTo: [169, 205, 240], from: 32, to: 26 };   // number: warm orange (hot) -> icy blue (cool)

  function setupStrokes(root, sel) {
    return [].slice.call(root.querySelectorAll(sel)).map(function (p) {
      var L = p.getTotalLength(); p.style.visibility = 'hidden'; p.style.strokeDasharray = L + ' ' + (L + 4); p.style.strokeDashoffset = L;
      return { p: p, L: L, y: +(p.getAttribute('data-y') || 0) };
    });
  }
  function drawStroke(s, f) {
    f = clamp(f);
    if (f <= 0) { if (s._v !== 0) { s.p.style.visibility = 'hidden'; s._v = 0; } return; }
    if (s._v !== 1) { s.p.style.visibility = 'visible'; s._v = 1; }
    s.p.style.strokeDashoffset = s.L * (1 - f);
  }

  var KINDS = {
    plan: {
      setup: function (card) { return { strokes: setupStrokes(card, '.sc-plan [data-draw]').sort(function (a, b) { return a.p.getAttribute('data-draw') - b.p.getAttribute('data-draw'); }) }; },
      update: function (card, st, p) {
        var n = st.strokes.length;
        st.strokes.forEach(function (s, i) { var a = i / n * 0.92, b = a + 1.6 / n; drawStroke(s, (p - a) / (b - a)); });
      }
    },
    bluebird: {
      setup: function (card) {
        var main = card.querySelector('#bb-face-main');
        var feats = setupStrokes(card, '.sc-face path:not(#bb-face-main)');
        var m = setupStrokes(card, '#bb-face-main')[0];
        return { main: m, feats: feats, mainEl: main };
      },
      update: function (card, st, p) {
        var f = smooth(0.0, 0.95, p);
        drawStroke(st.main, f);
        var y = f > 0 ? st.mainEl.getPointAtLength(st.main.L * f).y : -1e9;
        st.feats.forEach(function (s) { drawStroke(s, (y - s.y) / 70); });
      }
    },
    everest: {
      setup: function (card) {
        return { glow: card.querySelector('.sc-ac-glow:not(.sc-ac-cool)'), cool: card.querySelector('.sc-ac-cool'), closed: card.querySelector('.sc-ac-closed'), open: card.querySelector('.sc-ac-open'), num: card.querySelector('.sc-ac-num') };
      },
      update: function (card, st, p) {
        var q = smooth(0.15, 0.85, p);
        st.glow.style.opacity = (1 - q).toFixed(3);                 // the warm glow fades as the room cools…
        if (st.cool) st.cool.style.opacity = q.toFixed(3);           // …and a cool one takes its place
        st.open.style.opacity = smooth(0.3, 0.75, p).toFixed(3);
        var t = Math.round(EVEREST.from - (EVEREST.from - EVEREST.to) * q);
        if (st.num._t !== t) { st.num.firstChild.nodeValue = String(t); st.num._t = t; }
        st.num.parentNode.style.color = mix(EVEREST.numFrom, EVEREST.numTo, q);
      }
    }
  };

  function mount(layer, hw, options) {
    var o = options || {}, links = o.links || {}, cards = [], layout = null, raf = 0;
    var assetBase = o.assetBase == null ? 'assets/showcase/' : o.assetBase;   // folder with ac-closed.png / ac-open.png

    function build() {
      layer.innerHTML = '';
      cards = [];
      var meta = hw.meta(); layout = hw.layout();
      (meta.cards || []).forEach(function (c) {
        var tpl = document.getElementById('sc-' + c.kind); if (!tpl) return;
        var node = tpl.content.firstElementChild.cloneNode(true);
        [].slice.call(node.querySelectorAll('img[data-src]')).forEach(function (im) { im.src = assetBase + im.getAttribute('data-src'); });
        node.style.left = (c.x / meta.width * 100) + '%';
        node.style.top = (c.y / meta.height * 100) + '%';
        node.style.width = (c.w / meta.width * 100) + '%';
        node.style.height = (c.h / meta.height * 100) + '%';
        var href = links[c.kind];
        if (node.tagName === 'A') {
          if (href) { node.href = href; node.target = '_blank'; node.rel = 'noopener noreferrer'; }
          else {       // no live link yet: show it, but not as a link
            var div = document.createElement('div'); div.className = node.className + ' sc-nolink';
            div.innerHTML = node.innerHTML; div.setAttribute('style', node.getAttribute('style'));
            var l = div.querySelector('.sc-go'); if (l) l.textContent = 'Live site coming soon';
            node = div;
          }
        }
        layer.appendChild(node);
        var k = -1; meta.phrases.forEach(function (ph, i) { if (ph.text === c.phrase) k = i; });
        var st = KINDS[c.kind].setup(node);
        cards.push({ node: node, kind: c.kind, k: k, st: st, shown: -1 });
      });
    }

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var ease = o.ease == null ? 0.28 : o.ease;          // seconds: how gently a picture follows its phrase
    var last = 0;
    function frame(now) {
      raf = requestAnimationFrame(frame);
      var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      if (hw.layout() !== layout) build();
      var units = hw.units();
      cards.forEach(function (c) {
        var u = null; units.forEach(function (x) { if (x.kind === 'phrase' && x.k === c.k) u = x; });
        var target = u ? clamp(u.frac) : 0;
        if (c.disp == null || reduce || target < c.disp - 0.5) c.disp = target;   // reset (coming back) or reduced motion: jump
        else if (target > c.disp) {                                                // ease forward only, never backwards
          c.disp += (target - c.disp) * (1 - Math.exp(-dt / ease));
          if (target - c.disp < 0.0015) c.disp = target;
        }
        var p = c.disp;
        if (p === c.shown) return;
        c.shown = p;
        var a = smooth(0, 0.14, p);                                                // gentle fade + rise into place
        c.node.style.visibility = p > 0.001 ? 'visible' : 'hidden';
        c.node.style.opacity = a.toFixed(3);
        c.node.style.setProperty('--sc-rise', ((1 - a) * 12).toFixed(2) + 'px');
        KINDS[c.kind].update(c.node, c.st, p);
      });
    }

    build();
    raf = requestAnimationFrame(frame);
    return {
      progress: function () { return cards.map(function (c) { return { kind: c.kind, p: c.shown }; }); },
      destroy: function () { cancelAnimationFrame(raf); layer.innerHTML = ''; }
    };
  }

  window.Showcase = { mount: mount };
})();
