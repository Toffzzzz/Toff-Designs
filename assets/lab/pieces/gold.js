/*
 * Lab piece 2: "Your initials in liquid gold" (lab.html#gold)
 *
 * Art direction: a jeweller's product shot. One piece of cast gold under three
 * softboxes in a dark studio, standing over a polished midnight floor that
 * holds its reflection and a soft shadow. The letters are heavy, rounded and
 * slightly domed like poured metal; a slow ripple runs across the surface so
 * the highlights drift the way they do on molten gold. No glow, no bloom: the
 * light comes only from what the gold reflects. Brand palette for everything
 * around it (midnight page, gold accents, cream ink), Cormorant Garamond for
 * the letters themselves.
 *
 * How it is made (raw WebGL2, no libraries):
 *   1. The typed letters (A to Z, up to three) are drawn on a 2D canvas.
 *   2. A signed distance field is built on the device with an anti-aliased
 *      Euclidean distance transform: each edge pixel gets its exact sub-pixel
 *      edge point (Gustavson's estimate from coverage and gradient), and an
 *      eight-neighbour sweep (8SSEDT) carries the nearest point everywhere. It
 *      goes to the GPU as an RG16F texture with a blurred inside depth beside
 *      it (for the swell); new letters morph between two fields.
 *   3. A fragment shader ray-marches a rounded, domed extrusion of that field,
 *      adds the ripple, and shades it as gold (Fresnel with gold's F0) against
 *      a procedural studio of softboxes, with real inter-reflections between
 *      letters, a reflective floor, a soft shadow and edge anti-aliasing.
 *
 * Contract (rounds/round-05-plan.md section 6):
 *   const piece = await mount(container, { reducedMotion, lowPower, soundOn, still });
 *   piece.title, piece.made, piece.goodFor, piece.describe(), piece.pause(), piece.resume(), await piece.dispose()
 * Extra options for tests only: renderScale (fixed render scale, no adaptation), letters (initial letters).
 * The Lab can set --lab-caption-h on the container to tell the piece how tall its caption bar is.
 */

const TITLE = 'Your initials in liquid gold';
const MADE = 'Your letters become a distance field on your device, which a WebGL2 shader casts as rounded, rippling gold with real reflections.';
const GOOD_FOR = 'Jewellers and luxury brands';

// The distance field covers this rectangle of the scene (world units), at this resolution.
const FIELD_W = 3.6, FIELD_H = 1.6, TEX_W = 1024, TEX_H = 455;
const INK_BOTTOM = -0.48;      // every set of letters stands on the same line
const INK_MAX_H = 0.96;        // cap height in world units
const INK_MAX_W = 3.05;
const FLOOR_Y = -0.64;
const MORPH_MS = 1150;

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uPP;          // principal point in drawing-buffer pixels (origin bottom left)
uniform float uF;          // focal length in drawing-buffer pixels
uniform vec3 uCam;
uniform mat3 uCamRot;
uniform mat3 uObj;         // world to object rotation
uniform float uTime, uMix, uRipple;
uniform vec2 uHalf;        // half size of the distance field (world units)
uniform vec4 uBox;         // object-space bounds of the letters: centre xy, half xy
uniform sampler2D uA, uB;
uniform int uSteps, uRSteps;
out vec4 outColor;

const float DEPTH = 0.07;
const float ROUND = 0.034;
const float DOME = 1.0;
const float FLOOR = ${FLOOR_Y.toFixed(3)};
const vec3 F0 = vec3(1.0, 0.745, 0.305);
const vec3 BG = vec3(0.00439, 0.00802, 0.02122);   // #0E1628 in linear light

