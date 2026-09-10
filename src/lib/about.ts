import data from '../data/about.json';

/**
 * About-page content.
 *
 * The values live in `src/data/about.json` so they can be edited through Pages
 * CMS as forms rather than by editing TypeScript. This file only gives them
 * types and regroups the flat skills list for rendering.
 *
 * TIMELINE ENTRIES WITH `placeholder: true` ARE SCAFFOLDING. They render with a
 * visible "replace this entry" chip so nothing invented can be mistaken for a
 * real credential. Rewrite each one, then untick the flag.
 *
 * Two rules keep this section credible:
 *   1. Every entry carries a date.
 *   2. Every entry carries a concrete artifact — a repo, a paper, a poster, a
 *      chip photo. An entry with no evidence is a claim, not an achievement.
 */

export type TimelineKind = 'experience' | 'education' | 'award';

export interface TimelineEntry {
  kind?: TimelineKind;
  date: string;
  title: string;
  org?: string;
  body?: string;
  evidenceLabel?: string;
  evidenceHref?: string;
  placeholder?: boolean;
}

export interface SkillRow {
  group: string;
  skill: string;
  whereLabel?: string;
  whereHref?: string;
}

export const TIMELINE: TimelineEntry[] = data.timeline as TimelineEntry[];

/** Experience and education are shown as separate sections on the page. */
export const experience = () => TIMELINE.filter((t) => (t.kind ?? 'experience') === 'experience');
export const education  = () => TIMELINE.filter((t) => t.kind === 'education');
export const awards     = () => TIMELINE.filter((t) => t.kind === 'award');

export interface Course {
  code?: string;
  title: string;
  term?: string;
  note?: string;
}
export const COURSES: Course[] = (data as { courses?: Course[] }).courses ?? [];

/**
 * The CMS edits a flat list (one row per skill, carrying its group name) because
 * a list nested inside a list is awkward to edit. Grouping happens here, at
 * build time, preserving first-seen group order.
 */
export function skillGroups(): { name: string; items: SkillRow[] }[] {
  const groups: { name: string; items: SkillRow[] }[] = [];
  for (const row of data.skills as SkillRow[]) {
    let g = groups.find((x) => x.name === row.group);
    if (!g) { g = { name: row.group, items: [] }; groups.push(g); }
    g.items.push(row);
  }
  return groups;
}
