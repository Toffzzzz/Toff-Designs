/*
 * "A million specks", the WebGL2 version (for browsers without WebGPU): the same physics as the WebGPU
 * compute shader, run as a fragment shader over floating-point textures (one texel per speck, ping-ponged),
 * and drawn as points that read their position straight from the texture. 262,144 specks (65,536 on
 * low-powered devices).
 */
import { MAXP } from './shapes.js';

const HASH = `
uint pcg(uint v) { uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
float hf(uint i, uint k) { return float(pcg(i * 2654435769u + k * 2246822507u) >> 8) / 16777216.0; }`;

const QUAD_VS = `#version 300 es
in vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const UPDATE_FS = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
uniform sampler2D uPos, uVel, uA, uB;
uniform int uSide, uNA, uNB, uMode;
uniform float uTime, uDt, uSwitchT, uSpanX, uJitter, uStiff, uSwirl, uRad, uPtrOn, uBurst;
uniform vec2 uPtr, uPtrVel, uBurstPos, uView;
uniform vec3 uOffset;
uniform mat3 uRot;
layout(location = 0) out vec4 oPos;
layout(location = 1) out vec4 oVel;
${HASH}
vec4 fetchPt(sampler2D t, int n, float h) { int i = min(int(h * float(n)), n - 1); return texelFetch(t, ivec2(i & 511, i >> 9), 0); }
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  uint id = uint(c.y * uSide + c.x);
  float h1 = hf(id, 1u), h2 = hf(id, 2u), h3 = hf(id, 3u), h4 = hf(id, 4u), h5 = hf(id, 5u);
  vec4 A = fetchPt(uA, uNA, h1);
  vec3 jit = vec3(h2 - 0.5, h3 - 0.5, (h4 - 0.5) * 3.0) * uJitter;
  if (uMode == 1) {            // a first visit: a wide drift of dust
    float a = h2 * 6.2831853, r = sqrt(h3);
    oPos = vec4(cos(a) * r * uView.x * 0.62, sin(a) * r * uView.y * 0.62, (h4 - 0.5) * 600.0, A.w * 0.4);
    oVel = vec4(0.0); return;
  }
  if (uMode == 2) {            // already in place (reduced motion, the still)
    oPos = vec4(uRot * A.xyz + jit + uOffset, A.w); oVel = vec4(0.0); return;
  }
  vec4 P = texelFetch(uPos, c, 0), V = texelFetch(uVel, c, 0);
  vec4 B = fetchPt(uB, uNB, h1);
  // the change sweeps across from left to right, each speck leaving a little after its neighbour
  float delay = clamp(B.x / uSpanX * 0.5 + 0.5, 0.0, 1.0) * 0.6 + h5 * 0.35;
  vec4 T = (uTime - uSwitchT > delay) ? A : B;
  vec3 tgt = uRot * T.xyz + jit + uOffset;
  vec3 p = P.xyz, v = V.xyz;
  float om = mix(2.4, 4.6, h4) * uStiff;
  vec3 toT = tgt - p;
  float dist = length(toT);
  vec3 acc = toT * om * om - v * om * 1.5;
  // a curling, divergence-free drift: strong while travelling, a faint shimmer at rest
  vec3 q = p * 0.0035; float tt = uTime * 0.07;
  vec3 flow = vec3(sin(q.y * 1.7 + tt) + 0.5 * sin(q.y * 3.1 - tt * 1.3),
                   cos(q.x * 1.9 - tt) + 0.5 * cos(q.x * 2.7 + tt * 0.8),
                   sin((q.x + q.y) * 1.3 + tt));
  acc += flow * (clamp(dist / 240.0, 0.0, 1.0) * 900.0 * uSwirl + 10.0);
  // the pointer pushes them aside and drags them along its path
  vec2 d = p.xy - uPtr; float dl = max(length(d), 0.001);
  float f = clamp(1.0 - dl / uRad, 0.0, 1.0); f = f * f * uPtrOn;
  acc += vec3(d / dl * 5200.0 + uPtrVel * 4.0, (h3 - 0.5) * 1600.0) * f;
  v += acc * uDt;
  if (uBurst > 0.0) {
    vec2 bd = p.xy - uBurstPos + vec2(h2 - 0.5, h3 - 0.5) * 0.01;
    v += vec3(normalize(bd) * (0.4 + h1 * 0.8), (h4 - 0.5)) * uBurst;
  }
  p += v * uDt;
  oPos = vec4(p, mix(P.w, T.w, min(uDt * 3.0, 1.0)));
  oVel = vec4(v, 0.0);
}`;

