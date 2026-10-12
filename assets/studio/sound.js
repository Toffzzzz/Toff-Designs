/*
 * Sound (off unless the visitor turns it on): everything is synthesised with the Web Audio API, no audio files.
 *   pen()   a soft pencil scratch     tick()  a tiny click for buttons     chime()  a gentle two-note bell
 *   var s = Sound.mount(buttonEl);    // the button toggles sound and remembers the choice on this device
 */
(function () {
  'use strict';
  var ctx = null, on = false, noise = null, lastPen = 0;
  function ac() {
    if (!ctx) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
    if (ctx.state === 'suspended') ctx.resume();
    if (!noise) { var len = ctx.sampleRate * 0.5; noise = ctx.createBuffer(1, len, ctx.sampleRate); var d = noise.getChannelData(0); for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; }
    return ctx;
  }
  function pen() {
    if (!on) return; var now = performance.now(); if (now - lastPen < 45) return; lastPen = now;
    var c = ac(); if (!c) return;
    var src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
    src.buffer = noise; bp.type = 'bandpass'; bp.frequency.value = 2400 + Math.random() * 1600; bp.Q.value = 1.4;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.035, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    src.connect(bp); bp.connect(g); g.connect(c.destination); src.start(t, Math.random() * 0.4, 0.12);
  }
  function tone(freq, t, dur, vol) {
    var c = ctx, o1 = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
    o1.type = 'sine'; o2.type = 'sine'; o1.frequency.value = freq; o2.frequency.value = freq * 2.756;
    var g2 = c.createGain(); g2.gain.value = 0.18;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(c.destination); o1.start(t); o2.start(t); o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  function chime() { if (!on) return; var c = ac(); if (!c) return; var t = c.currentTime; tone(784, t, 0.9, 0.05); tone(1175, t + 0.11, 1.1, 0.04); }
  function tick() { if (!on) return; var c = ac(); if (!c) return; tone(1600, c.currentTime, 0.06, 0.018); }
  function mount(btn) {
    try { on = localStorage.getItem('toff-sound') === 'on'; } catch (e) {}
    function sync() { if (!btn) return; btn.setAttribute('aria-pressed', on ? 'true' : 'false'); btn.querySelector('.snd-state').textContent = on ? 'on' : 'off'; }
    if (btn) btn.addEventListener('click', function () { on = !on; try { localStorage.setItem('toff-sound', on ? 'on' : 'off'); } catch (e) {} sync(); if (on) { ac(); chime(); } });
    sync();
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('button, .pg-chip, .as-chip') && !(btn && btn.contains(e.target))) tick(); }, true);
    ['toff:design', 'toff:drawn'].forEach(function (ev) { document.addEventListener(ev, chime); });
    return { on: function () { return on; } };
  }
  window.Sound = { mount: mount, pen: pen, chime: chime, tick: tick, on: function () { return on; } };
})();
