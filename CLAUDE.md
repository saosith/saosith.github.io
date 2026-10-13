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

## Layout and design

Read `DESIGN.md` before any visual change. The 24px graticule and its "every section
height divisible by 24" rule were retired in the 2026-10 redesign; DESIGN.md has the
current fonts, colors, section rhythm, minimum text sizes and widths to check.

## Verifying

```bash
npm run build
npx astro preview --port 4399
```

Check in the browser at 1920, 1366 and 390 px wide, then close the tab and stop the
preview process. Measure with `getBoundingClientRect()` / `getComputedStyle()` rather
than trusting screenshots.

## Content honesty

The repo ships worked examples whose numbers are invented, and several
placeholder entries. Never present placeholder or example content as real work,
and never publish a project whose numbers have not actually been produced.

## Project reports (web page + PDF)

A project page doubles as an engineering report. Optional frontmatter (`revision`,
`abstract`, `team`, `dataNote`, `decisions`, `revisions`, `references`, `bom`) feeds the
template: revision history, references and the BOM appendix render automatically at the
end; `<DecisionTable rows={frontmatter.decisions} />` and `<Placeholder what=… why=… />`
go in the body. `npm run pdf -- <slug>` prints the page to PDF through the print rules in
`components.css` — published projects to `public/uploads/<slug>-report.pdf` (linked
automatically on the next build), drafts to the git-ignored `reports-draft/`. The
`/report` skill (`~/.claude/skills/report`) holds the section structure and workflow.

## Voice

All site text should sound like Sao wrote it. Read `VOICE.md` (git-ignored, local only) before writing or editing
any prose (reports, About, Now line, captions): first person, plain, no em dashes, no
AI flourishes. Prefer editing Sao's own notes over writing from scratch, and show a
before/after of anything rewritten.

## Agents

Four agents live in `.claude/agents/` (local only): **writer** (all text, VOICE.md),
**designer** (all visuals, DESIGN.md), **hiring-panel** (recruiter + senior-engineer
review across analog IC, robotics, embedded, applications and controls; suggestions
go to Sao, never edits; reads `job-postings/`) and **reviewer** (read-only check
before any push). Order for a bigger update: writer/designer -> hiring-panel -> Sao
decides -> writer/designer -> reviewer -> push.
