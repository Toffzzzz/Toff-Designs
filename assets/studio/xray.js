/*
 * Sketch lens: an X-ray that shows the hand-drawn wireframe underneath any part of the page.
 * When switched on, it builds a pencil-on-paper twin of the live page (boxes outlined, headings
 * hand-lettered, body text as pencil bars, pictures as crossed boxes, every drawn line shown in full)
 * and reveals it through a gold lens that follows the pointer. On touch screens the lens is a
 * porthole in the middle of the screen and the page scrolls beneath it.
 *
 *   var x = XRay.mount({ exclude: '.as-root, .cur-ring' });   // adds the "Sketch lens" switch
 *   x.on()  x.off()  x.toggle()  x.active()
 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function mount(options) {
    var o = options || {};
    var skip = 'script, style, template, noscript, .xr-layer, .xr-switch, .xr-ring, .as-root, .as-pin-layer, .as-veil, .as-pop, .cur-ring, .amb-canvas, .tb, .tb-top, .xr-tip' + (o.exclude ? ', ' + o.exclude : '');
    var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'xr-switch'; btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 L21 21"/><path d="M7.5 10.5 H13.5 M10.5 7.5 V13.5" opacity=".55"/></svg><span>Sketch lens</span>';
    btn.setAttribute('aria-label', 'Sketch lens: see the hand-drawn plan under the page'); btn.title = 'See the pencil plan behind the page';
    var layer = document.createElement('div'); layer.className = 'xr-layer'; layer.setAttribute('aria-hidden', 'true'); layer.hidden = true;
    var docEl = document.createElement('div'); docEl.className = 'xr-doc'; layer.appendChild(docEl);
    var ring = document.createElement('div'); ring.className = 'xr-ring'; ring.setAttribute('aria-hidden', 'true'); ring.hidden = true;
    var tip = document.createElement('p'); tip.className = 'xr-tip'; tip.setAttribute('role', 'status'); tip.hidden = true;
    tip.textContent = fine ? 'You’re looking at the pencil plan behind the page. Move the lens around.' : 'You’re looking at the pencil plan behind the page. Scroll to move the page under the lens.';
    document.body.appendChild(layer); document.body.appendChild(ring); var host = o.placeIn && document.querySelector(o.placeIn);
    if (host) { btn.classList.add('xr-inbar'); tip.classList.add('xr-tip-top'); host.insertBefore(btn, (o.before && host.querySelector(o.before)) || null); } else document.body.appendChild(btn);
    document.body.appendChild(tip);
    var tipShown = false, labelT = 0; btn.classList.add('xr-labelled');   // on phones the name shows at first, then folds to the icon
    var on = false, raf = 0, dirty = true, lastBuild = 0, mo = null;
    var mx = window.innerWidth / 2, my = window.innerHeight / 2, x = mx, y = my, R = 0, targetR = 0;

    function rgbaVisible(c) { var m = c && c.match(/[\d.]+/g); return m && (m.length < 4 || +m[3] > 0.06); }
    function build() {
      var t0 = performance.now();
      docEl.innerHTML = '';
      docEl.style.width = document.documentElement.clientWidth + 'px';
      [].slice.call(document.body.children).forEach(function (child) {
        if (child.matches && child.matches(skip)) return;
        var c = copy(child); if (c) docEl.appendChild(c);
      });
      lastBuild = performance.now(); dirty = false;
      return lastBuild - t0;
    }
    function copy(src) {
      if (src.nodeType === 3) {
        if (!src.nodeValue.trim()) return document.createTextNode(src.nodeValue);
        var span = document.createElement('span'); span.className = 'xr-t'; span.textContent = src.nodeValue; return span;
      }
      if (src.nodeType !== 1 || (src.matches && src.matches(skip))) return null;
      var cs = getComputedStyle(src);
      if (cs.display === 'none') return null;
      var tag = src.tagName.toLowerCase(), dst;
      if (tag === 'canvas' || tag === 'video' || tag === 'iframe') {
        dst = document.createElement('div'); dst.className = 'xr-box xr-img';
        dst.style.cssText = 'display:' + (cs.display === 'inline' ? 'inline-block' : cs.display) + ';position:' + cs.position + ';left:' + cs.left + ';top:' + cs.top + ';right:' + cs.right + ';bottom:' + cs.bottom + ';width:' + cs.width + ';height:' + cs.height + ';margin:' + cs.margin + ';';
        return dst;
      }
      dst = src.cloneNode(false);
      if (dst.removeAttribute) { dst.removeAttribute('id'); dst.removeAttribute('for'); dst.removeAttribute('tabindex'); dst.removeAttribute('href'); dst.removeAttribute('data-brief'); }
      if (tag === 'img') { dst.classList.add('xr-img'); dst.removeAttribute('loading'); }
      else if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button') dst.classList.add('xr-box');
      else if (src.namespaceURI !== 'http://www.w3.org/2000/svg') {
        if (rgbaVisible(cs.backgroundColor) || cs.backgroundImage !== 'none' || parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0) dst.classList.add('xr-box');
        var fs = parseFloat(cs.fontSize);
        if (fs >= 24 || /^h[1-3]$/.test(tag)) dst.classList.add('xr-big');
      }
      if (tag === 'input' || tag === 'textarea') { dst.setAttribute('value', ''); dst.setAttribute('placeholder', ''); }
      for (var c = src.firstChild; c; c = c.nextSibling) { if (tag === 'select' || tag === 'textarea') break; var k = copy(c); if (k) dst.appendChild(k); }
      return dst;
    }

    function sizeLens() { targetR = fine ? Math.min(190, Math.max(120, window.innerWidth * 0.11)) : Math.min(window.innerWidth * 0.42, 200); }
    function frame() {
      raf = 0; if (!on) return;
      if (!fine) { mx = window.innerWidth / 2; my = window.innerHeight * 0.48; }
      x += (mx - x) * (reduce ? 1 : 0.22); y += (my - y) * (reduce ? 1 : 0.22); R += (targetR - R) * (reduce ? 1 : 0.18);
      docEl.style.transform = 'translate(' + (-window.scrollX) + 'px,' + (-window.scrollY) + 'px)';
      layer.style.clipPath = 'circle(' + R.toFixed(1) + 'px at ' + x.toFixed(1) + 'px ' + y.toFixed(1) + 'px)';
      ring.style.transform = 'translate(' + (x - R).toFixed(1) + 'px,' + (y - R).toFixed(1) + 'px)';
      ring.style.width = ring.style.height = (R * 2).toFixed(1) + 'px';
      if (dirty && performance.now() - lastBuild > 700) build();
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && on) raf = requestAnimationFrame(frame); }
    function onMove(e) { if (e.pointerType && e.pointerType !== 'mouse' && fine) return; mx = e.clientX; my = e.clientY; kick(); }

    function activate() {
      if (on) return; on = true;
      btn.setAttribute('aria-pressed', 'true'); document.documentElement.classList.add('xr-on'); btn.classList.remove('xr-labelled');
      if (!tipShown) { tipShown = true; tip.hidden = false; setTimeout(function () { tip.hidden = true; }, 5000); }
      build(); sizeLens(); R = reduce ? targetR : 0;
      if (fine) { x = mx; y = my; }
      layer.hidden = false; ring.hidden = false;
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('scroll', kick, { passive: true });
      window.addEventListener('resize', onResize);
      if ('MutationObserver' in window) { mo = new MutationObserver(function (list) { for (var i = 0; i < list.length; i++) { var t = list[i].target; if (!(layer.contains(t) || ring.contains(t) || btn.contains(t))) { dirty = true; return; } } }); mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true }); }
      kick();
    }
    function deactivate() {
      if (!on) return; on = false;
      btn.setAttribute('aria-pressed', 'false'); document.documentElement.classList.remove('xr-on'); tip.hidden = true;
      layer.hidden = true; ring.hidden = true; docEl.innerHTML = '';
      window.removeEventListener('pointermove', onMove); window.removeEventListener('scroll', kick); window.removeEventListener('resize', onResize);
      if (mo) mo.disconnect(); mo = null;
    }
    function onResize() { dirty = true; lastBuild = 0; sizeLens(); kick(); }
    btn.addEventListener('click', function () { if (on) deactivate(); else activate(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && on) deactivate(); });
    if (o.hideOver) {
      var hidden = {};
      o.hideOver.forEach(function (sel) {
        var t = document.querySelector(sel); if (!t || !('IntersectionObserver' in window)) return;
        new IntersectionObserver(function (es) { hidden[sel] = es[0].isIntersecting && es[0].intersectionRatio > (sel === '#opening' ? 0.5 : 0.05); btn.classList.toggle('xr-tucked', !on && Object.keys(hidden).some(function (k) { return hidden[k]; })); if (!btn.classList.contains('xr-tucked') && !labelT) labelT = setTimeout(function () { btn.classList.remove('xr-labelled'); }, 6000); }, { threshold: [0, 0.05, 0.5, 1] }).observe(t);
      });
    }
    return { on: activate, off: deactivate, toggle: function () { if (on) deactivate(); else activate(); }, active: function () { return on; }, rebuild: build, lens: function () { return { x: x, y: y, r: R }; } };
  }
  window.XRay = { mount: mount };
})();
