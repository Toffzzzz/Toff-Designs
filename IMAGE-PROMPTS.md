# Photos for the concept sites

The five concept sites are made-up businesses, so their photos may be made with an image AI. This file has every photo that would make them better, each as a prompt ready to paste into ChatGPT, with the exact file name, size and folder, and what to change on the page to use it.

**Only for the concept sites.** Never use an AI-made picture for a real person or real premises: the owner, Bluebird Wellness and Everest Climate Solutions need real photos (see the last section).

**Nothing is broken without them.** Every site already looks finished: Saltmarsh, Morrow, Atelier Wren and Hollis & Pine each use one stand-in photo, and everything else (Hart & Sons' copper pipework, the maps, Morrow's cup, Atelier Wren's hair swatches, Hollis & Pine's product drawings, Saltmarsh's room plan) is drawn in code. A new photo replaces a stand-in or adds a picture where the page has none.

## How to add them

1. Paste a prompt into ChatGPT and ask for the picture. Ask for the shape the prompt names (landscape, portrait or square); ChatGPT makes 1536×1024, 1024×1536 or 1024×1024. Keep the subject away from the edges: the script crops to the exact shape.
2. Download it into `~/Downloads/toff-round-05-images/` and rename it to the name given (only the name matters, not the extension: `saltmarsh-room.png` is fine).
3. When you have some or all of them, run:

   ```
   python3 tools/add-images.py
   ```

   It makes WebP files at the right sizes (and the smaller versions the pages use in srcset: `-1200` and `-640`), puts them in the right `img/` folder, never overwrites a file without `--force`, and lists what's still missing. `--dry-run` shows what it would do first. Photos smaller than the size asked for are enlarged, and it says so; they still look fine on most screens, but a sharper original is better for the hero pictures.
4. Make the page change under "Wiring it in" for each photo you added. Each one is a small HTML edit; where a photo needs a new place on the page (not just a new `src`), that is marked **new figure**, and it needs a line or two of CSS as well, so it's best done by Claude in a round with a screenshot check.
5. Run `python3 tests/run_all.py --suite pages --suite concepts`, look at the page at 390 and 1440, and check the site is still under 400 KB before interaction (Lighthouse). Then re-run `python3 tools/capture/hero.py <slug>` and `python3 tools/capture/concepts.py <slug>` so the home page shows the new look.

Every photo needs a short, plain `alt` text describing it (one is suggested for each). Keep `width` and `height` on every `<img>` (the sizes below), `decoding="async"`, and `loading="lazy"` for anything below the first screen.

---

## Saltmarsh (work/saltmarsh/img/)

**Art direction:** bold. A candlelit room on a weeknight: warm, low and close, with the printed menu card as the main character. Colours: near-black brown (#17110E), candle cream (#F4E8D4), warm linen (#BFA88C), ember orange (#E8804A) and a sea-green note (#8FB5A6). Light: candlelight and a single warm pendant, deep shadows, no daylight.

### saltmarsh-hero

- **File:** `saltmarsh-hero` → `saltmarsh-hero-2400.webp` (2400×1500), `saltmarsh-hero.webp` (1200×750) and `saltmarsh-hero-640.webp`
- **Shape to ask for:** landscape

```
A cinematic food photograph for a small seasonal restaurant in Bermondsey, London. Sliced duck breast with roasted carrots, a charred shallot, cherries and hazelnuts on a dark stoneware plate, freshly served, with a soft, visible curl of steam rising from it. Shot at a low three-quarter angle across a dark wooden table, candlelight from the left and one warm pendant above; a candle and a glass of red wine soft in the background. Palette of near-black brown, candle cream, warm linen and one ember-orange glint. Deep, velvety shadows, shallow depth of field, fine film grain, natural colour, no text, no logos, no people. Landscape, the plate slightly right of centre with dark space above it.
```

**Wiring it in** (`work/saltmarsh/index.html`): the steam is drawn over whatever `.hero__img` shows, so only the picture changes.
- In `<head>`, change the preload `<link rel="preload" href="img/playground-restaurant.avif" as="image" type="image/avif" fetchpriority="high">` to `<link rel="preload" as="image" href="img/saltmarsh-hero.webp" imagesrcset="img/saltmarsh-hero-640.webp 640w, img/saltmarsh-hero.webp 1200w, img/saltmarsh-hero-2400.webp 2400w" imagesizes="100vw" fetchpriority="high">`.
- In the hero (`<div class="hero__media" id="steam-stage">`), delete the line `<source srcset="img/playground-restaurant.avif" type="image/avif">`, and in the `<img class="hero__img">` set `src="img/saltmarsh-hero.webp" srcset="img/saltmarsh-hero-640.webp 640w, img/saltmarsh-hero.webp 1200w, img/saltmarsh-hero-2400.webp 2400w" sizes="100vw" width="1200" height="750"`. Keep its alt text if the dish is the same.

### saltmarsh-room

- **File:** `saltmarsh-room` → `saltmarsh-room.webp` (2400×1500), `-1200`, `-640`
- **Shape to ask for:** landscape

```
A cinematic interior photograph of a small, intimate restaurant dining room in Bermondsey, London, at about seven in the evening. Eight wooden tables with linen napkins, low candles on every table, a bare brick wall, an open kitchen pass glowing at the back, a printed menu card on one table. The room is just starting to fill: no faces visible, only the backs and hands of two diners in soft focus. Warm candlelight and a few warm pendants, deep shadows, palette of near-black brown, candle cream, warm linen and a touch of ember orange. 35mm lens, shallow depth of field, fine film grain, natural colour, no text, no logos. Landscape.
```

**Wiring it in:** **new figure** in the "Find us" section (`<section class="visit" id="visit">`), after the closing `</div>` of `<div class="visit__intro">`: `<figure class="visit__photo"><img src="img/saltmarsh-room-1200.webp" srcset="img/saltmarsh-room-640.webp 640w, img/saltmarsh-room-1200.webp 1200w, img/saltmarsh-room.webp 2400w" sizes="(min-width: 1024px) 50vw, 100vw" width="2400" height="1500" loading="lazy" decoding="async" alt="The dining room by candlelight, with the kitchen pass glowing at the back"></figure>`, with a CSS rule in `saltmarsh.css` for `.visit__photo` (full width of its column, the site's corner radius).

### saltmarsh-back-room

- **File:** `saltmarsh-back-room` → `saltmarsh-back-room.webp` (1600×1000), `-1200`, `-640`
- **Shape to ask for:** landscape

```
A cinematic photograph of a private dining room behind a restaurant kitchen, seen from the doorway: one long wooden table laid for twelve with linen, low candles down the middle, simple stoneware and wine glasses, a bare plaster wall with a single framed print, a warm pendant above. Empty of people, waiting for guests. Candlelight, deep shadows, palette of near-black brown, candle cream, warm linen, a hint of sea green in the glassware. 35mm lens, eye level, fine film grain, natural colour, no text, no logos. Landscape.
```

**Wiring it in:** **new figure** in "The back room" (`<section class="private" id="private">`), straight after `<p class="private__text">…</p>` and before `<figure class="plan">`: `<figure class="private__photo"><img src="img/saltmarsh-back-room-1200.webp" srcset="img/saltmarsh-back-room-640.webp 640w, img/saltmarsh-back-room-1200.webp 1200w, img/saltmarsh-back-room.webp 1600w" sizes="(min-width: 1024px) 45vw, 100vw" width="1600" height="1000" loading="lazy" decoding="async" alt="The back room: one long table laid for twelve, lit by candles"></figure>`, plus a `.private__photo` rule in `saltmarsh.css`. The drawn plan stays below it.

### saltmarsh-dishes-1 to saltmarsh-dishes-4

- **Files:** `saltmarsh-dishes-1`, `-2`, `-3`, `-4` → each `.webp` 1200×1200 and `-640`
- **Shape to ask for:** square

One prompt per dish; change only the first sentence.

```
A cinematic overhead food photograph, shot straight down onto a crumpled cream linen cloth on a dark wooden table: [DISH]. One plate, centred, with a little space around it, a single candle's warm light from the top left casting a soft shadow, a fork and a corner of a printed menu card at the edge. Palette of near-black brown, candle cream, warm linen and one ember-orange or sea-green accent from the food. Natural colour, fine film grain, no text, no logos, no hands. Square.
```

- `saltmarsh-dishes-1`: "smoked cod's roe with breakfast radishes and a slice of toasted sourdough, on a pale stoneware plate"
- `saltmarsh-dishes-2`: "Delica pumpkin roasted in brown butter with crisp sage leaves and hazelnuts, on a dark stoneware plate"
- `saltmarsh-dishes-3`: "hake with mussels in a cider sauce with samphire, in a shallow white bowl"
- `saltmarsh-dishes-4`: "a slice of brown butter tart with a spoon of crème fraîche, on a small speckled plate"

**Wiring it in:** **new figure**: a row of four square pictures under the menu card, after the closing `</div>` of `<div class="card" id="menu-card">` in `<section class="menu" id="menu">`: `<ul class="dishes" role="list">` with one `<li><img src="img/saltmarsh-dishes-1-640.webp" srcset="img/saltmarsh-dishes-1-640.webp 640w, img/saltmarsh-dishes-1.webp 1200w" sizes="(min-width: 1024px) 22vw, 50vw" width="1200" height="1200" loading="lazy" decoding="async" alt="Smoked cod’s roe with breakfast radishes"></li>` per dish, and a `.dishes` rule (two across on phones, four on laptops). The menu card stays the main character.

### saltmarsh-bar

- **File:** `saltmarsh-bar` → `saltmarsh-bar.webp` (1600×1067), `-1200`, `-640`
- **Shape to ask for:** landscape

```
A cinematic photograph of the small bar of a candlelit neighbourhood restaurant in Bermondsey, London: a dark wooden counter with four empty stools, bottles of wine on open shelves behind, two glasses and a carafe on the counter, a handwritten wine list chalked on a small board. Ready for walk-ins, no people. Warm candlelight and one pendant, deep shadows, palette of near-black brown, candle cream, warm linen and ember orange. 35mm lens, eye level, fine film grain, natural colour, no readable text, no logos. Landscape.
```

**Wiring it in:** **new figure** in "Book a table" (`<section class="book" id="book">`), at the end of `<div class="book__intro">`, under the line "Walk-ins are welcome at the bar.": `<figure class="book__photo"><img src="img/saltmarsh-bar-640.webp" srcset="img/saltmarsh-bar-640.webp 640w, img/saltmarsh-bar-1200.webp 1200w, img/saltmarsh-bar.webp 1600w" sizes="(min-width: 1024px) 33vw, 100vw" width="1600" height="1067" loading="lazy" decoding="async" alt="The bar, with its stools free for walk-ins"></figure>`, plus a `.book__photo` rule.

---

## Morrow Coffee (work/morrow/img/)

**Art direction:** calm. A bright corner café at half past seven: unhurried, warm, a little hand-made. Colours: crema (#F6EEE3), oat (#EBDDC9), roast brown (#2B1D14) and one terracotta accent (#A8482A). Light: soft early-morning daylight through a big window, gentle shadows.

### morrow-counter-morning

- **File:** `morrow-counter-morning` → `morrow-counter-morning.webp` (2400×1500), `-1200`, `-640`
- **Shape to ask for:** landscape

```
A cinematic photograph of the wooden counter of a small neighbourhood café in Hackney, London, at 7.30 in the morning. A flat white with simple latte art in a speckled terracotta-glazed cup on the counter, a glass dome of cardamom buns and croissants beside it, a chalk-white espresso machine soft in the background. Low, golden early-morning sunlight through a big window from the right, long soft shadows, steam from the cup. Palette of crema, oat, roast brown and one terracotta accent. Calm and unhurried. 50mm lens, shallow depth of field, natural colour, fine grain, no people, no text, no logos. Landscape, the cup left of centre with clear space above.
```

**Wiring it in** (`work/morrow/index.html`, `<figure class="hero__photo">`): in its `<img>`, set `src="img/morrow-counter-morning-1200.webp" srcset="img/morrow-counter-morning-640.webp 640w, img/morrow-counter-morning-1200.webp 1200w, img/morrow-counter-morning.webp 2400w" width="2400" height="1500"`, keep its `sizes`, and update the alt ("A flat white in a terracotta cup on the counter at half past seven, beside a dome of buns and croissants").

### morrow-long-table

- **File:** `morrow-long-table` → `morrow-long-table.webp` (1600×1200), `-1200`, `-640`
- **Shape to ask for:** landscape

```
A cinematic photograph of a long, pale oak communal table by the front window of a small Hackney café, early morning. Mismatched wooden chairs, two coffee cups and a plate of sourdough toast at one end, a folded newspaper, a small jug of wild flowers, sunlight falling across the table from the window. One person reading at the far end, seen from behind and out of focus. Palette of crema, oat, roast brown and terracotta. Soft, calm, unhurried. 35mm lens, natural colour, fine grain, no text, no logos. Landscape.
```

**Wiring it in:** **new figure** in "Order ahead" (`<section class="order" id="order">`), beside the heading block: `<figure class="order__photo"><img src="img/morrow-long-table-1200.webp" srcset="img/morrow-long-table-640.webp 640w, img/morrow-long-table-1200.webp 1200w, img/morrow-long-table.webp 1600w" sizes="(min-width: 1024px) 40vw, 100vw" width="1600" height="1200" loading="lazy" decoding="async" alt="The long table by the window, in the morning sun"></figure>`, plus a rule in `css/morrow.css`.

### morrow-bench-outside

- **File:** `morrow-bench-outside` → `morrow-bench-outside.webp` (1600×1200), `-1200`, `-640`
- **Shape to ask for:** landscape

```
A cinematic photograph of a simple wooden bench outside a small café shopfront on a quiet Hackney street, number 14 painted small on the door frame, a terracotta-painted window frame, a takeaway cup on the bench and a friendly scruffy dog lying beside it, morning light, a bicycle leaning on the railings. No faces. Palette of crema, oat, roast brown and terracotta, soft early sun. 35mm lens, natural colour, fine grain, no readable signs or logos. Landscape.
```

**Wiring it in:** **new figure** in "Find us on Elm Row" (`<section class="find" id="find">`), after the drawn map's `</figure>`: `<figure class="find__photo"><img src="img/morrow-bench-outside-1200.webp" srcset="img/morrow-bench-outside-640.webp 640w, img/morrow-bench-outside-1200.webp 1200w, img/morrow-bench-outside.webp 1600w" sizes="(min-width: 1024px) 40vw, 100vw" width="1600" height="1200" loading="lazy" decoding="async" alt="The bench outside number 14, with a dog waiting beside it"></figure>`, plus a rule in `css/morrow.css`.

### morrow-dawn-bake

- **File:** `morrow-dawn-bake` → `morrow-dawn-bake.webp` (1600×1200), `-1200`, `-640`
- **Shape to ask for:** landscape

```
A cinematic photograph of fresh sourdough loaves and a tray of cardamom buns just out of the oven in a small café kitchen before dawn, on a floured wooden bench, a little steam rising, a linen cloth and a baker's scraper beside them. Warm light from the oven and the first blue light of dawn through a small window. Palette of crema, oat, roast brown and terracotta crust. Close, tactile, quiet. 50mm lens, shallow depth of field, natural colour, fine grain, no people, no text, no logos. Landscape.
```

**Wiring it in:** **new figure** in "Food and drink" (`<section class="menu" id="menu">`), at the end of `<div class="menu__head">`: `<figure class="menu__photo"><img src="img/morrow-dawn-bake-640.webp" srcset="img/morrow-dawn-bake-640.webp 640w, img/morrow-dawn-bake-1200.webp 1200w, img/morrow-dawn-bake.webp 1600w" sizes="(min-width: 1024px) 30vw, 100vw" width="1600" height="1200" loading="lazy" decoding="async" alt="Sourdough and cardamom buns, just out of the oven"></figure>`, plus a rule in `css/morrow.css`.

---

## Atelier Wren (work/atelier-wren/img/)

**Art direction:** classic. A fashion magazine's quiet issue: big type, white space and one rose-coloured thread. Colours: warm paper white (#F4EFE7), ink black (#111111), smoke (#5E5750), a muted rose (#8A5459) and blush (#E8D6D2). Light: soft, directional morning light, editorial and still. People are shown from behind or in profile, never posed at the camera.

### aw-hero-chair

- **File:** `aw-hero-chair` → `aw-hero-chair.webp` (2400×3000), `-1200`, `-640`
- **Shape to ask for:** portrait

```
An editorial fashion-magazine photograph of a quiet four-chair hair studio in Marylebone, London: one blush leather salon chair facing a large round brass-framed mirror, a small marble shelf with a few amber bottles, a potted olive tree by a tall window. Empty, calm, early morning. Soft directional window light from the left, warm paper-white walls, ink-black details and one muted rose note. High contrast but gentle, medium format look, natural colour, fine grain, no people, no text, no logos. Portrait, the chair and mirror in the lower two thirds.
```

**Wiring it in** (`work/atelier-wren/index.html`, `<figure class="hero__pic">`): in `<img class="hero__img">`, set `src="img/aw-hero-chair-1200.webp" srcset="img/aw-hero-chair-640.webp 640w, img/aw-hero-chair-1200.webp 1200w, img/aw-hero-chair.webp 2400w" sizes="(min-width: 1024px) 45vw, 100vw" width="2400" height="3000"`, and the alt "The studio: a blush leather chair at a round brass mirror, with an olive tree by the window". The arch crops it, so check the crop at 390 and 1440.

### aw-look-soft-bob, aw-look-honey-balayage, aw-look-smooth-blow-dry, aw-look-long-layers, aw-look-copper-gloss, aw-look-soft-waves

- **Files:** one per look → each `.webp` 1600×2000, `-1200`, `-640`
- **Shape to ask for:** portrait

One prompt per look; change only the first sentence.

```
An editorial hair photograph for a magazine lookbook: [LOOK], seen from behind and slightly to one side, the model's face turned away, against a plain blush-pink plaster wall. Soft directional morning light from the left, a gentle shadow on the wall, the hair sharp and glossy, clothes a simple ink-black knit. Palette of warm paper white, ink black, blush and one muted rose. Still, precise, high-end but natural, medium format look, natural colour, fine grain, no text, no logos. Portrait, the head in the upper third.
```

- `aw-look-soft-bob`: "a short dark brown bob cut to one clean line at the jaw, the ends turned softly under"
- `aw-look-honey-balayage`: "long hair with a soft honey-blonde balayage that grows out gently from darker roots"
- `aw-look-smooth-blow-dry`: "a smooth, glossy shoulder-length blow-dry with movement at the ends"
- `aw-look-long-layers`: "long, layered chestnut hair that keeps its length, with soft face-framing layers"
- `aw-look-copper-gloss`: "shoulder-length hair in a rich copper gloss that catches the light"
- `aw-look-soft-waves`: "mid-length hair in soft, loose, brushed-out waves"

**Wiring it in:** each look's picture appears twice.
- In `work/atelier-wren/index.html`, the lookbook plate whose style has `view-transition-name: look-<slug>`: in its `<img class="plate__photo …">`, set `src="img/aw-look-<slug>-640.webp" srcset="img/aw-look-<slug>-640.webp 640w, img/aw-look-<slug>-1200.webp 1200w, img/aw-look-<slug>.webp 1600w" sizes="(min-width: 1024px) 30vw, 70vw" width="1600" height="2000"`, and on its `<span class="arch plate__arch">` change the style to `--px:50%;--py:35%;--z:1` (those values were crops of the stand-in photo). Remove the `duo-rose` or `duo-ink` class from the `<img>` if the photo should show in its own colours. Give it an alt describing the look, or keep `alt=""` (the plate's caption already names it).
- In `work/atelier-wren/looks/<slug>.html`, the `<img class="plate__photo …">` near line 71: the same change with `../img/` in front of each file name.

### aw-before and aw-after

- **Files:** `aw-before`, `aw-after` → each `.webp` 2400×1500, `-1200`, `-640`
- **Shape to ask for:** landscape. Make them as a pair, in one conversation, so the angle and light match.

```
An editorial before-and-after hair photograph, [BEFORE or AFTER]. The same woman seen from behind and slightly to the right, face turned away, in the same position against the same plain blush-pink plaster wall, in the same soft morning light from the left, wearing a simple ink-black knit. Palette of warm paper white, ink black, blush and one muted rose. Precise and honest, medium format look, natural colour, fine grain, no text, no logos. Landscape, the head centred.
```

- `aw-before`: "BEFORE: brassy, uneven shoulder-length hair with dry ends"
- `aw-after`: "AFTER: the same hair after a full colour and a cut, toned to a soft, even brown, the ends taken back to one clean line"

**Wiring it in** (`work/atelier-wren/index.html`, `<section class="ba" id="before-after">`): in `<div class="ba__layer ba__layer--before">`, set the `<img class="ba__photo">` to `src="img/aw-before-1200.webp" srcset="img/aw-before-640.webp 640w, img/aw-before-1200.webp 1200w, img/aw-before.webp 2400w" sizes="(min-width: 1024px) 60vw, 100vw" width="2400" height="1500"`; the same in `ba__layer--after` with `aw-after`. The drawn swatches over them can stay or be removed (`<svg class="swatch ba__swatch">`), whichever reads better.

### aw-stylists-ana, aw-stylists-theo, aw-stylists-isla, aw-stylists-sam

- **Files:** one per stylist → each `.webp` 1200×1500, `-640`
- **Shape to ask for:** portrait

```
An editorial portrait of [STYLIST], a hairdresser at a calm Marylebone hair studio, at work at a round brass mirror, seen in three-quarter profile and absorbed in cutting, not looking at the camera. Simple ink-black clothes, warm paper-white walls, one muted rose note in the background, soft directional morning light. Natural, unretouched skin, medium format look, natural colour, fine grain, no text, no logos. Portrait.
```

- `aw-stylists-ana`: "Ana, a woman in her thirties with a sharp dark bob"
- `aw-stylists-theo`: "Theo, a man in his thirties with short curly hair"
- `aw-stylists-isla`: "Isla, a woman in her twenties with long red hair tied back"
- `aw-stylists-sam`: "Sam, a person in their forties with short grey hair"

**Wiring it in:** **new figure** in "Four chairs, four stylists" (`<section class="studio" id="studio">`): in each `<li class="stylist">`, replace `<span class="stylist__mono" aria-hidden="true">A</span>` with `<img class="stylist__photo" src="img/aw-stylists-ana-640.webp" srcset="img/aw-stylists-ana-640.webp 640w, img/aw-stylists-ana.webp 1200w" sizes="(min-width: 1024px) 20vw, 45vw" width="1200" height="1500" loading="lazy" decoding="async" alt="">` (the name is the heading beside it), plus a `.stylist__photo` rule in `css/wren.css`.

---

## Hollis & Pine (work/hollis-and-pine/img/)

**Art direction:** fresh. A gallery shop on a bright morning: unfussy, tactile, with room to breathe. Colours: chalk white (#FAFAF7), birch (#22261F), moss (#5C6656), sage (#8A9A82), mist (#E4E9DF) and a clay accent (#9A5A43). Light: soft, diffuse northern daylight, pale shadows, Scandinavian calm.

### hero-shop-interior

- **File:** `hero-shop-interior` → `hero-shop-interior.webp` (2400×1500), `-1200`, `-640`
- **Shape to ask for:** landscape

```
A calm, cinematic interior photograph of a small independent shop in Islington, London, that sells natural-fibre clothing and hand-thrown ceramics. White walls, pale oak floor, a stone plinth with a pale stoneware vase of olive branches, a simple rail of linen and wool clothes in oat, white, moss and brown, a low shelf of bowls and mugs. Soft diffuse morning daylight from a big window, pale shadows, lots of space. Palette of chalk white, birch, sage, mist and one clay accent. Scandinavian calm, 35mm lens, natural colour, fine grain, no people, no text, no logos. Landscape.
```

**Wiring it in** (`work/hollis-and-pine/index.html`, `<figure class="hero__photo">`): in its `<img>`, set `src="img/hero-shop-interior-1200.webp" srcset="img/hero-shop-interior-640.webp 640w, img/hero-shop-interior-1200.webp 1200w, img/hero-shop-interior.webp 2400w" width="2400" height="1500"`, keep its `sizes`, and update the alt if the scene differs. Keep the `<figcaption>`.

### hearth-vase-glazes

- **File:** `hearth-vase-glazes` → `hearth-vase-glazes.webp` (2000×2000), `-1200`, `-640`
- **Shape to ask for:** square

```
A still-life product photograph of four identical hand-thrown stoneware vases in a row, each in a different glaze: matte chalk white, satin sage green, glossy clay brown, and speckled oatmeal. On a pale stone plinth against a mist-grey wall, soft diffuse daylight from the left, gentle pale shadows. Calm, tactile, honest, the clay's texture visible. 85mm lens, natural colour, fine grain, no people, no text, no logos. Square.
```

**Wiring it in:** on the product page for the Hearth vase (`work/hollis-and-pine/product.html?item=hearth-vase`), the picture is drawn by `productArt()` in `js/product.js` (`$('[data-art]').innerHTML = productArt(byId('hearth-vase'), 'chalk')`). To show the photo instead for this one product, set that element's content to `<img src="img/hearth-vase-glazes-1200.webp" srcset="img/hearth-vase-glazes-640.webp 640w, img/hearth-vase-glazes-1200.webp 1200w, img/hearth-vase-glazes.webp 2000w" sizes="(min-width: 1024px) 45vw, 100vw" width="2000" height="2000" alt="The Hearth vase in its four glazes: matte, satin, gloss and speckled">` when the item is `hearth-vase`. The 3D vase on the home page stays as it is.

### maker-maren-holt, field-linen-detail, ruth-okafor-knit

- **Files:** each `.webp` 1600×2000, `-1200`, `-640`
- **Shape to ask for:** portrait

`maker-maren-holt`:

```
A documentary photograph of a potter's hands at a kick wheel, throwing a tall stoneware vase, wet clay on the fingers, in a small bright studio in Walthamstow; shelves of drying pots behind, soft in focus. Soft diffuse daylight, palette of chalk white, birch, sage and clay. Close and tactile, no face, 50mm lens, natural colour, fine grain, no text, no logos. Portrait.
```

`field-linen-detail`:

```
A close documentary photograph of natural linen being cut and sewn in a small workshop in Leicester: an oat-coloured linen shirt on a cutting table, chalk marks, pins, a pair of tailor's shears, a hand smoothing the fabric. Soft diffuse daylight, palette of chalk white, oat, birch and moss. Tactile and calm, no face, 50mm lens, natural colour, fine grain, no text, no logos. Portrait.
```

`ruth-okafor-knit`:

```
A close documentary photograph of a hand-knitted wool jumper in a moss-green rib on a wooden table in a small studio in Hebden Bridge, a ball of undyed wool and wooden needles beside it, a hand resting on the knit. Soft diffuse daylight from a window, palette of chalk white, moss, sage and birch. Tactile and calm, no face, 50mm lens, natural colour, fine grain, no text, no logos. Portrait.
```

**Wiring it in:** the makers list ("Makers we know by name") is built in `work/hollis-and-pine/js/shop.js`, in `initMakers()`, from `MAKERS` in `js/data.js`. Add a `photo` to the three makers in `data.js` (`maren: { …, photo: 'img/maker-maren-holt' }`, `field: { …, photo: 'img/field-linen-detail' }`, `ruth: { …, photo: 'img/ruth-okafor-knit' }`), and in `initMakers()`, at the top of each `<li class="maker">`, add `${m.photo ? `<img class="maker__photo" src="${m.photo}-640.webp" srcset="${m.photo}-640.webp 640w, ${m.photo}-1200.webp 1200w, ${m.photo}.webp 1600w" sizes="(min-width: 1024px) 25vw, 60vw" width="1600" height="2000" loading="lazy" decoding="async" alt="">` : ''}`, plus a `.maker__photo` rule in `css/site.css` (**new figure**). Ewan Price has no photo yet; the list must still look even without one.

### shopfront

- **File:** `shopfront` → `shopfront.webp` (2000×1250), `-1200`, `-640`
- **Shape to ask for:** landscape

```
A calm architectural photograph of a small shopfront in a cobbled mews in Islington, London: a sage-green painted frame, a large clean window showing ceramics and folded linen inside, a simple wooden bench and a potted olive tree by the door, the shop's name kept out of view. Soft overcast morning light, palette of chalk white, sage, birch and one clay accent. Scandinavian calm, 35mm lens, straight verticals, natural colour, fine grain, no people, no readable text, no logos. Landscape.
```

**Wiring it in:** **new figure** in "Visit the shop" (`<section class="section visit" id="visit">`), after the closing `</div>` of `<div class="visit__info">`: `<figure class="visit__photo"><img src="img/shopfront-1200.webp" srcset="img/shopfront-640.webp 640w, img/shopfront-1200.webp 1200w, img/shopfront.webp 2000w" sizes="(min-width: 1024px) 50vw, 100vw" width="2000" height="1250" loading="lazy" decoding="async" alt="The shopfront on Halton Yard, with a bench and an olive tree by the door"></figure>`, plus a rule in `css/site.css`.

---

## Hart & Sons Plumbing (work/hart-and-sons/img/)

**Art direction:** practical. A well-run van: plain-spoken, organised, with numbers you can trust at a glance. Colours: charcoal (#1F2326), off-white (#F5F3EE), pewter (#565C61), steel (#B9BEC2) and copper (#9C5424, bright copper #E0915A). Light: honest overcast daylight, documentary, nothing staged or glossy. The site has no photo yet; it leads with type and drawn copper pipework, and photos should support that, not replace it.

### van-street

- **Files:** `van-street` → `van-street.webp` (2400×1600), `-1200`, `-640`, and `van-street-phone.webp` (1200×1500, a portrait crop from the same picture)
- **Shape to ask for:** landscape, with the van in the middle third so the portrait crop works

```
A documentary photograph of a clean charcoal-grey plumber's van parked on a quiet residential street of west London terraced houses in the morning, a thin copper-coloured stripe along its side and the name kept out of view, the side door open showing neatly racked copper pipe, fittings and tool boxes. Overcast daylight, wet pavement, palette of charcoal, off-white, pewter, steel and copper. Plain, trustworthy, organised. 35mm lens, eye level, natural colour, fine grain, no people, no readable text, no logos, no number plate. Landscape, the van in the middle third.
```

**Wiring it in** (`work/hart-and-sons/index.html`, the hero): **new figure**. The hero's right side is the drawn pipework (`<div class="hero__art">`); keep it. Add the photo below the hero's facts (after `</dl>` of `<dl class="hero__facts">`) as `<picture class="hero__photo"><source media="(max-width: 699px)" srcset="img/van-street-phone.webp" width="1200" height="1500"><img src="img/van-street-1200.webp" srcset="img/van-street-640.webp 640w, img/van-street-1200.webp 1200w, img/van-street.webp 2400w" sizes="(min-width: 1024px) 50vw, 100vw" width="2400" height="1600" loading="lazy" decoding="async" alt="The van on a west London street, its side door open on racked copper pipe"></picture>`, plus a rule in `css/site.css`. Keep it below the first screen so the site stays under its 400 KB budget.

### boiler-service

- **File:** `boiler-service` → `boiler-service.webp` (1600×1200), `-1200`, `-640`
- **Shape to ask for:** landscape

```
A documentary close-up photograph of a heating engineer's hands servicing a white wall-mounted gas boiler in a home kitchen, the front panel off, copper pipework and a pressure gauge below, a clean dust sheet on the worktop, a torch and a neat tool roll. Overcast daylight from a window, palette of charcoal, off-white, steel and copper. Careful, competent, unglamorous. 50mm lens, natural colour, fine grain, no face, no readable text, no logos. Landscape.
```

**Wiring it in:** **new figure** in "Prices from the list" (`<section class="prices" id="prices" data-embed-part>`), beside its heading: `<figure class="prices__photo"><img src="img/boiler-service-1200.webp" srcset="img/boiler-service-640.webp 640w, img/boiler-service-1200.webp 1200w, img/boiler-service.webp 1600w" sizes="(min-width: 1024px) 40vw, 100vw" width="1600" height="1200" loading="lazy" decoding="async" alt="A boiler being serviced, its copper pipework below"></figure>`, plus a rule. Hide it in embed mode (the AI demo's frame) with `html.is-embed .prices__photo { display: none; }`.

### on-the-day

- **File:** `on-the-day` → `on-the-day.webp` (1600×1067), `-1200`, `-640`
- **Shape to ask for:** landscape

```
A documentary photograph at the front door of a west London terraced house: a plumber's boots in blue shoe covers stepping onto a dust sheet laid over the hallway floor, a tool bag set down neatly beside it, the door open onto a grey morning. Overcast daylight, palette of charcoal, off-white, pewter and a copper-coloured tool bag strap. Respectful and tidy. 35mm lens, low angle, natural colour, fine grain, no faces, no readable text, no logos. Landscape.
```

**Wiring it in:** **new figure** in "What happens on the day" (`<section class="day" id="day">`), at the end of `<div class="day__head">`: `<figure class="day__photo"><img src="img/on-the-day-640.webp" srcset="img/on-the-day-640.webp 640w, img/on-the-day-1200.webp 1200w, img/on-the-day.webp 1600w" sizes="(min-width: 1024px) 35vw, 100vw" width="1600" height="1067" loading="lazy" decoding="async" alt="Shoe covers and a dust sheet at the front door"></figure>`, plus a rule. Keep it clear of the drawn pipe that runs down the section.

### hart-family

- **File:** `hart-family` → `hart-family.webp` (1200×1500), `-640`
- **Shape to ask for:** portrait

```
A documentary portrait of a father and his two grown sons, the plumbers of a family firm in west London, standing by the open side door of their charcoal van on a terraced street, in charcoal work clothes, relaxed and talking among themselves rather than posing, one holding a length of copper pipe. Overcast daylight, palette of charcoal, off-white, pewter and copper. Plain, warm, trustworthy, natural and unretouched. 50mm lens, natural colour, fine grain, no readable text, no logos. Portrait.
```

**Wiring it in:** **new figure** in the footer's "Call us" column, or above "Questions and answers" (`<section class="faq" id="questions">`): `<figure class="faq__photo"><img src="img/hart-family-640.webp" srcset="img/hart-family-640.webp 640w, img/hart-family.webp 1200w" sizes="(min-width: 1024px) 25vw, 70vw" width="1200" height="1500" loading="lazy" decoding="async" alt="The Harts by their van"></figure>`, plus a rule. The site never claims years in business or awards; the picture shouldn't either (no certificates, no slogans on the van).

---

## Also: SiteKit's plumber (assets/studio/playground/)

Design yours draws a plumber's site with a line drawing, because the only trades photo shows an air conditioner. This adds a photo for it.

- **File:** `playground-plumber` → `playground-plumber.webp` (1200×751)
- **Shape to ask for:** landscape

```
A documentary photograph of a plumber at work under a kitchen sink in a bright London home, seen from the shoulders down, fitting a new copper pipe joint, a neat open tool box beside them on a dust sheet. Soft daylight, natural colours, calm and competent. 35mm lens, fine grain, no face, no readable text, no logos. Landscape.
```

**Wiring it in:** in `assets/shared/sitekit.js`, the trades photo is `assets/studio/playground/playground-trades.webp` (`PHOTO_KINDS` and `DEFAULT_PHOTOS` near line 731), and SiteKit uses its line drawing for a plumber instead. Point the `trades` photo at `playground-plumber.webp` and let it be used. Then check Design yours (Pick, Trades) at 390 and 1440.

---

## Real photos to ask the clients for (case studies; not prompts)

These must be real photographs. Never make them with an AI.

### Bluebird Wellness (work/bluebird/)

- The clinic room, about 2400×1600, landscape: `work/bluebird/img/clinic-room.jpg`.
- A doctor preparing a drip, with the doctor's written consent, about 1600×2000, portrait: `work/bluebird/img/doctor.jpg`.
- Screenshots of the live site at 2×: 2880×1800 (laptop) and 1170×2532 (phone).
- A written OK to show the pencil sketch of their site.
- A short quote for Kind words, in their own words, if they're happy to give one (`testimonials` in settings.js).
- Worth mentioning to them: the live Bluebird site still shows "Placeholder" badges on its clinic photos.

### Everest Climate Solutions (work/everest/)

- A fitted unit in a real customer's room, with the customer's permission, about 2400×1600, landscape: `work/everest/img/install.jpg`.
- Screenshots of the site at 2× once it's live.
- A written OK to show the pencil sketch.
- The live address, once it's online (`links.everest` in settings.js, which replaces "Live site coming soon").
- A short quote for Kind words, if they're happy to give one.
- Worth mentioning: their local build still has [TODO] placeholders (Who we are, Areas we cover, Certifications, phone and email).

Wiring the case-study photos in is a small change to each case study's `index.html` (a new `<figure>` in the "What we built" part); ask for it in a round once the photos arrive, and run `python3 tests/run_all.py --suite pages --suite a11y` afterwards.
