/* =====================================================================
   Everest Climate Solutions — the air-conditioning animation
   ---------------------------------------------------------------------
   Copied from the Everest site's src/scripts/coolScene.js: the same
   phases, easing, colour blending, flap crossfades and whole-degree
   countdown. Only the AC animation is copied (not the Everest logo, the
   service cards or the overview that follow it there).

   What changed to fit this page (see README.md):
   - It's a plain script (window.TOFF_EVEREST) instead of an ES module,
     and reads its values from settings.js (TOFF_SETTINGS.everest).
   - The original scrubs one pinned 0 → 1 timeline. Here the page's pen
     clock calls render(progress) with progress 0 → 1 over the AC part
     only (the original's 0 → justRightEnd). On laptops that progress is
     driven by scrolling; on phones it plays by itself. It never reverses.
   - The background is set on .ev-room (behind the section) instead of the
     pinned stage.
   - The unit's move to the overview and the card deck are not used.

   Sequence, as fractions of the original pinned scroll:
     0.00 – 0.06  the background warms to peach; the unit (flap closed)
                  and "32°C" fade in
     0.06 – 0.85  cooling: 32 → 18°C in whole degrees, background warm →
                  neutral → cool, number terracotta → Deep Blue, the flap
                  opens (closed → half at 27°C, half → open at 22°C)
     0.85 – 0.88  "Room temperature" becomes "Just right"
   ===================================================================== */
(function () {
  const { gsap } = window;

  const clamp01 = gsap.utils.clamp(0, 1);
  const seg = (value, start, end) => clamp01((value - start) / (end - start));
  const easeOut = gsap.parseEase('power2.out');

  function fade(el, alpha, { hide = true } = {}) {
    el.style.opacity = alpha;
    if (hide) el.style.visibility = alpha > 0.001 ? 'visible' : 'hidden';
  }

  function move(el, x, y, scale = 1) {
    const still = Math.abs(x) < 0.01 && Math.abs(y) < 0.01 && Math.abs(scale - 1) < 0.0001;
    // No transform at all at rest, so text renders crisply
    el.style.transform = still ? 'none' : `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  }

  /**
   * scene: the section built from #tpl-everest.
   * Returns { render(progress), finalTemperature }.
   */
  function init(scene, SETTINGS) {
    const $ = (selector) => scene.querySelector(selector);

    const { from, to } = SETTINGS.temperature;
    const { phases, flap } = SETTINGS;
    const steps = from - to;

    const room = $('[data-ev-room]');
    const unit = $('[data-unit]');
    const closed = $('[data-unit-closed]');
    const half = $('[data-unit-half]');
    const open = $('[data-unit-open]');
    const readout = $('[data-readout]');
    const labelHot = $('[data-label-hot]');
    const labelCool = $('[data-label-cool]');
    const tempColour = $('[data-temp-colour]');
    const temp = $('[data-temp]');

    scene.style.setProperty('--ev-slate', SETTINGS.colors.label);
    scene.style.setProperty('--ev-ink', SETTINGS.colors.coolNumber);
    temp.textContent = from;

    const C = SETTINGS.colors;
    const warmUp = gsap.utils.interpolate(C.coolBackground, C.warmBackground);
    const coolHalf1 = gsap.utils.interpolate(C.warmBackground, C.neutralBackground);
    const coolHalf2 = gsap.utils.interpolate(C.neutralBackground, C.coolBackground);
    const numberColour = gsap.utils.interpolate(C.warmNumber, C.coolNumber);

    const cAt = (degrees) => (from - degrees) / steps; // cooling progress where `degrees` first shows
    let shownTemp = null;

    // progress: 0 → 1 over the AC part (the original's 0 → justRightEnd)
    function render(progress) {
      const t = clamp01(progress) * phases.justRightEnd;

      const intro = seg(t, 0, phases.introEnd);
      const c = seg(t, phases.introEnd, phases.coolingEnd);
      const justRight = seg(t, phases.coolingEnd, phases.justRightEnd);

      // Background: cool → warm as the unit appears, then warm → neutral → cool
      room.style.backgroundColor =
        c <= 0 ? warmUp(intro) : c < 0.5 ? coolHalf1(c * 2) : coolHalf2((c - 0.5) * 2);

      // The unit fades in, rising 24px
      const unitIn = easeOut(seg(intro, 0.3, 1));
      fade(unit, unitIn);
      move(unit, 0, 24 * (1 - unitIn));

      // The flap. Each new image fades in on top before the one underneath fades
      // out, so the unit never dims.
      const h0 = cAt(flap.half);
      const o0 = cAt(flap.open);
      const cf = flap.crossfade;
      closed.style.opacity = 1 - seg(c, h0 + cf * 0.6, h0 + cf);
      half.style.opacity = seg(c, h0, h0 + cf * 0.6) * (1 - seg(c, o0 + cf * 0.6, o0 + cf));
      open.style.opacity = seg(c, o0, o0 + cf * 0.6);

      // The number, in whole degrees. It only shows `to` once cooling is complete.
      const degrees = from - Math.min(steps, Math.floor(c * steps + 1e-6));
      if (degrees !== shownTemp) {
        temp.textContent = degrees;
        shownTemp = degrees;
      }
      tempColour.style.color = numberColour(c);
      fade(labelHot, 1 - seg(justRight, 0, 0.45));
      fade(labelCool, seg(justRight, 0.55, 1));

      // The big readout fades in, rising 24px
      const readIn = easeOut(seg(intro, 0.4, 1));
      fade(readout, readIn);
      move(readout, 0, 24 * (1 - readIn));
    }

    return { render, finalTemperature: to };
  }

  window.TOFF_EVEREST = { init };
})();
