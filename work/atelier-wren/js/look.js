/*
 * Atelier Wren: a look's own page. The plate arrives from the lookbook through a shared-element
 * View Transition (CSS: @view-transition, and the same view-transition-name on both pages).
 * "Back to the lookbook" goes back in history when the lookbook is the page before, so the
 * home page keeps its place and the plate flows back into it; otherwise it's an ordinary link.
 */
import { initCommon } from './common.js';

initCommon();

const back = document.querySelector('[data-back]');
if (back) {
  back.addEventListener('click', (e) => {
    const nav = window.navigation;
    if (!nav || !nav.canGoBack || !nav.currentEntry) return;
    const prev = nav.entries()[nav.currentEntry.index - 1];
    if (!prev || !prev.url) return;
    const home = new URL('../', location.href);
    const u = new URL(prev.url);
    if (u.origin === home.origin && u.pathname === home.pathname) { e.preventDefault(); history.back(); }
  });
}
