# Design guide: how the site looks

> **Current design (2026-11-10): copper redesign.** The red-and-white design described
> further down is superseded; it is kept for history and can be restored from the git tag
> `backup-red-white-2026-11-10`. Reference mockups: `reviews/mockups/site-redesign/B6*.html`.
>
> - **Palette:** paper `#f6f3ee`, ink `#1d1a16`, copper `#c46a22` (accent, vias, buttons on dark),
>   text copper `#a2561a`, trace `#d9a877`; dark band/footer `#1d1a16` / `#141210`. Tokens live in
>   `src/styles/copper.css` (loaded last), with a dark-mode set.
> - **Type:** Inter everywhere (headings 800, body 400/500). No Manrope/Poppins/Arial on the web.
> - **Motifs:** copper PCB traces pinned to section corners (`Traces.astro`), drawn at natural size,
>   45-degree bends, ending in vias, never crossing (a crossing reads as a short), never behind text.
>   Every section headline starts with a copper via circle.
> - **3D:** the Hub board is an interactive `model-viewer` (hero, Hub card, project header). No still
>   poster image; a "Loading 3D model" label shows until it loads.
> - **Images:** never cropped (`object-fit: contain`), except the About photo (cropped around Sao).
> - **Fit rule:** every section a menu link jumps to fills exactly one laptop screen
>   (min-height `100svh - 72px`) and shows no edge of its neighbours; check with
>   getBoundingClientRect after every change. Experience (4 roles) may span ~2 screens.
> - **Icon:** `public/favicon.svg`, a light pulse drawn as sampled bars on copper.

Read this before changing anything visual. Set 2026-10-13 with Sao after the redesign
(reference: ramitkrishnan.com for structure, TI datasheets for tone). The goal is a
site that looks designed by a person, not generated: big type, real images, few words,
neutral colors with one red accent.

## Identity

| Token | Value | Use |
|---|---|---|
| Headings | **Manrope 500** (`--display`) | h1–h4, band titles, CTA. Medium weight, like the Ramit reference. |
| Body | **Poppins 400/500** (`--sans`) | Running text, nav, buttons. |
| Reports | **Arial** (Arimo fallback), `src/styles/report.css` | Project pages and their PDFs only: TI-datasheet look, numbered sections, grey ruled tables, red as a thin accent. |
| Mono | system `ui-monospace` | Code only. Reports set it to Arial too. |
| Ink | `#111111` / greys `#474747`, `#737373` | Text |
| Paper | `#ffffff` | Default background |
| Band light | `#f3f3f3` (`--band-1`) | Alternate sections, light project bands |
| Band dark | `#151515` (`--band-2`) | Dark project bands, call-to-action band |
| Footer | `#0b0b0b` | Footer |
| Accent | **TI red `#cc0000`** (`--signal`) | Small things: kickers, thin top lines on dark bands, the Now bar, hover states |
| Brand red | **`#cc0000`** (`--brand-red`), same in both themes | The two red surfaces only: the hero text tile and the featured (first) project band |

Red is a background in exactly two places: the **hero text tile** and the **featured
project band**, both `var(--brand-red)`, fixed `#cc0000` in light and dark mode, with white text (5.9:1).
Everything else red is a small accent. On dark bands, kickers are **white** (the CTA "Open to work" kicker
included): brand red is only 3.3:1 on `#151515` and the lighter `#ff6b6b` reads as pink. Dark mode keeps the same structure with neutral
greys; `--signal` lightens to `#ff5c5c` there, so never use `--signal` for a large surface
(white on `#ff5c5c` is about 2.8:1 and looks pink).

## Page rhythm (top to bottom)

Hero (red text tile + PLD video tile) → white About → Projects (white heading and Now line, then full-width
bands: first one **red**, then alternating **grey / black**; black bands get a 3 px red
top line) → white Experience (white so it separates from a grey or black last band) →
**grey Awards** (when shown) → white Skills → **grey Education** → white Data → **black call-to-action band** (red top line) → **black
footer**. Keep this alternation when adding sections.

## Type scale and minimum sizes

