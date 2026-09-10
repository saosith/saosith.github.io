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
    dataStatus: z.enum(['design', 'model', 'simulated', 'measured']).default('model'),
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
