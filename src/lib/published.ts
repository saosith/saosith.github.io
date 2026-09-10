import { getCollection } from 'astro:content';
import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Hrefs that actually resolve. A claim linking to an unpublished draft falls
 * back to plain text instead of becoming a dead link.
 *
 * Three things count as live: a published project or note, an external URL, and
 * a file that is really sitting in `public/`. The last one is checked on disk
 * rather than assumed — an evidence link is a promise that there is something
 * to open, so a typo in a filename should read as "add the link", not ship a
 * 404 to someone reviewing your work.
 */
export async function livePredicate() {
  const published = new Set([
    ...(await getCollection('projects', ({ data }) => !data.draft)).map((p) => `/projects/${p.id}/`),
    ...(await getCollection('notes', ({ data }) => !data.draft)).map((n) => `/notes/${n.id}/`),
  ]);

  const publicDir = path.join(process.cwd(), 'public');

  /** `/uploads/a%20b.pdf` -> public/uploads/a b.pdf, refusing to escape public/. */
  const fileExists = (href: string) => {
    let rel: string;
    try {
      rel = decodeURIComponent(href).replace(/^\/+/, '');
    } catch {
      return false; // malformed percent-encoding
    }
    const full = path.resolve(publicDir, rel);
    if (!full.startsWith(publicDir + path.sep)) return false;
    return existsSync(full);
  };

  return (href?: string) => {
    if (!href) return false;
    if (published.has(href)) return true;
    if (/^https?:\/\//.test(href)) return true;
    if (href.startsWith('/')) return fileExists(href.split(/[?#]/)[0]);
    return false;
  };
}
