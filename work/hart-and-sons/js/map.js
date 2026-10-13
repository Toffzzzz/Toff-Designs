/*
 * Hart & Sons: the coverage map (signature, part two) and the postcode check.
 * The map is inline SVG (built by scratch/hart-and-sons/build_map.py): the Thames, the
 * outline of the area and one cell per covered district. It draws itself from W2
 * Paddington out to W7 Hanwell: on laptops as you scroll (only forward), on phones by
 * itself when reached; reduced motion shows it drawn. Checking a postcode finishes the
 * drawing at once (the visitor has taken over) and marks the district.
 */
import { DISTRICTS, parsePostcode, isCovered } from './rules.js';
import { goBook } from './booking.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const seg = (p, a, b) => clamp01((p - a) / (b - a));

export function initMap(motion) {
  const svg = document.querySelector('[data-map]');
  if (!svg) return;

  // Text and stroke sizes are given in screen pixels; --u converts them to map units.
  const setUnit = (w) => { if (w > 0) svg.style.setProperty('--u', (1000 / w).toFixed(3)); };
  setUnit(svg.getBoundingClientRect().width);
  if ('ResizeObserver' in window) new ResizeObserver(([e]) => setUnit(e.contentRect.width)).observe(svg);

  const byIndex = (a, b) => Number(a.dataset.i) - Number(b.dataset.i);
  const cells = Array.from(svg.querySelectorAll('.map__cell')).sort(byIndex);
  const labels = Array.from(svg.querySelectorAll('.map__label')).sort(byIndex);
  const river = Array.from(svg.querySelectorAll('.map__river-bank, .map__river-water'));
  const riverLabel = svg.querySelector('.map__river-label');
  const outline = svg.querySelector('.map__outline');
  const marks = Array.from(svg.querySelectorAll('.map__mark'));
  const ealing = cells.findIndex((c) => c.dataset.district === 'W5');

  const STEP = 0.055, LEN = 0.22, FIRST = 0.1;
  let last = -1;
  function draw(p) {
    if (p === last) return;
    last = p;
    for (const r of river) r.style.setProperty('--p', seg(p, 0, 0.42).toFixed(4));
    if (riverLabel) riverLabel.style.setProperty('--o', seg(p, 0.3, 0.45).toFixed(3));
    if (outline) outline.style.setProperty('--p', seg(p, 0, 0.6).toFixed(4));
    cells.forEach((c, i) => {
      const a = FIRST + i * STEP;
      c.style.setProperty('--p', seg(p, a, a + LEN).toFixed(4));
      labels[i].style.setProperty('--o', seg(p, a + LEN * 0.6, a + LEN * 1.05).toFixed(3));
    });
    if (marks[0]) marks[0].style.setProperty('--o', seg(p, 0.12, 0.22).toFixed(3));
    if (marks[1]) { const a = FIRST + ealing * STEP + LEN * 0.6; marks[1].style.setProperty('--o', seg(p, a, a + 0.1).toFixed(3)); }
    svg.classList.toggle('is-drawn', p >= 1);
  }

  let handle = null;
  if (motion) {
    draw(0);
    handle = motion.start(svg, {
      start: 0.95, end: 0.45, anchor: 0, duration: 2600, minDuration: 1200,
      ease: motion.ease.inOut,
      onProgress: draw,
    });
  } else {
    draw(1);
  }

  /* The postcode check */
  const form = document.querySelector('[data-pc-form]');
  if (!form) return;
  const input = form.querySelector('input');
  const result = form.querySelector('[data-pc-result]');

  const mark = (district) => {
    for (const n of svg.querySelectorAll('.is-hit')) n.classList.remove('is-hit');
    if (!district) return;
    for (const n of svg.querySelectorAll(`[data-district="${district}"]`)) n.classList.add('is-hit');
  };
  const say = (cls, ...parts) => {
    result.className = `pc__result ${cls}`;
    result.replaceChildren(...parts);
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    input.removeAttribute('aria-invalid');
    if (handle) handle.finish();      // the visitor has taken over: show the whole map now
    const text = input.value.trim();
    if (!text) {
      mark(null);
      input.setAttribute('aria-invalid', 'true');
      say('is-error', 'Type a postcode first, like W5 2AB, or just W5.');
      return;
    }
    const { district, error } = parsePostcode(text);
    if (error) {
      mark(null);
      input.setAttribute('aria-invalid', 'true');
      say('is-error', error);
      return;
    }
    if (isCovered(district)) {
      mark(district);
      const book = document.createElement('button');
      book.type = 'button';
      book.className = 'pc__book';
      book.textContent = `Book a visit in ${district}`;
      book.addEventListener('click', () => goBook({ pc: district }));
      say('is-yes', `Yes, ${district} ${DISTRICTS[district]} is in our area. `, book);
    } else {
      mark(null);
      say('is-no', `${district} is outside our area. We cover west London from Paddington out to Ealing: W2 to W14.`);
    }
  });
  input.addEventListener('input', () => { if (input.getAttribute('aria-invalid')) input.removeAttribute('aria-invalid'); });
}
