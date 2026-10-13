/*
 * Fluid: midnight water with cream and gold ink, simulated on the graphics card (WebGL 2, no libraries).
 * A "stable fluids" solver (advection, vorticity confinement, divergence, pressure, projection) at a
 * modest grid, with the ink carried at screen resolution by MacCormack advection (a forward and a
 * backward step, corrected and clamped) so lines stay crisp instead of smearing. Two inks in two
 * channels: red = cream, green = gold. Ink is laid down as anti-aliased line segments (one pass per
 * batch, scissored to the segment's box), so the pen writes thin, sharp lines.
 *
 *   const f = createFluid(canvas, { light, colours: { bg, cream, gold } })   // null if WebGL 2 can't do it
 *   f.ink(points, { cream, gold, radius })      points in CSS px, y down
 *   f.push(points, { speed, radius })           a current along a polyline (texels per second)
 *   f.swirl(x, y, vx, vy, radius)               a gaussian push (CSS px per second)
 *   f.step(dt)  f.render(pen)  f.resize()  f.clear()  f.dispose()
 */

const VERT = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const HEAD = `#version 300 es
precision highp float; precision highp sampler2D;
in vec2 vUv; out vec4 o;
`;

const FRAG = {
  copy: HEAD + `uniform sampler2D uSrc; void main(){ o = texture(uSrc, vUv); }`,
  scale: HEAD + `uniform sampler2D uSrc; uniform float uK; void main(){ o = texture(uSrc, vUv) * uK; }`,
  curl: HEAD + `uniform sampler2D uVel; uniform vec2 uTx;
    void main(){
      float L = texture(uVel, vUv - vec2(uTx.x, 0.)).y, R = texture(uVel, vUv + vec2(uTx.x, 0.)).y;
      float T = texture(uVel, vUv + vec2(0., uTx.y)).x, B = texture(uVel, vUv - vec2(0., uTx.y)).x;
      o = vec4(0.5 * (R - L - T + B), 0., 0., 1.);
    }`,
  vorticity: HEAD + `uniform sampler2D uVel, uCurl; uniform vec2 uTx; uniform float uCurlK, uDt;
    void main(){
      float L = texture(uCurl, vUv - vec2(uTx.x, 0.)).x, R = texture(uCurl, vUv + vec2(uTx.x, 0.)).x;
      float T = texture(uCurl, vUv + vec2(0., uTx.y)).x, B = texture(uCurl, vUv - vec2(0., uTx.y)).x;
      float C = texture(uCurl, vUv).x;
      vec2 f = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
      f /= length(f) + 1e-4; f *= uCurlK * C; f.y *= -1.;
      vec2 v = texture(uVel, vUv).xy + f * uDt;
      o = vec4(clamp(v, -1000., 1000.), 0., 1.);
    }`,
  divergence: HEAD + `uniform sampler2D uVel; uniform vec2 uTx;
    void main(){
      vec2 C = texture(uVel, vUv).xy;
      float L = texture(uVel, vUv - vec2(uTx.x, 0.)).x, R = texture(uVel, vUv + vec2(uTx.x, 0.)).x;
      float T = texture(uVel, vUv + vec2(0., uTx.y)).y, B = texture(uVel, vUv - vec2(0., uTx.y)).y;
      if (vUv.x - uTx.x < 0.) L = -C.x; if (vUv.x + uTx.x > 1.) R = -C.x;
      if (vUv.y + uTx.y > 1.) T = -C.y; if (vUv.y - uTx.y < 0.) B = -C.y;
      o = vec4(0.5 * (R - L + T - B), 0., 0., 1.);
    }`,
  pressure: HEAD + `uniform sampler2D uP, uDiv; uniform vec2 uTx;
    void main(){
      float L = texture(uP, vUv - vec2(uTx.x, 0.)).x, R = texture(uP, vUv + vec2(uTx.x, 0.)).x;
      float T = texture(uP, vUv + vec2(0., uTx.y)).x, B = texture(uP, vUv - vec2(0., uTx.y)).x;
      o = vec4((L + R + T + B - texture(uDiv, vUv).x) * 0.25, 0., 0., 1.);
    }`,
  gradient: HEAD + `uniform sampler2D uP, uVel; uniform vec2 uTx;
    void main(){
      float L = texture(uP, vUv - vec2(uTx.x, 0.)).x, R = texture(uP, vUv + vec2(uTx.x, 0.)).x;
      float T = texture(uP, vUv + vec2(0., uTx.y)).x, B = texture(uP, vUv - vec2(0., uTx.y)).x;
      o = vec4(texture(uVel, vUv).xy - 0.5 * vec2(R - L, T - B), 0., 1.);
    }`,
  // clears ink softly inside a box (feathered edges), a little more each frame
  wash: HEAD + `uniform sampler2D uSrc; uniform vec4 uBox; uniform vec2 uRes; uniform float uK, uFeather;
    void main(){
      vec2 p = vUv * uRes;
      vec2 d = max(uBox.xy - p, p - uBox.zw);
      float m = 1. - smoothstep(0., uFeather, max(d.x, d.y));
      o = texture(uSrc, vUv) * mix(1., uK, m);
    }`,
  // a touch of viscosity: removes the grid-scale chequerboard the pressure solve leaves behind
  soften: HEAD + `uniform sampler2D uVel; uniform vec2 uTx; uniform float uK;
    void main(){
      vec2 C = texture(uVel, vUv).xy;
      vec2 n = texture(uVel, vUv - vec2(uTx.x, 0.)).xy + texture(uVel, vUv + vec2(uTx.x, 0.)).xy + texture(uVel, vUv + vec2(0., uTx.y)).xy + texture(uVel, vUv - vec2(0., uTx.y)).xy;
      o = vec4(mix(C, n * 0.25, uK), 0., 1.);
    }`,
  advect: HEAD + `uniform sampler2D uVel, uSrc; uniform vec2 uTx; uniform float uDt, uKeep;
    void main(){
      vec2 c = vUv - uDt * texture(uVel, vUv).xy * uTx;
      o = texture(uSrc, c) * uKeep;
    }`,
  // MacCormack: uSign = 1 for the forward step, -1 for the backward one
  trace: HEAD + `uniform sampler2D uVel, uSrc; uniform vec2 uTx; uniform float uDt, uSign;
    void main(){ o = texture(uSrc, vUv - uSign * uDt * texture(uVel, vUv).xy * uTx); }`,
  correct: HEAD + `uniform sampler2D uVel, uSrc, uHat, uBar; uniform vec2 uTx, uDyeTx; uniform float uDt, uKeep;
    void main(){
      vec2 back = vUv - uDt * texture(uVel, vUv).xy * uTx;
      vec4 r = texture(uHat, vUv) + 0.5 * (texture(uSrc, vUv) - texture(uBar, vUv));
      vec2 st = back / uDyeTx - 0.5, i0 = (floor(st) + 0.5) * uDyeTx;
      vec4 a = texture(uSrc, i0), b = texture(uSrc, i0 + vec2(uDyeTx.x, 0.)), c = texture(uSrc, i0 + vec2(0., uDyeTx.y)), d = texture(uSrc, i0 + uDyeTx);
      r = clamp(r, min(min(a, b), min(c, d)), max(max(a, b), max(c, d)));
      o = r * uKeep;
    }`,
  // ink and currents along a polyline (up to 32 points), in CSS px of the target
  segment: HEAD + `uniform vec2 uPts[32]; uniform int uN, uMode; uniform vec2 uRes; uniform float uR, uSoft, uSpeed; uniform vec4 uCol;
    void main(){
      vec2 p = vUv * uRes; float dmin = 1e9; vec2 tg = vec2(0.);
      if (uN == 1) dmin = length(p - uPts[0]);
      for (int i = 0; i < 31; i++) {
        if (i >= uN - 1) break;
        vec2 a = uPts[i], ab = uPts[i + 1] - a; float l2 = dot(ab, ab);
        float t = l2 > 0. ? clamp(dot(p - a, ab) / l2, 0., 1.) : 0.;
        float d = length(p - a - ab * t);
        if (d < dmin) { dmin = d; tg = l2 > 0. ? ab / sqrt(l2) : vec2(0.); }
      }
      if (uMode == 0) o = uCol * (1. - smoothstep(uR - uSoft, uR + uSoft, dmin));
      else o = vec4(tg * uSpeed * exp(-dmin * dmin / (2. * uR * uR)), 0., 0.);
    }`,
  swirl: HEAD + `uniform vec2 uPt, uRes, uV; uniform float uR;
    void main(){ vec2 p = vUv * uRes - uPt; o = vec4(uV * exp(-dot(p, p) / (2. * uR * uR)), 0., 0.); }`,
  display: HEAD + `uniform sampler2D uDye; uniform vec2 uDyeTx, uView; uniform vec3 uBg, uCream, uGold, uDeep; uniform vec4 uPen; uniform float uSeed;
    // Catmull-Rom in 9 bilinear taps: sharper than plain bilinear when the ink is enlarged
    vec4 sharp(vec2 uv){
      vec2 s = uv / uDyeTx, t1 = floor(s - 0.5) + 0.5, f = s - t1;
      vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f)), w1 = 1.0 + f * f * (-2.5 + 1.5 * f), w2 = f * (0.5 + f * (2.0 - 1.5 * f)), w3 = f * f * (-0.5 + 0.5 * f);
      vec2 w12 = w1 + w2, o12 = w2 / w12;
      vec2 a = (t1 - 1.) * uDyeTx, b = (t1 + o12) * uDyeTx, c = (t1 + 2.) * uDyeTx;
      vec4 r = texture(uDye, vec2(a.x, a.y)) * w0.x * w0.y + texture(uDye, vec2(b.x, a.y)) * w12.x * w0.y + texture(uDye, vec2(c.x, a.y)) * w3.x * w0.y
             + texture(uDye, vec2(a.x, b.y)) * w0.x * w12.y + texture(uDye, vec2(b.x, b.y)) * w12.x * w12.y + texture(uDye, vec2(c.x, b.y)) * w3.x * w12.y
             + texture(uDye, vec2(a.x, c.y)) * w0.x * w3.y + texture(uDye, vec2(b.x, c.y)) * w12.x * w3.y + texture(uDye, vec2(c.x, c.y)) * w3.x * w3.y;
      return max(r, 0.);
    }
    float hash(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
    void main(){
      vec2 d = clamp(sharp(vUv).rg, 0., 1.);
      // a little relief: ink is lit from the top left, like wet ink on a sheet
      float hx = dot(texture(uDye, vUv + vec2(uDyeTx.x, 0.)).rg - texture(uDye, vUv - vec2(uDyeTx.x, 0.)).rg, vec2(.7, .5));
      float hy = dot(texture(uDye, vUv + vec2(0., uDyeTx.y)).rg - texture(uDye, vUv - vec2(0., uDyeTx.y)).rg, vec2(.7, .5));
      vec3 n = normalize(vec3(-hx * 1.6, -hy * 1.6, 1.));
      float lit = dot(n, normalize(vec3(-.45, .55, .7)));
      // thin, stretched gold stays gold (it only gets finer), dense gold is brightest
      vec3 gold = mix(mix(uDeep, uGold, .55), uGold, smoothstep(.1, .6, d.g));
      vec3 col = mix(uBg, gold, smoothstep(0., .5, d.g) * .95);
      col = mix(col, uCream, smoothstep(.04, .8, d.r));
      col *= mix(1., .82 + .3 * lit, clamp(d.r + d.g, 0., 1.) * .7);
      // the pen tip
      vec2 pp = vUv * uView - uPen.xy;
      col = mix(col, uGold, uPen.w * (1. - smoothstep(uPen.z - .9, uPen.z + .9, length(pp))));
      col += (hash(vUv * uView + uSeed) - .5) / 255.;
      o = vec4(col, 1.);
    }`,
};

