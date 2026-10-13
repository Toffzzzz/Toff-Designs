/*
 * Hollis & Pine: what every page shares. The concept ribbon, the top bar (hides as you
 * scroll down, comes back as you scroll up), the phone menu (a full-screen dialog), the
 * basket, and the fade-ups (motion.js: they play once when reached and never reverse).
 */
import { mountRibbon } from '../../../assets/shared/ribbon.js';
import { fadeUp } from '../../../assets/shared/motion.js';
import { mountBasket } from './basket.js';

export const embedded = () => document.documentElement.classList.contains('is-embed');

function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

function topBar() {
  const bar = document.querySelector('[data-bar]');
  if (!bar) return;
  let lastY = window.scrollY, ticking = false;
  const update = () => {
    ticking = false;
    const y = window.scrollY;
    const hide = y > lastY && y > 160 && !bar.contains(document.activeElement);
    if (Math.abs(y - lastY) > 4) { bar.classList.toggle('is-hidden', hide); lastY = y; }
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  bar.addEventListener('focusin', () => bar.classList.remove('is-hidden'));
}

function phoneMenu() {
  const btn = document.querySelector('[data-open-menu]');
  const nav = document.querySelector('.nav');
  if (!btn || !nav) return;
  const links = [...nav.querySelectorAll('a')].map((a) => `<li><a href="${a.getAttribute('href')}">${a.textContent}</a></li>`).join('');
  const dlg = el(`<dialog class="menu" aria-label="Menu">
    <div class="wrap">
      <div class="menu__top"><span class="wordmark" aria-hidden="true">Hollis <span class="wordmark__amp">&amp;</span>&nbsp;Pine</span><button class="close-btn" type="button" data-close>Close</button></div>
      <nav aria-label="Main"><ul class="menu__list" role="list">${links}</ul></nav>
      <p class="menu__foot">28 Halton Yard, Islington<br>Tuesday to Saturday 10am to 6pm, Sunday 11am to 4pm</p>
    </div>
  </dialog>`);
  document.body.appendChild(dlg);
  btn.setAttribute('aria-expanded', 'false');
  btn.addEventListener('click', () => { dlg.showModal(); btn.setAttribute('aria-expanded', 'true'); dlg.querySelector('.menu__list a').focus(); });
  let followed = false;
  dlg.addEventListener('close', () => { btn.setAttribute('aria-expanded', 'false'); if (!followed) btn.focus({ preventScroll: true }); followed = false; });
  dlg.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) dlg.close();
    const a = e.target.closest('a');
    if (a) {
      // close first, then follow the link (an in-page link scrolls once the dialog is gone)
      const href = a.getAttribute('href');
      followed = true;
      if (href.startsWith('#')) {
        e.preventDefault();
        dlg.close();
        const target = document.querySelector(href);
        if (target) { target.scrollIntoView(); target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); history.replaceState(null, '', href); }
      } else dlg.close();
    }
  });
  window.matchMedia('(min-width: 900px)').addEventListener('change', (m) => { if (m.matches && dlg.open) dlg.close(); });
}

export function initSite() {
  mountRibbon({ name: 'Hollis & Pine' });
  topBar();
  phoneMenu();
  mountBasket();
}

export function fades(root = document) {
  const els = [...root.querySelectorAll('[data-fade]')].filter((e) => !e.dataset.fadeOn);
  els.forEach((e) => { e.dataset.fadeOn = '1'; });
  return fadeUp(els);
}
