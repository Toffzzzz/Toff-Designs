/*
 * Fluid: liquid gold ink in midnight water, simulated on the graphics card (WebGL, no libraries).
 * A real "stable fluids" solver: advection, vorticity, divergence, pressure and projection, every frame.
 * Moving the pointer stirs the water and drops ink; the pen of the InkWriter can bleed ink into it too.
 * Draws only while on screen and the tab is visible; never runs for reduced motion, low-power devices
 * or browsers without the needed WebGL support (the section simply shows its normal background).
 *
 *   var f = Fluid.mount(document.getElementById('contact-ink'));
 *   f.splat(clientX, clientY, dx, dy, strength)    f.running()    f.destroy()
 */
(function () {
  'use strict';
  var VERT = 'precision highp float;attribute vec2 aPosition;varying vec2 vUv,vL,vR,vT,vB;uniform vec2 texelSize;' +
    'void main(){vUv=aPosition*.5+.5;vL=vUv-vec2(texelSize.x,0.);vR=vUv+vec2(texelSize.x,0.);vT=vUv+vec2(0.,texelSize.y);vB=vUv-vec2(0.,texelSize.y);gl_Position=vec4(aPosition,0.,1.);}';
  var FRAG = {
    splat: 'precision highp float;varying vec2 vUv;uniform sampler2D uTarget;uniform float aspectRatio,radius;uniform vec3 color;uniform vec2 point;' +
      'void main(){vec2 p=vUv-point;p.x*=aspectRatio;vec3 s=exp(-dot(p,p)/radius)*color;gl_FragColor=vec4(texture2D(uTarget,vUv).xyz+s,1.);}',
    advect: 'precision highp float;varying vec2 vUv;uniform sampler2D uVelocity,uSource;uniform vec2 texelSize;uniform float dt,dissipation;' +
      'void main(){vec2 c=vUv-dt*texture2D(uVelocity,vUv).xy*texelSize;gl_FragColor=texture2D(uSource,c)/(1.+dissipation*dt);}',
    divergence: 'precision highp float;varying vec2 vUv,vL,vR,vT,vB;uniform sampler2D uVelocity;' +
      'void main(){float L=texture2D(uVelocity,vL).x,R=texture2D(uVelocity,vR).x,T=texture2D(uVelocity,vT).y,B=texture2D(uVelocity,vB).y;vec2 C=texture2D(uVelocity,vUv).xy;' +
      'if(vL.x<0.)L=-C.x;if(vR.x>1.)R=-C.x;if(vT.y>1.)T=-C.y;if(vB.y<0.)B=-C.y;gl_FragColor=vec4(.5*(R-L+T-B),0.,0.,1.);}',
    curl: 'precision highp float;varying vec2 vUv,vL,vR,vT,vB;uniform sampler2D uVelocity;' +
      'void main(){float L=texture2D(uVelocity,vL).y,R=texture2D(uVelocity,vR).y,T=texture2D(uVelocity,vT).x,B=texture2D(uVelocity,vB).x;gl_FragColor=vec4(.5*(R-L-T+B),0.,0.,1.);}',
    vorticity: 'precision highp float;varying vec2 vUv,vL,vR,vT,vB;uniform sampler2D uVelocity,uCurl;uniform float curl,dt;' +
      'void main(){float L=texture2D(uCurl,vL).x,R=texture2D(uCurl,vR).x,T=texture2D(uCurl,vT).x,B=texture2D(uCurl,vB).x,C=texture2D(uCurl,vUv).x;' +
      'vec2 f=.5*vec2(abs(T)-abs(B),abs(R)-abs(L));f/=length(f)+.0001;f*=curl*C;f.y*=-1.;vec2 v=texture2D(uVelocity,vUv).xy+f*dt;gl_FragColor=vec4(clamp(v,-1000.,1000.),0.,1.);}',
    pressure: 'precision highp float;varying vec2 vUv,vL,vR,vT,vB;uniform sampler2D uPressure,uDivergence;' +
      'void main(){float L=texture2D(uPressure,vL).x,R=texture2D(uPressure,vR).x,T=texture2D(uPressure,vT).x,B=texture2D(uPressure,vB).x;gl_FragColor=vec4((L+R+B+T-texture2D(uDivergence,vUv).x)*.25,0.,0.,1.);}',
    gradient: 'precision highp float;varying vec2 vUv,vL,vR,vT,vB;uniform sampler2D uPressure,uVelocity;' +
      'void main(){float L=texture2D(uPressure,vL).x,R=texture2D(uPressure,vR).x,T=texture2D(uPressure,vT).x,B=texture2D(uPressure,vB).x;vec2 v=texture2D(uVelocity,vUv).xy-vec2(R-L,T-B);gl_FragColor=vec4(v,0.,1.);}',
    clear: 'precision highp float;varying vec2 vUv;uniform sampler2D uTexture;uniform float value;void main(){gl_FragColor=value*texture2D(uTexture,vUv);}',
    display: 'precision highp float;varying vec2 vUv;uniform sampler2D uTexture;' +
      'void main(){vec3 c=texture2D(uTexture,vUv).rgb;c=c/(1.+c)*.85;float a=clamp(max(c.r,max(c.g,c.b))*1.15,0.,1.);gl_FragColor=vec4(c,a);}'
  };

  function mount(host, options) {
    var o = options || {};
    var none = { running: function () { return false; }, splat: function () {}, destroy: function () {}, enabled: false };
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2)) return none;
    var canvas = document.createElement('canvas'); canvas.className = 'fl-canvas'; canvas.setAttribute('aria-hidden', 'true');
    var params = { alpha: true, depth: false, stencil: false, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'low-power' };
    var gl = canvas.getContext('webgl2', params), isGL2 = !!gl;
    if (!gl) gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
    if (!gl) return none;
    var halfType, internal, format = gl.RGBA, filter = gl.LINEAR;
    if (isGL2) { if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) return none; halfType = gl.HALF_FLOAT; internal = gl.RGBA16F; }
    else { var hf = gl.getExtension('OES_texture_half_float'); if (!hf) return none; halfType = hf.HALF_FLOAT_OES; internal = gl.RGBA; if (!gl.getExtension('OES_texture_half_float_linear')) filter = gl.NEAREST; }

    function compile(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
    var vs;
    try { vs = compile(gl.VERTEX_SHADER, VERT); } catch (e) { return none; }
    var P = {};
    try {
      Object.keys(FRAG).forEach(function (k) {
        var p = gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, FRAG[k]));
        gl.bindAttribLocation(p, 0, 'aPosition'); gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link');
        var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
        for (var i = 0; i < n; i++) { var name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
        P[k] = { p: p, u: u };
      });
    } catch (e) { return none; }

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0);

    function fbo(w, h) {
      gl.activeTexture(gl.TEXTURE0);
      var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, halfType, null);
      var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      return { t: t, f: f, w: w, h: h, tx: 1 / w, ty: 1 / h, attach: function (id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, t); return id; } };
    }
    function dbl(w, h) { var a = fbo(w, h), b = fbo(w, h); return { get read() { return a; }, get write() { return b; }, swap: function () { var t = a; a = b; b = t; } }; }
    function blit(target) {
      if (target) { gl.viewport(0, 0, target.w, target.h); gl.bindFramebuffer(gl.FRAMEBUFFER, target.f); }
      else { gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }
    function res(n) { var a = canvas.width / Math.max(1, canvas.height); return a > 1 ? { w: Math.round(n * a), h: n } : { w: n, h: Math.round(n / a) }; }

    host.insertBefore(canvas, host.firstChild);
    var vel, dye, div, crl, prs, simN = o.sim || 128, dyeN = o.dye || (window.innerWidth < 700 ? 384 : 640);
    function setup() {
      var r = host.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(2, Math.round(r.width * d)); canvas.height = Math.max(2, Math.round(r.height * d));
      var s = res(simN), q = res(dyeN);
      vel = dbl(s.w, s.h); dye = dbl(q.w, q.h); div = fbo(s.w, s.h); crl = fbo(s.w, s.h); prs = dbl(s.w, s.h);
    }
    // check the framebuffer really works on this device before committing to it
    try { setup(); gl.bindFramebuffer(gl.FRAMEBUFFER, vel.read.f); if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw 0; }
    catch (e) { canvas.remove(); return none; }

    function use(k, tx, ty) { gl.useProgram(P[k].p); if (P[k].u.texelSize) gl.uniform2f(P[k].u.texelSize, tx, ty); return P[k].u; }
    function splatRaw(x, y, dx, dy, col, radius) {
      var u = use('splat', vel.read.tx, vel.read.ty);
      gl.uniform1i(u.uTarget, vel.read.attach(0)); gl.uniform1f(u.aspectRatio, canvas.width / canvas.height);
      gl.uniform2f(u.point, x, y); gl.uniform3f(u.color, dx, dy, 0); gl.uniform1f(u.radius, radius / 100);
      blit(vel.write); vel.swap();
      gl.uniform1i(u.uTarget, dye.read.attach(0)); gl.uniform3f(u.color, col[0], col[1], col[2]);
      blit(dye.write); dye.swap();
    }
    var GOLD = [0.85, 0.66, 0.36];
    function step(dt) {
      gl.disable(gl.BLEND);
      var u = use('curl', vel.read.tx, vel.read.ty); gl.uniform1i(u.uVelocity, vel.read.attach(0)); blit(crl);
      u = use('vorticity', vel.read.tx, vel.read.ty); gl.uniform1i(u.uVelocity, vel.read.attach(0)); gl.uniform1i(u.uCurl, crl.attach(1)); gl.uniform1f(u.curl, 22); gl.uniform1f(u.dt, dt); blit(vel.write); vel.swap();
      u = use('divergence', vel.read.tx, vel.read.ty); gl.uniform1i(u.uVelocity, vel.read.attach(0)); blit(div);
      u = use('clear', prs.read.tx, prs.read.ty); gl.uniform1i(u.uTexture, prs.read.attach(0)); gl.uniform1f(u.value, 0.8); blit(prs.write); prs.swap();
      u = use('pressure', vel.read.tx, vel.read.ty); gl.uniform1i(u.uDivergence, div.attach(0));
      for (var i = 0; i < 18; i++) { gl.uniform1i(u.uPressure, prs.read.attach(1)); blit(prs.write); prs.swap(); }
      u = use('gradient', vel.read.tx, vel.read.ty); gl.uniform1i(u.uPressure, prs.read.attach(0)); gl.uniform1i(u.uVelocity, vel.read.attach(1)); blit(vel.write); vel.swap();
      u = use('advect', vel.read.tx, vel.read.ty); gl.uniform1i(u.uVelocity, vel.read.attach(0)); gl.uniform1i(u.uSource, vel.read.attach(0)); gl.uniform1f(u.dt, dt); gl.uniform1f(u.dissipation, 0.25); blit(vel.write); vel.swap();
      gl.uniform2f(u.texelSize, vel.read.tx, vel.read.ty);
      gl.uniform1i(u.uVelocity, vel.read.attach(0)); gl.uniform1i(u.uSource, dye.read.attach(1)); gl.uniform1f(u.dissipation, 0.95); blit(dye.write); dye.swap();
    }
    function render() {
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      var u = use('display', 0, 0); gl.uniform1i(u.uTexture, dye.read.attach(0)); blit(null);
    }

    var visible = false, raf = 0, last = 0, lastInput = 0, nextAuto = 0, frames = 0, lastPt = null, seed = 9;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    function frame(now) {
      raf = 0; if (!visible || document.hidden) return;
      var dt = Math.min(0.016667, (now - (last || now)) / 1000 || 0.016); last = now;
      if (now > nextAuto && now - lastInput > 2600) {     // gentle swirls by themselves, so the ink is always alive
        var a = rnd() * Math.PI * 2, x = 0.2 + rnd() * 0.6, y = 0.25 + rnd() * 0.5;
        splatRaw(x, y, Math.cos(a) * 220, Math.sin(a) * 220, [GOLD[0] * 0.32, GOLD[1] * 0.32, GOLD[2] * 0.32], 0.28);
        nextAuto = now + 1500 + rnd() * 1400;
      }
      step(dt); render(); frames++;
      raf = requestAnimationFrame(frame);
    }
    function start() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
    function api_splat(cx, cy, dx, dy, strength) {
      var r = canvas.getBoundingClientRect(); if (!r.width) return;
      var x = (cx - r.left) / r.width, y = 1 - (cy - r.top) / r.height; if (x < 0 || x > 1 || y < 0 || y > 1) return;
      var k = strength == null ? 1 : strength;
      splatRaw(x, y, (dx || 0) * 6, -(dy || 0) * 6, [GOLD[0] * 0.9 * k, GOLD[1] * 0.9 * k, GOLD[2] * 0.9 * k], o.radius || 0.18);
      lastInput = performance.now(); start();
    }
    function onMove(e) {
      var r = canvas.getBoundingClientRect(); if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) { lastPt = null; return; }
      if (lastPt) api_splat(e.clientX, e.clientY, e.clientX - lastPt[0], e.clientY - lastPt[1], 0.5);
      lastPt = [e.clientX, e.clientY];
    }
    window.addEventListener('pointermove', onMove, { passive: true });
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); }, { threshold: 0 }) : null;
    if (io) io.observe(host); else { visible = true; start(); }
    document.addEventListener('visibilitychange', function () { if (!document.hidden && visible) start(); });
    var ro = 'ResizeObserver' in window ? new ResizeObserver(function () { var r = host.getBoundingClientRect(); if (Math.abs(r.width * Math.min(window.devicePixelRatio || 1, 1.5) - canvas.width) > 40) setup(); }) : null;
    if (ro) ro.observe(host);
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); visible = false; });
    return {
      enabled: true, running: function () { return !!raf; }, frames: function () { return frames; }, splat: api_splat,
      destroy: function () { visible = false; if (raf) cancelAnimationFrame(raf); if (io) io.disconnect(); if (ro) ro.disconnect(); window.removeEventListener('pointermove', onMove); canvas.remove(); }
    };
  }
  window.Fluid = { mount: mount };
})();
