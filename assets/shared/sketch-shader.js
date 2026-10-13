/*
 * Toff Studio: SketchStage, a website screenshot drawn live as a pen-and-pencil
 * sketch in cream ink on midnight paper, painted back to full colour with a brush.
 * Used by the home page's hero and the Lab's "Sketch to site". Raw WebGL2, no
 * dependencies.
 *
 *   import { SketchStage } from './assets/shared/sketch-shader.js';
 *   if (SketchStage.supported()) {
 *     const stage = new SketchStage(canvas, { onDone: () => {...} });
 *     await stage.load('assets/.../site.webp');   // URL, Blob/File, <img>, ImageBitmap or canvas
 *     stage.autoPaint(2000);                       // or paintAt() from your own pointer code
 *   }
 *
 * Options (all optional):
 *   ink, paper, gold   CSS hex colours (defaults: the site's cream, midnight and gold)
 *   goldEdge           draw a thin gold line on the moving edge of the reveal (true)
 *   dprCap             cap on devicePixelRatio (2)
 *   maxTexWidth        the screenshot is scaled down to at most this width (2560)
 *   align              [x, y] 0..1, where the screenshot is anchored when cropped
 *                      to the canvas's shape ([0.5, 0]: centred, top)
 *   brush              brush radius in CSS px (default: 9% of the canvas's short side)
 *   pointer            true: paint with a mouse or pen over the canvas (false; touch never paints)
 *   autoResize         follow the canvas's CSS size with a ResizeObserver (true)
 *   onCoverage(c)      called with the revealed fraction 0..1, about 4 times a second while painting
 *   onDone()           called once when the painting is complete (rendering then stops)
 *
 * Methods:
 *   SketchStage.supported() -> boolean        WebGL2 available
 *   load(src) -> Promise                      new picture: a fresh sketch, nothing revealed
 *   paintAt(x, y, vx?, vy?)                   the visitor's brush, CSS px from the canvas's
 *                                             top left; velocity in CSS px per ms (worked out
 *                                             from the previous call if left out). Stops autoPaint.
 *   autoPaint(ms = 2000)                      a brush paints it all in by itself, then finish()
 *   finish(ms = 700) -> Promise               floods the rest smoothly from what's painted
 *   coverage() -> number                      revealed fraction 0..1 (last measurement)
 *   renderSketchOnly()                        draws the pure sketch once (for stills)
 *   toBlob(type = 'image/webp', q = 0.92) -> Promise<Blob>   the pure sketch at canvas size
 *   resize()                                  call after the canvas's CSS size changes
 *   dispose()                                 frees everything and releases the GL context
 *   done (boolean), canvas
 *
 * Rendering happens only while something changes: no animation frames when idle.
 */

const HEX = (h) => {
  h = String(h).replace('#', '');
  if (h.length === 3) h = h.replace(/./g, '$&$&');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
};

const NOISE = `
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+1.),f.x),f.y);}
float fbm(vec2 p){return vn(p)*.55+vn(p*2.03+7.1)*.3+vn(p*4.01+3.3)*.15;}`;

const VS = `#version 300 es
void main(){vec2 p=vec2(gl_VertexID==1?3.:-1.,gl_VertexID==2?3.:-1.);gl_Position=vec4(p,0,1);}`;

const HEAD = `#version 300 es
precision highp float;
out vec4 o;
uniform vec2 uRes,uCss;` + NOISE;

