/*
 * "A million specks", the WebGPU version: three.js's WebGPURenderer with a TSL compute shader that moves
 * every speck on the graphics card each frame (springs towards its target, a curling drift, the pointer's
 * push), and instanced sprites that read the same storage buffers to draw them.
 * Physics matches gl.js line for line, so both versions behave alike.
 */
import { MAXP } from './shapes.js';

export async function createGPU(canvas, { count }) {
  const THREE = await import('three/webgpu');
  const {
    Fn, instancedArray, instanceIndex, uniform, float, vec2, vec3, vec4, uint, hash, select, If,
    sin, cos, min, max, clamp, length, normalize, mix, sqrt, uv, dot, pow,
  } = await import('three/tsl');

  const renderer = new THREE.WebGPURenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  await renderer.init();
  if (!renderer.backend || !renderer.backend.isWebGPUBackend) { renderer.dispose(); return null; }
  // Colours are written as display values and added up as they are, exactly as in the WebGL version.
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(new THREE.Color(0.0549, 0.0863, 0.1569), 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 10000);

  const pos = instancedArray(count, 'vec4');
  const vel = instancedArray(count, 'vec4');
  const ptsA = instancedArray(MAXP, 'vec4');
  const ptsB = instancedArray(MAXP, 'vec4');

  const u = {
    time: uniform(0), dt: uniform(0.016), switchT: uniform(0), spanX: uniform(700), jitter: uniform(1),
    stiff: uniform(1), swirl: uniform(1), rad: uniform(120), ptrOn: uniform(0), burst: uniform(0),
    ptr: uniform(new THREE.Vector2(1e5, 1e5)), ptrVel: uniform(new THREE.Vector2()), burstPos: uniform(new THREE.Vector2()),
    view: uniform(new THREE.Vector2(1, 1)), offset: uniform(new THREE.Vector3()), rot: uniform(new THREE.Matrix3()),
    camD: uniform(1000), size: uniform(1), alpha: uniform(0.3),
  };
  const nP = float(MAXP);
  const H = (k) => hash(instanceIndex.add(uint(k * 1000003)));
  const fetchPt = (buf, h) => buf.element(uint(min(h.mul(nP), nP.sub(1))));

  const placeCloud = Fn(() => {
    const h1 = H(1), h2 = H(2), h3 = H(3), h4 = H(4);
    const A = fetchPt(ptsA, h1);
    const a = h2.mul(6.2831853), r = sqrt(h3);
    pos.element(instanceIndex).assign(vec4(cos(a).mul(r).mul(u.view.x).mul(0.62), sin(a).mul(r).mul(u.view.y).mul(0.62), h4.sub(0.5).mul(600), A.w.mul(0.4)));
    vel.element(instanceIndex).assign(vec4(0));
  })().compute(count);

  const jitterOf = () => vec3(H(2).sub(0.5), H(3).sub(0.5), H(4).sub(0.5).mul(3)).mul(u.jitter);
  const placeTarget = Fn(() => {
    const A = fetchPt(ptsA, H(1));
    pos.element(instanceIndex).assign(vec4(u.rot.mul(A.xyz).add(jitterOf()).add(u.offset), A.w));
    vel.element(instanceIndex).assign(vec4(0));
  })().compute(count);

  const update = Fn(() => {
    const h1 = H(1), h2 = H(2), h3 = H(3), h4 = H(4), h5 = H(5);
    const P = pos.element(instanceIndex), V = vel.element(instanceIndex);
    const A = fetchPt(ptsA, h1), B = fetchPt(ptsB, h1);
    // the change sweeps across from left to right, each speck leaving a little after its neighbour
    const delay = clamp(B.x.div(u.spanX).mul(0.5).add(0.5), 0, 1).mul(0.6).add(h5.mul(0.35));
    const T = select(u.time.sub(u.switchT).greaterThan(delay), A, B).toVar();
    const tgt = u.rot.mul(T.xyz).add(jitterOf()).add(u.offset);
    const p = P.xyz.toVar(), v = V.xyz.toVar();
    const om = mix(2.4, 4.6, h4).mul(u.stiff);
    const toT = tgt.sub(p);
    const dist = length(toT);
    const acc = toT.mul(om.mul(om)).sub(v.mul(om.mul(1.5))).toVar();
    // a curling, divergence-free drift: strong while travelling, a faint shimmer at rest
    const q = p.mul(0.0035), tt = u.time.mul(0.07);
    const flow = vec3(
      sin(q.y.mul(1.7).add(tt)).add(sin(q.y.mul(3.1).sub(tt.mul(1.3))).mul(0.5)),
      cos(q.x.mul(1.9).sub(tt)).add(cos(q.x.mul(2.7).add(tt.mul(0.8))).mul(0.5)),
      sin(q.x.add(q.y).mul(1.3).add(tt)),
    );
    acc.addAssign(flow.mul(clamp(dist.div(240), 0, 1).mul(900).mul(u.swirl).add(10)));
    // the pointer pushes them aside and drags them along its path
    const d = p.xy.sub(u.ptr), dl = max(length(d), 0.001);
    const f0 = clamp(float(1).sub(dl.div(u.rad)), 0, 1), f = f0.mul(f0).mul(u.ptrOn);
    acc.addAssign(vec3(d.div(dl).mul(5200).add(u.ptrVel.mul(4)), h3.sub(0.5).mul(1600)).mul(f));
    v.addAssign(acc.mul(u.dt));
    If(u.burst.greaterThan(0), () => {
      const bd = p.xy.sub(u.burstPos).add(vec2(h2.sub(0.5), h3.sub(0.5)).mul(0.01));
      v.addAssign(vec3(normalize(bd).mul(h1.mul(0.8).add(0.4)), h4.sub(0.5)).mul(u.burst));
    });
    p.addAssign(v.mul(u.dt));
    P.assign(vec4(p, mix(P.w, T.w, min(u.dt.mul(3), 1))));
    V.assign(vec4(v, 0));
  })().compute(count);

  // Drawing: one instanced sprite per speck, sized in CSS pixels, added up on the midnight page.
  const material = new THREE.PointsNodeMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
  material.sizeAttenuation = false;
  const Pa = pos.toAttribute(), Va = vel.toAttribute();
  material.positionNode = Pa.xyz;
  const hs = hash(instanceIndex.add(uint(11000033))), hc = hash(instanceIndex.add(uint(12000036))), hb = hash(instanceIndex.add(uint(13000039))), ht = hash(instanceIndex.add(uint(14000042)));
  const persp = u.camD.div(max(u.camD.sub(Pa.z), 1));
  const flake = hs.greaterThan(0.985);
  material.sizeNode = select(flake, float(2.6), hs.mul(0.55).add(1.1)).mul(u.size).mul(persp);
  const gold = vec3(0.86, 0.62, 0.27), amber = vec3(0.70, 0.42, 0.13), cream = vec3(0.945, 0.86, 0.68);
  const base = select(hc.lessThan(0.66), gold, select(hc.lessThan(0.94), amber, cream));
  const col = mix(base, cream, clamp(length(Va.xyz).div(1200), 0, 0.5));
  const twinkle = select(flake, pow(sin(u.time.mul(ht.mul(2.5).add(1.2)).add(ht.mul(40))).mul(0.5).add(0.5), 14).mul(2.4).add(0.8), float(1));
  const bright = Pa.w.mul(mix(0.85, 1.5, hb)).mul(clamp(persp, 0.75, 1.3)).mul(twinkle).mul(u.alpha);
  const q = uv().sub(0.5);
  const mask = clamp(float(1.2).sub(dot(q, q).mul(3.2)), 0, 1);
  material.colorNode = vec4(col.mul(bright).mul(mask), 1);
  const sprite = new THREE.Sprite(material);
  sprite.count = count;
  sprite.frustumCulled = false;
  scene.add(sprite);

  let w = 1, h = 1;
  function apply(U) {
    u.time.value = U.time; u.dt.value = U.dt; u.switchT.value = U.switchT; u.spanX.value = U.spanX; u.jitter.value = U.jitter;
    u.stiff.value = U.stiff; u.swirl.value = U.swirl; u.rad.value = U.rad; u.ptrOn.value = U.ptrOn; u.burst.value = U.burst;
    u.ptr.value.set(U.ptr[0], U.ptr[1]); u.ptrVel.value.set(U.ptrVel[0], U.ptrVel[1]); u.burstPos.value.set(U.burstPos[0], U.burstPos[1]);
    u.view.value.set(w, h); u.offset.value.set(U.offset[0], U.offset[1], U.offset[2]);
    u.rot.value.fromArray(U.rot);
    u.camD.value = U.camD; u.size.value = U.size; u.alpha.value = U.alpha;
  }

  return {
    kind: 'WebGPU',
    count,
    resize(cw, ch, ratio) {
      w = cw; h = ch;
      renderer.setPixelRatio(ratio);
      renderer.setSize(cw, ch, false);
      const D = (ch / 2) / Math.tan((15 * Math.PI) / 180);
      camera.aspect = cw / ch; camera.near = D * 0.2; camera.far = D * 3; camera.position.set(0, 0, D);
      camera.updateProjectionMatrix();
    },
    setShape(next, keepPrevious) {
      const a = ptsA.value, b = ptsB.value;
      b.array.set(keepPrevious ? a.array : next); b.needsUpdate = true;
      a.array.set(next); a.needsUpdate = true;
    },
    place(U, mode) { apply(U); renderer.compute(mode === 'cloud' ? placeCloud : placeTarget); },
    step(U) { apply(U); renderer.compute(update); },
    render(U) { apply(U); renderer.render(scene, camera); },
    dispose() {
      scene.remove(sprite);
      material.dispose();
      [placeCloud, placeTarget, update].forEach((n) => n.dispose && n.dispose());
      renderer.dispose();   // also destroys the GPU device it created
    },
  };
}
