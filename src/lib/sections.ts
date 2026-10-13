import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { awards } from './about';

/**
 * Sections only appear once they have real content, so visitors never see a
 * template or an empty state. The header uses the same checks to hide its links.
 */

/** Awards: at least one entry that is not a placeholder. */
export const hasAwards = () => awards().some((a) => !a.placeholder);

/** Data: at least one dataset in public/data that is not a placeholder model file. */
export function hasDatasets(): boolean {
  const dir = fileURLToPath(new URL('../../public/data', import.meta.url));
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .some((f) => {
        try { return (JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')).meta?.source ?? '') !== 'model'; }
        catch { return false; }
      });
  } catch { return false; }
}
