import data from '../data/site.json';

/**
 * Identity and links.
 *
 * The editable values live in `src/data/site.json` so Pages CMS can present them
 * as a form. Structural values that should not be edited from a CMS — the
 * canonical URL and the social-card path — stay here in code.
 */
export const SITE = {
  ...data,
  url: 'https://saosith.github.io',
  ogImage: '/og.png',
} as const;
