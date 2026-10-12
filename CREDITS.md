# Credits and licences

Everything below is licensed for commercial use on a website. Keep this file up to date whenever a font, library or image is added.

## In use (Round 02)

### Handwriting and finale heading: Hershey cursive

The handwriting line ("You plan", "We design", "We deliver", "So... what will it be?") and the finale's "Tell us what you need" are drawn from the public-domain Hershey **cursive** single-line font (`tools/handwriting/cursive.jhf`), converted to pen strokes by `tools/handwriting/build_line.py` and `tools/handwriting/build_finale.py` (into `assets/handwriting/line-data.js` and `assets/finale/finale-data.js`). The acknowledgement below must stay with the font data (it is also in `tools/handwriting/hershey-licence.txt`):

```
USE RESTRICTION:
	This distribution of the Hershey Fonts may be used by anyone for
	any purpose, commercial or otherwise, providing that:
		1. The following acknowledgements must be distributed with
			the font data:
			- The Hershey Fonts were originally created by Dr.
				A. V. Hershey while working at the U. S.
				National Bureau of Standards.
			- The format of the Font data in this distribution
				was originally created by
					James Hurt
					Cognition, Inc.
					900 Technology Park Drive
					Billerica, MA 01821
					(mit-eddie!ci-dandelion!hurt)
		2. The font data in this distribution may be converted into
			any other format *EXCEPT* the format distributed by
			the U.S. NTIS (which organization holds the rights
			to the distribution and use of the font data in that
			particular format). Not that anybody would really
			*want* to use their format... each point is described
			in eight bytes as "xxx yyy:", where xxx and yyy are
			the coordinate values as ASCII numbers.

*PLEASE* be reassured: The legal implications of NTIS' attempt to control
a particular form of the Hershey Fonts *are* troubling. HOWEVER: We have
been endlessly and repeatedly assured by NTIS that they do not care what
we do with our version of the font data, they do not want to know about it,
they understand that we are distributing this information all over the world,
etc etc etc... but because it isn't in their *exact* distribution format, they
just don't care!!! So go ahead and use the data with a clear conscience! (If
```

### Text fonts (self-hosted in `fonts/`)

- **Cormorant Garamond** (weights 300 and 400, 400 italic), Copyright 2015 the Cormorant Project Authors (github.com/CatharsisFonts/Cormorant), SIL Open Font License 1.1. Downloaded from the official Google Fonts repository (github.com/google/fonts, `ofl/cormorantgaramond`), cut to the weights used and to Latin characters, saved as woff2. Licence: `fonts/cormorant-garamond/OFL.txt`.
- **Inter** (weights 400 and 500), Copyright 2020 The Inter Project Authors (github.com/rsms/inter), SIL Open Font License 1.1. Downloaded from the official Google Fonts repository (`ofl/inter`), cut to the weights used and to Latin characters, saved as woff2. Licence: `fonts/inter/OFL.txt`.

### Images

