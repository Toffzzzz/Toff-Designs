/*
 * Toff Studio: the page shell (round 05), shared by the home page, the case studies and the Lab.
 *
 *   <html lang="en-GB" data-base="../../" data-page="case">   data-base: the way back to the site root
 *                                                             ("./" at the root, "../../" in work/<slug>/)
 *                                                             data-page: "home", "lab", "case" or anything else
 *   <main id="main"> … </main>
 *   <footer data-shell-footer></footer>        optional: where the footer goes (otherwise it's added at the end)
 *   <script type="module">
 *     import { mount } from '../../assets/shared/shell.js';
 *     const shell = mount({ aliases: { 'selected-work': 'work' } });
 *   </script>
 *
 * What it adds
 *  - The skip link ("Skip to content"), first in the tab order, to <main>.
 *  - The top bar: "Toff Studio"; Work, AI, Design yours, The Lab; the gold "Start a project" button.
 *    Phones (under 700px): the name, "Start a project" and Menu, which opens a full-screen menu
 *    (Escape or Close shuts it and focus goes back to Menu; the rest of the page is inert while it's open).
 *    The bar hides while you scroll down and comes back as soon as you scroll up (or tab into it).
 *    Section links jump straight to the section, land just below the bar and add no #fragment; from
 *    other pages they go to {base}index.html#id, and the home page cleans the #id away on arrival.
 *  - "Start a project" (and any element with data-concierge) dispatches a cancelable
 *    CustomEvent('toff:concierge-open', { detail: { source, topic } }) on document. The concierge calls
 *    event.preventDefault() to say it has opened; if nobody does, the link simply goes to #contact on
 *    the home page (an in-page jump there, a page change elsewhere).
 *  - The footer (deep midnight, a fine gold rule above): the signature written by the pen, the name,
 *    "Start a project →", "Plan it with our helper", the two case studies, the Lab, Email, Privacy
 *    policy, other legal pages, social links, the craft line (this page's real load time and weight,
 *    and the time in London), © year, company details. Every value comes from settings.js as before.
 *  - An empty, fixed mount point for the floating button (the concierge builds the button).
 *  - The gold-line page transition: the .vt-rule element the cross-document View Transition in
 *    tokens.css needs, and transition(fn) for changes inside a page (the Lab's pieces).
 *
 * API: mount(options) -> shell
 *   options.links      [{ label, id } | { label, page }]: the bar's links (default: Work #work, AI #ai,
 *                      Design yours #design-yours, The Lab lab.html)
 *   options.aliases    { oldId: newId }: old #addresses that should land on a new section
 *   options.cleanHash  remove the #fragment after landing on a section (default true; the Lab passes false)
 *   options.jumpLinks  handle in-page #links (default true)
 *   options.footer     false to leave the footer out
 *   options.main       selector of the main content (default 'main')
 *   shell.jumpTo(id, { focus = true })       jump to a section below the bar, without a #fragment
 *   shell.openConcierge(detail) -> boolean   true if a concierge took it
 *   shell.href(id) -> string                 a link to a home-page section that works from this page
 *   shell.transition(update) -> Promise      a same-page gold-line transition (or just update())
 *   shell.bar  { el, show(), hide(), setSuppressed(bool) }   setSuppressed(true): hidden and inert (a full-screen piece)
 *   shell.menu { open(), close(), isOpen() }
 *   shell.footer, shell.floatSlot, shell.base, shell.isHome
 *   Also available to classic scripts as window.ToffShell.
 */
import { start, reducedMotion, isLaptop } from './motion.js';

export const CONCIERGE_EVENT = 'toff:concierge-open';
export const DEFAULT_LINKS = [
  { label: 'Work', id: 'work' },
  { label: 'AI', id: 'ai' },
  { label: 'Design yours', id: 'design-yours' },
  { label: 'The Lab', page: 'lab.html' },
];
const PHONE_MAX = 699;   // the phone layout of the bar (matches the 700px phone breakpoint)

const S = window.TOFF_SETTINGS || {};
const doc = document, root = doc.documentElement;
const filled = (v) => (typeof v === 'string' ? v.trim() !== '' : !!v);
function el(tag, attrs, ...kids) {
  const e = doc.createElement(tag);
  for (const k in attrs || {}) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach((c) => { if (c != null) e.append(c); });
  return e;
}
function ext(text, href) {   // an outside link: new tab, said out loud
  return el('a', { href, target: '_blank', rel: 'noopener noreferrer' }, text, el('span', { class: 'visually-hidden', text: ' (opens in a new tab)' }));
}

