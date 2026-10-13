/*
 * Hart & Sons Plumbing: puts the page together.
 * With ?embed=visit (the AI demo's frame) only the price list and "Book a visit" show,
 * without the menu or the concept ribbon, and nothing animates by scrolling.
 */
import { mountRibbon } from '../../../assets/shared/ribbon.js';
import { isEmbed } from '../../../assets/shared/embed-api.js';
import * as motion from '../../../assets/shared/motion.js';
import { initVisit } from './booking.js';
import { initQuote } from './quote.js';
import { initEmbed } from './embed.js';
import { initMap } from './map.js';
import { initDay } from './day.js';

mountRibbon({ name: 'Hart & Sons Plumbing' });
initVisit();
initQuote();
initEmbed();

if (isEmbed()) {
  // In the frame the hero (and its h1) is hidden: the business name becomes the page's heading.
  const name = document.querySelector('.embed-bar__name');
  const hero = document.querySelector('.hero__title');
  if (name && hero) {
    const h1 = document.createElement('h1');
    h1.className = name.className;
    h1.append(...name.childNodes);
    name.replaceWith(h1);
    const h2 = document.createElement('p');
    h2.className = hero.className;
    h2.id = hero.id;
    h2.append(...hero.childNodes);
    hero.replaceWith(h2);
  }
} else {
  initMenu();
  initPipes();
  initMap(motion);
  initDay(motion);
}

function initPipes() {
  const svg = document.querySelector('[data-pipes]');
  if (!svg) return;
  let timer = 0;
  motion.start(svg, {
    trigger: 1,
    onPlay({ instant }) {
      if (instant) { svg.classList.add('is-drawn'); return; }
      requestAnimationFrame(() => {
        svg.classList.add('is-drawing');
        timer = setTimeout(() => svg.classList.add('is-drawn'), 2200);
      });
    },
    onReset() { clearTimeout(timer); svg.classList.remove('is-drawing', 'is-drawn'); },
  });
}

function initMenu() {
  const dlg = document.getElementById('menu');
  const opener = document.querySelector('[data-menu-open]');
  if (!dlg || !opener || typeof dlg.showModal !== 'function') return;
  opener.setAttribute('aria-expanded', 'false');
  opener.addEventListener('click', () => { dlg.showModal(); opener.setAttribute('aria-expanded', 'true'); });
  dlg.querySelector('[data-menu-close]').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => opener.setAttribute('aria-expanded', 'false'));
  for (const a of dlg.querySelectorAll('a[href^="#"]')) {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) { dlg.close(); return; }
      e.preventDefault();
      dlg.close();
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      target.scrollIntoView({ behavior: motion.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    });
  }
  window.matchMedia('(min-width: 1100px)').addEventListener('change', (e) => { if (e.matches && dlg.open) dlg.close(); });
}