// The sketch, rendered once per picture and size.
const FS_SKETCH = HEAD + `
uniform sampler2D uSrc;
uniform vec2 uSrcPx,uScale,uOff;
uniform float uLod,uBg,uDir,uRange,uDpr,uSeed;
uniform vec3 uInk,uPaper;
vec3 tx(vec2 st,float l){return textureLod(uSrc,uOff+st*uScale,l).rgb;}
float lu(vec3 c){return dot(c,vec3(.299,.587,.114));}
float sobel(vec2 st,vec2 e,float l){
  vec3 a=tx(st-e,l),b=tx(st+vec2(0,-e.y),l),c=tx(st+vec2(e.x,-e.y),l),d=tx(st+vec2(-e.x,0),l),
       f=tx(st+vec2(e.x,0),l),g=tx(st+vec2(-e.x,e.y),l),h=tx(st+vec2(0,e.y),l),i=tx(st+e,l);
  vec3 gx=c+2.*f+i-a-2.*d-g,gy=g+2.*h+i-a-2.*b-c;
  return max(length(vec2(lu(gx),lu(gy))),sqrt(dot(gx,gx)+dot(gy,gy))*.46);
}
vec2 wob(vec2 p,float s,float amp,float k){return (vec2(fbm(p/s+k),fbm(p/s+k+31.7))-.5)*amp;}
// Hand hatching: short parallel strokes with tapered ends, kept or dropped by tone.
float hatch(vec2 p,float ang,float sp,float tone,float sd){
  if(tone<=0.)return 0.;
  vec2 d=vec2(cos(ang),sin(ang)),n=vec2(-d.y,d.x);
  float u=dot(p,n)/sp,a=dot(p,d),li=floor(u);
  float L=16.+14.*h21(vec2(li,sd));
  float aa=a/L+h21(vec2(li,sd+5.)),si=floor(aa),fa=fract(aa);
  float r=h21(vec2(li*1.31+si,sd+9.));
  float lv=(mod(li,2.)<.5?.12:.42)+r*.12;
  float on=smoothstep(lv-.08,lv+.08,tone);
  float tp=smoothstep(0.,.08,fa)*smoothstep(.86,.62,fa);
  float cu=fract(u)-.5+(r-.5)*.3+(fa-.5)*(r-.5)*.5;
  float w=.11+.08*tone,aw=.75/(uDpr*sp);
  return (1.-smoothstep(w-aw,w+aw,abs(cu)))*tp*on;
}
// How far the source departs from its own page colour: 0 = paper, 1 = full ink.
float ik(vec2 st,float l){return clamp(uDir*(uBg-lu(tx(st,l)))/uRange,0.,1.);}
// Difference of Gaussians on that: thin dark features (lettering, rules) become pen strokes.
float dog(vec2 st,vec2 c,float l){
  float a=ik(st,l),b=0.;
  for(int i=0;i<8;i++){float t=float(i)*.785+.39;vec2 d=vec2(cos(t),sin(t))*c;b+=ik(st+d,l)*.6+ik(st+d*2.,l)*.4;}
  return a-b/8.;
}
void main(){
  vec2 s=gl_FragCoord.xy/uRes,st=vec2(s.x,1.-s.y),p=st*uCss;
  vec2 c=1./uCss,e=max(c*.5,.7/(uSrcPx*uScale));
  vec2 w1=wob(p,95.,5.,uSeed),w2=wob(p,70.,8.,uSeed+11.);
  vec2 q1=st+w1*c,q2=st+w2*c;
  float pr=.62+.38*smoothstep(.2,.8,vn(p/85.+uSeed*3.));
  float tb=lu(tx(q1,uLod+3.2));
  float tone=clamp(uDir*(uBg-tb)/uRange,0.,1.);
  // In shaded areas (photos, dark panels) the hatching carries the drawing and lines step back.
  float t0=tone,shade=smoothstep(.35,.85,tone);
  tone=smoothstep(.1,.9,tone+(fbm(p/50.+uSeed)-.5)*.25);
  float d1=dog(q1,c,uLod);
  // Thin dark marks (lettering, icons, rules) are written in solid ink; wide areas are
  // only outlined (and hatched below): inside one, every point 3px away is ink too.
  float a0=ik(q1,uLod),rmin=1.;
  for(int i=0;i<8;i++){float t=float(i)*.785;rmin=min(rmin,ik(q1+vec2(cos(t),sin(t))*c*3.,uLod));}
  float fill=smoothstep(.2,.5,a0)*(1.-smoothstep(.35,.6,rmin))*smoothstep(.04,.16,a0-ik(q1,uLod+2.))*(1.-.6*shade);
  float pen=max(fill*.9,smoothstep(.13,.4,d1))+smoothstep(.5,.75,-d1)*.7*(1.-shade);
  float g1=sobel(q1,e,uLod);
  float out1=smoothstep(.08,.22,g1)*(1.-smoothstep(.25,.45,g1))*(1.-smoothstep(.12,.3,abs(d1)))*(1.-smoothstep(.05,.18,t0))*.85;
  float e1=clamp(max(pen*(1.-.65*shade),out1*(1.-shade)),0.,1.)*pr;
  // A second, fainter pencil pass over the bigger shapes, slightly off (a re-traced line).
  float g2=sobel(q2,e*1.5,uLod+1.6);
  float e2=smoothstep(.9,1.6,g2)*(1.-smoothstep(.1,.3,abs(dog(q2,c*2.,uLod+1.))))*.2;
  // Light marks inside a shaded area (a button's label) are left as bare paper.
  float hole=1.-smoothstep(.12,.3,-min(d1,dog(q1,c*2.2,uLod)))*smoothstep(.1,.35,t0);
  float h1=hole*hatch(p+w2,.82,5.5,tone,1.+uSeed)*(.4+.6*tone);
  float h2=hole*hatch(p+w1,-.68,6.5,tone-.42,2.+uSeed);
  float gr=h21(floor(gl_FragCoord.xy)+uSeed),gc=vn(p*1.1+uSeed);
  float pencil=mix(.45,1.,gc)*mix(.7,1.,gr);
  float ink=1.-(1.-e1*.92)*(1.-e2*pencil)*(1.-h1*.5*pencil)*(1.-h2*.42*pencil);
  ink*=mix(.84,1.,gr);
  vec3 paper=uPaper*(1.+(gr-.5)*.07+(fbm(p/180.)-.5)*.06);
  o=vec4(mix(paper,uInk,clamp(ink,0.,1.)),1);
}`;

