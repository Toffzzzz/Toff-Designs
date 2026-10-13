/*
 * Atelier Wren: what every page shares: the concept ribbon, the phone menu, "open now",
 * today's row in the hours, and the fade-ups (motion rules from assets/shared/motion.js).
 */
import { mountRibbon } from '../../../assets/shared/ribbon.js';
import { fadeUp } from '../../../assets/shared/motion.js';
import { londonNow } from '../../../assets/shared/embed-api.js';
import { openNow } from './data.js';

export function initCommon() {
  mountRibbon({ name: 'Atelier Wren' });
  initMenu();
  paintOpenNow();
  setInterval(paintOpenNow, 60e3);
  fadeUp('[data-fade]');
}

function initMenu() {
  const dialog = document.getElementById('menu');
  const open = document.querySelector('.masthead .menu-btn');
  if (!dialog || !open || typeof dialog.showModal !== 'function') {
    if (open) open.hidden = true;   // no dialog support: the links are in the footer
    return;
  }
  open.setAttribute('aria-expanded', 'false');
  open.addEventListener('click', () => { dialog.showModal(); open.setAttribute('aria-expanded', 'true'); });
  dialog.addEventListener('close', () => { open.setAttribute('aria-expanded', 'false'); });
  dialog.querySelector('[data-close]').addEventListener('click', () => { dialog.close(); open.focus(); });
  dialog.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    const hash = a.getAttribute('href');
    if (hash && hash.startsWith('#')) {
      e.preventDefault();
      dialog.close();
      const target = document.querySelector(hash);
      if (target) {
        history.pushState(null, '', hash);
        target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
        const h = target.querySelector('h2, h1');
        if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
      }
    }
  });
}

function paintOpenNow() {
  const o = openNow();
  document.querySelectorAll('[data-open-now]').forEach((el) => { el.textContent = o.text; });
  document.querySelectorAll('.hero__open').forEach((el) => el.classList.toggle('is-closed', !o.open));
  const today = londonNow().weekday;
  document.querySelectorAll('#hours [data-day]').forEach((row) => row.classList.toggle('is-today', row.dataset.day === today));
}
