import { getCollection } from 'astro:content';

/**
 * Hrefs that actually resolve. A claim linking to an unpublished draft falls
 * back to plain text instead of becoming a dead link.
 */
export async function livePredicate() {
  const published = new Set([
    ...(await getCollection('projects', ({ data }) => !data.draft)).map((p) => `/projects/${p.id}/`),
    ...(await getCollection('notes', ({ data }) => !data.draft)).map((n) => `/notes/${n.id}/`),
  ]);
  return (href?: string) => !!href && (published.has(href) || /^https?:\/\//.test(href));
}