- `assets/showcase/ac-closed.png`, `assets/showcase/ac-open.png`: the air-conditioning unit, from the Everest Climate Solutions site (the owner's client project), supplied with the round 02 files.
- The Bluebird Wellness face drawing inside `assets/showcase/showcase.html` and `assets/enquiry/style-picker.html`: from `assets/face-line.svg`, supplied by the owner (round 01).
- `favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `og-image.png`: made for this site by `tools/make-icons.py` from the Cormorant Garamond "T" (SIL Open Font License 1.1).
- The opening sketch, the plan notepad and the style picker icons: drawn for this site (round 02 files).

### Libraries

None. Every script on the page is the site's own; nothing is loaded from other sites.

## No longer used (Round 01; files kept in the project)

### Single-line fonts (the handwriting)

Source: the SVG fonts distributed with **Hershey Text** (Evil Mad Scientist), which ships with Inkscape (`share/extensions/svg_fonts`), and Windell H. Oskay's full collection at https://gitlab.com/oskay/svg-fonts. The original files are in `tools/svg-fonts/`. `tools/build-fonts.mjs` converts them into the stroke data in `paths/fonts/` (each stroke's direction is normalised, and the `…Single` versions have doubled strokes removed; both are permitted derivatives).

#### Used in Round 01

| Used for | Font | Derived from | Licence |
|---|---|---|---|
| Phrase 1 "You plan" | EMS Allure (`EMSAllure`) | Allura, Rob Leuschke, TypeSETit | SIL Open Font License 1.1 |
| Phrase 2 "WE DESIGN" | Hershey Sans 1-stroke (`HersheySans1`) | Hershey fonts, Dr A. V. Hershey | Hershey Fonts licence (below) |
| Phrase 3 "We deliver" | Hershey Serif Medium Italic, single line (`HersheySerifMedItalicSingle`) | Hershey fonts, Dr A. V. Hershey | Hershey Fonts licence (below) |
| Phrase 4 and finale heading | EMS Neato (`EMSNeato`) | Bad Script, Roman Shchyukin (Gaslight) | SIL Open Font License 1.1 |

#### Also available (fonts-preview.html)

All EMS fonts are SIL Open Font License 1.1 derivatives of OFL fonts: EMS Bird (Bilbo), EMS Bird Swash Caps (Bilbo Swash Caps), EMS Brush (Alex Brush), EMS Capitol (Sacramento), EMS Casual Hand (Covered By Your Grace), EMS Decorous Script (Petit Formal Script), EMS Delight (Delius), EMS Delight Swash Caps (Delius Swash Caps), EMS Elfin (Mountains of Christmas), EMS Felix (Felipa), EMS Herculean (Poiret One), EMS Invite (Tangerine), EMS League (League Script), EMS Little Princess (Princess Sofia), EMS Misty Night (Foglihten No03), EMS Nixish and Nixish Italic (Nixie One), EMS Osmotron (Orbitron), EMS Pancakes (Short Stack), EMS Pepita (Pecita), EMS Qwandry (Qwigley), EMS Readability and Readability Italic (Source Sans Pro Light), EMS Society (Mrs Saint Delafield), EMS Space Rocks (Atari Asteroids lettering, as labelled by the distributor; check before commercial use), EMS Swiss (Italianno), EMS Tech (Architects Daughter). Twin Sans (OFL, derived from Hershey Sans). All other Hershey fonts: Hershey Fonts licence.

The OFL text is in `tools/svg-fonts/OFL.txt`. Each font file's own metadata also states its licence and credits.

#### Hershey Fonts licence (required acknowledgement)

The Hershey Fonts may be used by anyone for any purpose, commercial or otherwise, provided that:

- The Hershey Fonts were originally created by Dr. A. V. Hershey while working at the U. S. National Bureau of Standards.
- The format of the Font data in this distribution was originally created by James Hurt, Cognition, Inc., 900 Technology Park Drive, Billerica, MA 01821.

SVG conversion by Windell H. Oskay, www.evilmadscientist.com, from emergent.unpythonic.net/software/hershey via "Hershey Fonts in SVG" by Marty McGuire.

### Text font (Round 01: variable Inter in `assets/fonts/inter/`)

- **Inter** by The Inter Project Authors (Rasmus Andersson), SIL Open Font License 1.1. Self-hosted in `assets/fonts/inter/` (latin variable font, weights 400–600); licence in `assets/fonts/inter/OFL.txt`.

### Libraries (in `vendor/`, copied from the Everest project's node_modules)

- **GSAP 3.15.0**, GreenSock: free under the GSAP Standard "no charge" licence, https://gsap.com/standard-license (commercial use allowed).
- **Lenis 1.3.26**, darkroom.engineering: MIT licence.

### Images and drawings

- `assets/face-line.svg`: the Bluebird Wellness face drawing, supplied by the owner (round 01).
- `assets/everest/ac-closed`, `ac-half`, `ac-open` (`.png` and `.webp`): the air-conditioning unit images from the owner's Everest Climate Solutions project (`public/images/`), copied unchanged.
- `assets/styles/placeholder-style.svg`: placeholder drawing for the extra style slots, made for this site.
