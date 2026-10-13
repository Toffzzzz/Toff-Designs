/*
 * Saltmarsh: the steam's renderer (one WebGL (1) full-screen pass over the hero photo).
 * Used by js/steam-worker.js, which runs it on an OffscreenCanvas in a worker so that none
 * of its work (creating the context, compiling the shaders, uploading the photo, drawing
 * the frames) ever lands on the page's main thread; js/steam.js falls back to running it
 * on the page itself where a worker cannot draw WebGL, with the setup spread over frames.
 * js/steam.js owns the page side: layout, visibility, the pause control, the pointer.
 */

export const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

export const FRAG = (precision) => `
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

// one step at a time, so no single task runs long (it matters on the page's main thread)
const raf = (fn) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(fn) : setTimeout(() => fn(performance.now()), 16));
const caf = (id) => (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(id) : clearTimeout(id));
const nextFrame = () => new Promise((res) => raf(() => res()));
const nextTask = () => new Promise((res) => {
  if (typeof MessageChannel === 'undefined') { setTimeout(res, 0); return; }
  const ch = new MessageChannel(); ch.port1.onmessage = () => res(); ch.port2.postMessage(0);
});
export const breather = () => nextFrame().then(nextTask);   // after the next frame, in a fresh task

function shader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);       // status is read once it has finished (see build())
  return s;
}

// compile and link without waiting on the driver: with KHR_parallel_shader_compile, ask
// "done yet?" once a frame (a non-blocking query); without it, give it a few frames first
async function build(gl, vsSrc, fsSrc) {
  const ext = gl.getExtension('KHR_parallel_shader_compile');
  const vs = shader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = shader(gl, gl.FRAGMENT_SHADER, fsSrc);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (ext) {
    for (let i = 0; i < 600 && !gl.getProgramParameter(prog, ext.COMPLETION_STATUS_KHR); i++) await nextFrame();
  } else {
    for (let i = 0; i < 3; i++) await nextFrame();
  }
  await nextTask();
  if (gl.isContextLost()) throw new Error('context lost');
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = (!gl.getShaderParameter(vs, gl.COMPILE_STATUS) && gl.getShaderInfoLog(vs))
      || (!gl.getShaderParameter(fs, gl.COMPILE_STATUS) && gl.getShaderInfoLog(fs))
      || gl.getProgramInfoLog(prog) || 'link';
    throw new Error(log);
  }
  gl.detachShader(prog, vs); gl.detachShader(prog, fs);
  gl.deleteShader(vs); gl.deleteShader(fs);
  return prog;
}

/*
 * createRenderer(canvas, source, init, onLost) -> renderer, once its first frame is drawn.
 *  canvas: a <canvas> or an OffscreenCanvas; source: the photo (an <img> or an ImageBitmap)
 *  init: { iw, ih, night: [r, g, b], layout, fade }
 * The renderer takes messages (the same ones from the page or through the worker):
 *  { type: 'layout', W, H, density, cover, stops, stop5, title, lede }
 *  { type: 'run', on }        run the loop or hold the current frame
 *  { type: 'play' }           the visitor pressed Play: the wisps come back at once
 *  { type: 'still' }          reduced motion turned on: the steam held, for good
 *  { type: 'ptr', x, y }      the pointer, in the photo's uv
 */
export async function createRenderer(canvas, source, init, onLost) {
  const opts = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power' };
  const gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
  if (!gl) throw new Error('no WebGL');
  await breather();

  const hp = gl.getShaderPrecisionFormat && gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
  const precision = hp && hp.precision > 0 ? 'highp' : 'mediump';
  const prog = await build(gl, VERT, FRAG(precision));
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
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  if (source && typeof source.close === 'function') source.close();   // an ImageBitmap: the GPU has it now
  await breather();
  if (gl.isContextLost()) throw new Error('context lost');

  const U = {};
  ['u_tex', 'u_cover', 'u_time', 'u_fade', 'u_aspect', 'u_ptr', 'u_night', 'u_stops', 'u_stop5', 'u_title', 'u_lede'].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });
  gl.uniform1i(U.u_tex, 0);
  gl.uniform1f(U.u_aspect, init.iw / init.ih);
  gl.uniform3f(U.u_night, ...init.night);

  let time = 7.5, fade = init.fade || 0, last = 0, id = 0, on = false, lost = false;
  const ptr = { x: 0.5, y: 0.5, s: 0, tx: 0.5, ty: 0.5 };

  function draw() {
    if (lost) return;
    gl.uniform1f(U.u_time, time % 1000);
    gl.uniform1f(U.u_fade, fade);
    gl.uniform3f(U.u_ptr, ptr.x, ptr.y, ptr.s);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function frame(now) {
    id = 0;
    if (!on || lost) { last = 0; return; }
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    time += dt;
    fade = Math.min(1, fade + dt / 3);                  // the wisps gather over three seconds
    ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 6);
    ptr.y += (ptr.ty - ptr.y) * Math.min(1, dt * 6);
    ptr.s *= Math.exp(-dt * 1.6);
    draw();
    id = raf(frame);
  }
  function layout(l) {
    // the same crop as the <img> (object-fit cover with its object-position), measured by the page
    canvas.width = Math.min(2560, Math.round(l.W * l.density));
    canvas.height = Math.min(1600, Math.round(l.H * l.density));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform4f(U.u_cover, ...l.cover);
    gl.uniform4f(U.u_stops, ...l.stops);
    gl.uniform1f(U.u_stop5, l.stop5);
    gl.uniform4f(U.u_title, ...l.title);
    gl.uniform4f(U.u_lede, ...l.lede);
  }

  function apply(m) {
    if (lost) return;
    switch (m.type) {
      case 'layout': layout(m); if (!on) draw(); break;
      case 'run':
        on = !!m.on;
        if (on && !id) id = raf(frame);
        if (!on && id) { caf(id); id = 0; last = 0; }
        break;
      case 'play': if (fade < 1) fade = Math.max(fade, 0.6); break;
      case 'still': on = false; if (id) { caf(id); id = 0; } fade = 1; draw(); break;
      case 'ptr':
        ptr.tx = m.x; ptr.ty = m.y;
        if (ptr.s < 0.05) { ptr.x = ptr.tx; ptr.y = ptr.ty; }
        ptr.s = Math.min(1, ptr.s + 0.08);
        break;
      default:
    }
  }

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    lost = true; on = false;
    if (id) { caf(id); id = 0; }
    if (onLost) onLost();
  });

  // the first frame (identical to the photo and its shade when the steam starts from nothing)
  layout(init.layout);
  draw();
  await nextFrame();
  if (gl.isContextLost()) throw new Error('context lost');
  return { apply };
}
