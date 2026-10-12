/*
 * Snapshot: takes a picture of any part of the page, in the browser, with no libraries.
 * It copies the element with its computed styles into an SVG <foreignObject> and returns that
 * SVG as a data URL (an image you can put in an <img>). Same-site pictures and 2D canvases are
 * embedded so the snapshot is self-contained.
 *
 *   Snapshot.take(element, { maxWidth: 420 }).then(function (dataUrl) { … })   // null if it can't
 */
(function () {
  'use strict';
  var PROPS = ['display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'box-sizing', 'width', 'height', 'min-height', 'max-width',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis', 'align-items', 'align-self', 'justify-content', 'gap', 'row-gap', 'column-gap', 'order',
    'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row', 'place-items',
    'color', 'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat',
    'border-top', 'border-right', 'border-bottom', 'border-left', 'border-radius', 'box-shadow', 'outline',
    'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-align', 'text-transform', 'text-decoration', 'white-space', 'text-overflow',
    'opacity', 'visibility', 'overflow', 'overflow-x', 'overflow-y', 'transform', 'transform-origin', 'filter', 'object-fit', 'aspect-ratio',
    'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset', 'list-style-type', 'vertical-align'];
  var baseCache = {}, sandbox = null;
  function base(tag, ns) {
    var key = (ns || '') + tag;
    if (baseCache[key]) return baseCache[key];
    if (!sandbox) { sandbox = document.createElement('div'); sandbox.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;'; document.body.appendChild(sandbox); }
    var el = ns ? document.createElementNS(ns, tag) : document.createElement(tag);
    sandbox.appendChild(el);
    var cs = getComputedStyle(el), out = {};
    PROPS.forEach(function (p) { out[p] = cs.getPropertyValue(p); });
    sandbox.removeChild(el);
    return (baseCache[key] = out);
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function imgToData(img) {
    try {
      var shown = img.getBoundingClientRect().width || 300;             // only as sharp as it's shown, so briefs stay small
      var c = document.createElement('canvas'), w = Math.round(Math.min(img.naturalWidth, Math.max(160, shown * 1.5))), h = Math.round(img.naturalHeight * w / img.naturalWidth);
      if (!w || !h) return null;
      c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h);
      return c.toDataURL('image/jpeg', 0.72);
    } catch (e) { return null; }
  }

  function take(el, opts) {
    var o = opts || {}, maxW = o.maxWidth || 420, budget = o.maxNodes || 900;
    return new Promise(function (resolve) {
      try {
        var r = el.getBoundingClientRect(); if (!r.width || !r.height) return resolve(null);
        var count = 0;
        function copy(src) {
          if (++count > budget) throw new Error('too big');
          if (src.nodeType === 3) return document.createTextNode(src.nodeValue);
          if (src.nodeType !== 1) return null;
          var tag = src.tagName.toLowerCase();
          if (tag === 'script' || tag === 'style' || tag === 'template' || tag === 'noscript') return null;
          var ns = src.namespaceURI === 'http://www.w3.org/2000/svg' ? src.namespaceURI : null;
          var cs = getComputedStyle(src);
          if (cs.display === 'none') return null;
          var dst;
          if (tag === 'img') {
            dst = document.createElement('img');
            var data = src.complete ? imgToData(src) : null;
            if (data) dst.setAttribute('src', data);
          } else if (tag === 'canvas') {
            dst = document.createElement('img');
            try { dst.setAttribute('src', src.toDataURL('image/png')); } catch (e) {}
          } else if (tag === 'input' || tag === 'textarea') {
            dst = document.createElement('div'); dst.textContent = src.value || src.getAttribute('placeholder') || '';
          } else if (tag === 'iframe' || tag === 'video') {
            dst = document.createElement('div');
          } else {
            dst = ns ? document.createElementNS(ns, tag) : document.createElement(tag);
            for (var i = 0; i < src.attributes.length; i++) {
              var a = src.attributes[i];
              if (/^(on|id$|class$|style$|data-|aria-|role$|tabindex$|href$|src$)/.test(a.name)) continue;
              try { dst.setAttribute(a.name, a.value); } catch (e) {}
            }
          }
          var b = base(ns ? tag : (dst.tagName || 'div').toLowerCase(), ns), style = '';
          PROPS.forEach(function (p) { var v = cs.getPropertyValue(p); if (v && v !== b[p]) style += p + ':' + v + ';'; });
          if (cs.transform && cs.transform !== 'none' && style.indexOf('transform-origin') < 0) style += 'transform-origin:' + cs.transformOrigin + ';';   // the default can't be trusted here
          if (src === el) style += 'margin:0;';
          if (style) dst.setAttribute('style', style);
          if (tag !== 'img' && tag !== 'canvas' && tag !== 'input' && tag !== 'textarea') {
            for (var c = src.firstChild; c; c = c.nextSibling) { var k = copy(c); if (k) dst.appendChild(k); }
          }
          return dst;
        }
        var clone = copy(el);
        var w = Math.ceil(r.width), h = Math.ceil(r.height), s = Math.min(1, maxW / w);
        var wrap = document.createElement('div');
        wrap.setAttribute('style', 'width:' + w + 'px;height:' + h + 'px;overflow:hidden;font-family:' + esc(getComputedStyle(document.body).fontFamily) + ';color:' + getComputedStyle(document.body).color + ';background:' + (o.background || getComputedStyle(document.body).backgroundColor) + ';');
        wrap.appendChild(clone);
        var xml = new XMLSerializer().serializeToString(wrap);
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + Math.round(w * s) + '" height="' + Math.round(h * s) + '" viewBox="0 0 ' + w + ' ' + h + '">' +
          '<foreignObject x="0" y="0" width="' + w + '" height="' + h + '">' + xml + '</foreignObject></svg>';
        resolve('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
      } catch (e) { resolve(null); }
    });
  }
  window.Snapshot = { take: take };
})();
