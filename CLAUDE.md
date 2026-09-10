# Working in this repo

Astro static site, deployed to GitHub Pages. Content is edited through
[Pages CMS](https://pagescms.org), configured by `.pages.yml`.

## Pages CMS is part of every content change

**Assume any change that adds something the site owner fills in later also needs
a `.pages.yml` change.** Uploads (photos, logos, PDFs), text that gets revised
(status lines, captions, notes), and show/hide toggles all qualify. A field with
no form in the CMS can only be edited by hand-editing the repo, which defeats
the point — and in practice it never gets filled in.

Check `.pages.yml` on every content-shaped task, make the change when it is
warranted, and say so. Do not ask whether to update it.

The loop for a new editable field:

1. Add the key to the right `src/data/*.json` (or a new file if it deserves its
   own sidebar entry).
2. Read it in `src/lib/`, render it, and give it a visible empty state — a
   dashed "add a photo here" slot, not a silent collapse.
3. Add the field to `.pages.yml` with a `description` saying what good input
   looks like. Those descriptions are the only help visible while editing.
4. Rebuild, and confirm the entry still loads. A malformed field breaks the
   whole form, not just itself.

Gotchas, both already fixed in the config and both silent when wrong:

- `select` choices belong under `options.values` as `{ value:, label: }` pairs.
  A bare list under `options` renders "No options found".
- The media block needs `categories: [image, document]` or the picker refuses
  PDFs.

## Layout rhythm

Vertical spacing is a 24px grid (`--unit`), drawn as a faint graticule behind
the page. Section heights should stay divisible by 24 — that is why fixed sizes
look like 216px rather than 200px. Measure after changing spacing, and measure
rule-to-rule rather than text-to-rule.

## Verifying

```bash
npm run build
npx astro preview --port 4399
```

Check in the browser, then close the tab and stop the preview process. Screenshots
alone miss grid drift — measure with `getBoundingClientRect()` and check
`height % 24`.

## Content honesty

The repo ships worked examples whose numbers are invented, and several
placeholder entries. Never present placeholder or example content as real work,
and never publish a project whose numbers have not actually been produced.
