/*
 * Gold particles: thousands of specks that gather into "Toff Studio", scatter from the pointer and spring
 * back, and morph into a laptop, a phone and the monogram (by themselves every few seconds, or on tap).
 * Physics on the CPU, drawing with WebGL. Draws only while on screen; reduced motion shows the lettering still.
 *
 *   var p = Particles.mount(document.getElementById('particles'), { shapes: ['text:Toff Studio', 'laptop', 'phone', 'text:T'] });
 *   p.next()   p.shape()   p.running()
 */
(function () {
  'use strict';
  var VS = 'attribute vec2 a_pos;attribute float a_b;uniform vec2 u_res;uniform float u_size;varying float v_b;' +
    'void main(){vec2 c=a_pos/u_res*2.-1.;gl_Position=vec4(c.x,-c.y,0.,1.);gl_PointSize=u_size*(.7+a_b*.6);v_b=a_b;}';
  var FS = 'precision mediump float;varying float v_b;uniform vec3 u_col;' +
    'void main(){vec2 p=gl_PointCoord-.5;float r=length(p);float a=smoothstep(.5,.0,r);a*=a;gl_FragColor=vec4(u_col*(.8+v_b*.7)*a,a);}';

  function sampleShape(kind, w, h, n, dpr) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var g = c.getContext('2d'); g.fillStyle = '#000'; g.strokeStyle = '#000'; g.lineCap = 'round'; g.lineJoin = 'round';
    var m = Math.min(w, h);
    if (kind.indexOf('text:') === 0) {
      var t = kind.slice(5), lines = (w < h * 1.6 && t.indexOf(' ') > 0) ? t.split(' ') : [t], fam = '"Cormorant Garamond", Georgia, serif';
      g.font = '600 100px ' + fam; g.textAlign = 'center'; g.textBaseline = 'middle';
      var widest = Math.max.apply(null, lines.map(function (l) { return g.measureText(l).width; }));
      var fs = Math.min((w * 0.88) / widest * 100, (h * (t.length === 1 ? 0.92 : 0.8)) / (lines.length * 0.95));
      g.font = '600 ' + fs + 'px ' + fam;
      lines.forEach(function (l, i) { g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * fs * 0.95); });
    } else if (kind === 'laptop') {
      var lw = m * 1.25, lh = lw * 0.62, x = (w - lw) / 2, y = (h - lh) / 2 - m * 0.06; g.lineWidth = m * 0.035;
      rr(g, x, y, lw, lh, m * 0.04); g.stroke(); g.lineWidth = m * 0.03; rr(g, x + lw * 0.06, y + lh * 0.1, lw * 0.88, lh * 0.8, 6); g.stroke();
      g.lineWidth = m * 0.04; g.beginPath(); g.moveTo(x - lw * 0.1, y + lh + m * 0.05); g.lineTo(x + lw * 1.1, y + lh + m * 0.05); g.stroke();
    } else if (kind === 'phone') {
      var ph = m * 0.86, pw = ph * 0.5, px = (w - pw) / 2, py = (h - ph) / 2; g.lineWidth = m * 0.035;
      rr(g, px, py, pw, ph, pw * 0.16); g.stroke(); g.lineWidth = m * 0.03; g.beginPath(); g.moveTo(px + pw * 0.36, py + ph * 0.06); g.lineTo(px + pw * 0.64, py + ph * 0.06); g.stroke();
      g.beginPath(); g.arc(px + pw / 2, py + ph * 0.9, m * 0.02, 0, Math.PI * 2); g.fill();
    }
    var d = g.getImageData(0, 0, w, h).data, pts = [];
    for (var y2 = 0; y2 < h; y2 += 2) for (var x2 = 0; x2 < w; x2 += 2) if (d[(y2 * w + x2) * 4 + 3] > 128) pts.push(x2, y2);
    var out = new Float32Array(n * 2), cnt = pts.length / 2;
    for (var i = 0; i < n; i++) { var k = cnt ? Math.floor(Math.random() * cnt) : 0; out[i * 2] = (pts[k * 2] + Math.random() * 2) * dpr; out[i * 2 + 1] = (pts[k * 2 + 1] + Math.random() * 2) * dpr; }
    return out;
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  function mount(host, options) {
    var o = options || {}, shapes = o.shapes || ['text:Toff Studio', 'laptop', 'phone', 'text:T'];
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var none = { running: function () { return false; }, next: function () {}, shape: function () { return shapes[0]; }, enabled: false };
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) return none;
    var canvas = document.createElement('canvas'); canvas.className = 'pt-canvas'; canvas.setAttribute('aria-hidden', 'true');
    var gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true });
    if (!gl) return none;
    host.appendChild(canvas);
    function sh(t, s) { var x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return x; }
    var prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return none; }
    gl.useProgram(prog);
    var uRes = gl.getUniformLocation(prog, 'u_res'), uSize = gl.getUniformLocation(prog, 'u_size'), uCol = gl.getUniformLocation(prog, 'u_col');
    gl.uniform3f(uCol, 0.86, 0.69, 0.40);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    var posBuf = gl.createBuffer(), bBuf = gl.createBuffer(), aPos = gl.getAttribLocation(prog, 'a_pos'), aB = gl.getAttribLocation(prog, 'a_b');
    var N = 0, P, V, T, B, W = 0, H = 0, dpr = 1, idx = 0, targets = [];
    function setup() {
      var r = host.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = Math.max(2, Math.round(r.width * dpr)); H = Math.max(2, Math.round(r.height * dpr)); canvas.width = W; canvas.height = H; gl.viewport(0, 0, W, H);
      var n = Math.round(Math.min(7000, Math.max(2200, r.width * r.height / 70)));
      var first = !P || n !== N; N = n;
      if (first) { P = new Float32Array(N * 2); V = new Float32Array(N * 2); B = new Float32Array(N); for (var i = 0; i < N; i++) { P[i * 2] = Math.random() * W; P[i * 2 + 1] = Math.random() * H; B[i] = Math.random(); } }
      var sw = Math.round(r.width), shh = Math.round(r.height);
      targets = shapes.map(function (s) { return sampleShape(s, sw, shh, N, dpr); });
      T = targets[idx];
      gl.bindBuffer(gl.ARRAY_BUFFER, bBuf); gl.bufferData(gl.ARRAY_BUFFER, B, gl.STATIC_DRAW); gl.enableVertexAttribArray(aB); gl.vertexAttribPointer(aB, 1, gl.FLOAT, false, 0, 0);
      gl.uniform2f(uRes, W, H); gl.uniform1f(uSize, (r.width < 600 ? 2.6 : 2.4) * dpr);
      if (reduce) { for (var j = 0; j < N * 2; j++) P[j] = T[j]; draw(); }
    }
    var mx = -1e5, my = -1e5, down = false, dx0 = 0, dy0 = 0;
    function local(e) { var r = canvas.getBoundingClientRect(); mx = (e.clientX - r.left) * dpr; my = (e.clientY - r.top) * dpr; }
    host.addEventListener('pointermove', local);
    host.addEventListener('pointerleave', function () { mx = my = -1e5; });
    host.addEventListener('pointerdown', function (e) { local(e); down = true; dx0 = e.clientX; dy0 = e.clientY; });
    host.addEventListener('pointerup', function (e) { if (down && Math.hypot(e.clientX - dx0, e.clientY - dy0) < 12) next(); down = false; });   // a tap, not a drag
    host.addEventListener('pointercancel', function () { down = false; mx = my = -1e5; });
    function draw() {
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferData(gl.ARRAY_BUFFER, P, gl.DYNAMIC_DRAW); gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.POINTS, 0, N);
    }
    var R = 90, visible = false, raf = 0, lastSwitch = 0, frames = 0, lastT = 0, cost = 0;
    function frame(now) {
      raf = 0; if (!visible || document.hidden) { lastT = 0; return; }
      if (!lastSwitch) lastSwitch = now;
      if (o.autoCycle !== false && now - lastSwitch > (o.cycleMs || 7000)) next(now);
      var c0 = performance.now(), rr2 = (R * dpr) * (R * dpr), steps = lastT ? Math.max(1, Math.min(4, Math.round((now - lastT) / 16.7))) : 1; lastT = now;
      for (var s = 0; s < steps; s++) for (var i = 0; i < N; i++) {          // a slow device takes several small steps, so the shape forms just as fast
        var ix = i * 2, x = P[ix], y = P[ix + 1], vx = V[ix], vy = V[ix + 1];
        vx += (T[ix] - x) * 0.018; vy += (T[ix + 1] - y) * 0.018;                 // spring towards its place in the shape
        var dx = x - mx, dy = y - my, d2 = dx * dx + dy * dy;
        if (d2 < rr2) { var f = (1 - d2 / rr2) * 3.2 / (Math.sqrt(d2) + 0.1); vx += dx * f; vy += dy * f; }   // scatter from the pointer
        vx *= 0.85; vy *= 0.85;
        P[ix] = x + vx; P[ix + 1] = y + vy; V[ix] = vx; V[ix + 1] = vy;
      }
      cost = cost ? cost * 0.9 + (performance.now() - c0) * 0.1 : performance.now() - c0;
      draw(); frames++;
      raf = requestAnimationFrame(frame);
    }
    function next(now) {
      idx = (idx + 1) % shapes.length; T = targets[idx]; lastSwitch = now || performance.now();
      for (var i = 0; i < N * 2; i++) V[i] += (Math.random() - 0.5) * 9;          // a little burst as they leave
      host.setAttribute('data-shape', shapes[idx]);
      if (reduce) { for (var j = 0; j < N * 2; j++) P[j] = T[j]; draw(); }
    }
    function start() { if (!raf && !reduce) raf = requestAnimationFrame(frame); }
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
      setup(); host.setAttribute('data-shape', shapes[idx]);
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); }, { threshold: 0.1 }).observe(host);
      else { visible = true; start(); }
    });
    if ('ResizeObserver' in window) { var lw = 0; new ResizeObserver(function () { var w = host.clientWidth; if (Math.abs(w - lw) > 30 && P) { lw = w; setup(); } else lw = lw || w; }).observe(host); }
    document.addEventListener('visibilitychange', function () { if (!document.hidden && visible) start(); });
    return { enabled: true, next: next, shape: function () { return shapes[idx]; }, running: function () { return !!raf; }, frames: function () { return frames; }, count: function () { return N; }, cost: function () { return cost; }, settle: function () { if (!N) return 0; var e = 0; for (var i = 0; i < N * 2; i += 2) e += Math.hypot(P[i] - T[i], P[i + 1] - T[i + 1]); return e / N / dpr; } };
  }
  window.Particles = { mount: mount };
})();
