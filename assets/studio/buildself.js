/*
 * Watch it build itself: real HTML and CSS type themselves on the left, and the preview on the right is
 * built from exactly that code, keystroke by keystroke (inside a Shadow DOM, so it can't touch the page).
 * Plays once when it comes into view; Replay and Skip are offered; reduced motion shows the finished result.
 *
 *   BuildSelf.mount(document.getElementById('build-itself'), { image: 'assets/studio/playground/playground-cafe.webp' })
 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function html(img) {
    return '<article class="card">\n' +
      '  <img src="' + img + '" alt="">\n' +
      '  <div class="body">\n' +
      '    <p class="kicker">Morrow Coffee</p>\n' +
      '    <h3>Slow mornings, very good coffee.</h3>\n' +
      '    <a class="btn" href="#menu">See the menu</a>\n' +
      '  </div>\n' +
      '</article>\n';
  }
  var CSS = [
    ':host { container-type: inline-size; }\n',
    '.card {\n  display: grid;\n  grid-template-columns: 1.1fr 1fr;\n  border-radius: 20px;\n  overflow: hidden;\n  background: #FBF7F1;\n  box-shadow: 0 30px 60px -30px rgba(0,0,0,.6);\n}\n',
    '.card img {\n  width: 100%;\n  height: 100%;\n  object-fit: cover;\n}\n',
    '.body {\n  padding: 36px;\n  align-self: center;\n}\n',
    '.kicker {\n  margin: 0;\n  color: #8A6A4B;\n  letter-spacing: .14em;\n  text-transform: uppercase;\n  font: 500 12px Inter, sans-serif;\n}\n',
    'h3 {\n  margin: 10px 0 24px;\n  font: 400 40px/1.05 "Cormorant Garamond", serif;\n  color: #2B1E14;\n}\n',
    '.btn {\n  display: inline-block;\n  padding: 12px 20px;\n  border-radius: 999px;\n  background: #2B1E14;\n  color: #FBF7F1;\n  font: 500 14px Inter, sans-serif;\n  text-decoration: none;\n}\n',
    '@container (max-width: 520px) {\n  .card { grid-template-columns: 1fr; }\n  .card img { height: 180px; }\n}\n',
    '.card { animation: rise .9s ease both; }\n@keyframes rise {\n  from { opacity: 0; transform: translateY(16px); }\n}\n'
  ].join('');

  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function hiHTML(src) {                                    // one pass, so the highlighting never colours its own markup
    return esc(src).replace(/&lt;(\/?)([a-z0-9]+)((?:\s+[a-z-]+="[^"]*")*)(\s*\/?&gt;)?/g, function (m, slash, tag, attrs, end) {
      var a = attrs.replace(/\s+([a-z-]+)="([^"]*)"/g, ' <span class="bs-attr">$1</span>=<span class="bs-str">"$2"</span>');
      return '&lt;' + slash + '<span class="bs-tag">' + tag + '</span>' + a + (end || '');
    });
  }
  function hiCSS(src) {
    return esc(src).replace(/^([^{}\n][^{}\n]*)(?=\s*\{)/gm, '<span class="bs-sel">$1</span>')
      .replace(/^(\s+)([a-z-]+)(:)/gm, '$1<span class="bs-prop">$2</span>$3')
      .replace(/(@[a-z-]+)/g, '<span class="bs-at">$1</span>');
  }

  function mount(root, options) {
    var o = options || {}, img = o.image || 'playground/playground-cafe.webp';
    var codeEl = root.querySelector('.bs-code'), tabs = root.querySelectorAll('.bs-tab'), host = root.querySelector('.bs-preview');
    var replay = root.querySelector('.bs-replay'), skip = root.querySelector('.bs-skip'), progress = root.querySelector('.bs-progress i');
    var shadow = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    var style = document.createElement('style'), stage = document.createElement('div');
    var BASE = ':host{display:block;color:#1a1a1a;font:16px/1.4 Georgia,serif} img{max-width:100%;display:block}';   // unstyled HTML looks like a plain browser page
    style.textContent = BASE; shadow.appendChild(style); shadow.appendChild(stage);
    var HTML = html(img), total = HTML.length + CSS.length, pos = 0, timer = 0, state = 'idle', lastHTML = '';

    function show(n) {
      var h = HTML.slice(0, Math.min(n, HTML.length)), c = n > HTML.length ? CSS.slice(0, n - HTML.length) : '';
      var inCSS = n > HTML.length;
      tabs[0].setAttribute('aria-selected', inCSS ? 'false' : 'true'); tabs[1].setAttribute('aria-selected', inCSS ? 'true' : 'false');
      codeEl.innerHTML = (inCSS ? hiCSS(c) : hiHTML(h)) + (n < total ? '<span class="bs-caret"></span>' : '');
      codeEl.scrollTop = codeEl.scrollHeight;
      // the preview is built from exactly what has been typed so far
      var cut = h.lastIndexOf('>') + 1, safe = h.slice(0, cut);
      if (safe !== lastHTML) { stage.innerHTML = safe; lastHTML = safe; }
      style.textContent = BASE + c;
      if (progress) progress.style.width = (n / total * 100).toFixed(1) + '%';
      var note = n >= total ? 'Finished: the same card, now with its look.' : inCSS ? 'Now the styling: colours, fonts and spacing arrive.' : 'First the words and the photo, as plain content.';
      if (stageNote && stageNote.textContent !== note) stageNote.textContent = note;
    }
    var stageNote = root.querySelector('.bs-stage-note');
    function tick() {
      if (state !== 'playing') return;
      var ch, n = 0;
      do { ch = (pos < HTML.length ? HTML : CSS)[pos < HTML.length ? pos : pos - HTML.length]; pos++; n++; }
      while (pos < total && n < 4 && ch !== '\n' && pos !== HTML.length);       // a few characters per keystroke, never past a line end
      show(pos);
      if (pos >= total) { state = 'done'; root.setAttribute('data-built', '1'); skip.hidden = true; replay.hidden = false; return; }
      var d = ch === '\n' ? 90 : 16 + Math.random() * 18;   // a natural, brisk typing rhythm
      timer = setTimeout(tick, d);
    }
    function play() {
      clearTimeout(timer); pos = 0; lastHTML = ''; root.removeAttribute('data-built');
      if (reduce) { finish(); return; }
      state = 'playing'; skip.hidden = false; replay.hidden = true; tick();
    }
    function finish() { clearTimeout(timer); pos = total; state = 'done'; show(total); root.setAttribute('data-built', '1'); skip.hidden = true; replay.hidden = false; }
    replay.addEventListener('click', play);
    skip.addEventListener('click', finish);
    show(0);
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); setTimeout(play, 400); } }, { threshold: 0.45 });
      io.observe(root);
    } else play();
    return { play: play, finish: finish, state: function () { return state; }, progress: function () { return pos / total; }, preview: function () { return shadow; } };
  }
  window.BuildSelf = { mount: mount };
})();
