import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/** One row of a datasheet-style parameter table. */
const specRow = z.object({
  param: z.string(),
  symbol: z.string().optional(),
  target: z.string().optional(),
  sim: z.string().optional(),
  measured: z.string().optional(),
  unit: z.string().optional(),
  /** Drives the pass/fail chip. `na` renders no chip. */
  status: z.enum(['pass', 'marginal', 'fail', 'na']).default('na'),
  /** Footnote key, matched against `footnotes[].ref`. */
  note: z.string().optional(),
});

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    /** One line, shown in the project list and as the page lede. */
    summary: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    order: z.number().default(100),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),

    /** Thumbnail shown beside the row on the projects list. */
    cover: z.string().optional(),
    /** Short silent loop shown on the project card instead of the cover image. */
    coverVideo: z.string().optional(),
    coverAlt: z.string().optional(),

    tags: z.array(z.string()).default([]),
    tools: z.array(z.string()).default([]),
    process: z.string().optional(),

    /**
     * Provenance of every number on the page. Renders a visible badge, so a
     * page can never quietly present hand-model output as measured silicon.
     * `design` covers work that is captured but not yet built or simulated —
     * a schematic, a layout, a board — where there are no numbers to defend.
     */
    dataStatus: z.enum(['design', 'model', 'simulated', 'built', 'measured']).default('model'),
    /** Test conditions footer, e.g. "VDD = 1.8 V, T = 27 °C, CL = 2 pF". */
    conditions: z.string().optional(),
    /** IP position, e.g. "SkyWater sky130 open PDK — publicly shareable". */
    ip: z.string().optional(),

    /** Three-or-so numbers shown on the card and in the rail. */
    headline: z.array(z.object({
      label: z.string(), value: z.string(), unit: z.string().optional(),
    })).default([]),

    specs: z.array(specRow).default([]),
    footnotes: z.array(z.object({ ref: z.string(), text: z.string() })).default([]),

    links: z.array(z.object({ label: z.string(), href: z.string() })).default([]),

    /* ---- Report fields. All optional, so a short project page needs none. ---- */

    /** e.g. "Rev A — schematic". Shown in the header and on the PDF title block. */
    revision: z.string().optional(),
    /** Three to five sentences: problem, what was built, the key result. */
    abstract: z.string().optional(),
    /** Team work: who it was for and what you did. Absent means solo work. */
    team: z.object({ org: z.string(), role: z.string() }).optional(),
    /** Overrides the badge text, e.g. "Simulated in LTspice; no board built yet." */
    dataNote: z.string().optional(),
    /**
     * Report PDF. Leave empty: `npm run pdf` writes /uploads/<slug>-report.pdf and
     * the page finds it on the next build. Set it only to point somewhere else.
     */
    pdf: z.string().optional(),

    /** Choices between options. Placed in the body with <DecisionTable />. */
    decisions: z.array(z.object({
      id: z.string().optional(),
      topic: z.string(),
      options: z.string(),
      choice: z.string(),
      reason: z.string(),
      status: z.enum(['decided', 'open', 'reversed']).default('decided'),
    })).default([]),

    /**
     * Where the project stands. Replaces empty Layout / Simulation / Test sections:
     * a section appears only once it has content; everything still to come is a row
     * here. Placed in the body with <StatusTable rows={frontmatter.stages} />.
     */
    stages: z.array(z.object({
      stage: z.string(),
      status: z.enum(['done', 'next', 'planned']).default('planned'),
      plan: z.string().optional(),
    })).default([]),

    /** Rendered automatically at the end of the page, newest first as written. */
    revisions: z.array(z.object({
      rev: z.string(),
      date: z.string(),
      change: z.string(),
    })).default([]),

    /** Rendered automatically as the BOM appendix. */
    bom: z.array(z.object({
      ref: z.string(),
      part: z.string(),
      value: z.string().optional(),
      pkg: z.string().optional(),
      source: z.string().optional(),
    })).default([]),

    /** Rendered automatically as the references list. */
    references: z.array(z.object({
      label: z.string(),
      href: z.string().optional(),
    })).default([]),
  }),
});

const notes = defineCollection({
  loader: glob({ base: './src/content/notes', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects, notes };
