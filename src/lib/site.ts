import data from '../data/site.json';
import resume from '../data/resume.json';
import footer from '../data/footer.json';

/**
 * Identity and links.
 *
 * The editable values live in `src/data/*.json` so Pages CMS can present them as
 * forms — identity in site.json, the CV in resume.json, the footer note in
 * footer.json, each its own entry in the CMS sidebar. Structural values that
 * should not be edited from a CMS — the canonical URL and the social-card path —
 * stay here in code.
 */
export const SITE = {
  ...data,
  /** Every link to the CV follows this one value: nav, footer and hero button. */
  resume: (resume as { file?: string }).file ?? '',
  resumeLabel: (resume as { label?: string }).label || 'Resume',
  footerNote: (footer as { note?: string }).note ?? '',
  url: 'https://saosith.github.io',
  ogImage: '/og.png',
} as const;
