import aboutData from '../data/about.json';
import experienceData from '../data/experience.json';
import educationData from '../data/education.json';
import awardsData from '../data/awards.json';
import coursesData from '../data/courses.json';
import skillsData from '../data/skills.json';

/**
 * Home-page content.
 *
 * Each section of the page has its own file under `src/data`, so Pages CMS can
 * list them as separate entries in its sidebar rather than burying the whole
 * page inside one enormous "About" form. Splitting them also means a save to
 * one section can never rewrite another.
 *
 * TIMELINE ENTRIES WITH `placeholder: true` ARE SCAFFOLDING. They render with a
 * visible "replace this entry" chip so nothing invented can be mistaken for a
 * real credential. Rewrite each one, then untick the flag.
 *
 * Two rules keep these sections credible:
 *   1. Every entry carries a date.
 *   2. Every entry carries a concrete artifact — a repo, a paper, a poster, a
 *      chip photo. An entry with no evidence is a claim, not an achievement.
 */

export interface TimelineEntry {
  date: string;
  title: string;
  org?: string;
  /**
   * Square organisation mark shown beside the entry. Optional: without one the
   * entry falls back to a monogram tile built from the organisation name, so a
   * missing image never leaves a hole in the column.
   */
  logo?: string;
  body?: string;
  evidenceLabel?: string;
  evidenceHref?: string;
  placeholder?: boolean;
}

export interface SkillRow {
  group: string;
  skill: string;
}

export interface Course {
  code?: string;
  title: string;
  term?: string;
  note?: string;
}

/** The About section's paragraphs, in order. */
export const ABOUT: string[] = (aboutData as { paragraphs?: string[] }).paragraphs ?? [];

/** The square profile photo shown beside the About text. Empty renders a slot. */
export const ABOUT_PHOTO = {
  src: ((aboutData as { photo?: string }).photo ?? '').trim(),
  alt: ((aboutData as { photoAlt?: string }).photoAlt ?? '').trim(),
};

const entries = (d: unknown) => ((d as { entries?: TimelineEntry[] }).entries ?? []);

export const experience = () => entries(experienceData);
export const education  = () => entries(educationData);
export const awards     = () => entries(awardsData);

export const COURSES: Course[] = (coursesData as { courses?: Course[] }).courses ?? [];

/**
 * The CMS edits a flat list, one row per skill carrying its group name, because
 * a list nested inside a list is awkward to edit. Grouping happens here at build
 * time, preserving the order groups first appear in.
 */
export function skillGroups(): { name: string; items: SkillRow[] }[] {
  const groups: { name: string; items: SkillRow[] }[] = [];
  for (const raw of (skillsData as { skills?: SkillRow[] }).skills ?? []) {
    // Trimmed: a trailing space typed in the CMS would otherwise read as a
    // different group and print the same heading twice.
    const row = { group: raw.group.trim(), skill: raw.skill.trim() };
    if (!row.skill) continue;
    let g = groups.find((x) => x.name === row.group);
    if (!g) { g = { name: row.group, items: [] }; groups.push(g); }
    g.items.push(row);
  }
  return groups;
}
