/*
 * Brief: turns what a visitor told the assistant (answers, pinned picks, designs) into a polished,
 * self-contained project brief document, with a generative ink cover unique to each visitor.
 *
 *   Brief.html(brief)      -> the whole document as an HTML string
 *   Brief.text(brief)      -> a plain-text version (for email)
 *   Brief.download(brief)  -> saves "toff-brief-<name>.html"
 *   Brief.print(brief)     -> opens it in a new tab and offers Save as PDF / Print
 *   Brief.flowArt(seed, w, h) -> the cover artwork as an SVG string (same seed, same art)
 */
(function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var s = seed || 1; return function () { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e9) / 1e9; }; }

  // smooth 2D gradient noise
  function noise2(seed) {
    var r = rng(seed), perm = [], g = [];
    for (var i = 0; i < 256; i++) { perm[i] = i; var a = r() * Math.PI * 2; g[i] = [Math.cos(a), Math.sin(a)]; }
    for (i = 255; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
    function grad(ix, iy, x, y) { var v = g[perm[(perm[ix & 255] + iy) & 255]]; return v[0] * (x - ix) + v[1] * (y - iy); }
    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    return function (x, y) {
      var x0 = Math.floor(x), y0 = Math.floor(y), sx = fade(x - x0), sy = fade(y - y0);
      var a = grad(x0, y0, x, y), b = grad(x0 + 1, y0, x, y), c = grad(x0, y0 + 1, x, y), d = grad(x0 + 1, y0 + 1, x, y);
      return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy;
    };
  }

  function flowArt(seedText, w, h) {
    w = w || 800; h = h || 1000;
    var seed = hash(String(seedText || 'Toff')), r = rng(seed ^ 0x9e3779b9), n = noise2(seed);
    var scale = 0.0021 + r() * 0.0012, turns = 1.6 + r() * 1.4, lines = '', N = 260;
    for (var k = 0; k < N; k++) {
      var x = r() * w, y = r() * h, pts = [], len = 50 + Math.floor(r() * 90);
      for (var s = 0; s < len; s++) {
        pts.push(x.toFixed(1) + ',' + y.toFixed(1));
        var ang = n(x * scale, y * scale) * Math.PI * 2 * turns;
        x += Math.cos(ang) * 4.2; y += Math.sin(ang) * 4.2;
        if (x < -20 || x > w + 20 || y < -20 || y > h + 20) break;
      }
      if (pts.length < 6) continue;
      var gold = r() < 0.82, op = (0.18 + r() * 0.62).toFixed(2), sw = (0.5 + r() * 1.5).toFixed(2);
      lines += '<polyline points="' + pts.join(' ') + '" stroke="' + (gold ? '#D8AC5F' : '#F1E3C6') + '" stroke-opacity="' + op + '" stroke-width="' + sw + '"/>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid slice"><rect width="' + w + '" height="' + h + '" fill="#0E1628"/>' +
      '<g fill="none" stroke-linecap="round" stroke-linejoin="round">' + lines + '</g></svg>';
  }

  var FEATURE_NOTES = {
    'Online booking': 'Calendar, reminders, confirmation emails; payments optional',
    'Chat assistant': 'Scripted or AI; asks your questions in your order',
    'Online shop': 'Products, basket, checkout and order emails',
    'Blog or news': 'Posts the owner can add themselves',
    'Custom animations': 'Bespoke drawn or scroll animations',
    'Photos or video shoot': 'Planned shoot or art-directed imagery',
    'Multiple languages': 'Translated pages and a language switch',
    'Hosting & care': 'Hosting, updates, backups and small changes'
  };

  function dateStr(d) { try { return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d); } catch (e) { return d.toDateString(); } }

  function text(b) {
    var L = [];
    L.push('Website brief' + (b.name ? ' for ' + b.name : ''), dateStr(new Date(b.created || Date.now())), '');
    L.push('Business: ' + (b.business || '-'), 'Needs: ' + (b.need || '-'), 'Pages: ' + (b.pages || '-'), 'Timing: ' + (b.timing || '-'), 'Budget: ' + (b.budget || '-'), 'Email: ' + (b.email || '-'), '');
    if (b.features && b.features.length) { L.push('Features:'); b.features.forEach(function (f) { L.push(' - ' + f); }); L.push(''); }
    if (b.designs && b.designs.length) { L.push('Designs:'); b.designs.forEach(function (d) { L.push(' - ' + (d.source === 'drawn' ? 'Drawn: ' : 'Playground: ') + d.summary); }); L.push(''); }
    if (b.pins && b.pins.length) { L.push('Pinned on the site:'); b.pins.forEach(function (p) { L.push(' ' + p.n + '. ' + p.label + (p.choice ? ' [' + p.choice + ']' : '') + (p.note ? ': ' + p.note : '')); }); L.push(''); }
    if (b.notes && b.notes.length) { L.push('Other notes:'); b.notes.forEach(function (n) { L.push(' - ' + n); }); }
    return L.join('\n');
  }

  function html(b) {
    var name = b.name || 'your business', d = new Date(b.created || Date.now());
    var row = function (k, v) { return v ? '<tr><th>' + esc(k) + '</th><td>' + esc(v) + '</td></tr>' : ''; };
    var pins = (b.pins || []).map(function (p) {
      return '<figure class="pin"><div class="pin-n">' + p.n + '</div>' +
        (p.snapshot ? '<img class="pin-img" src="' + p.snapshot + '" alt="Snapshot of ' + esc(p.label) + '">' : '<div class="pin-img pin-none">' + esc(p.label) + '</div>') +
        '<figcaption><b>' + esc(p.label) + '</b>' + (p.choice ? '<span class="tag">' + esc(p.choice) + '</span>' : '') + (p.note ? '<p>' + esc(p.note) + '</p>' : '') +
        (p.section ? '<small>' + esc(p.section) + '</small>' : '') + '</figcaption></figure>';
    }).join('');
    var designs = (b.designs || []).map(function (ds) {
      return '<div class="design">' + (ds.snapshot ? '<img src="' + ds.snapshot + '" alt="">' : '') + '<div><b>' + (ds.source === 'drawn' ? 'Drawn by hand' : 'Made in the playground') + '</b><p>' + esc(ds.summary) + '</p>' +
        (ds.colours ? '<span class="sw">' + ds.colours.map(function (c) { return '<i style="background:' + esc(c) + '"></i>'; }).join('') + '</span>' : '') + '</div></div>';
    }).join('');
    var scope = [['Pages', b.pages || 'To agree', 'Page count drives most of the build time']];
    (b.features || []).forEach(function (f) { scope.push([f, 'Requested', FEATURE_NOTES[f] || '']); });
    (b.pins || []).filter(function (p) { return p.choice !== 'Not this'; }).forEach(function (p) { scope.push(['Like: ' + p.label, p.choice || 'Liked', p.note || '']); });
    var scopeRows = scope.map(function (s) { return '<tr><td>' + esc(s[0]) + '</td><td>' + esc(s[1]) + '</td><td>' + esc(s[2]) + '</td><td class="q"></td></tr>'; }).join('');
    var transcript = (b.transcript || []).map(function (m) { return '<p class="' + (m.who === 'you' ? 'you' : 'bot') + '"><b>' + (m.who === 'you' ? esc(b.name || 'Visitor') : 'Assistant') + ':</b> ' + esc(m.text) + '</p>'; }).join('');
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Website brief – ' + esc(name) + '</title><style>' +
      '@page{size:A4;margin:16mm}*{box-sizing:border-box}body{margin:0;font:15px/1.6 Inter,-apple-system,"Segoe UI",sans-serif;color:#14202E;background:#F6F1E8}' +
      '.cover{position:relative;min-height:100vh;color:#F6F0E4;background:#0E1628;display:flex;flex-direction:column;justify-content:flex-end;padding:56px;overflow:hidden;page-break-after:always;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
      '.cover .art{position:absolute;inset:0}.cover .art svg{width:100%;height:100%;display:block}.cover>*:not(.art){position:relative}' +
      '.kicker{font:italic 400 20px/1.2 "Cormorant Garamond",Georgia,serif;color:#D8AC5F;margin:0 0 10px}.cover h1{font:300 clamp(40px,7vw,76px)/1.02 "Cormorant Garamond",Georgia,serif;margin:0 0 14px;max-width:14ch}' +
      '.cover-text{background:rgba(14,22,40,.9);padding:26px 30px;border-radius:12px;max-width:640px}.cover p.meta{margin:0;color:#A7AFC2}.wrap{max-width:860px;margin:0 auto;padding:56px 32px}' +
      'h2{font:400 30px/1.1 "Cormorant Garamond",Georgia,serif;margin:44px 0 14px;border-top:1px solid #D8C9AC;padding-top:22px}' +
      'table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:9px 10px;border-bottom:1px solid #E4D9C4;vertical-align:top}th{width:32%;color:#5B6472;font-weight:500}' +
      '.scope th{width:auto;background:#EFE6D6}.scope td.q{width:18%;border-left:1px dashed #D8C9AC}' +
      '.pins{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px}.pin{margin:0;position:relative;background:#fff;border-radius:12px;padding:12px;box-shadow:0 1px 0 #E4D9C4}' +
      '.pin-n{position:absolute;top:-10px;left:-10px;width:28px;height:28px;border-radius:50%;background:#D8AC5F;color:#0E1628;font-weight:600;display:grid;place-items:center;font-size:13px}' +
      '.pin-img{display:block;width:100%;max-height:220px;object-fit:contain;background:#0E1628;border-radius:8px}.pin-none{padding:40px 12px;color:#F1E3C6;text-align:center;font-size:13px}' +
      '.pin figcaption{padding-top:10px}.pin p{margin:4px 0}.pin small{color:#5B6472}.tag{display:inline-block;margin-left:8px;font-size:11px;padding:2px 8px;border-radius:99px;background:#EFE6D6;color:#5A4630}' +
      '.design{display:flex;gap:16px;align-items:center;background:#fff;border-radius:12px;padding:12px;margin-bottom:12px}.design img{width:260px;max-width:45%;border-radius:8px;background:#fff}' +
      '.sw i{display:inline-block;width:16px;height:16px;border-radius:50%;margin-right:4px;box-shadow:0 0 0 1px #0002}' +
      '.chat p{margin:6px 0}.chat .bot{color:#5B6472}.foot{margin-top:48px;color:#5B6472;font-size:13px}' +
      '@media print{.wrap{padding:0}h2{break-after:avoid}.pin,.design{break-inside:avoid}}' +
      '</style></head><body>' +
      '<section class="cover"><div class="art">' + flowArt((b.name || '') + (b.business || '') + (b.email || ''), 800, 1100) + '</div>' +
      '<div class="cover-text"><p class="kicker">Toff Studio</p><h1>Website brief for ' + esc(name) + '</h1><p class="meta">' + esc(dateStr(d)) + (b.email ? ' · ' + esc(b.email) : '') + '</p></div></section>' +
      '<main class="wrap">' +
      '<h2>The business</h2><table>' + row('Name', b.name) + row('Business', b.business) + row('What they need', b.need) + row('Pages', b.pages) + row('Timing', b.timing) + row('Budget', b.budget) + row('Email', b.email) + '</table>' +
      (b.features && b.features.length ? '<h2>Features</h2><table>' + b.features.map(function (f) { return row(f, FEATURE_NOTES[f] || 'Requested'); }).join('') + '</table>' : '') +
      (designs ? '<h2>Their designs</h2>' + designs : '') +
      (pins ? '<h2>What they pointed at</h2><div class="pins">' + pins + '</div>' : '') +
      (b.notes && b.notes.length ? '<h2>Other notes</h2><ul>' + b.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' : '') +
      '<h2>Scope for the quote</h2><table class="scope"><tr><th>Item</th><th>Detail</th><th>Notes</th><th>Quote</th></tr>' + scopeRows + '</table>' +
      (transcript ? '<h2>Conversation</h2><div class="chat">' + transcript + '</div>' : '') +
      '<p class="foot">Made with the planning assistant on the Toff Studio website. The cover artwork was drawn for this brief alone.</p>' +
      '</main></body></html>';
  }

  function slug(s) { return String(s || 'brief').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'brief'; }
  function download(b) {
    var blob = new Blob([html(b)], { type: 'text/html' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'toff-brief-' + slug(b.name) + '.html'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    return a.download;
  }
  function print(b) {
    var w = window.open('', '_blank'); if (!w) return false;
    w.document.open(); w.document.write(html(b)); w.document.close();
    w.addEventListener('load', function () { setTimeout(function () { try { w.focus(); w.print(); } catch (e) {} }, 300); });
    return true;
  }
  window.Brief = { html: html, text: text, download: download, print: print, flowArt: flowArt };
})();
