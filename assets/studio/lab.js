/* The Lab page: mounts the experiments. */
(function () {
  'use strict';
  function mount(o) {
    var out = {};
    out.tb = TopBar.mount({ solid: true, cta: o.main + '#contact', links: [['Main site', o.main], ['Building itself', '#build-itself'], ['Specks', '#particles-band'], ['One line', '#one-line'], ['Liquid gold', '#liquid-gold'], ['Moving ink', '#moving-ink']] });
    out.snd = Sound.mount(document.querySelector('.snd-toggle'));
    out.bs = BuildSelf.mount(document.getElementById('build-itself'), { image: o.image || 'playground/playground-cafe.webp' });   // lab.html in the site root passes its own path
    out.pt = Particles.mount(document.getElementById('particles'), { shapes: ['text:Toff Studio', 'laptop', 'phone', 'text:T'] });
    if (out.pt.enabled) document.getElementById('particles').classList.add('is-live');
    var lg = o.logoBase || 'lab-logos/';   // lab.html in the site root passes its own path
    out.ol = OneLine.mount(document.getElementById('one-line'), { examples: [
      { label: 'A mountain badge', src: lg + 'mountain.svg' }, { label: 'A shield', src: lg + 'shield.svg' },
      { label: 'An app icon', src: lg + 'bolt.svg' }, { label: 'A café mark', src: lg + 'cup.svg' }] });
    out.mg = Monogram.mount(document.getElementById('monogram'));
    if (out.mg.enabled) document.getElementById('monogram').classList.add('is-live'); else document.getElementById('liquid-gold').classList.add('lab-off');
    out.fl = Fluid.mount(document.getElementById('lab-ink'));
    if (!out.fl.enabled) document.getElementById('moving-ink').classList.add('lab-off');
    out.sig = InkWriter.mount(document.getElementById('lab-sign'), { phrase: 'signature', speed: 60, threshold: 0.6,
      onPen: function (x, y) { Sound.pen(); if (out.fl.enabled) out.fl.splat(x, y, (Math.random() - .5) * 6, (Math.random() - .5) * 6, 0.32); } });
    out.ftSig = InkWriter.mount(document.getElementById('ft-sign'), { phrase: 'signature', speed: 70, threshold: 0.9 });
    out.kt = Kinetic.mount('.r3-h2');
    Craft.fillFooter(document.querySelector('.ft'));
    ['bs', 'pt', 'ol', 'mg', 'fl', 'sig', 'snd'].forEach(function (k) { window['__' + k] = out[k]; });
    return out;
  }
  window.Lab = { mount: mount };
})();
