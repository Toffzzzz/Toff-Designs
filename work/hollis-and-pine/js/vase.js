/*
 * Hollis & Pine: a thrown ceramic, drawn live with three.js r186.
 * A profile curve (the pot's outer silhouette) becomes a LatheGeometry with a real wall,
 * a rounded lip, an inside and a floor; glazes are physically based (MeshPhysicalMaterial)
 * with a hand-dipped glaze line over a bare clay foot, throwing rings in the bump map and
 * iron speckles for the speckled glaze; soft studio light comes from RoomEnvironment
 * through PMREM, with one soft key light and its shadow on a stone plinth.
 *
 * Kept self-contained so the Lab's "Shape a vase" can reuse it.
 *
 *   import { createVase, GLAZES } from './vase.js';
 *   const vase = createVase(canvas, {
 *     profile: [[r, y], …],      // outer silhouette from foot to rim, any units (y up)
 *     glaze: 'satin',            // 'matte' | 'satin' | 'gloss' | 'speckled'
 *     colour: '#9AA992',         // optional: overrides the glaze's own colour
 *     angle: 0.5,                // starting turn, radians
 *     plinth: true,              // the stone plinth under it
 *     onInteract() {},           // the visitor started dragging (stop any automatic motion)
 *     onChange(angle) {},        // the turn changed (drag, inertia, setAngle)
 *     onLost() {},               // the WebGL context was lost: show a still instead
 *   });
 *   vase.setGlaze('gloss', { colour, instant })   // blends over 520ms unless instant
 *   vase.setProfile(points)                        // rebuild the pot
 *   vase.setAngle(rad) / vase.getAngle() / vase.turnBy(rad)
 *   vase.render()                                  // draw one frame now
 *   vase.snapshot('image/png') -> Promise<Blob>    // a product shot
 *   vase.ready -> Promise (resolves after the first frame)
 *   vase.dispose()                                 // frees everything and loses the context
 * Throws if WebGL isn't available (the caller shows its still).
 * Renders on demand: nothing draws while nothing moves.
 */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Mesh, Group, LatheGeometry, Vector2, Vector3,
  MeshPhysicalMaterial, MeshStandardMaterial, PlaneGeometry, MeshBasicMaterial, DirectionalLight,
  PMREMGenerator, CanvasTexture, SRGBColorSpace, NoColorSpace, RepeatWrapping, ClampToEdgeWrapping,
  NeutralToneMapping, PCFShadowMap, Color, CatmullRomCurve3, MathUtils,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const GLAZES = {
  matte:    { label: 'Matte',    colour: '#E9E4DA', roughness: 0.84, clearcoat: 0,    clearcoatRoughness: 0.6,  sheen: 0.25, speckle: false },
  satin:    { label: 'Satin',    colour: '#9AA992', roughness: 0.46, clearcoat: 0.22, clearcoatRoughness: 0.42, sheen: 0,    speckle: false },
  gloss:    { label: 'Gloss',    colour: '#9A553C', roughness: 0.16, clearcoat: 1,    clearcoatRoughness: 0.05, sheen: 0,    speckle: false },
  speckled: { label: 'Speckled', colour: '#D9CBB2', roughness: 0.58, clearcoat: 0.35, clearcoatRoughness: 0.3,  sheen: 0,    speckle: true },
};

const CLAY = '#B8916F';
const TEX_W = 1024, TEX_H = 512;
const easeOut = (t) => 1 - Math.pow(1 - t, 5);

/* ------------------------------------------------------------ the profile -> lathe points */
/*
 * Returns { points: Vector2[] (evenly spaced along the outline, so uv.y is arc length),
 *           height, maxR, vDip (where the glaze line sits on the outside), vRim,
 *           radiusAtV(v) }
 * The outline runs: base centre -> foot -> outer wall -> rounded lip -> inner wall -> floor centre.
 * Normalised so the pot is 1 unit tall.
 */
