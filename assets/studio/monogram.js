/*
 * Liquid gold monogram: a molten-gold "T", ray-marched in a WebGL shader (no libraries, no 3D models).
 * The letter is a signed-distance shape that gently ripples like liquid metal, turns towards the pointer,
 * and reflects a soft midnight-and-gold surrounding. Draws only while on screen.
 *
 *   var m = Monogram.mount(document.getElementById('monogram'));   m.running()
 */
(function () {
  'use strict';
  var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FS = [
    'precision highp float;uniform vec2 R;uniform float t;uniform vec2 m;',
    'mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}',
    'float box(vec3 p,vec3 b,float r){vec3 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r;}',
    'float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}',
    'float map(vec3 p){',
    '  p.xz*=rot(m.x*.6+sin(t*.35)*.18);p.yz*=rot(-m.y*.35+cos(t*.3)*.08);',
    '  float w=sin(p.y*3.1+t*1.6)*.016+sin(p.x*4.2-t*1.3)*.013;',          // the liquid ripple
    '  float bar=box(p-vec3(0.,.70,0.),vec3(.80,.075,.11),.03);',
    '  float sl=box(p-vec3(-.75,.58,0.),vec3(.05,.17,.11),.025),sr=box(p-vec3(.75,.58,0.),vec3(.05,.17,.11),.025);',   // the serifs hanging from the bar
    '  float stem=box(p-vec3(0.,-.08,0.),vec3(.13,.78,.11),.03);',
    '  float foot=box(p-vec3(0.,-.84,0.),vec3(.36,.05,.11),.03);',
    '  float d=smin(bar,stem,.12);d=smin(d,min(sl,sr),.06);d=smin(d,foot,.12);',
    '  return d+w;}',
    'vec3 nrm(vec3 p){vec2 e=vec2(.0015,0.);return normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));}',
    'vec3 env(vec3 d){float y=d.y*.5+.5;vec3 sky=mix(vec3(.04,.05,.09),vec3(.42,.38,.36),smoothstep(.2,.9,y));',
    '  sky+=vec3(1.,.82,.5)*pow(max(dot(d,normalize(vec3(.6,.7,.4))),0.),24.)*2.2;',
    '  sky+=vec3(.9,.7,.45)*pow(max(dot(d,normalize(vec3(-.7,.2,.6))),0.),8.)*.5;',
    '  sky+=vec3(1.,.93,.82)*smoothstep(.26,.2,abs(d.x-.4))*smoothstep(.42,.36,abs(d.y-.3))*1.1;',     // a soft studio light up and to the right
    '  sky+=vec3(.9,.75,.55)*smoothstep(-.55,-.8,d.x)*.6;return sky;}',                                       // and a warm rim from the left
    'void main(){vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;vec3 ro=vec3(0.,0.,4.3),rd=normalize(vec3(uv,-1.75));',
    '  float d=0.,h,mn=1e3;bool hit=false;for(int i=0;i<72;i++){h=map(ro+rd*d);mn=min(mn,h);if(h<.001){hit=true;break;}d+=h*.9;if(d>8.)break;}',
    '  if(!hit){float a=smoothstep(.014,.0,mn)*.55;gl_FragColor=vec4(.62,.47,.26,a);return;}',
    '  vec3 p=ro+rd*d,n=nrm(p),r=reflect(rd,n);float fr=pow(1.-max(dot(n,-rd),0.),3.);',
    '  vec3 gold=vec3(1.,.72,.3);vec3 c=env(r)*mix(gold,vec3(1.),fr*.5)*1.25;',
    '  c+=gold*.22*max(dot(n,normalize(vec3(.4,.8,.6))),0.);',
    '  c=c/(1.+c);c=pow(c,vec3(.85));gl_FragColor=vec4(c,1.);}'
  ].join('\n');

  function mount(host, options) {
    var o = options || {};
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var none = { running: function () { return false; }, enabled: false };
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) return none;
    var canvas = document.createElement('canvas'); canvas.className = 'mg-canvas'; canvas.setAttribute('aria-hidden', 'true');
    var gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false });
    if (!gl) return none;
    function sh(tp, s) { var x = gl.createShader(tp); gl.shaderSource(x, s); gl.compileShader(x); return x; }
    var prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return none;
    host.appendChild(canvas); gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var uR = gl.getUniformLocation(prog, 'R'), uT = gl.getUniformLocation(prog, 't'), uM = gl.getUniformLocation(prog, 'm');
    function size() { var r = host.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, o.maxDpr || 1.25); canvas.width = Math.max(2, Math.round(r.width * d)); canvas.height = Math.max(2, Math.round(r.height * d)); gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(uR, canvas.width, canvas.height); }
    size(); if ('ResizeObserver' in window) new ResizeObserver(size).observe(host);
    var tx = 0, ty = 0, mx = 0, my = 0, visible = false, raf = 0, t0 = performance.now(), frames = 0;
    window.addEventListener('pointermove', function (e) { var r = host.getBoundingClientRect(); tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2))); ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2))); }, { passive: true });
    function draw(now) { mx += (tx - mx) * 0.06; my += (ty - my) * 0.06; gl.uniform1f(uT, reduce ? 2.0 : (now - t0) / 1000); gl.uniform2f(uM, mx, my); gl.drawArrays(gl.TRIANGLES, 0, 3); frames++; }
    function frame(now) { raf = 0; if (!visible || document.hidden) return; draw(now); if (!reduce) raf = requestAnimationFrame(frame); }
    function start() { if (!raf) raf = requestAnimationFrame(frame); }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); }, { threshold: 0 }).observe(host);
    else { visible = true; start(); }
    document.addEventListener('visibilitychange', function () { if (!document.hidden && visible) start(); });
    return { enabled: true, running: function () { return !!raf; }, frames: function () { return frames; } };
  }
  window.Monogram = { mount: mount };
})();