// The reveal mask: r = revealed (only ever grows), g = wetness (spreads, then dries).
const FS_MASK = HEAD + `
uniform sampler2D uPrev;
uniform vec2 uMRes;
uniform vec4 uSp[32];
uniform int uN;
uniform float uDry,uFlood;
void main(){
  vec2 s=gl_FragCoord.xy/uMRes,px=1./uMRes,p=s*uCss;
  vec4 v=texture(uPrev,s);
  float m=v.r,w=v.g*uDry;
  // Ink bleed: while wet, the edge creeps outwards along the paper's fibres
  // (a smooth noise field), copying its neighbours so the edge stays one soft line.
  float fib=fbm(p/14.+vec2(0,uFlood*3.));
  float gate=max(smoothstep(.42,.6,fib),uFlood);
  float sp=0.,sw=0.,R=1.2+uFlood*14.;
  for(int i=0;i<8;i++){
    float a=float(i)*.785+fib*2.;
    vec4 q=texture(uPrev,s+vec2(cos(a),sin(a))*px*R);
    float k=max(smoothstep(.15,.45,q.g),uFlood);
    sp=max(sp,q.r*k);sw=max(sw,q.g*k);
  }
  m=max(m,sp*gate);
  w=max(w,sw*.82*gate);
  float edge=(vn(p/24.)-.5)*.3+(vn(p/7.)-.5)*.12;
  for(int i=0;i<32;i++){
    if(i>=uN)break;
    vec4 b=uSp[i];
    float d=length((s-b.xy)*uCss)/b.z+edge;
    float a=(1.-smoothstep(.55,1.,d))*b.w;
    m=max(m,a);w=max(w,a);
  }
  o=vec4(m,clamp(w,0.,1.),0,1);
}`;

// What you see: the sketch, the screenshot where the mask is, an ink-bleed edge and a gold line.
const FS_COMP = HEAD + `
uniform sampler2D uSketch,uSrc,uMask;
uniform vec2 uScale,uOff;
uniform float uMode,uFinish,uGold,uDpr;
uniform vec3 uGoldC;
void main(){
  vec2 s=gl_FragCoord.xy/uRes,st=vec2(s.x,1.-s.y),p=st*uCss;
  vec3 ph=texture(uSrc,uOff+st*uScale).rgb;
  if(uMode>1.5){o=vec4(ph,1);return;}
  vec3 sk=texture(uSketch,s).rgb;
  if(uMode>.5){o=vec4(sk,1);return;}
  vec4 mk=texture(uMask,s);
  float v=mk.r+(fbm(p/30.)-.5)*.34+(vn(p/6.5)-.5)*.07+uFinish*1.4;
  float fw=fwidth(v)+1e-4;
  float rev=smoothstep(.5-fw,.5+fw,v);
  float rim=rev*(1.-smoothstep(0.,.12,v-.5));
  vec3 col=mix(sk,ph*(1.-.1*rim),rev);
  float dl=abs(v-.5)/fw;
  float ln=1.-smoothstep(.55*uDpr,.55*uDpr+1.,dl);
  col=mix(col,uGoldC,ln*uGold*smoothstep(.06,.45,mk.g)*(1.-uFinish));
  o=vec4(col,1);
}`;