export function buildOutline(profile, { wall = 0.032, samples = 300 } = {}) {
  const src = profile.map(([r, y]) => [Math.max(0.001, r), y]).sort((a, b) => a[1] - b[1]);
  const y0 = src[0][1], h = Math.max(1e-6, src[src.length - 1][1] - y0);
  const P = src.map(([r, y]) => [r / h, (y - y0) / h]);
  const curve = new CatmullRomCurve3(P.map(([r, y]) => new Vector3(r, y, 0)), false, 'centripetal');
  const outer = curve.getSpacedPoints(160).map((v) => [Math.max(0.004, v.x), v.y]);
  const foot = outer[0][0], top = outer[outer.length - 1];
  const t = wall;

  const pts = [];
  // base: centre out to the foot, with a little bevel
  for (let i = 0; i <= 6; i++) pts.push([(foot - t * 0.6) * (i / 6), 0]);
  pts.push([foot - t * 0.15, t * 0.08]);
  const outerStart = pts.length;
  outer.forEach((p, i) => { if (i > 0 || p[0] > foot - t * 0.1) pts.push(p); });
  const outerEnd = pts.length - 1;
  // lip: half a circle from the outside to the inside
  const lc = [top[0] - t / 2, top[1]];
  for (let i = 1; i < 10; i++) { const a = (Math.PI * i) / 10; pts.push([lc[0] + Math.cos(a) * t / 2, lc[1] + Math.sin(a) * t / 2]); }
  const lipEnd = pts.length;
  // inner wall: the outer wall moved inwards along its normals, top to bottom
  const floorY = Math.max(t * 1.6, 0.045);
  for (let i = outer.length - 1; i >= 0; i--) {
    const a = outer[Math.max(0, i - 1)], b = outer[Math.min(outer.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const nx = dy / len, ny = -dx / len;                 // outward normal
    const x = Math.max(0.006, outer[i][0] - nx * t), y = outer[i][1] - ny * t;
    if (y <= floorY + t * 0.6) break;
    pts.push([x, Math.min(y, top[1] - t * 0.5)]);
  }
  const last = pts[pts.length - 1];
  pts.push([Math.max(0.006, last[0] * 0.92), floorY + t * 0.15]);
  for (let i = 1; i <= 6; i++) pts.push([Math.max(0.0005, last[0] * 0.85 * (1 - i / 6)), floorY]);

  // resample evenly by arc length
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = cum[cum.length - 1];
  const at = (s) => {
    let j = 1; while (j < cum.length - 1 && cum[j] < s) j++;
    const k = (s - cum[j - 1]) / Math.max(1e-9, cum[j] - cum[j - 1]);
    return [pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * k, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * k];
  };
  const points = [];
  for (let i = 0; i < samples; i++) { const [x, y] = at((L * i) / (samples - 1)); points.push(new Vector2(x, y)); }

  // where the glaze stops on the outside (a hand-dipped line about a tenth of the way up)
  const dipH = 0.1;
  let iDip = outerStart; while (iDip < outerEnd && pts[iDip][1] < dipH) iDip++;
  const vDip = cum[iDip] / L, vRim = cum[Math.round((outerEnd + lipEnd) / 2)] / L;
  const radiusAtV = (v) => at(Math.max(0, Math.min(1, v)) * L)[0];
  const maxR = Math.max(...outer.map((p) => p[0]));
  return { points, height: 1, maxR, vDip, vRim, length: L, radiusAtV };
}

/* ------------------------------------------------------------ glaze textures (painted once per glaze) */
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function canvas2d(w = TEX_W, h = TEX_H) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
const vy = (v) => (1 - v) * TEX_H;   // texture v (0 at the base) -> canvas y

/* The wavy dip line with drips, shared by every map so they line up. */
function dipEdge(outline, seed = 7) {
  const r = rng(seed), n = 64, edge = [];
  const ph1 = r() * 6.28, ph2 = r() * 6.28;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    let v = outline.vDip + 0.006 * Math.sin(u * Math.PI * 2 * 3 + ph1) + 0.004 * Math.sin(u * Math.PI * 2 * 7 + ph2) + (r() - 0.5) * 0.003;
    edge.push([u, v]);
  }
  const drips = [];
  for (let i = 0; i < 5; i++) drips.push({ u: r(), w: 0.004 + r() * 0.005, len: 0.008 + r() * 0.018 });
  return { edge, drips };
}
function tracePath(ctx, dip) {
  ctx.beginPath();
  ctx.moveTo(0, TEX_H);
  dip.edge.forEach(([u, v]) => ctx.lineTo(u * TEX_W, vy(v)));
  ctx.lineTo(TEX_W, TEX_H);
  ctx.closePath();
}
function paintDrips(ctx, dip) {
  dip.drips.forEach((d) => {
    const x = d.u * TEX_W, w = d.w * TEX_W;
    const base = dip.edge[Math.round(d.u * (dip.edge.length - 1))][1];
    ctx.beginPath();
    ctx.ellipse(x, vy(base - d.len / 2), w / 2, (d.len / 2) * TEX_H, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

function paintColour(outline, dip, glaze, colour) {
  const [c, ctx] = canvas2d();
  const r = rng(1234);
  // glaze, with thicker and thinner patches (slightly darker where it pooled)
  ctx.fillStyle = colour; ctx.fillRect(0, 0, TEX_W, TEX_H);
  const base = new Color(colour);
  for (let i = 0; i < 90; i++) {
    const k = (r() - 0.5) * 0.08;
    const tint = base.clone().offsetHSL(0, 0, k);
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#' + tint.getHexString();
    ctx.beginPath();
    ctx.ellipse(r() * TEX_W, r() * TEX_H, 30 + r() * 90, 10 + r() * 40, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // glaze breaking thin on the lip: the clay shows through a little
  const rimY = vy(outline.vRim), band = 0.018 * TEX_H;
  const g = ctx.createLinearGradient(0, rimY - band, 0, rimY + band);
  g.addColorStop(0, 'rgba(184,145,111,0)'); g.addColorStop(0.5, 'rgba(184,145,111,.32)'); g.addColorStop(1, 'rgba(184,145,111,0)');
  ctx.fillStyle = g; ctx.fillRect(0, rimY - band, TEX_W, band * 2);
  // iron speckles, kept round on the pot (wider in u where the pot is narrow)
  if (glaze.speckle) {
    for (let i = 0; i < 2600; i++) {
      const v = outline.vDip + r() * (1 - outline.vDip);
      const rad = Math.max(0.02, outline.radiusAtV(v));
      const d = 0.0025 + Math.pow(r(), 3) * 0.008;               // diameter, in pot heights
      const wu = (d / (2 * Math.PI * rad)) * TEX_W, hv = (d / outline.length) * TEX_H;
      const x = r() * TEX_W, y = vy(v);
      ctx.fillStyle = `rgba(232,220,198,${0.5})`;                  // the paler halo where iron bled
      ctx.beginPath(); ctx.ellipse(x, y, wu * 1.25, hv * 1.25, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(${78 + r() * 20},${56 + r() * 12},${40},${0.7 + r() * 0.3})`;
      ctx.beginPath(); ctx.ellipse(x, y, wu / 2, hv / 2, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  // bare clay below the dip line, with grog flecks
  ctx.save(); tracePath(ctx, dip); ctx.clip();
  ctx.fillStyle = CLAY; ctx.fillRect(0, 0, TEX_W, TEX_H);
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = r() < 0.5 ? 'rgba(120,88,62,.35)' : 'rgba(225,200,170,.35)';
    ctx.fillRect(r() * TEX_W, vy(outline.vDip) + r() * (TEX_H - vy(outline.vDip)), 1 + r() * 1.5, 1 + r());
  }
  ctx.restore();
  // drips of glaze over the line, and a darker edge where it's thickest
  ctx.fillStyle = colour; paintDrips(ctx, dip);
  ctx.strokeStyle = '#' + base.clone().offsetHSL(0, 0, -0.12).getHexString();
  ctx.globalAlpha = 0.5; ctx.lineWidth = 2;
  ctx.beginPath(); dip.edge.forEach(([u, v], i) => (i ? ctx.lineTo(u * TEX_W, vy(v)) : ctx.moveTo(u * TEX_W, vy(v)))); ctx.stroke();
  ctx.globalAlpha = 1;
  return c;
}

function paintRoughness(outline, dip, glaze) {
  const [c, ctx] = canvas2d(512, 256);
  ctx.scale(512 / TEX_W, 256 / TEX_H);
  const v = Math.round(glaze.roughness * 255);
  ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(0, 0, TEX_W, TEX_H);
  if (glaze.speckle) {   // speckles break the surface a little
    const r = rng(99);
    ctx.fillStyle = `rgba(255,255,255,.35)`;
    for (let i = 0; i < 1200; i++) ctx.fillRect(r() * TEX_W, r() * TEX_H * (1 - outline.vDip), 3, 2);
  }
  ctx.save(); tracePath(ctx, dip); ctx.clip(); ctx.fillStyle = 'rgb(240,240,240)'; ctx.fillRect(0, 0, TEX_W, TEX_H); ctx.restore();
  ctx.fillStyle = `rgb(${v},${v},${v})`; paintDrips(ctx, dip);
  return c;
}

/* clearcoat mask (white where glazed) and the bump map (throwing rings), shared by every glaze */
function paintMask(outline, dip) {
  const [c, ctx] = canvas2d(512, 256);
  ctx.scale(512 / TEX_W, 256 / TEX_H);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, TEX_W, TEX_H);
  ctx.save(); tracePath(ctx, dip); ctx.clip(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, TEX_W, TEX_H); ctx.restore();
  ctx.fillStyle = '#fff'; paintDrips(ctx, dip);
  return c;
}
function paintBump(outline) {
  const [c, ctx] = canvas2d(256, 1024);
  const r = rng(5);
  const img = ctx.createImageData(256, 1024);
  // rings along v (rows), each ring wobbling a little around the pot
  const rows = new Float32Array(1024);
  let phase = 0;
  for (let y = 0; y < 1024; y++) {
    phase += 0.16 + r() * 0.05;
    rows[y] = 0.5 + 0.5 * Math.sin(phase) * (0.6 + 0.4 * Math.sin(y * 0.013));
  }
  for (let y = 0; y < 1024; y++) {
    for (let x = 0; x < 256; x++) {
      const wob = Math.sin((x / 256) * Math.PI * 2 * 2 + y * 0.05) * 2;
      const yy = Math.min(1023, Math.max(0, Math.round(y + wob)));
      const val = Math.round(110 + rows[yy] * 60 + (r() - 0.5) * 8);
      const i = (y * 256 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = val; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function stoneTexture() {
  const [c, ctx] = canvas2d(512, 512);
  const r = rng(42);
  ctx.fillStyle = '#E3DFD5'; ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = r() < 0.6 ? 'rgba(190,182,164,.09)' : 'rgba(255,252,246,.14)';
    ctx.beginPath(); ctx.ellipse(r() * 512, r() * 512, 8 + r() * 46, 4 + r() * 22, r() * 3, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 2600; i++) { ctx.fillStyle = r() < 0.5 ? 'rgba(150,135,110,.22)' : 'rgba(255,255,255,.3)'; ctx.fillRect(r() * 512, r() * 512, 1.2, 1.2); }
  return c;
}
function shadowTexture() {
  const [c, ctx] = canvas2d(256, 256);
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(40,36,28,.55)'); g.addColorStop(0.45, 'rgba(40,36,28,.22)'); g.addColorStop(1, 'rgba(40,36,28,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  return c;
}

/* ------------------------------------------------------------ the scene */
export function createVase(canvas, opts = {}) {
  const o = { glaze: 'satin', angle: 0.5, plinth: true, ...opts };
  if (!o.profile || o.profile.length < 3) throw new TypeError('createVase: profile needs at least three [r, y] points');

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'default' });
  renderer.setPixelRatio(o.pixelRatio || Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envRT = pmrem.fromScene(room, 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.85;
  room.traverse((m) => { if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); });

  const camera = new PerspectiveCamera(26, 1, 0.1, 50);

  // soft key light from the upper left, like a window
  const key = new DirectionalLight(0xfff8f0, 1.05);
  key.position.set(-2.2, 3.2, 2.4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 9;
  key.shadow.blurSamples = 16;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.02;
  const sc = key.shadow.camera; sc.left = -1.2; sc.right = 1.2; sc.top = 1.6; sc.bottom = -0.6; sc.near = 0.5; sc.far = 8;
  scene.add(key, key.target);

  const pot = new Group();
  scene.add(pot);

  // the plinth: a stone block whose top is y = 0
  const disposables = [];
  let plinth = null, contact = null;
  if (o.plinth) {
    const stone = new CanvasTexture(stoneTexture());
    stone.colorSpace = SRGBColorSpace; stone.wrapS = stone.wrapT = RepeatWrapping;
    const pg = new RoundedBoxGeometry(1, 1, 1, 4, 0.02);
    const pm = new MeshStandardMaterial({ color: 0xf2f0ea, map: stone, roughness: 0.94, envMapIntensity: 0.5 });
    plinth = new Mesh(pg, pm);
    plinth.receiveShadow = true;
    scene.add(plinth);
    disposables.push(pg, pm, stone);
    const ct = new CanvasTexture(shadowTexture());
    const cg = new PlaneGeometry(1, 1);
    const cm = new MeshBasicMaterial({ map: ct, transparent: true, depthWrite: false, toneMapped: false });
    contact = new Mesh(cg, cm);
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = 0.002;
    scene.add(contact);
    disposables.push(ct, cg, cm);
  }

  // the glazed body
  const material = new MeshPhysicalMaterial({ color: 0xffffff, roughness: 1, metalness: 0, clearcoat: 0, ior: 1.5, sheenColor: new Color(0xffffff) });
  const uni = { uMap2: { value: null }, uRough2: { value: null }, uMix: { value: 0 } };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uni);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uMap2;\nuniform sampler2D uRough2;\nuniform float uMix;')
      .replace('#include <map_fragment>', `#ifdef USE_MAP
        vec4 sampledDiffuseColor = mix( texture2D( map, vMapUv ), texture2D( uMap2, vMapUv ), uMix );
        diffuseColor *= sampledDiffuseColor;
      #endif`)
      .replace('#include <roughnessmap_fragment>', `float roughnessFactor = roughness;
      #ifdef USE_ROUGHNESSMAP
        roughnessFactor *= mix( texture2D( roughnessMap, vRoughnessMapUv ).g, texture2D( uRough2, vRoughnessMapUv ).g, uMix );
      #endif`);
  };
  material.customProgramCacheKey = () => 'hp-glaze-mix';

  let geometry = null, outline = null, dip = null, mask = null, bump = null;
  let mesh = null;
  const cache = new Map();   // glaze key -> { map, rough }

  function texFor(name, colour) {
    const k = name + '|' + colour;
    if (!cache.has(k)) {
      const gl = GLAZES[name];
      const map = new CanvasTexture(paintColour(outline, dip, gl, colour));
      map.colorSpace = SRGBColorSpace; map.anisotropy = 4;
      map.wrapS = RepeatWrapping; map.wrapT = ClampToEdgeWrapping;
      const rough = new CanvasTexture(paintRoughness(outline, dip, gl));
      rough.colorSpace = NoColorSpace; rough.wrapS = RepeatWrapping;
      cache.set(k, { map, rough });
    }
    return cache.get(k);
  }
  function clearCache() { cache.forEach(({ map, rough }) => { map.dispose(); rough.dispose(); }); cache.clear(); }

  let current = { name: o.glaze in GLAZES ? o.glaze : 'satin', colour: o.colour || GLAZES[o.glaze in GLAZES ? o.glaze : 'satin'].colour };

  function applyParams(gl) {
    material.clearcoat = gl.clearcoat;
    material.clearcoatRoughness = gl.clearcoatRoughness;
    material.sheen = gl.sheen;
    material.sheenRoughness = 0.8;
  }

  function build(profile) {
    if (mesh) { pot.remove(mesh); geometry.dispose(); }
    if (mask) mask.dispose();
    if (bump) bump.dispose();
    clearCache();
    outline = buildOutline(profile);
    dip = dipEdge(outline);
    geometry = new LatheGeometry(outline.points, 128);
    mesh = new Mesh(geometry, material);
    mesh.castShadow = true; mesh.receiveShadow = true;
    pot.add(mesh);
    mask = new CanvasTexture(paintMask(outline, dip)); mask.colorSpace = NoColorSpace; mask.wrapS = RepeatWrapping;
    bump = new CanvasTexture(paintBump(outline)); bump.colorSpace = NoColorSpace; bump.wrapS = RepeatWrapping;
    material.clearcoatMap = mask;
    material.bumpMap = bump; material.bumpScale = 0.9;
    const t = texFor(current.name, current.colour);
    material.map = t.map; material.roughnessMap = t.rough;
    uni.uMap2.value = t.map; uni.uRough2.value = t.rough; uni.uMix.value = 0;
    applyParams(GLAZES[current.name]);
    material.needsUpdate = true;
    if (contact) { const s = Math.max(outline.maxR * 2.3, 0.5); contact.scale.set(s * 1.25, s, 1); contact.position.x = 0.06; }
    if (plinth) {   // a block a little wider than the pot; tall enough to leave the frame
      const pw = Math.max(outline.maxR * 2 * 1.45, 0.95);
      plinth.scale.set(pw, 2.4, pw * 0.78);
      plinth.position.y = -1.2;
    }
    frame();
    request();
  }

  /* framing: the pot fills the height with room around it; a wide bowl fits by width */
  let w = 0, h = 0;
  function frame() {
    const aspect = w && h ? w / h : 1;
    camera.aspect = aspect;
    const potW = outline ? outline.maxR * 2 : 1;
    const needH = 1.66, needW = Math.max(potW * 1.6, 1.3);
    const vfov = MathUtils.degToRad(camera.fov);
    const distH = needH / 2 / Math.tan(vfov / 2);
    const distW = needW / 2 / (Math.tan(vfov / 2) * aspect);
    const dist = Math.max(distH, distW);
    const lookY = 0.42;
    const elev = MathUtils.degToRad(11);
    camera.position.set(0, lookY + Math.sin(elev) * dist, Math.cos(elev) * dist);
    camera.lookAt(0, lookY, 0);
    camera.updateProjectionMatrix();
  }
  function resize() {
    const r = canvas.getBoundingClientRect();
    const nw = Math.max(1, Math.round(r.width)), nh = Math.max(1, Math.round(r.height));
    if (nw === w && nh === h) return;
    w = nw; h = nh;
    renderer.setSize(w, h, false);
    frame();
    request();
  }

  /* drawing on demand */
  let raf = 0, disposed = false, lost = false;
  let angle = o.angle || 0, vel = 0, dragging = false;
  let blend = null;
  let resolveReady; const ready = new Promise((r) => { resolveReady = r; });

  function draw() {
    if (disposed || lost) return;
    pot.rotation.y = angle;
    renderer.render(scene, camera);
    if (resolveReady) { resolveReady(); resolveReady = null; }
  }
  let lastTick = 0;
  function tick(now) {
    raf = 0;
    let more = false;
    const dt = lastTick ? Math.min(64, now - lastTick) : 16.7;
    lastTick = now;
    if (!dragging && Math.abs(vel) > 0.00002) {   // inertia after a fling, in radians per ms, easing out over ~0.2s
      angle += vel * dt; vel *= Math.exp(-dt / 190); more = true;
      if (o.onChange) o.onChange(angle);
    } else vel = 0;
    if (blend) {
      const t = Math.min(1, (now - blend.t0) / blend.dur);
      const e = easeOut(t);
      uni.uMix.value = e;
      const a = GLAZES[blend.from], b = GLAZES[blend.to];
      material.clearcoat = a.clearcoat + (b.clearcoat - a.clearcoat) * e;
      material.clearcoatRoughness = a.clearcoatRoughness + (b.clearcoatRoughness - a.clearcoatRoughness) * e;
      material.sheen = a.sheen + (b.sheen - a.sheen) * e;
      if (t >= 1) {
        material.map = uni.uMap2.value; material.roughnessMap = uni.uRough2.value; uni.uMix.value = 0;
        applyParams(b); blend = null;
      } else more = true;
    }
    draw();
    if (more) raf = requestAnimationFrame(tick); else lastTick = 0;
  }
  function request() { if (!raf && !disposed) raf = requestAnimationFrame(tick); }

  /* dragging to turn: horizontal drags turn it; vertical swipes still scroll the page */
  let lastX = 0, lastT = 0, pid = null;
  canvas.style.touchAction = 'pan-y';
  const onDown = (e) => {
    if (e.button && e.button !== 0) return;
    pid = e.pointerId; dragging = true; vel = 0; lastX = e.clientX; lastT = performance.now();
    try { canvas.setPointerCapture(pid); } catch (err) { /* fine */ }
    if (o.onInteract) o.onInteract();
  };
  const onMove = (e) => {
    if (!dragging || e.pointerId !== pid) return;
    const dx = e.clientX - lastX, now = performance.now();
    const d = (dx / Math.max(240, w)) * Math.PI * 1.6;
    angle += d;
    vel = 0.6 * vel + 0.4 * (d / Math.max(8, now - lastT));
    lastX = e.clientX; lastT = now;
    if (o.onChange) o.onChange(angle);
    request();
  };
  const onUp = (e) => {
    if (e.pointerId !== pid) return;
    dragging = false; pid = null;
    if (performance.now() - lastT > 80) vel = 0;
    request();
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  const onLost = (e) => { e.preventDefault(); lost = true; if (o.onLost) o.onLost(); };
  canvas.addEventListener('webglcontextlost', onLost);

  const ro = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(canvas); else window.addEventListener('resize', resize);

  build(o.profile);
  resize();

  return {
    ready,
    get glaze() { return current.name; },
    setGlaze(name, { colour, instant = false } = {}) {
      if (!(name in GLAZES) || disposed) return;
      const next = { name, colour: colour || GLAZES[name].colour };
      if (next.name === current.name && next.colour === current.colour) return;
      const from = blend ? blend.to : current.name;
      if (blend) { material.map = uni.uMap2.value; material.roughnessMap = uni.uRough2.value; uni.uMix.value = 0; blend = null; }
      const t = texFor(next.name, next.colour);
      current = next;
      uni.uMap2.value = t.map; uni.uRough2.value = t.rough;
      if (instant) { material.map = t.map; material.roughnessMap = t.rough; uni.uMix.value = 0; applyParams(GLAZES[name]); request(); return; }
      blend = { from, to: name, t0: performance.now(), dur: 520 };
      request();
    },
    setProfile(profile) { if (!disposed) build(profile); },
    setAngle(a) { angle = a; vel = 0; request(); },
    getAngle() { return angle; },
    turnBy(d) { angle += d; vel = 0; if (o.onChange) o.onChange(angle); request(); },
    render() { draw(); },
    snapshot(type = 'image/png') {
      return new Promise((resolve) => { draw(); canvas.toBlob(resolve, type); });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('webglcontextlost', onLost);
      if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
      clearCache();
      if (geometry) geometry.dispose();
      if (mask) mask.dispose();
      if (bump) bump.dispose();
      material.dispose();
      disposables.forEach((d) => d.dispose());
      envRT.dispose(); pmrem.dispose();
      key.shadow.dispose && key.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();   // WEBGL_lose_context: hands the context back now
    },
  };
}
