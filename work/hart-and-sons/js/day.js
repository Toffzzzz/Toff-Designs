/*
 * Hart & Sons: "What happens on the day". A copper pipe runs through four fittings, one per
 * stop; it draws itself as you scroll on laptops (only forward) and by itself on phones,
 * and each stop's words appear as the pipe reaches its fitting. Reduced motion: all drawn.
 */
export function initDay(motion) {
  const run = document.querySelector('[data-day-run]');
  if (!run) return;
  const svg = run.querySelector('[data-day-pipe]');
  const paths = Array.from(svg.querySelectorAll('path'));
  const stops = Array.from(run.querySelectorAll('[data-stop]'));
  let fracs = stops.map((_, i) => i / Math.max(1, stops.length - 1));
  let progress = 0;

  function layout() {
    const box = run.getBoundingClientRect();
    if (!box.width) return;
    const pts = stops.map((s) => {
      const f = s.querySelector('.stop__fit');
      // Measure without the stop's entrance offset.
      const r = f.getBoundingClientRect();
      const shift = parseFloat(getComputedStyle(s).transform.split(',')[5]) || 0;
      return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top - shift];
    });
    svg.setAttribute('viewBox', `0 0 ${box.width.toFixed(1)} ${box.height.toFixed(1)}`);
    const horizontal = pts.length > 1 && pts[1][0] - pts[0][0] > 20;
    let d;
    const R = 16;
    if (horizontal) {
      d = `M0 ${pts[0][1].toFixed(1)}H${pts[0][0].toFixed(1)}`;
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1];
        const [x1, y1] = pts[i];
        if (Math.abs(y1 - y0) < 1) { d += `H${x1.toFixed(1)}`; continue; }
        const mx = (x0 + x1) / 2;
        const s = Math.sign(y1 - y0);
        d += `H${(mx - R).toFixed(1)}Q${mx.toFixed(1)} ${y0.toFixed(1)} ${mx.toFixed(1)} ${(y0 + s * R).toFixed(1)}`
          + `V${(y1 - s * R).toFixed(1)}Q${mx.toFixed(1)} ${y1.toFixed(1)} ${(mx + R).toFixed(1)} ${y1.toFixed(1)}H${x1.toFixed(1)}`;
      }
      d += `H${box.width.toFixed(1)}`;
      fracs = pts.map(([x]) => x / box.width);
    } else {
      const top = pts[0][1];
      const bottom = pts[pts.length - 1][1];
      d = `M${pts[0][0].toFixed(1)} ${(top - 24).toFixed(1)}V${(bottom + 24).toFixed(1)}`;
      fracs = pts.map(([, y]) => (y - top + 24) / (bottom - top + 48));
    }
    for (const p of paths) p.setAttribute('d', d);
    apply(progress);
  }

  function apply(p) {
    progress = p;
    svg.style.setProperty('--p', p.toFixed(4));
    stops.forEach((s, i) => { if (p > 0 && p >= fracs[i] - 0.02) s.classList.add('is-on'); });
  }

  layout();
  if ('ResizeObserver' in window) new ResizeObserver(layout).observe(run);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);

  if (!motion) { apply(1); return; }
  motion.start(run, {
    start: 0.85, end: 0.3, anchor: 0, duration: 2000, minDuration: 900,
    ease: motion.ease.inOut,
    onProgress: (p) => {
      if (p < progress) stops.forEach((s) => s.classList.remove('is-on'));   // a bfcache return starts it again
      apply(p);
    },
  });
}
