/*
 * Saltmarsh: heat and steam rising off the hero dish (the signature).
 * Loaded by main.js after the page has loaded and gone idle, so the photo is the first
 * paint and this never delays it. One WebGL (1) full-screen pass over the same photo:
 *  - a heat shimmer just above the food (the photo is resampled through a rising flow), and
 *  - soft, slow wisps: long ridged noise filaments, screen-blended in candle white, that
 *    widen and fade as they climb into the dark of the room.
 * The canvas maps the photo exactly like the <img> beneath it (object-fit: cover, the same
 * object-position) and draws the headline's shade itself (the same stops as .hero__shade),
 * so the wisps rise above the shade. It replaces the photo and the CSS shade in one frame,
 * from a frame identical to them, and the steam then gathers over three seconds.
 * Runs only while the hero is on screen and the tab is visible; the "Pause the steam"
 * button (WCAG 2.2.2, it runs past five seconds) stops it for the rest of the visit.
 * Reduced motion: one still frame with the steam held, no loop, no button.
 * A fine pointer over the hero stirs the steam a little (it answers the pointer only).
 * No WebGL, a shader error or a lost context: the canvas goes and the photo stays.
 */

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = (precision) => `
precision ${precision} float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform vec4 u_cover;     // screen uv -> image uv: scale.xy, offset.zw
uniform float u_time;
uniform float u_fade;     // 0 -> 1 as it fades in
uniform float u_aspect;   // image width / height
uniform vec3 u_ptr;       // image uv of the pointer, strength
uniform vec3 u_night;     // the room colour, for the headline's shade

uniform vec4 u_stops;     // the shade's stops 1-4, as fractions of the height (from main.js)
uniform float u_stop5;    // stop 5
uniform vec4 u_title;     // the headline's box (uv: x0, y0, x1, y1)
uniform vec4 u_lede;      // the line under it

// the same shade as .hero__shade in saltmarsh.css (night over the photo, by height)
float seg(float y, float y0, float y1, float a0, float a1) { return mix(a0, a1, clamp((y - y0) / max(y1 - y0, 0.0001), 0.0, 1.0)); }
float shadeA(float y) {
  if (y < u_stops.x) return seg(y, 0.0, u_stops.x, 0.94, 0.88);
  if (y < u_stops.y) return seg(y, u_stops.x, u_stops.y, 0.88, 0.5);
  if (y < u_stops.z) return seg(y, u_stops.y, u_stops.z, 0.5, 0.0);
  if (y < u_stops.w) return 0.0;
  if (y < u_stop5) return seg(y, u_stops.w, u_stop5, 0.0, 0.76);
  return seg(y, u_stop5, 1.0, 0.76, 1.0);
}
// 1 inside a box, easing to 0 over a soft edge (f, in uv)
float box(vec2 p, vec4 r, vec2 f) {
  vec2 a = smoothstep(r.xy - f, r.xy, p) * (1.0 - smoothstep(r.zw, r.zw + f, p));
  return a.x * a.y;
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = r * p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = v_uv * u_cover.xy + u_cover.zw;           // image uv, y down
  float sh = shadeA(v_uv.y);
  vec3 base = mix(texture2D(u_tex, uv).rgb, u_night, sh);

  // the plume: centred on the duck, rising from the top of the food (drawn above the shade)
  vec2 SRC = vec2(0.585, 0.50);
  float h = SRC.y - uv.y;                              // height above the food, in image heights
  float t = u_time;
  float sway = (noise(vec2(h * 2.2 - t * 0.045, 3.1)) - 0.5) * 0.34 * max(h, 0.0);
  float x = (uv.x - SRC.x) * u_aspect - sway;
  float halfw = 0.11 + max(h, 0.0) * 0.5;
  float plume = smoothstep(-0.06, 0.04, h) * (1.0 - smoothstep(0.26, 0.56, h))
              * (1.0 - smoothstep(halfw * 0.35, halfw, abs(x)));
  if (plume < 0.003) { gl_FragColor = vec4(base, 1.0); return; }

  vec2 q = vec2(x, h);
  vec2 w = vec2(fbm(q * 2.4 + vec2(0.0, -t * 0.095)), fbm(q * 2.4 + vec2(4.7, -t * 0.08)));

  // the pointer stirs it a little
  vec2 pd = vec2((uv.x - u_ptr.x) * u_aspect, uv.y - u_ptr.y);
  float pf = u_ptr.z * exp(-dot(pd, pd) * 40.0);
  w += vec2(-pd.y, pd.x) * pf * 5.0;

  // heat shimmer, strongest just above the food
  float haze = plume * (1.0 - smoothstep(0.0, 0.3, h)) * smoothstep(-0.05, 0.02, h);
  vec2 off = (w - 0.5) * vec2(0.0045, 0.008) * haze * u_fade;
  vec3 col = mix(texture2D(u_tex, uv + off).rgb, u_night, sh);

  // wisps: long filaments stretched upwards, plus a faint body of vapour
  float n = fbm(vec2(q.x * 3.0, q.y * 1.5) + (w - 0.5) * 2.0 - vec2(0.0, t * 0.15));
  float ridge = 1.0 - abs(n * 2.0 - 1.0);
  float wisp = pow(ridge, 6.0);
  float body = smoothstep(0.42, 0.85, fbm(q * 1.5 + w - vec2(0.0, t * 0.11)));
  float density = plume * smoothstep(-0.05, 0.03, h) * (wisp * 1.0 + body * 0.12);
  float a = clamp(density * 0.78 * u_fade, 0.0, 0.5);
  // thinner behind the words, so the text keeps its contrast (large headline 3:1+, the line 4.5:1+)
  vec2 soft = vec2(0.03, 0.04);
  a *= 1.0 - 0.3 * box(v_uv, u_title, soft);
  a *= 1.0 - 0.85 * box(v_uv, u_lede, soft);
  vec3 steam = vec3(0.98, 0.93, 0.86);
  col = 1.0 - (1.0 - col) * (1.0 - steam * a);         // screen blend: light, never a glow
  gl_FragColor = vec4(col, 1.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error(log || 'shader'); }
  return s;
}

function whenLoaded(img) {
  if (img.complete && img.naturalWidth) return (img.decode ? img.decode().catch(() => {}) : Promise.resolve());
  return new Promise((res, rej) => { img.addEventListener('load', res, { once: true }); img.addEventListener('error', rej, { once: true }); });
}

export async function mountSteam(stage, { img, toggle, reduced, store }) {
  if (!stage || !img) return null;
  await whenLoaded(img);

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const opts = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power' };
  const gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
  if (!gl) return null;

  const hp = gl.getShaderPrecisionFormat && gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
  const precision = hp && hp.precision > 0 ? 'highp' : 'mediump';
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG(precision)));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
  } catch (err) {
    console.warn('Steam shader unavailable:', err.message);
    return null;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); }
  catch (err) { console.warn('Steam texture unavailable:', err.message); return null; }

  const U = {};
  ['u_tex', 'u_cover', 'u_time', 'u_fade', 'u_aspect', 'u_ptr', 'u_night', 'u_stops', 'u_stop5', 'u_title', 'u_lede'].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });
  gl.uniform1i(U.u_tex, 0);
  const iw = img.naturalWidth, ih = img.naturalHeight;
  gl.uniform1f(U.u_aspect, iw / ih);
  const night = (getComputedStyle(document.documentElement).getPropertyValue('--night').trim() || '#17110E').replace('#', '');
  gl.uniform3f(U.u_night, ...[0, 2, 4].map((i) => parseInt(night.slice(i, i + 2), 16) / 255));

  // the same crop as the <img>: object-fit cover with its computed object-position
  let W = 1, H = 1;
  const resize = () => {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    const s = Math.max(W / iw, H / ih);
    const density = Math.min(window.devicePixelRatio || 1, Math.max(1, 1 / s), 2);
    canvas.width = Math.min(2560, Math.round(W * density));
    canvas.height = Math.min(1600, Math.round(H * density));
    gl.viewport(0, 0, canvas.width, canvas.height);
    const pos = getComputedStyle(img).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
    const px = Number.isFinite(pos[0]) ? pos[0] : 0.5, py = Number.isFinite(pos[1]) ? pos[1] : 0.5;
    const dw = iw * s, dh = ih * s;
    const ox = (W - dw) * px, oy = (H - dh) * py;
    gl.uniform4f(U.u_cover, W / dw, H / dh, -ox / dw, -oy / dh);
    readLayout();
    if (!running()) draw();
  };

  // the shade's stops (set on the hero by main.js) and the text boxes, in the canvas's uv
  const heroEl = stage.closest('.hero') || stage;
  function readLayout() {
    const r = stage.getBoundingClientRect();
    const cs = getComputedStyle(heroEl);
    const st = [1, 2, 3, 4, 5].map((i, k) => { const v = parseFloat(cs.getPropertyValue(`--sh-${i}`)); return Number.isFinite(v) ? v / r.height : [0.26, 0.46, 0.6, 0.72, 0.88][k]; });
    gl.uniform4f(U.u_stops, st[0], st[1], st[2], st[3]);
    gl.uniform1f(U.u_stop5, st[4]);
    const rect = (el) => {
      if (!el) return [2, 2, 2, 2];
      const b = el.getBoundingClientRect();
      return [(b.left - r.left) / r.width, (b.top - r.top) / r.height, (b.right - r.left) / r.width, (b.bottom - r.top) / r.height];
    };
    gl.uniform4f(U.u_title, ...rect(heroEl.querySelector('.hero__title')));
    gl.uniform4f(U.u_lede, ...rect(heroEl.querySelector('.hero__lede')));
  }
  heroEl.addEventListener('saltmarsh:shade', () => { readLayout(); if (!running()) draw(); });

  let time = 7.5, fade = 0, last = 0, raf = 0, visible = false, lost = false;
  let paused = !!(store && store.get('steamPaused'));
  const ptr = { x: 0.5, y: 0.5, s: 0, tx: 0.5, ty: 0.5 };

  function draw() {
    if (lost) return;
    gl.uniform1f(U.u_time, time % 1000);
    gl.uniform1f(U.u_fade, fade);
    gl.uniform3f(U.u_ptr, ptr.x, ptr.y, ptr.s);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  const running = () => !reduced && !paused && visible && !document.hidden && !lost;
  function frame(now) {
    raf = 0;
    if (!running()) { last = 0; return; }
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    time += dt;
    fade = Math.min(1, fade + dt / 3);                  // the wisps gather over three seconds
    ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 6);
    ptr.y += (ptr.ty - ptr.y) * Math.min(1, dt * 6);
    ptr.s *= Math.exp(-dt * 1.6);
    draw();
    raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && running()) raf = requestAnimationFrame(frame); };

  // the canvas goes in over the photo and fades up from an identical first frame
  stage.append(canvas);
  if (reduced || paused) fade = 1;
  resize();
  draw();
  const hero = stage.closest('.hero') || stage;
  // the canvas carries the shade itself (so the steam can rise above it): swap both in one frame
  requestAnimationFrame(() => { canvas.classList.add('is-live'); hero.classList.add('is-steaming'); });

  new ResizeObserver(() => { resize(); }).observe(stage);
  const io = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    kick();
  }, { threshold: 0 });
  io.observe(stage);
  document.addEventListener('visibilitychange', kick);

  // the pause control (it runs past five seconds)
  const label = toggle && toggle.querySelector('.steam-toggle__verb');
  const syncToggle = () => {
    if (!toggle) return;
    toggle.dataset.state = paused ? 'paused' : 'playing';
    label.textContent = paused ? 'Play' : 'Pause';
  };
  if (toggle && !reduced) {
    syncToggle();
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      paused = !paused;
      if (store) store.set('steamPaused', paused);
      if (!paused && fade < 1) fade = Math.max(fade, 0.6);
      syncToggle();
      kick();
    });
  }

  // a fine pointer over the hero stirs the steam (never on touch: that is scrolling)
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduced) {
    hero.addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      const sx = (e.clientX - r.left) / r.width, sy = (e.clientY - r.top) / r.height;
      const c = gl.getUniform(prog, U.u_cover);
      ptr.tx = sx * c[0] + c[2]; ptr.ty = sy * c[1] + c[3];
      if (ptr.s < 0.05) { ptr.x = ptr.tx; ptr.y = ptr.ty; }
      ptr.s = Math.min(1, ptr.s + 0.08);
    }, { passive: true });
  }

  // reduced motion switched on mid-visit: hold the current frame and stop for good
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onMq = () => { if (mq.matches) { reduced = true; fade = 1; draw(); if (toggle) toggle.hidden = true; } };
  if (mq.addEventListener) mq.addEventListener('change', onMq);

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    lost = true;
    hero.classList.remove('is-steaming');
    canvas.remove();
    if (toggle) toggle.hidden = true;
  });

  return {
    pause() { paused = true; syncToggle(); },
    play() { paused = false; syncToggle(); kick(); },
    get running() { return running(); },
  };
}