// Coverage: each output cell averages a 4x4 grid of the mask.
const FS_COV = HEAD + `
uniform sampler2D uMask;
uniform vec2 uCRes;
void main(){
  float c=0.;
  for(int y=0;y<4;y++)for(int x=0;x<4;x++){
    vec2 s=(floor(gl_FragCoord.xy)+(vec2(x,y)+.5)/4.)/uCRes;
    c+=step(.5,texture(uMask,s).r);
  }
  o=vec4(c/16.,0,0,1);
}`;

const FS_COPY = HEAD + `
uniform sampler2D uT;
void main(){o=texture(uT,gl_FragCoord.xy/uRes);}`;

const COV_W = 48, COV_H = 30;

export class SketchStage {
  static supported() {
    try {
      const gl = document.createElement('canvas').getContext('webgl2');
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
      return !!gl;
    } catch { return false; }
  }

  constructor(canvas, o = {}) {
    this.canvas = canvas;
    this.o = {
      ink: '#F1E3C6', paper: '#0E1628', gold: '#D8AC5F', goldEdge: true, dprCap: 2,
      maxTexWidth: 2560, align: [0.5, 0], brush: 0, pointer: false, autoResize: true,
      onCoverage: null, onDone: null, ...o,
    };
    this.done = false;
    this._q = [];
    this._cov = 0;
    this._raf = 0;
    this._frame = this._frame.bind(this);
    this._off = [];
    const on = (t, type, fn, opt) => { t.addEventListener(type, fn, opt); this._off.push(() => t.removeEventListener(type, fn, opt)); };
    on(canvas, 'webglcontextlost', (e) => { e.preventDefault(); cancelAnimationFrame(this._raf); this._raf = 0; this._lost = true; });
    on(canvas, 'webglcontextrestored', () => { this._lost = false; this._init(); if (this._bmp) { this._upload(); this._finishNow(); } });
    if (this.o.pointer) {
      on(canvas, 'pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        const r = canvas.getBoundingClientRect();
        for (const ev of e.getCoalescedEvents?.() || [e]) this.paintAt(ev.clientX - r.left, ev.clientY - r.top);
      });
    }
    if (this.o.autoResize && 'ResizeObserver' in window) {
      this._ro = new ResizeObserver(() => this.resize());
      this._ro.observe(canvas);
    }
    this._init();
    this.resize();
  }

  /* ---------- GL setup ---------- */

  _init() {
    const gl = this.gl = this.canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error('WebGL2 is not available');
    const prog = (fs) => {
      const p = gl.createProgram();
      for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, fs]]) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(gl.getShaderInfoLog(s));
        gl.attachShader(p, s); gl.deleteShader(s);
      }
      gl.linkProgram(p);
      const u = {};
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) || 0;
      for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name.replace('[0]', ''); u[name] = gl.getUniformLocation(p, name); }
      return { p, u };
    };
    this._P = { sketch: prog(FS_SKETCH), mask: prog(FS_MASK), comp: prog(FS_COMP), cov: prog(FS_COV), copy: prog(FS_COPY) };
    this._vao = gl.createVertexArray();
    this._srcTex = null;
    this._rt = {};
    this._rt.cov = this._target(COV_W, COV_H);
    this._pbo = gl.createBuffer();
    this._fence = null;
  }

  _tex(w, h, data = null) {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  _target(w, h) {
    const gl = this.gl, tex = this._tex(w, h), fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fb, w, h };
  }

  _free(t) { if (t) { this.gl.deleteTexture(t.tex); this.gl.deleteFramebuffer(t.fb); } }

  _pass(name, target, uniforms, textures = []) {
    const gl = this.gl, { p, u } = this._P[name];
    gl.useProgram(p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fb : null);
    gl.viewport(0, 0, target ? target.w : this.canvas.width, target ? target.h : this.canvas.height);
    textures.forEach(([n, t], i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(u[n], i); });
    for (const k in uniforms) {
      const v = uniforms[k], l = u[k];
      if (l == null) continue;
      if (k === 'uN') gl.uniform1i(l, v);
      else if (k === 'uSp') gl.uniform4fv(l, v);
      else if (typeof v === 'number') gl.uniform1f(l, v);
      else gl[`uniform${v.length}fv`](l, v);
    }
    gl.bindVertexArray(this._vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /* ---------- size and picture ---------- */

  resize() {
    if (this._disposed || this._lost) return;
    const r = this.canvas.getBoundingClientRect();
    const cw = r.width || this.canvas.clientWidth, ch = r.height || this.canvas.clientHeight;
    if (!cw || !ch) return;
    const dpr = Math.min(window.devicePixelRatio || 1, this.o.dprCap);
    const W = Math.max(1, Math.round(cw * dpr)), H = Math.max(1, Math.round(ch * dpr));
    this._css = [cw, ch];
    this._dpr = dpr;
    if (W === this.canvas.width && H === this.canvas.height && this._rt.sketch) { this._cover(); this._draw(); return; }
    this.canvas.width = W; this.canvas.height = H;
    this._free(this._rt.sketch);
    this._rt.sketch = this._target(W, H);
    // The mask keeps what's been painted: copy it across into the new size.
    const mw = Math.min(1024, Math.ceil(W / 2)), mh = Math.max(1, Math.round(mw * H / W));
    const a = this._target(mw, mh), b = this._target(mw, mh);
    if (this._rt.m0) {
      this._pass('copy', a, { uRes: [mw, mh] }, [['uT', this._rt.m0.tex]]);
      this._free(this._rt.m0); this._free(this._rt.m1);
    }
    this._rt.m0 = a; this._rt.m1 = b;
    this._cover();
    this._sketch();
    this._draw();
  }

  _cover() {
    if (!this._img) return;
    const [cw, ch] = this._css, [iw, ih] = this._img, ca = cw / ch, ia = iw / ih;
    let sx = 1, sy = 1;
    if (ia > ca) sx = ca / ia; else sy = ia / ca;
    this._scale = [sx, sy];
    this._offs = [(1 - sx) * this.o.align[0], (1 - sy) * this.o.align[1]];
  }

  async load(src) {
    let bmp;
    if (typeof src === 'string') {
      const res = await fetch(src);
      if (!res.ok) throw new Error(`Couldn't load ${src}`);
      bmp = await createImageBitmap(await res.blob());
    } else if (src instanceof Blob) bmp = await createImageBitmap(src);
    else {
      if (src.decode) await src.decode().catch(() => {});
      bmp = await createImageBitmap(src);
    }
    if (this._disposed) return;
    // Scale to at most maxTexWidth wide; crop very tall pages (only the top is ever shown).
    const maxT = Math.min(this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE), 8192);
    const k = Math.min(1, this.o.maxTexWidth / bmp.width, maxT / bmp.width);
    const w = Math.round(bmp.width * k);
    const hCrop = Math.min(bmp.height, Math.round(bmp.width * 2.5), Math.floor(maxT / k));
    const h = Math.round(hCrop * k);
    if (k < 1 || hCrop < bmp.height) {
      const sy = Math.round((bmp.height - hCrop) * this.o.align[1]);
      const out = await createImageBitmap(bmp, 0, sy, bmp.width, hCrop, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' });
      bmp.close?.(); bmp = out;
    }
    if (this._disposed) return;
    this._bmp?.close?.();
    this._bmp = bmp;
    this._img = [bmp.width, bmp.height];
    this._paper(bmp);
    this._upload();
    this.reset();
  }

  // The page's own background tone (the commonest brightness) becomes the paper;
  // what stands out from it becomes ink.
  _paper(bmp) {
    const c = document.createElement('canvas');
    c.width = 64; c.height = Math.max(1, Math.round(64 * bmp.height / bmp.width));
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(bmp, 0, 0, c.width, c.height);
    const d = x.getImageData(0, 0, c.width, c.height).data, hist = new Array(32).fill(0);
    for (let i = 0; i < d.length; i += 4) hist[Math.min(31, ((0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 8) | 0)]++;
    const bg = (hist.indexOf(Math.max(...hist)) + 0.5) / 32;
    this._bg = bg;
    this._dir = bg > 0.45 ? 1 : -1;
    this._range = Math.max(0.3, bg > 0.45 ? bg : 1 - bg);
  }

  _upload() {
    const gl = this.gl;
    if (this._srcTex) gl.deleteTexture(this._srcTex);
    const t = this._srcTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, this._bmp);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this._seed = (this._img[0] * 7 + this._img[1] * 13) % 97 / 9.7;
    this._cover();
    this._sketch();
  }

  /** Forget the painting (for a new picture). */
  reset() {
    this._stopAuto();
    this._finishing = null;
    this.done = false;
    this._q.length = 0;
    this._cov = 0;
    this._last = null;
    this._wetUntil = 0;
    this._dirty = false;
    this._dropFence();
    if (!this._rt.m0) return;
    for (const t of [this._rt.m0, this._rt.m1]) {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, t.fb);
      this.gl.clearColor(0, 0, 0, 1); this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }
    this._draw();
  }

  _sketch() {
    if (!this._srcTex || !this._rt.sketch) return;
    const W = this.canvas.width, srcPerDev = this._img[0] * this._scale[0] / W;
    this._pass('sketch', this._rt.sketch, {
      uRes: [W, this.canvas.height], uCss: this._css, uSrcPx: this._img, uScale: this._scale, uOff: this._offs,
      uLod: Math.max(0, Math.log2(srcPerDev * this._dpr) - 0.3), uBg: this._bg, uDir: this._dir, uRange: this._range,
      uDpr: this._dpr, uSeed: this._seed, uInk: HEX(this.o.ink), uPaper: HEX(this.o.paper),
    }, [['uSrc', this._srcTex]]);
  }

  /* ---------- drawing ---------- */

  _draw(mode = this.done ? 2 : 0) {
    if (!this._srcTex || this._disposed || this._lost) return;
    this._pass('comp', null, {
      uRes: [this.canvas.width, this.canvas.height], uCss: this._css, uScale: this._scale, uOff: this._offs,
      uMode: mode, uFinish: this._finishing ? this._finishing.f : 0, uGold: this.o.goldEdge ? 1 : 0,
      uDpr: this._dpr, uGoldC: HEX(this.o.gold),
    }, [['uSketch', this._rt.sketch.tex], ['uSrc', this._srcTex], ['uMask', this._rt.m0.tex]]);
  }

  /** Draws the pure sketch once (for stills). The next paint redraws normally. */
  renderSketchOnly() { this._draw(1); }

  _kick() { if (!this._raf && !this._disposed && !this._lost) this._raf = requestAnimationFrame(this._frame); }

  _frame(now) {
    this._raf = 0;
    if (this.done || !this._srcTex) return;
    const dt = Math.min(100, now - (this._t || now)) || 16;
    this._t = now;
    if (this._auto) this._stepAuto(now);
    const fin = this._finishing;
    if (fin) fin.f = fin.ms ? Math.min(1, (now - fin.t0) / fin.ms) : 1;
    const wet = now < this._wetUntil;
    if (this._q.length || wet || fin) {
      do {
        const n = Math.min(32, this._q.length), sp = new Float32Array(128);
        for (let i = 0; i < n; i++) sp.set(this._q[i], i * 4);
        this._q.splice(0, n);
        const [a, b] = [this._rt.m0, this._rt.m1];
        this._pass('mask', b, {
          uRes: [b.w, b.h], uMRes: [b.w, b.h], uCss: this._css, uSp: sp, uN: n,
          uDry: Math.pow(0.86, dt / 16.7), uFlood: fin ? fin.f * fin.f : 0,
        }, [['uPrev', a.tex]]);
        this._rt.m0 = b; this._rt.m1 = a;
      } while (this._q.length);
      this._dirty = true;
    }
    if (fin && fin.f >= 1) return this._finishNow();
    this._draw();
    if (this._fence) this._measure(now);
    else if (this._dirty && (now - (this._covT || 0) > 250 || !(this._auto || wet || fin))) this._measure(now);
    if (this.done) return;
    if (this._auto || this._q.length || fin || now < this._wetUntil || this._fence || this._dirty) this._kick();
  }

  // Coverage is read back from a tiny copy of the mask through a pixel buffer and a
  // fence, a frame or two later, so the GPU never stalls.
  _measure(now) {
    const gl = this.gl, c = this._rt.cov;
    if (this._fence) {
      const st = gl.clientWaitSync(this._fence, 0, 0);
      if (st !== gl.ALREADY_SIGNALED && st !== gl.CONDITION_SATISFIED) return;
      const px = new Uint8Array(c.w * c.h * 4);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this._pbo);
      gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, px);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
      this._dropFence();
      return this._covFrom(px);
    }
    this._covT = now; this._dirty = false;
    this._pass('cov', c, { uRes: [c.w, c.h], uCRes: [c.w, c.h] }, [['uMask', this._rt.m0.tex]]);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this._pbo);
    gl.bufferData(gl.PIXEL_PACK_BUFFER, c.w * c.h * 4, gl.STREAM_READ);
    gl.readPixels(0, 0, c.w, c.h, gl.RGBA, gl.UNSIGNED_BYTE, 0);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    this._fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
  }

  _dropFence() { if (this._fence) { this.gl.deleteSync(this._fence); this._fence = null; } }

  _covFrom(px) {
    const c = this._rt.cov;
    let sum = 0;
    for (let i = 0; i < px.length; i += 4) sum += px[i];
    this._cov = Math.max(this._cov, sum / (255 * c.w * c.h));
    this.o.onCoverage?.(this._cov);
    if (this._cov > 0.98 && !this._finishing) this.finish(350);
  }

  /** Revealed fraction 0..1, as last measured (about 4 times a second while painting). */
  coverage() { return this.done ? 1 : this._cov; }

  _splat(x, y, r, strength = 1) {
    const [cw, ch] = this._css;
    this._q.push([x / cw, 1 - y / ch, r, strength]);
    this._wetUntil = performance.now() + 900;
    this._kick();
  }

  // Stamps along the segment from the last point so fast strokes leave no gaps.
  _stroke(x, y, r, last) {
    if (last) {
      const dx = x - last[0], dy = y - last[1], d = Math.hypot(dx, dy), step = Math.max(2, r * 0.3), n = Math.min(64, Math.ceil(d / step));
      for (let i = 1; i <= n; i++) this._splat(last[0] + dx * i / n, last[1] + dy * i / n, r);
    } else this._splat(x, y, r);
  }

  _base() { return this.o.brush || 0.09 * Math.min(...this._css); }

  /** The visitor's brush. x, y in CSS px from the canvas's top left; vx, vy in CSS px per ms. */
  paintAt(x, y, vx, vy) {
    if (this.done || !this._srcTex || this._finishing) return;
    this._stopAuto();
    const now = performance.now(), last = this._last && now - this._last[2] < 120 ? this._last : null;
    if (vx == null) {
      const dt = last ? Math.max(8, now - last[2]) : 16;
      vx = last ? (x - last[0]) / dt : 0; vy = last ? (y - last[1]) / dt : 0;
    }
    const sp = Math.hypot(vx, vy), k = Math.min(1, Math.max(0, (sp - 0.2) / 2.3));
    this._stroke(x, y, this._base() * (0.7 + 0.65 * k * k * (3 - 2 * k)), last);
    this._last = [x, y, now];
  }

  /* ---------- the brush that paints by itself ---------- */

  autoPaint(ms = 2000) {
    if (this.done || !this._srcTex || this._finishing) return;
    const [W, H] = this._css, base = 0.16 * Math.min(W, H) + 0.04 * Math.max(W, H);
    // Loose diagonal sweeps, top left to bottom right, rising slightly to the right.
    const th = -0.38, d = [Math.cos(th), Math.sin(th)], n = [-d[1], d[0]];
    const corners = [[0, 0], [W, 0], [0, H], [W, H]];
    const vs = corners.map(([x, y]) => x * n[0] + y * n[1]);
    const v0 = Math.min(...vs) + base * 0.55, v1 = Math.max(...vs) - base * 0.55;
    const passes = Math.max(2, Math.ceil((v1 - v0) / (base * 1.12)) + 1);
    let rnd = 7;
    const rand = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
    const inset = base * 0.35, pts = [];
    for (let j = 0; j < passes; j++) {
      const v = v0 + (v1 - v0) * j / (passes - 1);
      // Where this line crosses the inset rectangle.
      let lo = -1e9, hi = 1e9;
      const P = [v * n[0], v * n[1]];
      [[0, inset, W - inset], [1, inset, H - inset]].forEach(([ax, a, b]) => {
        if (Math.abs(d[ax]) < 1e-6) return;
        const t0 = (a - P[ax]) / d[ax], t1 = (b - P[ax]) / d[ax];
        lo = Math.max(lo, Math.min(t0, t1)); hi = Math.min(hi, Math.max(t0, t1));
      });
      if (hi < lo) { const m = (lo + hi) / 2; lo = hi = m; }
      const seg = [lo, (lo * 2 + hi) / 3, (lo + hi * 2) / 3, hi];
      if (j % 2) seg.reverse();
      seg.forEach((t, i) => {
        const bow = (i === 1 || i === 2) ? (rand() - 0.5) * base * 0.5 : 0;
        pts.push([P[0] + d[0] * t + n[0] * bow, P[1] + d[1] * t + n[1] * bow]);
      });
    }
    // Dense Catmull-Rom polyline; time per step grows on bends, so the hand slows at turns.
    const poly = [], w = [];
    const at = (i) => pts[Math.max(0, Math.min(pts.length - 1, i))];
    for (let i = 0; i < pts.length - 1; i++) {
      const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
      for (let s = 0; s < 24; s++) {
        const t = s / 24, t2 = t * t, t3 = t2 * t;
        poly.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t3)));
      }
    }
    poly.push(pts[pts.length - 1]);
    let total = 0;
    const T = [0];
    for (let i = 1; i < poly.length; i++) {
      const a = poly[i - 1], b = poly[i], c = poly[i + 1] || b;
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const turn = Math.abs(Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0])) % (2 * Math.PI);
      total += l * (1 + 6 * Math.min(turn, 2 * Math.PI - turn));
      T.push(total);
    }
    this._auto = { t0: performance.now(), ms: ms * 0.8, finMs: ms * 0.25, poly, T, total, i: 0, base, last: null };
    this._kick();
  }

  _stopAuto() { this._auto = null; }

  _stepAuto(now) {
    const a = this._auto, x = Math.min(1, (now - a.t0) / a.ms);
    const e = x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    const target = (0.35 * x + 0.65 * e) * a.total;
    while (a.i < a.poly.length - 1 && a.T[a.i + 1] <= target) {
      a.i++;
      const p = a.poly[a.i], q = a.last;
      const sp = q ? Math.hypot(p[0] - q[0], p[1] - q[1]) / Math.max(1, (a.T[a.i] - (q[2] || 0)) / a.total * a.ms) : 1;
      const k = Math.min(1, sp / 3);
      this._stroke(p[0], p[1], a.base * (0.78 + 0.3 * k), q);
      a.last = [p[0], p[1], a.T[a.i]];
    }
    if (x >= 1) { this._auto = null; this.finish(a.finMs); }
  }

  /** Completes the painting smoothly: the reveal floods out from what's painted. */
  finish(ms = 700) {
    if (this.done) return Promise.resolve();
    if (!this._finishing) {
      this._stopAuto();
      if (this._cov < 0.02 && this._css) this._splat(this._css[0] / 2, this._css[1] * 0.45, 0.3 * Math.min(...this._css));
      this._finishing = { t0: performance.now(), ms, f: 0, p: null };
      this._finishing.p = new Promise((res) => (this._finishing.res = res));
    }
    this._kick();
    return this._finishing.p;
  }

  _finishNow() {
    const fin = this._finishing;
    this._stopAuto();
    this._finishing = null;
    const was = this.done;
    this.done = true;
    this._cov = 1;
    this._dropFence();
    cancelAnimationFrame(this._raf); this._raf = 0;
    this._draw(2);
    fin?.res?.();
    if (!was) { this.o.onCoverage?.(1); this.o.onDone?.(); }
  }

  /** The pure sketch at canvas size, as an image file. */
  async toBlob(type = 'image/webp', quality = 0.92) {
    const gl = this.gl, t = this._rt.sketch, px = new Uint8ClampedArray(t.w * t.h * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
    gl.readPixels(0, 0, t.w, t.h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const flip = new Uint8ClampedArray(px.length), row = t.w * 4;
    for (let y = 0; y < t.h; y++) flip.set(px.subarray(y * row, (y + 1) * row), (t.h - 1 - y) * row);
    const c = document.createElement('canvas');
    c.width = t.w; c.height = t.h;
    c.getContext('2d').putImageData(new ImageData(flip, t.w, t.h), 0, 0);
    return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), type, quality));
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    cancelAnimationFrame(this._raf); this._raf = 0;
    this._ro?.disconnect();
    this._off.forEach((f) => f()); this._off = [];
    const gl = this.gl;
    if (gl && !gl.isContextLost()) {
      Object.values(this._rt).forEach((t) => this._free(t));
      Object.values(this._P).forEach(({ p }) => gl.deleteProgram(p));
      gl.deleteTexture(this._srcTex); gl.deleteVertexArray(this._vao); gl.deleteBuffer(this._pbo);
      if (this._fence) gl.deleteSync(this._fence);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    this._bmp?.close?.();
    this._rt = {}; this._bmp = this._srcTex = this.gl = null;
    if (this._finishing) this._finishing.res?.();
  }
}