export function createFluid(canvas, opts = {}) {
  const light = !!opts.light;
  const gl = canvas.getContext('webgl2', { alpha: false, depth: false, stencil: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const lose = gl.getExtension('WEBGL_lose_context');
  const fail = () => { if (lose) lose.loseContext(); return null; };
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) return fail();
  gl.getExtension('OES_texture_float_linear');

  const shaders = [], programs = {};
  function compile(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
    shaders.push(s); return s;
  }
  try {
    const vs = compile(gl.VERTEX_SHADER, VERT);
    for (const k in FRAG) {
      const p = gl.createProgram();
      gl.attachShader(p, vs); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, FRAG[k]));
      gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
      const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, ''); u[name] = gl.getUniformLocation(p, name); }
      programs[k] = { p, u };
    }
  } catch (e) { return fail(); }

  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0);

  const targets = new Set();
  function target(w, h) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    const r = { t, f, w, h, tx: [1 / w, 1 / h] };
    targets.add(r); return r;
  }
  function drop(r) { if (!r) return; gl.deleteTexture(r.t); gl.deleteFramebuffer(r.f); targets.delete(r); }
  function pair(w, h) { let a = target(w, h), b = target(w, h); return { get read() { return a; }, get write() { return b; }, swap() { const t = a; a = b; b = t; }, drop() { drop(a); drop(b); } }; }

  let css = { w: 1, h: 1 }, vel, dye, prs, div, crl, hat, bar;
  const simShort = light ? 96 : 176, iters = light ? 14 : 26;
  function sizes() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(light ? 1 : 2, window.devicePixelRatio || 1);
    css = { w: Math.max(2, r.width), h: Math.max(2, r.height) };
    canvas.width = Math.max(2, Math.round(css.w * dpr)); canvas.height = Math.max(2, Math.round(css.h * dpr));
    const aspect = css.w / css.h;
    const sim = aspect >= 1 ? [Math.round(simShort * aspect), simShort] : [simShort, Math.round(simShort / aspect)];
    const dyeScale = light ? 0.7 : Math.min(1.35, Math.max(1, dpr * 0.75));
    let dw = Math.round(css.w * dyeScale), dh = Math.round(css.h * dyeScale);
    const cap = light ? 900 : 1700, m = Math.max(dw, dh);
    if (m > cap) { dw = Math.round(dw * cap / m); dh = Math.round(dh * cap / m); }
    return { sim, dye: [Math.max(2, dw), Math.max(2, dh)] };
  }
  function build(keep) {
    const s = sizes();
    const old = keep ? dye : null;
    if (vel) { vel.drop(); prs.drop(); drop(div); drop(crl); if (!keep) dye.drop(); drop(hat); drop(bar); }
    vel = pair(s.sim[0], s.sim[1]); prs = pair(s.sim[0], s.sim[1]); div = target(s.sim[0], s.sim[1]); crl = target(s.sim[0], s.sim[1]);
    dye = pair(s.dye[0], s.dye[1]);
    if (!light) { hat = target(s.dye[0], s.dye[1]); bar = target(s.dye[0], s.dye[1]); } else { hat = bar = null; }
    if (old) {                                                    // carry the ink over to the new size
      gl.disable(gl.BLEND);
      const u = use('copy'); bind(u.uSrc, old.read, 0); blit(dye.read);
      old.drop();
    }
  }
  function use(k) { gl.useProgram(programs[k].p); return programs[k].u; }
  function bind(loc, r, unit) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, r.t); gl.uniform1i(loc, unit); }
  function blit(r) {
    if (r) { gl.bindFramebuffer(gl.FRAMEBUFFER, r.f); gl.viewport(0, 0, r.w, r.h); }
    else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  build(false);
  gl.bindFramebuffer(gl.FRAMEBUFFER, vel.read.f);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) { dispose(); return null; }

  // ---- input: everything in CSS px with y down, converted here
  const flat = new Float32Array(64);
  function scissorFor(r, pts, pad) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    pts.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
    const sx = r.w / css.w, sy = r.h / css.h;
    const X0 = Math.max(0, Math.floor((x0 - pad) * sx)), X1 = Math.min(r.w, Math.ceil((x1 + pad) * sx));
    const Y0 = Math.max(0, Math.floor((css.h - y1 - pad) * sy)), Y1 = Math.min(r.h, Math.ceil((css.h - y0 + pad) * sy));
    if (X1 <= X0 || Y1 <= Y0) return false;
    gl.enable(gl.SCISSOR_TEST); gl.scissor(X0, Y0, X1 - X0, Y1 - Y0); return true;
  }
  function segments(r, pts, setup, pad) {
    for (let start = 0; start < pts.length; start += 31) {
      const chunk = pts.slice(start, start + 32);
      if (!chunk.length) break;
      if (!scissorFor(r, chunk, pad)) continue;
      const u = use('segment');
      flat.fill(0);
      chunk.forEach(([x, y], i) => { flat[i * 2] = x; flat[i * 2 + 1] = css.h - y; });
      gl.uniform2fv(u.uPts, flat); gl.uniform1i(u.uN, chunk.length); gl.uniform2f(u.uRes, css.w, css.h);
      setup(u);
      blit(r);
      if (start + 32 >= pts.length) break;
    }
    gl.disable(gl.SCISSOR_TEST);
  }
  function ink(pts, { cream = 0, gold = 0, radius = 2, soft = 0.75 }) {
    if (!pts.length) return;
    gl.enable(gl.BLEND); gl.blendEquation(gl.MAX); gl.blendFunc(gl.ONE, gl.ONE);
    segments(dye.read, pts, (u) => { gl.uniform1i(u.uMode, 0); gl.uniform1f(u.uR, radius); gl.uniform1f(u.uSoft, soft); gl.uniform4f(u.uCol, cream, gold, 0, 0); }, radius + 3);
    gl.blendEquation(gl.FUNC_ADD); gl.disable(gl.BLEND);
  }
  function push(pts, { speed, radius = 8 }) {
    if (pts.length < 2) return;
    gl.enable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD); gl.blendFunc(gl.ONE, gl.ONE);
    segments(vel.read, pts, (u) => { gl.uniform1i(u.uMode, 1); gl.uniform1f(u.uR, radius); gl.uniform1f(u.uSpeed, speed); gl.uniform4f(u.uCol, 0, 0, 0, 0); }, radius * 3.2);
    gl.disable(gl.BLEND);
  }
  function cellPx() { return css.w / vel.read.w; }
  // vx, vy in CSS px per second (y down)
  function swirl(x, y, vx, vy, radius) {
    const pad = radius * 3.2;
    if (!scissorFor(vel.read, [[x, y]], pad)) return;
    gl.enable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD); gl.blendFunc(gl.ONE, gl.ONE);
    const u = use('swirl'), k = 1 / cellPx();
    gl.uniform2f(u.uPt, x, css.h - y); gl.uniform2f(u.uRes, css.w, css.h); gl.uniform2f(u.uV, vx * k, -vy * k); gl.uniform1f(u.uR, radius);
    blit(vel.read);
    gl.disable(gl.BLEND); gl.disable(gl.SCISSOR_TEST);
  }

  // ---- the solver
  const params = { curl: light ? 5 : 7, velKeep: 0.5, soften: 0.35, dyeKeep: 0.03 };
  function step(dt) {
    gl.disable(gl.BLEND);
    const tx = vel.read.tx;
    let u = use('curl'); gl.uniform2fv(u.uTx, tx); bind(u.uVel, vel.read, 0); blit(crl);
    u = use('vorticity'); gl.uniform2fv(u.uTx, tx); bind(u.uVel, vel.read, 0); bind(u.uCurl, crl, 1); gl.uniform1f(u.uCurlK, params.curl); gl.uniform1f(u.uDt, dt); blit(vel.write); vel.swap();
    u = use('divergence'); gl.uniform2fv(u.uTx, tx); bind(u.uVel, vel.read, 0); blit(div);
    u = use('scale'); bind(u.uSrc, prs.read, 0); gl.uniform1f(u.uK, 0.8); blit(prs.write); prs.swap();
    u = use('pressure'); gl.uniform2fv(u.uTx, tx); bind(u.uDiv, div, 1);
    for (let i = 0; i < iters; i++) { bind(u.uP, prs.read, 0); blit(prs.write); prs.swap(); }
    u = use('gradient'); gl.uniform2fv(u.uTx, tx); bind(u.uP, prs.read, 0); bind(u.uVel, vel.read, 1); blit(vel.write); vel.swap();
    u = use('soften'); gl.uniform2fv(u.uTx, tx); bind(u.uVel, vel.read, 0); gl.uniform1f(u.uK, params.soften); blit(vel.write); vel.swap();
    u = use('advect'); gl.uniform2fv(u.uTx, tx); bind(u.uVel, vel.read, 0); bind(u.uSrc, vel.read, 1); gl.uniform1f(u.uDt, dt); gl.uniform1f(u.uKeep, 1 / (1 + params.velKeep * dt)); blit(vel.write); vel.swap();
    const keep = 1 / (1 + params.dyeKeep * dt);
    if (light) {
      u = use('advect'); gl.uniform2fv(u.uTx, tx); bind(u.uVel, vel.read, 0); bind(u.uSrc, dye.read, 1); gl.uniform1f(u.uDt, dt); gl.uniform1f(u.uKeep, keep); blit(dye.write); dye.swap();
    } else {
      u = use('trace'); gl.uniform2fv(u.uTx, tx); bind(u.uVel, vel.read, 0); gl.uniform1f(u.uDt, dt);
      bind(u.uSrc, dye.read, 1); gl.uniform1f(u.uSign, 1); blit(hat);
      bind(u.uSrc, hat, 1); gl.uniform1f(u.uSign, -1); blit(bar);
      u = use('correct'); gl.uniform2fv(u.uTx, tx); gl.uniform2fv(u.uDyeTx, dye.read.tx); gl.uniform1f(u.uDt, dt); gl.uniform1f(u.uKeep, keep);
      bind(u.uVel, vel.read, 0); bind(u.uSrc, dye.read, 1); bind(u.uHat, hat, 2); bind(u.uBar, bar, 3); blit(dye.write); dye.swap();
    }
  }
  // box in CSS px (y down): { x0, y0, x1, y1 }; k is this frame's multiplier inside it
  function wash(box, k) {
    gl.disable(gl.BLEND);
    const u = use('wash');
    bind(u.uSrc, dye.read, 0);
    gl.uniform4f(u.uBox, box.x0, css.h - box.y1, box.x1, css.h - box.y0); gl.uniform2f(u.uRes, css.w, css.h);
    gl.uniform1f(u.uK, k); gl.uniform1f(u.uFeather, 22);
    blit(dye.write); dye.swap();
  }
  const col = opts.colours;
  let seed = 0;
  function render(pen) {
    gl.disable(gl.BLEND);
    const u = use('display');
    bind(u.uDye, dye.read, 0); gl.uniform2fv(u.uDyeTx, dye.read.tx);
    gl.uniform2f(u.uView, css.w, css.h);
    gl.uniform3fv(u.uBg, col.bg); gl.uniform3fv(u.uCream, col.cream); gl.uniform3fv(u.uGold, col.gold); gl.uniform3fv(u.uDeep, col.deep);
    if (pen) gl.uniform4f(u.uPen, pen.x, css.h - pen.y, pen.r, pen.a); else gl.uniform4f(u.uPen, 0, 0, 0, 0);
    gl.uniform1f(u.uSeed, (seed = (seed + 17.31) % 1000));
    blit(null);
  }
  function clear() {
    [vel.read, vel.write, prs.read, prs.write, dye.read, dye.write].forEach((r) => { gl.bindFramebuffer(gl.FRAMEBUFFER, r.f); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); });
  }
  let disposed = false;
  function dispose() {
    if (disposed) return; disposed = true;
    targets.forEach((r) => { gl.deleteTexture(r.t); gl.deleteFramebuffer(r.f); });
    targets.clear();
    for (const k in programs) gl.deleteProgram(programs[k].p);
    shaders.forEach((s) => gl.deleteShader(s));
    gl.deleteBuffer(vbo); gl.deleteVertexArray(vao);
    if (lose) lose.loseContext();
  }
  return {
    gl, ink, push, swirl, wash, step, render, clear, dispose, cellPx, params,
    resize() { build(true); },
    size() { return { w: css.w, h: css.h }; },
    lost() { return gl.isContextLost(); },
  };
}
