/**
 * Content for the About page.
 *
 * TIMELINE ENTRIES MARKED `placeholder: true` ARE SCAFFOLDING. They render with
 * a visible "replace me" marker so nothing invented can be mistaken for a real
 * credential. Delete or rewrite each one, then drop the `placeholder` flag.
 *
 * Rules that keep this section credible:
 *   1. Every entry carries a date.
 *   2. Every entry carries a concrete artifact — a repo, a paper, a poster, a
 *      chip photo. An entry with no evidence is a claim, not an achievement.
 */

export interface TimelineEntry {
  date: string;
  title: string;
  org?: string;
  body?: string;
  evidence?: { label: string; href: string }[];
  placeholder?: boolean;
}

export const TIMELINE: TimelineEntry[] = [
  {
    date: '2024 — present',
    title: 'B.S. Electrical Engineering',
    org: 'University of Oklahoma',
    body: 'Coursework in analog electronics, semiconductor devices, signals and systems, and electromagnetics. Self-directed work in analog IC design on the sky130 open PDK alongside it.',
  },
  {
    date: 'Add a date',
    title: 'Add a research or lab position',
    org: 'Group or lab name',
    body: 'One or two sentences on what you actually built or measured — the instrument, the circuit, the result. Not the topic area.',
    evidence: [{ label: 'Poster / report (PDF)', href: '#' }],
    placeholder: true,
  },
  {
    date: 'Add a date',
    title: 'Add a tapeout, award, or competition result',
    org: 'Shuttle, sponsor, or competition',
    body: 'If you have taped out, name the shuttle and the date — for example "sky130 via the Efabless MPW shuttle". A die photo or GDS render on the home page is the strongest single signal an IC portfolio can carry.',
    evidence: [{ label: 'GDS / die photo', href: '#' }],
    placeholder: true,
  },
];

export interface SkillGroup {
  name: string;
  items: { skill: string; where?: { label: string; href: string } }[];
}

/**
 * Every claim links to the project that demonstrates it. A skill with no link
 * is listed as coursework so the difference stays visible.
 */
export const SKILLS: SkillGroup[] = [
  {
    name: 'Schematic & simulation',
    items: [
      { skill: 'Xschem', where: { label: 'op-amp', href: '/projects/two-stage-opamp/' } },
      { skill: 'ngspice', where: { label: 'op-amp', href: '/projects/two-stage-opamp/' } },
      { skill: 'Corner & Monte Carlo analysis', where: { label: 'op-amp', href: '/projects/two-stage-opamp/' } },
      { skill: 'Cadence Virtuoso / Spectre' },
      { skill: 'LTspice' },
    ],
  },
  {
    name: 'Layout & verification',
    items: [
      { skill: 'Magic VLSI', where: { label: 'bandgap', href: '/projects/bandgap-reference/' } },
      { skill: 'DRC / LVS (netgen)', where: { label: 'bandgap', href: '/projects/bandgap-reference/' } },
      { skill: 'Parasitic extraction', where: { label: 'bandgap', href: '/projects/bandgap-reference/' } },
      { skill: 'KLayout' },
    ],
  },
  {
    name: 'Process & devices',
    items: [
      { skill: 'SkyWater sky130 open PDK', where: { label: 'op-amp', href: '/projects/two-stage-opamp/' } },
      { skill: 'Device characterisation (gm/ID)', where: { label: 'gm/ID note', href: '/notes/gm-id-sizing/' } },
      { skill: 'Silicon photonics' },
    ],
  },
  {
    name: 'Tooling',
    items: [
      { skill: 'Python (NumPy, Matplotlib)', where: { label: 'data pipeline', href: '/notes/plotting-ngspice/' } },
      { skill: 'MATLAB' },
      { skill: 'Git' },
      { skill: 'Linux / shell' },
    ],
  },
];