let mounted = null;

export function mount(options) {
  if (mounted) return mounted;
  const o = options || {};
  let base = root.getAttribute('data-base') || './';
  if (!/\/$/.test(base)) base += '/';
  const page = root.getAttribute('data-page') || '';
  const isHome = page === 'home';
  const aliases = o.aliases || {};
  const links = o.links || DEFAULT_LINKS;
  const studio = S.studioName || 'Toff Studio';
  const showPH = root.classList.contains('show-unfinished');

  const has = (id) => !!doc.getElementById(id);
  const href = (id) => (has(id) ? '#' + id : base + 'index.html#' + id);
  const linkHref = (l) => (l.page ? base + l.page : href(l.id));
  const contactHref = () => href('contact');

  /* ---------------------------------------------------------------- the concierge event */
  function openConcierge(detail) {
    const ev = new CustomEvent(CONCIERGE_EVENT, { cancelable: true, detail: Object.assign({ source: 'page' }, detail || {}) });
    return !doc.dispatchEvent(ev);   // false from dispatchEvent = the concierge called preventDefault()
  }

  /* ---------------------------------------------------------------- skip link, main, gold-line element */
  const main = doc.querySelector(o.main || 'main');
  if (main) { if (!main.id) main.id = 'main'; if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1'); }
  let skip = doc.querySelector('body > .sh-skip, body > .skip');
  if (!skip) {
    skip = el('a', { class: 'sh-skip', href: '#' + (main ? main.id : 'main') }, 'Skip to content');
    doc.body.prepend(skip);
  }
  if (!doc.querySelector('.vt-rule')) skip.after(el('div', { class: 'vt-rule', 'aria-hidden': 'true' }));

  /* ---------------------------------------------------------------- the top bar */
  const navItems = () => links.map((l) => el('li', null, el('a', { href: linkHref(l), 'data-link': l.id || l.page, 'aria-current': l.page && page && l.page.indexOf(page) === 0 ? 'page' : null }, l.label)));
  const mark = el('a', { class: 'sh-mark', href: isHome ? '#top' : base + 'index.html' }, studio);
  const nav = el('nav', { class: 'sh-nav', 'aria-label': 'Main' }, el('ul', null, navItems()));
  const cta = el('a', { class: 'sh-cta btn-gold', href: contactHref(), 'data-concierge': 'topbar' },
    el('span', { class: 'sh-cta-long' }, 'Start a project'), el('span', { class: 'sh-cta-short' }, 'Enquire'));
  const menuBtn = el('button', { class: 'sh-menu-btn', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'sh-menu' }, 'Menu');
  const barIn = el('div', { class: 'sh-bar-in' }, mark, nav, cta, menuBtn);
  const bar = el('header', { class: 'sh-bar', 'data-shell-bar': true }, barIn);

  const menuMore = el('ul', { class: 'sh-menu-more' },
    el('li', null, el('a', { href: base + 'work/bluebird/' }, 'Bluebird Wellness case study')),
    el('li', null, el('a', { href: base + 'work/everest/' }, 'Everest Climate Solutions case study')));
  const menu = el('nav', { class: 'sh-menu', id: 'sh-menu', 'aria-label': 'Main', hidden: true },
    el('ul', { class: 'sh-menu-links' }, navItems()), menuMore);
  skip.nextElementSibling && skip.nextElementSibling.classList.contains('vt-rule') ? skip.nextElementSibling.after(bar) : skip.after(bar);
  bar.after(menu);

  // hide on the way down, back on the way up
  let lastY = window.scrollY, acc = 0, hiddenBar = false, keepUntil = 0, suppressed = false;
  function setHidden(h) {
    if (h === hiddenBar) return;
    hiddenBar = h; bar.classList.toggle('is-hidden', h);
  }
  function showBar() { setHidden(false); }
  function hideBar() { if (!isMenuOpen() && !bar.contains(doc.activeElement)) setHidden(true); }
  function onScroll() {
    const y = window.scrollY, dy = y - lastY; lastY = y;
    bar.classList.toggle('is-solid', y > 8);
    if (suppressed || isMenuOpen() || bar.contains(doc.activeElement)) return;
    if (performance.now() < keepUntil) { acc = 0; return; }   // a jump has just happened: keep the bar where it is
    // "Start a project" stays visible at all times (round 04, kept in round 05), so the bar no longer
    // hides on the way down; set settings.topbar.hideOnScroll to true to bring that back.
    if (!(S.topbar && S.topbar.hideOnScroll)) { acc = 0; showBar(); return; }
    if (y < bar.offsetHeight) { acc = 0; showBar(); return; }
    if (dy > 0) { acc = Math.max(0, acc) + dy; if (acc > 12) hideBar(); }
    else if (dy < 0) { acc = Math.min(0, acc) + dy; if (acc < -8) showBar(); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  bar.addEventListener('focusin', showBar);
  onScroll();

  // the section you're reading is marked (one link at most)
  const sectionLinks = [...bar.querySelectorAll('.sh-nav a[data-link]'), ...menu.querySelectorAll('.sh-menu-links a[data-link]')]
    .filter((a) => a.getAttribute('href').charAt(0) === '#');
  let markTick = 0;
  function markCurrent() {
    markTick = 0;
    let cur = null;
    links.forEach((l) => {
      const s = l.id && doc.getElementById(l.id); if (!s) return;
      const r = s.getBoundingClientRect();
      if (r.top <= window.innerHeight * 0.4 && r.bottom > window.innerHeight * 0.2) cur = l.id;
    });
    sectionLinks.forEach((a) => { if (a.getAttribute('data-link') === cur) a.setAttribute('aria-current', 'true'); else if (a.getAttribute('aria-current') === 'true') a.removeAttribute('aria-current'); });
  }
  if (sectionLinks.length) {
    window.addEventListener('scroll', () => { if (!markTick) markTick = requestAnimationFrame(markCurrent); }, { passive: true });
    markCurrent();
  }

  /* ---------------------------------------------------------------- the full-screen menu (phones) */
  let inerted = [], closeTimer = 0;
  function isMenuOpen() { return menuBtn.getAttribute('aria-expanded') === 'true'; }
  function openMenu() {
    if (isMenuOpen()) return;
    clearTimeout(closeTimer);
    menuBtn.setAttribute('aria-expanded', 'true'); menuBtn.textContent = 'Close';
    menu.hidden = false; showBar();
    root.classList.add('sh-menu-open'); bar.classList.add('is-menu');
    inerted = [...doc.body.children].filter((c) => c !== bar && c !== menu && !c.inert && c.tagName !== 'SCRIPT');
    inerted.forEach((c) => { c.inert = true; });
    void menu.offsetWidth; menu.classList.add('is-open');
    const first = menu.querySelector('a'); if (first) first.focus({ preventScroll: true });
  }
  function closeMenu(returnFocus) {
    if (!isMenuOpen()) return;
    menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.textContent = 'Menu';
    root.classList.remove('sh-menu-open'); bar.classList.remove('is-menu');
    inerted.forEach((c) => { c.inert = false; }); inerted = [];
    menu.classList.remove('is-open');
    const hide = () => { if (!isMenuOpen()) menu.hidden = true; };
    if (reducedMotion()) hide(); else closeTimer = setTimeout(hide, 300);
    if (returnFocus) menuBtn.focus({ preventScroll: true });
  }
  menuBtn.addEventListener('click', () => (isMenuOpen() ? closeMenu(true) : openMenu()));
  doc.addEventListener('keydown', (e) => {
    if (!isMenuOpen()) return;
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); return; }
    if (e.key !== 'Tab') return;   // keep Tab inside the bar and the menu while it's open
    const f = [...bar.querySelectorAll('a[href], button'), ...menu.querySelectorAll('a[href], button')].filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    const i = f.indexOf(doc.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && (i === -1 || i === f.length - 1)) { e.preventDefault(); f[0].focus(); }
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(false); });
  const mqPhone = window.matchMedia('(max-width: ' + PHONE_MAX + 'px)');
  const onLayout = () => { if (!mqPhone.matches) closeMenu(false); };
  if (mqPhone.addEventListener) mqPhone.addEventListener('change', onLayout); else mqPhone.addListener(onLayout);

  /* ---------------------------------------------------------------- in-page jumps (no #fragment) */
  function barSpace() { return hiddenBar || suppressed ? 0 : bar.offsetHeight; }
  function jumpTo(id, opts) {
    const focus = !opts || opts.focus !== false;
    id = aliases[id] || id;
    if (id === 'top') { keepUntil = performance.now() + 500; window.scrollTo(0, 0); showBar(); return true; }
    const t = doc.getElementById(id); if (!t) return false;
    keepUntil = performance.now() + 500;
    if (!suppressed) setHidden(false);
    const y = Math.max(0, Math.round(t.getBoundingClientRect().top + window.scrollY - barSpace() - 12));
    window.scrollTo({ top: y, behavior: 'instant' });
    if (focus) {
      if (!t.hasAttribute('tabindex') && !t.matches('a[href], button, input, select, textarea')) t.setAttribute('tabindex', '-1');
      t.focus({ preventScroll: true });
    }
    return true;
  }
  if (o.jumpLinks !== false) {
    doc.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || a.hasAttribute('data-no-jump') || a.hasAttribute('data-concierge')) return;
      const id = decodeURIComponent(a.getAttribute('href').slice(1));
      if (!id || (id !== 'top' && !doc.getElementById(aliases[id] || id))) return;
      e.preventDefault();
      jumpTo(id);
    });
  }
  // anything marked data-concierge (the bar's button, the footer's links, "Ask us about an assistant →")
  doc.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('[data-concierge]'); if (!a) return;
    if (openConcierge({ source: a.getAttribute('data-concierge') || 'page', topic: a.getAttribute('data-concierge-topic') || undefined })) { e.preventDefault(); if (isMenuOpen()) closeMenu(false); return; }
    const h = a.getAttribute('href') || '';
    if (h.charAt(0) === '#' && jumpTo(h.slice(1))) e.preventDefault();
  });

  // Arriving with a #fragment (from another page, or an old address): land below the bar, then drop the fragment
  if (o.cleanHash !== false && location.hash.length > 1) {
    const raw = decodeURIComponent(location.hash.slice(1)), id = aliases[raw] || raw;
    if (doc.getElementById(id)) {
      let touched = false;
      const stop = () => { touched = true; };
      ['wheel', 'touchstart', 'keydown'].forEach((ev) => window.addEventListener(ev, stop, { once: true, passive: true }));
      jumpTo(id, { focus: false });
      try { history.replaceState(history.state, '', location.pathname + location.search); } catch (err) { /* file:// */ }
      const again = () => { if (!touched) jumpTo(id, { focus: false }); };
      if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(again);
      if (doc.readyState === 'complete') again(); else window.addEventListener('load', again, { once: true });
    }
  }

  /* ---------------------------------------------------------------- the floating-button slot */
  const floatSlot = el('div', { class: 'sh-float', 'data-shell-float': true });

  /* ---------------------------------------------------------------- the footer */
  let footer = null;
  if (o.footer !== false) {
    footer = doc.querySelector('[data-shell-footer]') || el('footer', { 'data-shell-footer': true });
    footer.classList.add('sh-footer');
    footer.replaceChildren(buildFooter());
    if (!footer.isConnected) doc.body.append(footer);
    fillCraft(footer);
    signature(footer.querySelector('.sh-ft-sign'));
  }
  doc.body.append(floatSlot);

  function buildFooter() {
    const contact = contactHref();
    const L = S.legal || {}, C = S.company || {};
    const items = [
      el('li', null, el('a', { href: base + 'work/bluebird/' }, 'Bluebird Wellness case study')),
      el('li', null, el('a', { href: base + 'work/everest/' }, 'Everest Climate Solutions case study')),
      el('li', null, el('a', { href: base + 'lab.html' }, 'The Lab'), el('span', { class: 'sh-ft-note' }, 'Experiments in what a browser can draw')),
    ];
    // Email: shown once it's set (a marked placeholder while showPlaceholders is on)
    if (filled(S.email)) items.push(el('li', null, 'Email ', el('a', { href: 'mailto:' + S.email.trim() }, S.email.trim())));
    else if (showPH) items.push(el('li', { 'data-unfinished': true }, 'Email ', el('span', { class: 'sh-ft-ph' }, 'your address here'), ' ', el('span', { class: 'sh-ph-tag' }, 'Placeholder')));
    // Privacy policy: "coming soon" until it exists; other legal pages once they exist
    if (filled(L.privacyPolicyUrl)) items.push(el('li', null, el('a', { href: L.privacyPolicyUrl }, 'Privacy policy')));
    else items.push(el('li', { 'data-unfinished': true }, 'Privacy policy ', el('span', { class: 'sh-ft-ph' }, 'coming soon')));
    [['Terms', L.termsUrl], ['Cookie policy', L.cookiesUrl]].forEach(([t, u]) => { if (filled(u)) items.push(el('li', null, el('a', { href: u }, t))); });
    const social = (S.social || []).filter((s) => s && filled(s.url) && filled(s.label));
    if (social.length) items.push(el('li', { class: 'sh-ft-social' }, social.map((s, i) => [i ? ' · ' : null, ext(s.label, s.url)])));

    const parts = [];
    if (filled(C.name)) parts.push(C.name);
    if (filled(C.number)) parts.push('Company no. ' + C.number);
    if (filled(C.address)) parts.push('Registered office: ' + C.address);
    if (filled(C.vat)) parts.push('VAT no. ' + C.vat);

    const frag = doc.createDocumentFragment();
    frag.append(
      el('div', { class: 'sh-ft-top wrap' },
        el('div', { class: 'sh-ft-main' },
          el('div', { class: 'sh-ft-sign', role: 'img', 'aria-label': 'Signed, Toff' }),
          el('p', { class: 'sh-ft-mark' }, studio),
          el('a', { class: 'sh-ft-start', href: contact, 'data-concierge': 'footer' }, el('span', null, 'Start a project'), ' ', el('span', { class: 'arrow', 'aria-hidden': 'true' }, '→')),
          el('a', { class: 'sh-ft-plan', href: contact, 'data-concierge': 'footer-helper', 'data-concierge-topic': 'plan' }, 'Plan it with our helper')),
        el('ul', { class: 'sh-ft-links' }, items)),
      el('div', { class: 'sh-ft-base wrap' },
        el('p', { class: 'sh-craft' }, 'This page loaded in ', el('span', { 'data-craft': 'load' }, 'a moment'), ' on your device and weighs ',
          el('span', { 'data-craft': 'weight' }, 'very little'), ', with ', el('span', { 'data-craft': 'external' }, 'no trackers'), '. It’s ',
          el('span', { 'data-craft': 'time' }), ' in London.'),
        el('p', { class: 'sh-ft-copy' }, '© ' + (S.copyrightYear || new Date().getFullYear()) + ' ' + studio + (filled(S.location) ? ', ' + S.location : ''),
          parts.length ? el('span', { class: 'sh-ft-company' }, parts.join(' · ')) : null)));
    return frag;
  }

  /* ---------------------------------------------------------------- the craft line (ported from assets/studio/craft.js) */
  function fillCraft(root) {
    const set = (k, v) => root.querySelectorAll('[data-craft="' + k + '"]').forEach((s) => { s.textContent = v; });
    const seconds = (ms) => (ms < 1000 ? (ms / 1000).toFixed(2) : (ms / 1000).toFixed(1));
    function measure() {
      const nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || null;
      const loadMs = nav && nav.loadEventEnd > 0 ? nav.loadEventEnd - nav.startTime : 0;
      let bytes = nav ? (nav.transferSize || nav.encodedBodySize || 0) : 0, ext = 0;
      (performance.getEntriesByType ? performance.getEntriesByType('resource') : []).forEach((r) => {
        bytes += r.transferSize || r.encodedBodySize || 0;   // cached files count at their size, so the number stays honest
        try { const u = new URL(r.name, location.href); if (/^https?:$/.test(u.protocol) && u.host !== location.host) ext++; } catch (e) { /* ignore */ }
      });
      set('load', seconds(Math.max(0, Math.round(loadMs))) + ' s');
      set('weight', Math.round(bytes / 1024) + ' KB');
      set('external', ext === 0 ? 'no trackers and nothing loaded from other websites' : ext + ' file' + (ext === 1 ? '' : 's') + ' from other websites');
    }
    if (doc.readyState === 'complete') setTimeout(measure, 0); else window.addEventListener('load', () => setTimeout(measure, 0), { once: true });
    const time = () => {
      let t = '';
      try { t = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }).format(new Date()); } catch (e) { /* ignore */ }
      set('time', t);
    };
    time();
    let timer = 0;   // keep the time current only while the footer is on screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => {
        clearInterval(timer); timer = 0;
        if (es[0].isIntersecting) { time(); timer = setInterval(time, 20000); }
      }).observe(root);
    }
  }

  /* ---------------------------------------------------------------- the signature (the pen's cursive, from inkwriter-data.js) */
  function signature(box) {
    if (!box) return;
    const NS = 'http://www.w3.org/2000/svg', SPEED = 70, LIFT = 110;   // as the footer's InkWriter: 70 units a second, 110ms pen lifts
    function draw() {
      const ph = window.INK_PHRASES && window.INK_PHRASES.signature; if (!ph) return;
      const svg = doc.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', ph.viewBox.join(' ')); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
      svg.setAttribute('fill', 'none'); svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
      const sh = doc.createElementNS(NS, 'g'), ink = doc.createElementNS(NS, 'g');
      sh.setAttribute('class', 'sh-sign-shadow'); ink.setAttribute('class', 'sh-sign-ink');
      svg.append(sh, ink); box.replaceChildren(svg);
      const strokes = ph.strokes.map((s) => {
        const a = doc.createElementNS(NS, 'path'), b = doc.createElementNS(NS, 'path');
        a.setAttribute('d', s.d); b.setAttribute('d', s.d); sh.append(a); ink.append(b);
        const L = b.getTotalLength() || s.len;
        [a, b].forEach((p) => { p.style.strokeDasharray = L + ' ' + (L + 2); p.style.strokeDashoffset = L; p.style.visibility = 'hidden'; });
        return { a, b, L };
      });
      const set = (s, f) => {
        if (f <= 0) { s.a.style.visibility = s.b.style.visibility = 'hidden'; return; }   // hidden, never a zero-length dash
        s.a.style.visibility = s.b.style.visibility = 'visible';
        const off = s.L * (1 - Math.min(1, f)); s.a.style.strokeDashoffset = off; s.b.style.strokeDashoffset = off;
      };
      const plan = []; let total = 0;
      strokes.forEach((s) => { plan.push({ s, at: total }); total += s.L / SPEED * 1000 + LIFT; });
      let raf = 0;
      start(box, {
        onPlay({ instant }) {
          if (instant) { strokes.forEach((s) => set(s, 1)); return; }
          let t0 = 0;
          const frame = (now) => {
            if (!t0) t0 = now;
            const t = now - t0;
            plan.forEach((p) => set(p.s, (t - p.at) / (p.s.L / SPEED * 1000)));
            raf = t < total ? requestAnimationFrame(frame) : 0;
            if (!raf) strokes.forEach((s) => set(s, 1));
          };
          raf = requestAnimationFrame(frame);
        },
        onReset() { cancelAnimationFrame(raf); raf = 0; strokes.forEach((s) => set(s, 0)); },
      });
    }
    if (window.INK_PHRASES) { draw(); return; }
    // load the pen's phrases only when the footer is near (about a screen ahead)
    const load = () => {
      const sc = el('script', { src: base + 'assets/studio/inkwriter-data.js' });
      sc.onload = draw; doc.head.append(sc);
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: '100% 0px 100% 0px' });
      io.observe(box);
    } else load();
  }

  /* ---------------------------------------------------------------- same-page gold-line transition */
  function transition(update) {
    if (!doc.startViewTransition || reducedMotion()) { const r = update && update(); return Promise.resolve(r); }
    return doc.startViewTransition(update).finished.catch(() => {});
  }

  mounted = {
    base, isHome, page, href, jumpTo, openConcierge, transition, footer, floatSlot, isLaptop,
    bar: {
      el: bar,
      show: showBar,
      hide: () => setHidden(true),
      setSuppressed(on) { suppressed = !!on; bar.inert = suppressed; bar.classList.toggle('is-suppressed', suppressed); if (!on) showBar(); },
    },
    menu: { open: openMenu, close: () => closeMenu(true), isOpen: isMenuOpen },
  };
  window.ToffShell = mounted;
  return mounted;
}

export default { mount, CONCIERGE_EVENT, DEFAULT_LINKS };