- Hero greeting: clamp(3rem → 5.4rem), weight 600, tight letter-spacing.
- Section titles: clamp(2rem → 2.9rem), weight 700.
- Project band titles: clamp(1.8rem → 2.7rem).
- Body text: 17 px, line-height about 1.65.
- **Nothing a visitor reads is under 15 px.** Only small labels (tags, "Updated…")
  may go down to about 13.5 px.

## Layout

- Page width is fluid: `--max: 1440px` with `--gutter` up to 4rem. Check at
  **1920, 1366 and 390 px** wide. Margins on a 1920 px screen should be about 230 px.
- Text keeps a readable measure (about 60–70 characters); fill extra width with
  **images or media columns, never by stretching text**.
- Full-bleed bands break out of `.wrap` with `margin: 0 calc(50% - 50vw)`, or with
  `box-shadow: 0 0 0 100vmax` + `clip-path: inset(0 -100vmax)` for section backgrounds.
- Focus ring: `var(--signal)` on light and dark surfaces, **white (3 px, 3 px offset)
  inside red surfaces** (hero tile, featured band), where a red ring would vanish.
- Text on red is full white (no opacity): 5.9:1. Semi-transparent white drops below 4.5:1
  at small sizes.
- Corners: 10–16 px radius on cards, images and buttons. Buttons are solid black
  (white on dark bands), hover to red.
- The old 24 px graticule is gone. Keep spacing consistent (multiples of 0.25rem),
  but sections no longer have to land on a drawn grid.

## Images and media

- **Every section should show something real**: lab photos, boards, renders,
  posters, short clips. A text-only section is the first thing to fix.
- Video: short (under ~20 s), silent, looping, autoplay muted, under ~4 MB, with a
  `.jpg` of the same name as the poster frame (`-q:v 2`, a sharp frame). Make them with
  ffmpeg at the source resolution, downscaled only if wider than 1280 px
  (`-an -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -movflags +faststart`;
  raise CRF by 1 until it fits). Start from phone originals, not chat-app exports.
- One image or one video per Experience entry. Project cards get the strongest
  visual (render, photo or loop).
- Team or lab media: confirm permission first (SCR captain, PLATEN group).

## Block diagrams

Use the `block-diagram` skill: Arial, white boxes with thin black borders, power
paths in TI red, signals in black, safety paths dashed red, short labels.

## Don't

- No IBM Plex, no monospace labels, no graticule, no chips on everything.
- No em dashes in visible text (see VOICE.md). No long paragraphs on dark or red.
- No more than two dark blocks in a row; no red backgrounds beyond the hero tile and the
  featured band; keep the sections around them neutral.
- Don't shrink text to fit; cut words instead.

## Verifying a visual change

`REPORT_DRAFTS=1 npx astro build && npx astro preview --port 4399`, then check the
page at 1920 / 1366 / 390 px with a hard reload (navigating to the same URL with a
hash does not reload). Measure, don't guess: `getBoundingClientRect()` for widths,
`getComputedStyle()` for font sizes. Close the tab and stop the preview afterwards.

## Two styles (2026-10-13)

- **Home page = Ramit reference.** Hero "C2-A": a red tile (greeting, tagline, white Resume
  button, outlined Message me button that jumps to the contact box) that bleeds off the
  left screen edge with only its right corners rounded, next to the PLD video tile; both
  share one grid row so they end on the same line; the photo caption (keep it to about
  8 words) sits over the bottom of the video on a dark gradient; band-style gap
  `clamp(1.5rem, 4vw, 4rem)`; on phones the tile becomes a full-width red strip, nav of About / Projects / Experience (page order) + Resume, project bands with
  the first (featured) band in TI red, then light/dark alternating; media side alternates by position.
- **Project pages and PDFs = TI datasheet ("A3").** Same MDX source. `npm run pdf` opens
  each page with `?paged`, which loads `public/report-paged.css` and Paged.js
  (`public/vendor/`) for the front page (Features / Applications / Description, key
  parameters, data status), a contents page with page numbers, running header and
  "Page N of M", and prints with PDF bookmarks. Never use `counter-increment: none` or
  CSS counters for numbering in paged mode: Paged.js mishandles them (section numbers
  are written as `.secno` spans instead).
