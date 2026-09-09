import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Read a JSON dataset from `public/data/` at build time.
 *
 * The same file is fetched by the client-side chart, so the server-rendered
 * summary table and the interactive plot can never disagree: one file, one
 * source of truth.
 */
export function loadData<T>(name: string): T {
  const path = fileURLToPath(new URL(`../../public/data/${name}`, import.meta.url));
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

/** Engineering notation, mirroring the client-side formatter in charts.ts. */
const PREFIX: Array<[number, string]> = [
  [1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''],
  [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p'],
];

export function eng(value: number, unit = '', sig = 3): string {
  if (value === 0) return `0 ${unit}`.trim();
  const abs = Math.abs(value);
  const [scale, prefix] = PREFIX.find(([s]) => abs >= s) ?? [1e-12, 'p'];
  const m = value / scale;
  const digits = Math.max(0, sig - Math.floor(Math.log10(Math.abs(m))) - 1);
  return `${m.toFixed(Math.min(digits, 3))} ${prefix}${unit}`.trim();
}
