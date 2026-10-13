# Design guide: how the site looks

Read this before changing anything visual. Set 2026-10-13 with Sao after the redesign
(reference: ramitkrishnan.com for structure, TI datasheets for tone). The goal is a
site that looks designed by a person, not generated: big type, real images, few words,
neutral colors with one red accent.

## Identity

| Token | Value | Use |
|---|---|---|
| Font | **Manrope** (Google Fonts), 400–800 | Everything. No IBM Plex, no monospace UI labels. |
| Mono | system `ui-monospace` | Only code and real numeric data. |
| Ink | `#111111` / greys `#474747`, `#737373` | Text |
| Paper | `#ffffff` | Default background |
| Band light | `#f3f3f3` (`--band-1`) | Alternate sections, light project bands |
| Band dark | `#151515` (`--band-2`) | Dark project bands, call-to-action band |
| Footer | `#0b0b0b` | Footer |
| Accent | **TI red `#cc0000`** (`--signal`) | Small things only: kickers, thin top lines on dark bands, the Now bar, hover states |

Red is an accent, never a full section background. Dark mode keeps the same structure
with neutral greys and `#ff5c5c` as the red.

## Page rhythm (top to bottom)

White hero → white About → **grey Experience** → Projects as alternating
**grey / black full-width bands** (black bands get a 3 px red top line) → **grey Awards**
→ white Skills → **grey Education** → white Data → **black call-to-action band**
(red top line) → **black footer**. Keep this alternation when adding sections.

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
- Corners: 10–16 px radius on cards, images and buttons. Buttons are solid black
  (white on dark bands), hover to red.
- The old 24 px graticule is gone. Keep spacing consistent (multiples of 0.25rem),
  but sections no longer have to land on a drawn grid.

## Images and media

- **Every section should show something real**: lab photos, boards, renders,
  posters, short clips. A text-only section is the first thing to fix.
- Video: short (under ~15 s), silent, looping, autoplay muted, under 1 MB, with a
  `.jpg` of the same name as the poster frame. Make them with ffmpeg
  (`-an -vf scale=720:-2 -crf 28 -movflags +faststart`).
- One image or one video per Experience entry. Project cards get the strongest
  visual (render, photo or loop).
- Team or lab media: confirm permission first (SCR captain, PLATEN group).

## Block diagrams

Use the `block-diagram` skill: Arial, white boxes with thin black borders, power
paths in TI red, signals in black, safety paths dashed red, short labels.

## Don't

- No IBM Plex, no monospace labels, no graticule, no chips on everything.
- No em dashes in visible text (see VOICE.md). No long paragraphs on dark or red.
- No more than two dark blocks in a row; no red section backgrounds.
- Don't shrink text to fit; cut words instead.

## Verifying a visual change

`REPORT_DRAFTS=1 npx astro build && npx astro preview --port 4399`, then check the
page at 1920 / 1366 / 390 px with a hard reload (navigating to the same URL with a
hash does not reload). Measure, don't guess: `getBoundingClientRect()` for widths,
`getComputedStyle()` for font sizes. Close the tab and stop the preview afterwards.