// x: signed distance to the letters; y: a smooth, blurred depth inside them (for the poured, pillowed faces)
vec2 sd2(vec2 p) {
  vec2 q = clamp(p, -uHalf, uHalf);
  vec2 uv = q / (2.0 * uHalf) + 0.5;
  vec2 a = texture(uA, uv).rg;
  if (uMix > 0.0) a = mix(a, texture(uB, uv).rg, uMix);
  return vec2(a.x + length(p - q), a.y);
}
// Smooth (B-spline bicubic) sampling for normals, so mirror reflections show no texel facets.
vec4 cubicW(float v) {
  vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
  vec4 s = n * n * n;
  float x = s.x, y = s.y - 4.0 * s.x, z = s.z - 4.0 * s.y + 6.0 * s.x;
  return vec4(x, y, z, 6.0 - x - y - z) * (1.0 / 6.0);
}
vec2 bicubic(sampler2D t, vec2 uv) {
  vec2 ts = vec2(textureSize(t, 0));
  uv = uv * ts - 0.5;
  vec2 f = fract(uv); uv -= f;
  vec4 xc = cubicW(f.x), yc = cubicW(f.y);
  vec4 c = uv.xxyy + vec2(-0.5, 1.5).xyxy;
  vec4 s = vec4(xc.xz + xc.yw, yc.xz + yc.yw);
  vec4 o = (c + vec4(xc.yw, yc.yw) / s) / ts.xxyy;
  vec2 s0 = texture(t, o.xz).rg, s1 = texture(t, o.yz).rg, s2 = texture(t, o.xw).rg, s3 = texture(t, o.yw).rg;
  float sx = s.x / (s.x + s.y), sy = s.z / (s.z + s.w);
  return mix(mix(s3, s2, sx), mix(s1, s0, sx), sy);
}
vec2 sd2s(vec2 p) {
  vec2 q = clamp(p, -uHalf, uHalf);
  vec2 uv = q / (2.0 * uHalf) + 0.5;
  vec2 a = bicubic(uA, uv);
  if (uMix > 0.0) a = mix(a, bicubic(uB, uv), uMix);
  return vec2(a.x + length(p - q), a.y);
}
float ripple(vec3 p) {
  float t = uTime;
  return uRipple * (sin(p.x * 5.6 + p.y * 1.6 - t * 0.80)
       + 0.70 * sin(p.y * 7.4 - p.x * 2.1 + t * 0.57)
       + 0.45 * sin(length(p.xy - vec2(0.55, 0.20)) * 12.0 - t * 1.15));
}
float shape(vec3 p, vec2 f) {
  float h = DEPTH + DOME * f.y;
  vec2 w = vec2(f.x, abs(p.z) - h);
  float d = min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - ROUND;
  if (d < 0.05) d += ripple(p);
  return d;
}
float map(vec3 p) { return shape(p, sd2(p.xy)); }
float mapS(vec3 p) { return shape(p, sd2s(p.xy)); }
vec3 normalAt(vec3 p) {
  const vec2 k = vec2(1.0, -1.0);
  const float e = 0.0018;
  return normalize(k.xyy * mapS(p + k.xyy * e) + k.yyx * mapS(p + k.yyx * e) +
                   k.yxy * mapS(p + k.yxy * e) + k.xxx * mapS(p + k.xxx * e));
}
bool boxHit(vec3 ro, vec3 rd, out float t0, out float t1) {
  vec3 c = vec3(uBox.xy, 0.0);
  vec3 h = vec3(uBox.zw, DEPTH + DOME * 0.075 + ROUND + 0.03);
  vec3 inv = 1.0 / rd;
  vec3 a = (c - h - ro) * inv, b = (c + h - ro) * inv;
  vec3 lo = min(a, b), hi = max(a, b);
  t0 = max(max(lo.x, lo.y), lo.z);
  t1 = min(min(hi.x, hi.y), hi.z);
  return t1 > max(t0, 0.0);
}
// Studio: dark cyclorama, an overhead softbox, a tall strip on the left, a warm kicker on the right, a dim fill card in front.
float rect(vec2 u, vec2 c, vec2 h, float s) {
  vec2 q = abs(u - c) - h;
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  return 1.0 - smoothstep(-s, s, d);
}
vec3 studio(vec3 d) {
  vec3 c = BG * 0.8 + vec3(0.006, 0.007, 0.012) * smoothstep(-0.1, 0.8, d.y);
  if (d.y > 0.04) { vec2 u = d.xz / d.y; c += vec3(1.0, 0.96, 0.90) * 4.6 * rect(u, vec2(0.05, 0.30), vec2(0.80, 0.30), 0.14); }
  if (d.x < -0.04) { vec2 u = vec2(d.z, d.y) / -d.x; c += vec3(1.0, 0.95, 0.88) * 3.4 * rect(u, vec2(0.60, 0.10), vec2(0.15, 0.95), 0.08); }
  if (d.x > 0.04) { vec2 u = vec2(d.z, d.y) / d.x; c += vec3(1.0, 0.80, 0.52) * 2.2 * rect(u, vec2(-0.55, 0.25), vec2(0.09, 0.75), 0.08); }
  if (d.z > 0.04) {
    // the big sweep in front: dark at the floor, bright towards the top, so every face carries a gradient
    vec2 u = d.xy / d.z;
    float sweep = 0.20 + 2.6 * smoothstep(-0.28, 0.90, u.y);
    c += vec3(1.0, 0.93, 0.82) * sweep * rect(u, vec2(-0.05, 0.30), vec2(1.25, 0.78), 0.30);
  }
  // The floor only takes over for rays that point well down: shallow ones meet the sweep in front first.
  if (d.y < -0.1) {
    vec3 fl = BG * 0.55 + vec3(0.050, 0.036, 0.016) * exp(-5.0 * -d.y);
    c = mix(c, fl, smoothstep(-0.12, -0.34, d.y));
  }
  return c;
}
vec3 backdrop(vec3 rd) {
  // The cyclorama behind: the page colour, a touch lighter where the light pools behind the gold.
  float pool = exp(-pow(length(vec2(rd.x * 1.3, rd.y - 0.02) * 2.4), 2.0));
  return BG * (0.92 + 0.45 * pool);
}
float march(vec3 ro, vec3 rd, float t0, float t1, int steps, float pix, out float best, out float tBest) {
  float t = max(t0, 0.0);
  best = 1e9; tBest = t;
  for (int i = 0; i < 200; i++) {
    if (i >= steps || t > t1) break;
    float h = map(ro + rd * t);
    float fp = pix * t;
    if (h < max(0.00025, fp * 0.3)) return t;
    float r = h / fp;
    if (r < best) { best = r; tBest = t; }
    if (i == steps - 1 && h < 0.004) return t;   // ran out of steps right at a grazing wall: call it a hit
    t += h * 0.75;
  }
  return -1.0;
}
float marchFast(vec3 ro, vec3 rd, int steps) {
  float t0, t1;
  if (!boxHit(ro, rd, t0, t1)) return -1.0;
  float t = max(t0, 0.0);
  for (int i = 0; i < 80; i++) {
    if (i >= steps || t > t1) break;
    float h = map(ro + rd * t);
    if (h < 0.0008) return t;
    t += h * 0.85;
  }
  return -1.0;
}
// Gold seen along view ray rdW (world) at object-space point p with object-space normal n.
vec3 gold(vec3 p, vec3 n, vec3 rdO, vec3 rdW, bool bounce) {
  mat3 toW = transpose(uObj);
  vec3 nW = toW * n;
  float c = clamp(dot(nW, -rdW), 0.0, 1.0);
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - c, 5.0);
  vec3 rO = reflect(rdO, n);
  vec3 rW = toW * rO;
  vec3 refl;
  float tr = bounce ? marchFast(p + n * 0.006, rO, uRSteps) : -1.0;
  if (tr > 0.0) {
    vec3 q = p + n * 0.006 + rO * tr;
    vec3 n2 = normalAt(q);
    refl = studio(toW * reflect(rO, n2)) * F0 * 0.92;
  } else {
    refl = studio(rW);
  }
  // A little self-shadowing in the crevices between letters.
  float occ = clamp(0.55 + 0.45 * map(p + n * 0.05) / 0.05, 0.0, 1.0);
  return refl * F * occ + F0 * 0.012;
}
float shadowAt(vec3 ro, vec3 rd) {
  // No bounding-box clip here: the soft penumbra reaches beyond the box, and clipping it leaves hard edges.
  float res = 1.0, t = 0.02;
  for (int i = 0; i < 30; i++) {
    if (t > 1.8) break;
    float h = map(ro + rd * t);
    res = min(res, 4.5 * h / t);
    if (res < 0.02) break;
    t += clamp(h, 0.02, 0.2);
  }
  return clamp(res, 0.0, 1.0);
}
vec3 floorAt(vec3 P, vec3 rd, float pix) {
  vec3 o = uObj * P;
  // Light pooling under the softbox, and the soft shadow it casts.
  float pool = exp(-dot(P.xz * vec2(0.42, 1.1), P.xz * vec2(0.42, 1.1)));
  float sh = 1.0;
  if (abs(o.x) < uBox.z + 1.2 && abs(P.z) < 1.4) sh = shadowAt(o, uObj * normalize(vec3(0.04, 1.0, 0.12)));
  vec3 c = BG * 0.62 + vec3(0.020, 0.019, 0.020) * pool * mix(0.32, 1.0, sh);
  // Warm light thrown down from the gold.
  float near = exp(-dot(o.xz * vec2(0.9 / max(uBox.z, 0.3), 2.6), o.xz * vec2(0.9 / max(uBox.z, 0.3), 2.6)));
  c += vec3(0.045, 0.028, 0.008) * near * sh;
  // Polished lacquer: a Fresnel mirror whose reflection fades with height (like a soft, blurred reflection).
  vec3 rr = reflect(rd, vec3(0.0, 1.0, 0.0));
  float fres = 0.05 + 0.95 * pow(1.0 - clamp(-rd.y, 0.0, 1.0), 5.0);
  vec3 rO = uObj * rr;
  float t = marchFast(o, rO, uRSteps + 8);
  if (t > 0.0) {
    vec3 q = o + rO * t;
    vec3 n = normalAt(q);
    float lift = (transpose(uObj) * q).y - FLOOR;
    c += gold(q, n, rO, rr, false) * fres * 0.42 * exp(-4.2 * lift);
  } else {
    c += studio(rr) * fres * 0.35;
  }
  return c;
}
vec3 tone(vec3 c) {
  float peak = max(c.r, max(c.g, c.b));
  if (peak <= 0.62) return c;
  float np = 0.62 + 0.38 * (1.0 - exp(-(peak - 0.62) / 0.38));
  vec3 r = c * (np / peak);
  float g = 1.0 - 1.0 / (0.22 * (peak - np) + 1.0);
  return mix(r, vec3(np), g);
}
vec3 srgb(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
void main() {
  vec2 fc = gl_FragCoord.xy;
  vec3 rdC = normalize(vec3((fc - uPP) / uF, -1.0));
  vec3 rd = uCamRot * rdC;
  vec3 ro = uCam;
  float pix = 1.0 / uF;
  vec3 roO = uObj * ro, rdO = uObj * rd;

  // Background first: floor or cyclorama, melting into each other with distance.
  vec3 bg;
  float tf = rd.y < 0.0 ? (FLOOR - ro.y) / rd.y : -1.0;
  if (tf > 0.0) {
    vec3 P = ro + rd * tf;
    float fade = exp(-0.018 * tf * tf);
    bg = mix(backdrop(rd), floorAt(P, rd, pix), fade);
  } else {
    bg = backdrop(rd);
  }

  vec3 col = bg;
  float t0, t1;
  if (boxHit(roO, rdO, t0, t1)) {
    float best, tb;
    float t = march(roO, rdO, t0, t1, uSteps, pix, best, tb);
    if (t > 0.0 && (tf < 0.0 || t < tf)) {
      vec3 p = roO + rdO * t;
      col = gold(p, normalAt(p), rdO, rd, true);
    } else if (t < 0.0 && best < 1.0) {
      // Anti-aliased silhouette: blend the nearest miss by how much of the pixel it covers.
      vec3 p = roO + rdO * tb;
      float cov = clamp(1.0 - best, 0.0, 1.0);
      col = mix(bg, gold(p, normalAt(p), rdO, rd, false), cov * cov * (3.0 - 2.0 * cov));
    }
  }
  col = srgb(tone(col * 1.06));
  col += (hash12(fc + fract(uTime) * 61.0) - 0.5) / 255.0;
  outColor = vec4(col, 1.0);
}`;

/* ---------- Distance field: anti-aliased Euclidean distance transform ----------
   Every edge pixel (partly covered by the letters) gets the exact point where the letter's edge crosses it, from
   its coverage and the direction of the coverage gradient (Gustavson's edge-distance estimate). A two-pass
   eight-neighbour sweep (8SSEDT) then carries the nearest edge point, as float coordinates, to every pixel.
   Keeping the sub-pixel edge point all the way out is what stops slanted stems from showing a stair-step in the
   mirror finish. */
const SQRT2 = Math.SQRT2;
function edgeDistance(gx, gy, a) {
  if (gx === 0 || gy === 0) return 0.5 - a;
  const gl = Math.hypot(gx, gy);
  gx = Math.abs(gx) / gl; gy = Math.abs(gy) / gl;
  if (gx < gy) { const t = gx; gx = gy; gy = t; }
  const a1 = 0.5 * gy / gx;
  if (a < a1) return 0.5 * (gx + gy) - Math.sqrt(2 * gx * gy * a);
  if (a < 1 - a1) return (0.5 - a) * gx;
  return -0.5 * (gx + gy) + Math.sqrt(2 * gx * gy * (1 - a));
}
/** cov: coverage 0..1 per pixel. Returns signed distance in pixels (negative inside). */
function aaedt(cov, w, h) {
  const n = w * h;
  const sx = new Float32Array(n).fill(-1e9), sy = new Float32Array(n).fill(-1e9), d2 = new Float32Array(n).fill(1e20);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x, a = cov[i];
      let edge = a > 0 && a < 1;
      if (!edge && a >= 1) {   // a fully covered pixel next to an empty one is an edge too
        edge = (x > 0 && cov[i - 1] <= 0) || (x < w - 1 && cov[i + 1] <= 0) || (y > 0 && cov[i - w] <= 0) || (y < h - 1 && cov[i + w] <= 0);
      }
      if (!edge) continue;
      const g = (xx, yy) => cov[Math.min(h - 1, Math.max(0, yy)) * w + Math.min(w - 1, Math.max(0, xx))];
      const gx = -g(x - 1, y - 1) - SQRT2 * g(x - 1, y) - g(x - 1, y + 1) + g(x + 1, y - 1) + SQRT2 * g(x + 1, y) + g(x + 1, y + 1);
      const gy = -g(x - 1, y - 1) - SQRT2 * g(x, y - 1) - g(x + 1, y - 1) + g(x - 1, y + 1) + SQRT2 * g(x, y + 1) + g(x + 1, y + 1);
      const gl = Math.hypot(gx, gy) || 1;
      const df = edgeDistance(gx, gy, Math.min(1, Math.max(0, a)));
      // the edge point: from the pixel centre towards the inside by df (df < 0 moves outwards)
      sx[i] = x + 0.5 + (gx / gl) * df;
      sy[i] = y + 0.5 + (gy / gl) * df;
      d2[i] = df * df;
    }
  }
  // One forward and one backward sweep, each checking the four neighbours already visited, then the row the other way.
  const relax = (i, j, px, py) => {
    const dx = px - sx[j], dy = py - sy[j], dd = dx * dx + dy * dy;
    if (dd < d2[i]) { d2[i] = dd; sx[i] = sx[j]; sy[i] = sy[j]; }
  };
  for (let y = 0; y < h; y++) {
    const py = y + 0.5, row = y * w;
    for (let x = 0; x < w; x++) {
      const i = row + x, px = x + 0.5;
      if (x > 0) relax(i, i - 1, px, py);
      if (y > 0) { relax(i, i - w, px, py); if (x > 0) relax(i, i - w - 1, px, py); if (x < w - 1) relax(i, i - w + 1, px, py); }
    }
    for (let x = w - 2; x >= 0; x--) relax(row + x, row + x + 1, x + 0.5, py);
  }
  for (let y = h - 1; y >= 0; y--) {
    const py = y + 0.5, row = y * w;
    for (let x = w - 1; x >= 0; x--) {
      const i = row + x, px = x + 0.5;
      if (x < w - 1) relax(i, i + 1, px, py);
      if (y < h - 1) { relax(i, i + w, px, py); if (x < w - 1) relax(i, i + w + 1, px, py); if (x > 0) relax(i, i + w - 1, px, py); }
    }
    for (let x = 1; x < w; x++) relax(row + x, row + x - 1, x + 0.5, py);
  }
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const d = Math.sqrt(d2[i]); out[i] = cov[i] > 0.5 ? -d : d; }
  return out;
}

function boxBlur(src, dst, w, h, r, horizontal) {
  const inv = 1 / (2 * r + 1);
  if (horizontal) {
    for (let y = 0; y < h; y++) {
      const o = y * w;
      let acc = 0;
      for (let x = -r; x <= r; x++) acc += src[o + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        dst[o + x] = acc * inv;
        acc += src[o + Math.min(w - 1, x + r + 1)] - src[o + Math.max(0, x - r)];
      }
    }
  } else {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += src[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        dst[y * w + x] = acc * inv;
        acc += src[Math.min(h - 1, y + r + 1) * w + x] - src[Math.max(0, y - r) * w + x];
      }
    }
  }
}

let fontReady = null;
function loadFont() {
  if (!fontReady) {
    fontReady = (document.fonts && document.fonts.load)
      ? Promise.race([document.fonts.load('500 200px "Cormorant Garamond"'), new Promise((r) => setTimeout(r, 1800))]).catch(() => {})
      : Promise.resolve();
  }
  return fontReady;
}

/** Draws the letters and returns { field: Float32Array (world units, negative inside), box: [cx, cy, hx, hy] }. */
function buildField(letters) {
  const c = document.createElement('canvas');
  c.width = TEX_W; c.height = TEX_H;
  const g = c.getContext('2d', { willReadFrequently: true });
  const ppu = TEX_W / FIELD_W;
  const fam = '"Cormorant Garamond", Georgia, "Times New Roman", serif';
  const chars = letters.split('');
  g.font = `500 100px ${fam}`;
  const track = 0.07;     // a jeweller's spacing between initials (em)
  const adv = chars.map((ch) => g.measureText(ch).width);
  const m = g.measureText(letters);
  const inkH100 = Math.max(1, (m.actualBoundingBoxAscent || 70) + (m.actualBoundingBoxDescent || 0));
  const width100 = adv.reduce((a, b) => a + b, 0) + track * 100 * (chars.length - 1);
  const size = Math.min((INK_MAX_H * ppu) / inkH100 * 100, (INK_MAX_W * ppu) / width100 * 100);
  g.font = `500 ${size}px ${fam}`;
  g.fillStyle = '#fff';
  g.textBaseline = 'alphabetic';
  const s = size / 100;
  const descent = (m.actualBoundingBoxDescent || 0) * s;
  const baseY = TEX_H / 2 - INK_BOTTOM * ppu - descent;
  let x = TEX_W / 2 - (width100 * s) / 2;
  chars.forEach((ch, i) => { g.fillText(ch, x, baseY); x += adv[i] * s + track * size; });

  const data = g.getImageData(0, 0, TEX_W, TEX_H).data;
  const n = TEX_W * TEX_H;
  const cov = new Float32Array(n);
  let x0 = TEX_W, x1 = 0, y0 = TEX_H, y1 = 0;
  for (let i = 0; i < n; i++) {
    const a = data[i * 4 + 3] / 255;
    cov[i] = a;
    if (a > 0) { const px = i % TEX_W, py = (i / TEX_W) | 0; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; }
  }
  const sdf = aaedt(cov, TEX_W, TEX_H);
  // Texture rows go bottom-up (flipped) so that +y is up in the shader.
  const dist = new Float32Array(n), depth = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const d = sdf[i] / ppu;
    dist[i] = d;
    depth[i] = Math.min(Math.max(-d, 0), 0.075);
  }
  const tmp = new Float32Array(n);
  // Smooth the distance a touch (3 x 3) to take off any last unevenness; near the surface it stays a distance field.
  boxBlur(dist, tmp, TEX_W, TEX_H, 1, true); boxBlur(tmp, dist, TEX_W, TEX_H, 1, false);
  for (let i = 0; i < n; i++) depth[i] = Math.min(Math.max(-dist[i], 0), 0.075);
  // Blur the inside depth (three box passes, about a Gaussian) so the faces swell smoothly with no crease down the middle.
  const rad = Math.round(0.03 * ppu);
  for (let pass = 0; pass < 3; pass++) { boxBlur(depth, tmp, TEX_W, TEX_H, rad, true); boxBlur(tmp, depth, TEX_W, TEX_H, rad, false); }
  // Keep the swell inside the letters, never steeper than the distance itself (so the ray-march stays safe).
  const field = new Float32Array(n * 2);
  for (let y = 0; y < TEX_H; y++) {
    const src = y * TEX_W, dst = (TEX_H - 1 - y) * TEX_W;
    for (let xx = 0; xx < TEX_W; xx++) {
      const d = dist[src + xx];
      field[(dst + xx) * 2] = d;
      field[(dst + xx) * 2 + 1] = Math.min(depth[src + xx], Math.max(-d, 0) * 0.85);
    }
  }
  if (x1 < x0) { x0 = TEX_W / 2; x1 = TEX_W / 2; y0 = TEX_H / 2; y1 = TEX_H / 2; }
  const wx0 = x0 / ppu - FIELD_W / 2, wx1 = (x1 + 1) / ppu - FIELD_W / 2;
  const wy1 = FIELD_H / 2 - y0 / ppu, wy0 = FIELD_H / 2 - (y1 + 1) / ppu;
  return { field, box: [(wx0 + wx1) / 2, (wy0 + wy1) / 2, (wx1 - wx0) / 2, (wy1 - wy0) / 2] };
}

/* ---------- Styles (scoped to .lg-, removed on dispose) ---------- */
const CSS = `
.lg-root { position: absolute; inset: 0; overflow: hidden; background: var(--bg, #0E1628); color: var(--text, #F6F0E4);
  font: 400 15px/1.5 var(--sans, "Work Sans", system-ui, sans-serif); -webkit-tap-highlight-color: transparent; }
.lg-canvas { position: absolute; z-index: 1; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; cursor: grab; outline: none; }
.lg-canvas:active { cursor: grabbing; }
.lg-canvas:focus-visible { outline: 2px solid var(--gold, #D8AC5F); outline-offset: -6px; border-radius: var(--radius-media, 12px); }
.lg-panel { position: absolute; z-index: 2; top: max(var(--s-5, 24px), env(safe-area-inset-top)); left: var(--margin, 16px); right: var(--margin, 16px);
  display: grid; grid-template-columns: auto auto 1fr; align-items: end; gap: var(--s-2, 8px) var(--s-4, 16px); pointer-events: none; }
.lg-panel > * { pointer-events: auto; }
.lg-field { display: grid; gap: 6px; }
.lg-label { color: var(--slate, #A7AFC2); font-size: 15px; line-height: 1.2; }
.lg-input { width: 5.4em; min-height: 52px; padding: 2px 14px 0; border: 1px solid var(--outline, rgba(167,175,194,.4)); border-radius: var(--radius, 8px);
  background: var(--tint, #1A2541); color: var(--text, #F6F0E4); caret-color: var(--gold, #D8AC5F);
  font: 400 30px/1 var(--serif, "Cormorant Garamond", Georgia, serif); letter-spacing: .14em; text-transform: uppercase; }
.lg-input::placeholder { color: var(--slate, #A7AFC2); opacity: .7; }
.lg-input:focus-visible { outline: 2px solid var(--gold, #D8AC5F); outline-offset: 3px; border-color: transparent; }
.lg-save { min-height: 44px; margin-bottom: 4px; padding: 0 2px; border: 0; background: none; color: var(--ink, #F1E3C6); cursor: pointer;
  font: 500 15px/1.2 var(--sans, "Work Sans", system-ui, sans-serif); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: .28em; justify-self: start; }
.lg-save:focus-visible { outline: 2px solid var(--gold, #D8AC5F); outline-offset: 3px; border-radius: 4px; }
@media (hover: hover) { .lg-save:hover { color: var(--text, #F6F0E4); } }
.lg-hint { grid-column: 1 / -1; margin: 2px 0 0; color: var(--slate, #A7AFC2); font-size: 14px; max-width: 40ch; }
.lg-hint .lg-touch { display: none; }
@media (hover: none) { .lg-hint .lg-fine { display: none; } .lg-hint .lg-touch { display: inline; } }
.lg-still { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.lg-play { position: absolute; z-index: 3; left: 50%; bottom: calc(var(--lab-caption-h, 112px) + 24px); transform: translateX(-50%);
  min-height: 48px; padding: 0 28px; border: 0; border-radius: var(--radius, 8px); background: var(--gold, #D8AC5F); color: var(--bg, #0E1628);
  font: 500 15px/1.2 var(--sans, "Work Sans", system-ui, sans-serif); cursor: pointer; }
.lg-play:focus-visible { outline: 2px solid var(--text, #F6F0E4); outline-offset: 3px; }
.lg-msg { position: absolute; left: var(--margin, 16px); right: var(--margin, 16px); top: 45%; text-align: center; color: var(--slate, #A7AFC2); }
.lg-sr { position: absolute !important; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0; }
@media (max-width: 699px) {
  .lg-panel { grid-template-columns: auto 1fr; }
  .lg-save { justify-self: end; }
}`;
let styleUsers = 0, styleEl = null;
function addStyle() {
  styleUsers++;
  if (!styleEl) { styleEl = document.createElement('style'); styleEl.dataset.labPiece = 'gold'; styleEl.textContent = CSS; document.head.appendChild(styleEl); }
}
function removeStyle() {
  styleUsers = Math.max(0, styleUsers - 1);
  if (!styleUsers && styleEl) { styleEl.remove(); styleEl = null; }
}

/* ---------- Small maths ---------- */
function rotY(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 1, 0, s, 0, c]; }       // column-major
function rotX(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, s, 0, -s, c]; }
function mul3(a, b) {
  const o = new Array(9);
  for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) o[c * 3 + r] = a[r] * b[c * 3] + a[3 + r] * b[c * 3 + 1] + a[6 + r] * b[c * 3 + 2];
  return o;
}
function transpose3(m) { return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]; }
function lookRot(eye, at) {
  let fx = at[0] - eye[0], fy = at[1] - eye[1], fz = at[2] - eye[2];
  const fl = Math.hypot(fx, fy, fz); fx /= fl; fy /= fl; fz /= fl;
  // right = normalize(f x up), with up = (0, 1, 0); up' = right x f
  let rx = -fz, ry = 0, rz = fx;
  const rl = Math.hypot(rx, ry, rz); rx /= rl; rz /= rl;
  const ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
  return [rx, ry, rz, ux, uy, uz, -fx, -fy, -fz];   // columns: right, up, back
}
const easeInOut = (t) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2);

/* ---------- The piece ---------- */
export async function mount(container, opts = {}) {
  const reducedMotion = !!opts.reducedMotion;
  const lowPower = !!opts.lowPower;
  const fixedScale = typeof opts.renderScale === 'number' ? opts.renderScale : 0;
  const ac = new AbortController();
  const on = (t, ev, fn, o) => t.addEventListener(ev, fn, Object.assign({ signal: ac.signal }, o || {}));
  addStyle();

  const root = document.createElement('div');
  root.className = 'lg-root';
  root.innerHTML = `
    <form class="lg-panel" autocomplete="off" novalidate>
      <div class="lg-field">
        <label class="lg-label" for="lg-input-${Date.now().toString(36)}">Your initials</label>
        <input class="lg-input" type="text" inputmode="text" autocapitalize="characters" autocomplete="off" spellcheck="false"
          maxlength="3" aria-describedby="lg-hint" />
      </div>
      <button class="lg-save" type="button">Save a picture</button>
      <p class="lg-hint" id="lg-hint">Up to three letters, A to Z. <span class="lg-fine">Move the pointer and the gold turns to face it.</span><span class="lg-touch">Drag across it to turn the gold.</span></p>
    </form>
    <canvas class="lg-canvas" tabindex="0" role="img"></canvas>
    <p class="lg-sr" aria-live="polite"></p>`;
  container.appendChild(root);
  const canvas = root.querySelector('.lg-canvas');
  const form = root.querySelector('.lg-panel');
  const input = root.querySelector('.lg-input');
  const label = root.querySelector('.lg-label');
  const saveBtn = root.querySelector('.lg-save');
  const live = root.querySelector('[aria-live]');
  const panelHint = root.querySelector('.lg-hint');
  const uid = 'lg-' + Math.random().toString(36).slice(2, 8);
  input.id = uid + '-input'; label.htmlFor = input.id; panelHint.id = uid + '-hint'; input.setAttribute('aria-describedby', panelHint.id);

  const clean = (s) => (s || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  let letters = clean(opts.letters) || 'TS';
  input.value = letters;
  const spelled = () => letters.split('').join(' ');
  const setLabel = () => canvas.setAttribute('aria-label', `The letters ${spelled()} cast in liquid gold, standing on a dark polished floor. Use the arrow keys to turn them.`);
  setLabel();

  let gl = null, prog = null, vao = null, buf = null, texA = null, texB = null, lose = null;
  let U = {};
  let raf = 0, running = false, paused = false, disposed = false, played = !(reducedMotion || lowPower);
  let lastNow = 0, simTime = 0, frames = 0, slowFrames = 0;
  let scale = fixedScale || Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.5) * (lowPower ? 0.7 : 1);
  const minScale = 0.5;
  let boxA = [0, 0, 1, 0.5], boxB = boxA, morph = null, queued = null;
  let yaw = 0, pitch = 0, yawV = 0, pitchV = 0, tYaw = 0, tPitch = 0, idle = true, idleT = 0;
  let fit = 0, fitTarget = 0, buildMs = 0;
  let stillImg = null, playBtn = null, msg = null;
  let w = 1, h = 1, dbw = 1, dbh = 1;

  function announce(text) { live.textContent = ''; setTimeout(() => { if (!disposed) live.textContent = text; }, 30); }

  /* --- GL set-up --- */
  function initGL() {
    gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    if (!gl) return false;
    lose = gl.getExtension('WEBGL_lose_context');
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('gold shader', gl.getShaderInfoLog(s)); } return s; };
    const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'aPos'); gl.linkProgram(prog);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn('gold link', gl.getProgramInfoLog(prog)); return false; }
    gl.useProgram(prog);
    vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    ['uPP', 'uF', 'uCam', 'uCamRot', 'uObj', 'uTime', 'uMix', 'uRipple', 'uHalf', 'uBox', 'uA', 'uB', 'uSteps', 'uRSteps'].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });
    gl.uniform1i(U.uA, 0); gl.uniform1i(U.uB, 1);
    gl.uniform2f(U.uHalf, FIELD_W / 2, FIELD_H / 2);
    gl.uniform1i(U.uSteps, lowPower ? 90 : 150);
    gl.uniform1i(U.uRSteps, lowPower ? 26 : 44);
    texA = makeTex(); texB = makeTex();
    on(canvas, 'webglcontextlost', (e) => { e.preventDefault(); stopLoop(); });
    return true;
  }
  function makeTex() {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, TEX_W, TEX_H, 0, gl.RG, gl.FLOAT, null);
    return t;
  }
  function upload(tex, field) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, TEX_W, TEX_H, 0, gl.RG, gl.FLOAT, field);
  }
  function bindTextures() {
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texA);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texB);
  }

  /* --- Framing: fit the letters into the space between the panel and the Lab's caption bar --- */
  function captionH() {
    const v = parseFloat(getComputedStyle(container).getPropertyValue('--lab-caption-h'));
    if (Number.isFinite(v)) return v;
    return w < 700 ? 168 : 112;
  }
  function frameFor(box) {
    const top = form.getBoundingClientRect().bottom - root.getBoundingClientRect().top + 12;
    const bottom = captionH() + 8;
    const availW = w - 32, availH = Math.max(120, h - top - bottom);
    const D = 4.6;
    const halfW = Math.abs(box[0]) + box[2] + 0.12;
    // fit width, and the height from the top of the letters down to the front of their reflection
    const fW = (availW * 0.44) / halfW * D;
    const fH = (availH * 0.48) / (box[1] + box[3] + 0.32) * D;
    const fCap = (Math.min(availH * 0.5, 400) / (box[3] * 2)) * D;
    return { f: Math.min(fW, fH, fCap), cy: top + availH * 0.5 };
  }
  let cyCss = 0;
  function resize() {
    const r = root.getBoundingClientRect();
    w = Math.max(1, r.width); h = Math.max(1, r.height);
    if (!gl) return;
    dbw = Math.max(2, Math.round(w * scale)); dbh = Math.max(2, Math.round(h * scale));
    if (canvas.width !== dbw || canvas.height !== dbh) { canvas.width = dbw; canvas.height = dbh; }
    gl.viewport(0, 0, dbw, dbh);
    const fr = frameFor(unionBox());
    fitTarget = fr.f; cyCss = fr.cy;
    if (!fit) fit = fitTarget;
  }
  function unionBox() {
    if (!morph) return boxA;
    const a = boxA, b = boxB;
    const x0 = Math.min(a[0] - a[2], b[0] - b[2]), x1 = Math.max(a[0] + a[2], b[0] + b[2]);
    const y0 = Math.min(a[1] - a[3], b[1] - b[3]), y1 = Math.max(a[1] + a[3], b[1] + b[3]);
    return [(x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2];
  }

  /* --- One frame --- */
  function draw() {
    const box = unionBox();
    const pad = 0.034 + 0.05;
    gl.useProgram(prog);
    bindTextures();
    gl.uniform4f(U.uBox, box[0], box[1], box[2] + pad, box[3] + pad);
    gl.uniform1f(U.uMix, morph ? morph.k : 0);
    gl.uniform1f(U.uTime, simTime);
    gl.uniform1f(U.uRipple, 0.0042);
    // Camera: a little above, looking slightly down at the letters.
    const eye = [0, 0.38, 4.6], at = [0, -0.06, 0];
    gl.uniform3f(U.uCam, eye[0], eye[1], eye[2]);
    gl.uniformMatrix3fv(U.uCamRot, false, lookRot(eye, at));
    const objToWorld = mul3(rotY(yaw), rotX(pitch));
    gl.uniformMatrix3fv(U.uObj, false, transpose3(objToWorld));
    gl.uniform1f(U.uF, fit * scale);
    // Principal point: centre of the free area (drawing-buffer pixels, origin bottom left).
    gl.uniform2f(U.uPP, dbw / 2, dbh - cyCss * scale);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    frames++;
  }

  /* --- Motion --- */
  function step(now) {
    const dt = Math.min(0.05, lastNow ? (now - lastNow) / 1000 : 0.016);
    lastNow = now;
    simTime += dt;
    if (idle) {
      idleT += dt;
      tYaw = 0.40 * Math.sin(idleT * 0.33);
      tPitch = 0.07 * Math.sin(idleT * 0.21 + 0.6);
    }
    // a heavy, critically damped turn
    const k = 16, c = 8;
    yawV += ((tYaw - yaw) * k - yawV * c) * dt; yaw += yawV * dt;
    pitchV += ((tPitch - pitch) * k - pitchV * c) * dt; pitch += pitchV * dt;
    fit += (fitTarget - fit) * Math.min(1, dt * 3.5);
    if (morph) {
      // advanced by (clamped) frame time, so a slow frame never makes it jump
      morph.e += dt * 1000;
      const k2 = Math.min(1, morph.e / MORPH_MS);
      morph.k = easeInOut(k2);
      if (k2 >= 1) finishMorph();
    }
  }
  function loop(now) {
    raf = 0;
    if (!running || paused || disposed) return;
    const before = lastNow;
    step(now);
    draw();
    // Adaptive resolution: if frames are slow, render fewer pixels (never below half).
    if (!fixedScale && before) {
      const dtMs = now - before;
      if (dtMs > 24) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
      if (slowFrames > 20 && scale > minScale) { scale = Math.max(minScale, scale * 0.85); slowFrames = 0; resize(); }
    }
    raf = requestAnimationFrame(loop);
  }
  function startLoop() { if (!running) { running = true; lastNow = 0; } if (!raf && !paused && !disposed) raf = requestAnimationFrame(loop); }
  function stopLoop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  function renderStill() { if (gl && !disposed) { resize(); fit = fitTarget; draw(); } }

  /* --- Letters --- */
  async function cast(next, animate) {
    if (!gl || disposed) return;
    if (morph) { queued = next; return; }
    if (next === letters && texA._letters === next) return;
    await loadFont();
    if (disposed) return;
    const tb = performance.now();
    const built = buildField(next);
    buildMs = performance.now() - tb;
    if (!animate) {
      upload(texA, built.field); texA._letters = next; boxA = built.box; letters = next;
      resize(); fit = fitTarget;
    } else {
      upload(texB, built.field); boxB = built.box;
      morph = { e: 0, k: 0, letters: next };
      resize();
    }
    if (!animate) { setLabel(); }
  }
  function finishMorph() {
    const t = texA; texA = texB; texB = t;
    texA._letters = morph.letters; boxA = boxB; letters = morph.letters;
    morph = null;
    setLabel();
    announce(`Cast in gold: ${spelled()}.`);
    resize();
    if (queued) { const q = queued; queued = null; if (q !== letters) cast(q, true); }
  }
  let inputTimer = 0;
  function onLetters() {
    const v = clean(input.value);
    if (input.value !== v) input.value = v;
    clearTimeout(inputTimer);
    if (!v) return;
    inputTimer = setTimeout(() => {
      takeOver();
      const animate = played && !reducedMotion && running && !paused;
      if (animate) cast(v, true);
      else cast(v, false).then(() => { if (!disposed) { renderStill(); announce(`Cast in gold: ${spelled()}.`); } });
    }, 260);
  }

  /* --- Taking over: the idle sway stops for good --- */
  function takeOver() { idle = false; }
  function aimAt(clientX, clientY) {
    const r = root.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, (clientX - r.left - r.width / 2) / (r.width / 2)));
    const ny = Math.max(-1, Math.min(1, (clientY - r.top - cyCss) / (r.height / 2)));
    tYaw = nx * 0.62;
    tPitch = ny * 0.2;
  }

  /* --- Saving a picture --- */
  function save() {
    if (!gl) return;
    const keep = scale;
    scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    resize();
    draw();
    canvas.toBlob((blob) => {
      if (!blob || disposed) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `initials-in-gold-${letters.toLowerCase()}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      announce('Picture saved.');
    }, 'image/png');
    scale = keep;
    resize();
    if (!running) draw();
  }

  /* --- Events --- */
  on(input, 'input', onLetters);
  on(input, 'keydown', (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.stopPropagation(); });
  on(form, 'submit', (e) => { e.preventDefault(); onLetters(); });
  on(saveBtn, 'click', save);
  on(canvas, 'pointermove', (e) => {
    if (!running) return;
    if (e.pointerType === 'mouse' || canvas.hasPointerCapture(e.pointerId)) { takeOver(); aimAt(e.clientX, e.clientY); }
  });
  on(canvas, 'pointerdown', (e) => {
    if (!running) return;
    takeOver(); aimAt(e.clientX, e.clientY);
    if (e.pointerType !== 'mouse') { try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } }
  });
  on(canvas, 'keydown', (e) => {
    const step = 0.16;
    let used = true;
    if (e.key === 'ArrowLeft') tYaw = Math.max(-0.7, (idle ? yaw : tYaw) - step);
    else if (e.key === 'ArrowRight') tYaw = Math.min(0.7, (idle ? yaw : tYaw) + step);
    else if (e.key === 'ArrowUp') tPitch = Math.max(-0.22, (idle ? pitch : tPitch) - step / 2);
    else if (e.key === 'ArrowDown') tPitch = Math.min(0.22, (idle ? pitch : tPitch) + step / 2);
    else if (e.key === 'Home') { tYaw = 0; tPitch = 0; }
    else used = false;
    if (used) {
      e.preventDefault(); e.stopPropagation(); takeOver();
      if (!running && gl) { yaw = tYaw; pitch = tPitch; draw(); }
    }
  });
  const ro = new ResizeObserver(() => { if (disposed) return; resize(); if (!running && gl && played === false && !stillImg) draw(); else if (!running && gl) draw(); });
  ro.observe(root);

  /* --- Start --- */
  function showPlay(withStill) {
    if (withStill && opts.still) {
      stillImg = document.createElement('img');
      stillImg.className = 'lg-still'; stillImg.alt = ''; stillImg.src = opts.still;
      root.insertBefore(stillImg, root.firstChild);
    }
    playBtn = document.createElement('button');
    playBtn.type = 'button'; playBtn.className = 'lg-play'; playBtn.textContent = 'Play';
    playBtn.setAttribute('aria-label', 'Play the liquid gold');
    root.appendChild(playBtn);
    on(playBtn, 'click', async () => {
      played = true;
      playBtn.remove(); playBtn = null;
      if (!gl) {
        if (!initGL()) { failed(); return; }
        await cast(clean(input.value) || letters, false);
        resize(); fit = fitTarget;
      }
      if (stillImg) { stillImg.remove(); stillImg = null; }
      canvas.focus({ preventScroll: true });
      startLoop();
    });
  }
  function failed() {
    msg = document.createElement('p'); msg.className = 'lg-msg';
    msg.textContent = 'This browser can’t draw the liquid gold (it needs WebGL2).';
    root.appendChild(msg);
  }

  resize();
  if (lowPower && opts.still && !played) {
    // A still and a Play button; nothing is drawn until the visitor asks for it.
    showPlay(true);
    await new Promise((r) => { if (stillImg.complete) r(); else { stillImg.onload = r; stillImg.onerror = r; } });
  } else if (!initGL()) {
    failed();
  } else {
    await cast(letters, false);
    resize(); fit = fitTarget;
    draw();
    if (played) startLoop(); else showPlay(false);
  }

  return {
    title: TITLE,
    made: MADE,
    goodFor: GOOD_FOR,
    describe() {
      return `The letters ${spelled()} cast in liquid gold: thick, rounded letters with a slow ripple running over their surface, ` +
        'standing above a dark polished floor that holds their reflection and a soft shadow. Studio lights show as long highlights along the rounded edges. ' +
        'Type up to three letters, A to Z, in the "Your initials" field and the gold melts into the new letters. ' +
        'The letters turn to face the pointer; on a touch screen, drag across them; with the keyboard, focus the picture and use the arrow keys. ' +
        '"Save a picture" downloads it as a PNG.';
    },
    pause() { paused = true; if (raf) cancelAnimationFrame(raf); raf = 0; clearTimeout(inputTimer); },
    resume() { if (disposed) return; paused = false; if (running) { lastNow = 0; raf = requestAnimationFrame(loop); } },
    async dispose() {
      if (disposed) return;
      disposed = true;
      stopLoop();
      clearTimeout(inputTimer);
      ac.abort();
      ro.disconnect();
      if (gl) {
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.deleteTexture(texA); gl.deleteTexture(texB);
        gl.deleteBuffer(buf); gl.deleteVertexArray(vao); gl.deleteProgram(prog);
        if (lose) lose.loseContext();
        gl = null;
      }
      canvas.width = 1; canvas.height = 1;
      root.remove();
      removeStyle();
    },
    // for tests
    _state() { return { letters, running, paused, frames, scale, idle, morphing: !!morph, k: morph ? morph.k : 0, buildMs: Math.round(buildMs) }; },
  };
}