const DRAW_VS = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
uniform sampler2D uPos, uVel;
uniform int uSide;
uniform mat4 uMVP;
uniform float uD, uSize, uDpr, uTime, uAlpha;
out vec3 vCol;
${HASH}
void main() {
  int id = gl_VertexID;
  ivec2 c = ivec2(id % uSide, id / uSide);
  vec4 P = texelFetch(uPos, c, 0), V = texelFetch(uVel, c, 0);
  gl_Position = uMVP * vec4(P.xyz, 1.0);
  float persp = uD / max(uD - P.z, 1.0);
  uint u = uint(id);
  float hs = hf(u, 11u), hc = hf(u, 12u), hb = hf(u, 13u), ht = hf(u, 14u);
  bool flake = hs > 0.985;
  gl_PointSize = max(1.0, (flake ? 2.6 : 1.1 + hs * 0.55) * uSize * uDpr * persp);
  vec3 gold = vec3(0.86, 0.62, 0.27), amber = vec3(0.70, 0.42, 0.13), cream = vec3(0.945, 0.86, 0.68);
  vec3 col = hc < 0.66 ? gold : (hc < 0.94 ? amber : cream);
  col = mix(col, cream, clamp(length(V.xyz) / 1200.0, 0.0, 0.5));
  float b = P.w * mix(0.7, 1.25, hb) * clamp(persp, 0.75, 1.3);
  if (flake) b *= 0.8 + 2.4 * pow(0.5 + 0.5 * sin(uTime * (1.2 + ht * 2.5) + ht * 40.0), 14.0);
  vCol = col * b * uAlpha;
}`;

const DRAW_FS = `#version 300 es
precision mediump float;
in vec3 vCol; out vec4 o;
void main() { vec2 q = gl_PointCoord - 0.5; float a = clamp(1.2 - dot(q, q) * 3.2, 0.0, 1.0); o = vec4(vCol * a, 1.0); }`;

export function createGL(canvas, { lowPower }) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const lose = gl.getExtension('WEBGL_lose_context');
  let fmt = null;
  if (gl.getExtension('EXT_color_buffer_float')) fmt = { internal: gl.RGBA32F, type: gl.FLOAT };
  else if (gl.getExtension('EXT_color_buffer_half_float')) fmt = { internal: gl.RGBA16F, type: gl.HALF_FLOAT };
  if (!fmt) { if (lose) lose.loseContext(); return null; }

  const side = lowPower ? 256 : 512;
  const count = side * side;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn('specks shader', gl.getShaderInfoLog(s)); return s; };
  const program = (vs, fs) => {
    const p = gl.createProgram(), a = sh(gl.VERTEX_SHADER, vs), b = sh(gl.FRAGMENT_SHADER, fs);
    gl.attachShader(p, a); gl.attachShader(p, b); gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
    gl.deleteShader(a); gl.deleteShader(b);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn('specks link', gl.getProgramInfoLog(p)); return null; }
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, info.name); }
    return { p, u };
  };
  const upd = program(QUAD_VS, UPDATE_FS), draw = program(DRAW_VS, DRAW_FS);
  if (!upd || !draw) { if (lose) lose.loseContext(); return null; }

  const quadVao = gl.createVertexArray(); gl.bindVertexArray(quadVao);
  const quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const emptyVao = gl.createVertexArray();

  const tex = (w, h, internal, type, data) => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, gl.RGBA, type, data || null);
    return t;
  };
  const states = [0, 1].map(() => {
    const pos = tex(side, side, fmt.internal, fmt.type), vel = tex(side, side, fmt.internal, fmt.type);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pos, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, vel, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    return { pos, vel, fb };
  });
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  const ptsSide = 512;                                   // MAXP = 512 x 512
  let ptsA = tex(ptsSide, ptsSide, gl.RGBA32F, gl.FLOAT), ptsB = tex(ptsSide, ptsSide, gl.RGBA32F, gl.FLOAT);
  let cur = 0, w = 1, h = 1, dpr = 1;

  function bindTex(unit, t, loc) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(loc, unit); }
  function runUpdate(U, mode) {
    const src = states[cur], dst = states[1 - cur];
    gl.useProgram(upd.p);
    const u = upd.u;
    bindTex(0, src.pos, u.uPos); bindTex(1, src.vel, u.uVel); bindTex(2, ptsA, u.uA); bindTex(3, ptsB, u.uB);
    gl.uniform1i(u.uSide, side); gl.uniform1i(u.uNA, MAXP); gl.uniform1i(u.uNB, MAXP); gl.uniform1i(u.uMode, mode);
    gl.uniform1f(u.uTime, U.time); gl.uniform1f(u.uDt, U.dt); gl.uniform1f(u.uSwitchT, U.switchT); gl.uniform1f(u.uSpanX, U.spanX);
    gl.uniform1f(u.uJitter, U.jitter); gl.uniform1f(u.uStiff, U.stiff); gl.uniform1f(u.uSwirl, U.swirl); gl.uniform1f(u.uRad, U.rad);
    gl.uniform1f(u.uPtrOn, U.ptrOn); gl.uniform1f(u.uBurst, U.burst);
    gl.uniform2f(u.uPtr, U.ptr[0], U.ptr[1]); gl.uniform2f(u.uPtrVel, U.ptrVel[0], U.ptrVel[1]); gl.uniform2f(u.uBurstPos, U.burstPos[0], U.burstPos[1]);
    gl.uniform2f(u.uView, w, h);
    gl.uniform3f(u.uOffset, U.offset[0], U.offset[1], U.offset[2]);
    gl.uniformMatrix3fv(u.uRot, false, U.rot);
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
    gl.viewport(0, 0, side, side);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(quadVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    cur = 1 - cur;
  }

  return {
    kind: 'WebGL2',
    count,
    resize(cw, ch, ratio) {
      w = cw; h = ch; dpr = ratio;
      canvas.width = Math.max(2, Math.round(cw * ratio)); canvas.height = Math.max(2, Math.round(ch * ratio));
    },
    setShape(next, keepPrevious) {
      // the shape on screen moves to B (where the specks are leaving from); the new one goes to A
      if (keepPrevious) { const t = ptsB; ptsB = ptsA; ptsA = t; }
      gl.bindTexture(gl.TEXTURE_2D, ptsA);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, ptsSide, ptsSide, gl.RGBA, gl.FLOAT, next);
      if (!keepPrevious) { gl.bindTexture(gl.TEXTURE_2D, ptsB); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, ptsSide, ptsSide, gl.RGBA, gl.FLOAT, next); }
    },
    place(U, mode) { runUpdate(U, mode === 'cloud' ? 1 : 2); },
    step(U) { runUpdate(U, 0); },
    render(U) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0.0549, 0.0863, 0.1569, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(draw.p);
      const u = draw.u, s = states[cur];
      bindTex(0, s.pos, u.uPos); bindTex(1, s.vel, u.uVel);
      gl.uniform1i(u.uSide, side);
      gl.uniformMatrix4fv(u.uMVP, false, U.mvp);
      gl.uniform1f(u.uD, U.camD); gl.uniform1f(u.uSize, U.size); gl.uniform1f(u.uDpr, dpr); gl.uniform1f(u.uTime, U.time); gl.uniform1f(u.uAlpha, U.alpha);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.bindVertexArray(emptyVao);
      gl.drawArrays(gl.POINTS, 0, count);
      gl.disable(gl.BLEND);
    },
    dispose() {
      states.forEach((s) => { gl.deleteTexture(s.pos); gl.deleteTexture(s.vel); gl.deleteFramebuffer(s.fb); });
      gl.deleteTexture(ptsA); gl.deleteTexture(ptsB);
      gl.deleteBuffer(quad); gl.deleteVertexArray(quadVao); gl.deleteVertexArray(emptyVao);
      gl.deleteProgram(upd.p); gl.deleteProgram(draw.p);
      if (lose) lose.loseContext();
    },
  };
}
