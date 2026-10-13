/*
 * Toff Studio: the concept ribbon (round-05.md Appendix A; plan section 8, risk 13).
 * "A concept site by Toff Studio. <Name> is made up." and a "Back to Toff Studio" link.
 * It sits in the normal page flow as the very last thing on the page, after the footer;
 * never fixed or sticky, so it can't cover content or controls. Keyboard: the link is
 * an ordinary link with a visible focus ring. Hidden with ?embed=<feature>.
 *
 * 1. In <head> (so the ribbon is styled with or without JavaScript):
 *      <link rel="stylesheet" href="../../assets/shared/ribbon.css">
 *    (If you forget, mountRibbon() adds it, but late.) For no flash in the AI demo's
 *    frame, also add the one-line is-embed script from embed-api.js's header.
 *
 * 2. In the HTML, as the last element of <body> before your scripts (after <footer>),
 *    write it in full so it is there without JavaScript:
 *
 *      <div data-toff-ribbon data-name="Saltmarsh" class="toff-ribbon" role="complementary" aria-label="About this site">
 *        <p class="toff-ribbon__text"><span class="toff-ribbon__line">A concept site by Toff Studio.</span>
 *          <span class="toff-ribbon__line">Saltmarsh is made up.</span></p>
 *        <a class="toff-ribbon__link" href="../../"><span class="toff-ribbon__arrow" aria-hidden="true">←</span><span class="toff-ribbon__label">Back to Toff Studio</span></a>
 *      </div>
 *
 *    (A bare <div data-toff-ribbon data-name="Saltmarsh"></div> also works; the module
 *    fills it in, but then there's nothing to see without JavaScript.)
 *
 * 3. In your module:
 *      import { mountRibbon } from '../../assets/shared/ribbon.js';
 *      mountRibbon({ name: 'Saltmarsh' });
 *
 * mountRibbon({ name, studio = 'Toff Studio', href }) -> HTMLElement
 *   Finds the first [data-toff-ribbon] (or appends one to the end of <body>), and
 *   (re)writes its contents and attributes so every site's ribbon is identical.
 *   name: the made-up business, as it should read ("Hart & Sons Plumbing"); falls back
 *         to data-name. Plain text; never parsed as HTML.
 *   href: defaults to the site root worked out from this file's own address (the same
 *         place as ../../ from work/<slug>/), so it's right from any page depth.
 *   With ?embed in the address it sets hidden on the element (ribbon.css also hides it
 *   under html.is-embed) and returns it.
 *
 * Colours: set --ribbon-bg, --ribbon-fg, --ribbon-accent on :root (or on the ribbon)
 * to fit the site; defaults are Toff's midnight #0E1628, text #F6F0E4 and gold #D8AC5F.
 * Keep text and link at 4.5 : 1 or more against the background. Optional
 * --ribbon-gutter and --ribbon-max line it up with the site's grid (see ribbon.css).
 */

const CSS_URL = new URL('./ribbon.css', import.meta.url).href;
const ROOT_URL = new URL('../../', import.meta.url).href;

function ensureStyles() {
  const linked = [...document.querySelectorAll('link[rel~="stylesheet"]')].some((l) => l.href === CSS_URL);
  if (linked) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_URL;
  document.head.appendChild(link);
}

const embedded = () => new URLSearchParams(location.search).has('embed');

export function mountRibbon({ name, studio = 'Toff Studio', href = ROOT_URL } = {}) {
  if (embedded()) document.documentElement.classList.add('is-embed');
  ensureStyles();

  let el = document.querySelector('[data-toff-ribbon]');
  if (!el) {
    el = document.createElement('div');
    el.setAttribute('data-toff-ribbon', '');
    document.body.appendChild(el);
  }

  const business = String(name || el.dataset.name || '').trim();
  if (!business) throw new TypeError('mountRibbon(): pass { name } or set data-name on [data-toff-ribbon].');
  el.dataset.name = business;
  el.classList.add('toff-ribbon');
  if (el.tagName !== 'ASIDE') el.setAttribute('role', 'complementary');
  el.setAttribute('aria-label', 'About this site');

  const line = (text) => {
    const s = document.createElement('span');
    s.className = 'toff-ribbon__line';
    s.textContent = text;
    return s;
  };
  const p = document.createElement('p');
  p.className = 'toff-ribbon__text';
  p.append(line(`A concept site by ${studio}.`), ' ', line(`${business} is made up.`));

  const a = document.createElement('a');
  a.className = 'toff-ribbon__link';
  a.href = href;
  const arrow = document.createElement('span');
  arrow.className = 'toff-ribbon__arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '←';
  const label = document.createElement('span');
  label.className = 'toff-ribbon__label';
  label.textContent = `Back to ${studio}`;
  a.append(arrow, label);

  el.replaceChildren(p, a);
  el.hidden = embedded();
  return el;
}
