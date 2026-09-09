/**
 * Hand-rolled SVG charts.
 *
 * No charting dependency: these need log axes, engineering-notation ticks,
 * phase-margin annotation and theme-token colours, which is less work to write
 * directly than to configure. Every chart ships a hover readout and an
 * accessible table alternative.
 */

const NS = 'http://www.w3.org/2000/svg';

type Attrs = Record<string, string | number>;

export function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  text?: string,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Engineering notation: 25000000 -> "25.0 M". Keeps units out of the mantissa. */
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

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Index of the sample nearest `target` in a sorted array. */
export function nearestIndex(sorted: number[], target: number): number {
  let lo = 0, hi = sorted.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < target) lo = mid; else hi = mid;
  }
  return Math.abs(sorted[lo] - target) <= Math.abs(sorted[hi] - target) ? lo : hi;
}

export function linTicks(min: number, max: number, step: number): number[] {
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

/* ------------------------------------------------------------------ *
 * Shared plot frame
 * ------------------------------------------------------------------ */

interface FrameOpts {
  width: number; height: number;
  padL: number; padR: number; padT: number; padB: number;
}

class Frame {
  svg: SVGSVGElement;
  o: FrameOpts;
  constructor(o: FrameOpts, title: string, desc: string) {
    this.o = o;
    this.svg = svgEl('svg', {
      viewBox: `0 0 ${o.width} ${o.height}`,
      role: 'img',
      'aria-labelledby': '',
      preserveAspectRatio: 'xMidYMid meet',
      style: 'width:100%;height:auto;overflow:visible;touch-action:pan-y',
    });
    const t = svgEl('title', {}, title);
    const d = svgEl('desc', {}, desc);
    this.svg.append(t, d);
  }
  get plotW() { return this.o.width - this.o.padL - this.o.padR; }
}

/* ------------------------------------------------------------------ *
 * Bode plot — gain and phase over a shared log-frequency axis
 * ------------------------------------------------------------------ */

export interface BodeData {
  meta: { title: string; conditions: string; source: string };
  freq_hz: number[];
  corners: Record<string, { gain_db: number[]; phase_deg: number[] }>;
  metrics: Record<string, { dcGainDb: number; gbwHz: number | null; phaseMarginDeg: number | null }>;
}

export interface BodeOptions {
  /** Corner drawn with emphasis and used for the crossover annotation. */
  reference?: string;
  /** Draw the trace once on first paint. Respects prefers-reduced-motion. */
  animate?: boolean;
  /** Compact variant for the hero: no phase panel, no legend. */
  compact?: boolean;
}

const SERIES_VARS = ['--series-1', '--series-2', '--series-3', '--series-4', '--series-5'];

export function mountBode(root: HTMLElement, data: BodeData, opts: BodeOptions = {}) {
  const reference = opts.reference ?? Object.keys(data.corners)[0];
  const compact = opts.compact ?? false;
  const names = Object.keys(data.corners);
  const colorOf = (n: string) => `var(${SERIES_VARS[names.indexOf(n) % SERIES_VARS.length]})`;

  const W = 880;
  const padL = 56, padR = compact ? 30 : 34, padT = 12, padB = 30;
  const gainH = compact ? 250 : 214;
  const gap = 30;
  const phaseH = compact ? 0 : 122;
  const H = padT + gainH + (compact ? 0 : gap + phaseH) + padB;

  const f = data.freq_hz;
  const fMin = f[0], fMax = f[f.length - 1];
  const lx0 = Math.log10(fMin), lx1 = Math.log10(fMax);

  let gLo = Infinity, gHi = -Infinity;
  for (const n of names) for (const v of data.corners[n].gain_db) { if (v < gLo) gLo = v; if (v > gHi) gHi = v; }
  gLo = Math.floor(Math.min(gLo, -20) / 20) * 20;
  gHi = Math.ceil((gHi + 5) / 20) * 20;
  const pLo = -270, pHi = 0;

  const X = (hz: number) => padL + ((Math.log10(hz) - lx0) / (lx1 - lx0)) * (W - padL - padR);
  const Yg = (db: number) => padT + ((gHi - db) / (gHi - gLo)) * gainH;
  const yPhaseTop = padT + gainH + gap;
  const Yp = (deg: number) => yPhaseTop + ((pHi - deg) / (pHi - pLo)) * phaseH;

  const frame = new Frame(
    { width: W, height: H, padL, padR, padT, padB },
    data.meta.title,
    `Open-loop gain${compact ? '' : ' and phase'} versus frequency for ${names.length} process corners. ` +
      `Reference corner ${reference}: DC gain ${data.metrics[reference].dcGainDb} dB, ` +
      `unity-gain crossover ${eng(data.metrics[reference].gbwHz ?? 0, 'Hz')}, ` +
      `phase margin ${data.metrics[reference].phaseMarginDeg} degrees.`,
  );
  const svg = frame.svg;

  const gGrid = svgEl('g', { 'aria-hidden': 'true' });
  const gAxes = svgEl('g', { 'aria-hidden': 'true' });
  const gData = svgEl('g');
  const gNote = svgEl('g', { 'aria-hidden': 'true' });
  const gHover = svgEl('g', { 'aria-hidden': 'true', style: 'pointer-events:none;opacity:0' });
  svg.append(gGrid, gAxes, gData, gNote, gHover);

  const AXIS = 'var(--rule-strong)';
  const GRID = 'var(--grid-line)';
  const TXT2 = 'var(--ink-2)';
  const TXT3 = 'var(--ink-3)';

  /* --- grid: decade majors, 2..9 minors --- */
  for (let d = Math.ceil(lx0); d <= Math.floor(lx1); d++) {
    const hz = Math.pow(10, d);
    const x = X(hz);
    gGrid.append(svgEl('line', {
      x1: x, x2: x, y1: padT, y2: padT + gainH, stroke: GRID, 'stroke-width': 1,
    }));
    if (!compact) gGrid.append(svgEl('line', {
      x1: x, x2: x, y1: yPhaseTop, y2: yPhaseTop + phaseH, stroke: GRID, 'stroke-width': 1,
    }));
    for (let m = 2; m <= 9 && d < lx1; m++) {
      const xm = X(hz * m);
      if (xm > W - padR) break;
      gGrid.append(svgEl('line', {
        x1: xm, x2: xm, y1: padT, y2: padT + gainH,
        stroke: GRID, 'stroke-width': 1, opacity: 0.45,
      }));
    }
    const label = hz >= 1e9 ? '1 GHz' : eng(hz, 'Hz', 1);
    gAxes.append(svgEl('text', {
      x, y: H - padB + 16, fill: TXT3, 'font-size': 11, 'text-anchor': 'middle',
      'font-family': 'var(--mono)',
    }, label));
  }

  for (const db of linTicks(gLo, gHi, 20)) {
    const y = Yg(db);
    gGrid.append(svgEl('line', { x1: padL, x2: W - padR, y1: y, y2: y, stroke: GRID, 'stroke-width': 1 }));
    gAxes.append(svgEl('text', {
      x: padL - 8, y: y + 3.5, fill: TXT3, 'font-size': 11, 'text-anchor': 'end', 'font-family': 'var(--mono)',
    }, String(db)));
  }
  // 0 dB is the meaningful line, not just another gridline.
  gAxes.append(svgEl('line', {
    x1: padL, x2: W - padR, y1: Yg(0), y2: Yg(0),
    stroke: AXIS, 'stroke-width': 1, 'stroke-dasharray': '3 3',
  }));

  if (!compact) {
    for (const deg of linTicks(pLo, pHi, 45)) {
      const y = Yp(deg);
      gGrid.append(svgEl('line', { x1: padL, x2: W - padR, y1: y, y2: y, stroke: GRID, 'stroke-width': 1 }));
      gAxes.append(svgEl('text', {
        x: padL - 8, y: y + 3.5, fill: TXT3, 'font-size': 11, 'text-anchor': 'end', 'font-family': 'var(--mono)',
      }, `${deg}°`));
    }
    gAxes.append(svgEl('line', {
      x1: padL, x2: W - padR, y1: Yp(-180), y2: Yp(-180),
      stroke: AXIS, 'stroke-width': 1, 'stroke-dasharray': '3 3',
    }));
  }

  // axis labels
  gAxes.append(svgEl('text', {
    x: padL, y: padT - 1, fill: TXT2, 'font-size': 11, 'font-weight': 500,
  }, 'Open-loop gain (dB)'));
  if (!compact) gAxes.append(svgEl('text', {
    x: padL, y: yPhaseTop - 6, fill: TXT2, 'font-size': 11, 'font-weight': 500,
  }, 'Phase (°)'));

  /* --- traces --- */
  const path = (xs: number[], ys: number[], Y: (v: number) => number) => {
    let d = '';
    for (let i = 0; i < xs.length; i++) {
      const x = X(xs[i]), y = clamp(Y(ys[i]), padT - 40, H);
      d += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2);
    }
    return d;
  };

  const traces: Record<string, { gain: SVGPathElement; phase?: SVGPathElement; on: boolean }> = {};
  for (const n of names) {
    const isRef = n === reference;
    const stroke = colorOf(n);
    const gp = svgEl('path', {
      d: path(f, data.corners[n].gain_db, Yg),
      fill: 'none', stroke, 'stroke-width': isRef ? 2.5 : 1.75,
      'stroke-linejoin': 'round', 'stroke-linecap': 'round',
    });
    gData.append(gp);
    let pp: SVGPathElement | undefined;
    if (!compact) {
      pp = svgEl('path', {
        d: path(f, data.corners[n].phase_deg, Yp),
        fill: 'none', stroke, 'stroke-width': isRef ? 2.5 : 1.75,
        'stroke-linejoin': 'round', 'stroke-linecap': 'round',
      });
      gData.append(pp);
    }
    traces[n] = { gain: gp, phase: pp, on: true };
  }

  /* --- crossover + phase-margin annotation on the reference corner --- */
  const ref = data.metrics[reference];
  if (ref.gbwHz) {
    const xc = X(ref.gbwHz);
    gNote.append(svgEl('line', {
      x1: xc, x2: xc, y1: Yg(0), y2: compact ? padT + gainH : yPhaseTop + phaseH,
      stroke: 'var(--ink-3)', 'stroke-width': 1, 'stroke-dasharray': '2 4',
    }));
    // 2px surface ring keeps the marker readable where traces overlap.
    gNote.append(svgEl('circle', { cx: xc, cy: Yg(0), r: 5, fill: 'var(--panel)' }));
    gNote.append(svgEl('circle', { cx: xc, cy: Yg(0), r: 3.4, fill: colorOf(reference) }));
    const lab = svgEl('text', {
      x: xc - 9, y: Yg(0) - 10, fill: 'var(--ink)', 'font-size': 11.5,
      'text-anchor': 'end', 'font-family': 'var(--mono)', 'font-weight': 500,
    }, `f_c = ${eng(ref.gbwHz, 'Hz')}`);
    gNote.append(lab);
    if (!compact && ref.phaseMarginDeg !== null) {
      const yPm = Yp(ref.phaseMarginDeg - 180);
      gNote.append(svgEl('line', {
        x1: xc, x2: xc, y1: yPm, y2: Yp(-180), stroke: 'var(--ink)', 'stroke-width': 2,
      }));
      gNote.append(svgEl('circle', { cx: xc, cy: yPm, r: 4.6, fill: 'var(--panel)' }));
      gNote.append(svgEl('circle', { cx: xc, cy: yPm, r: 3, fill: colorOf(reference) }));
      gNote.append(svgEl('text', {
        x: xc + 9, y: (yPm + Yp(-180)) / 2 + 4, fill: 'var(--ink)', 'font-size': 11.5,
        'font-family': 'var(--mono)', 'font-weight': 500,
      }, `PM = ${ref.phaseMarginDeg}°`));
    }
  }

  /* --- hover crosshair --- */
  const vline = svgEl('line', { y1: padT, y2: H - padB, stroke: 'var(--ink)', 'stroke-width': 1, opacity: 0.5 });
  gHover.append(vline);
  const dots: SVGCircleElement[] = [];

  const tip = document.createElement('div');
  tip.className = 'chart-tip';
  tip.hidden = true;

  const holder = document.createElement('div');
  holder.className = 'chart-holder';
  holder.append(svg, tip);
  root.append(holder);

  function moveHover(clientX: number) {
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * W;
    if (px < padL || px > W - padR) { hideHover(); return; }
    const hz = Math.pow(10, lx0 + ((px - padL) / (W - padL - padR)) * (lx1 - lx0));
    const i = nearestIndex(f, hz);
    const x = X(f[i]);
    vline.setAttribute('x1', String(x));
    vline.setAttribute('x2', String(x));
    dots.forEach((d) => d.remove());
    dots.length = 0;
    const rows: string[] = [];
    for (const n of names) {
      if (!traces[n].on) continue;
      const g = data.corners[n].gain_db[i];
      const p = data.corners[n].phase_deg[i];
      const y = Yg(g);
      if (y >= padT && y <= padT + gainH) {
        const ring = svgEl('circle', { cx: x, cy: y, r: 5, fill: 'var(--panel)' });
        const dot = svgEl('circle', { cx: x, cy: y, r: 3.2, fill: colorOf(n) });
        gHover.append(ring, dot);
        dots.push(ring, dot);
      }
      rows.push(
        `<tr><td><span class="sw" style="background:${colorOf(n)}"></span>${n}</td>` +
        `<td class="num">${g.toFixed(1)} dB</td>` +
        (compact ? '' : `<td class="num">${p.toFixed(0)}°</td>`) + '</tr>',
      );
    }
    tip.innerHTML =
      `<div class="chart-tip-head num">${eng(f[i], 'Hz')}</div>` +
      `<table><tbody>${rows.join('')}</tbody></table>`;
    tip.hidden = false;
    gHover.setAttribute('style', 'pointer-events:none;opacity:1');
    const left = clamp((x / W) * rect.width + 14, 8, rect.width - tip.offsetWidth - 8);
    tip.style.left = `${left}px`;
    tip.style.top = `8px`;
  }
  function hideHover() {
    tip.hidden = true;
    gHover.setAttribute('style', 'pointer-events:none;opacity:0');
    dots.forEach((d) => d.remove());
    dots.length = 0;
  }

  svg.addEventListener('pointermove', (e) => moveHover(e.clientX));
  svg.addEventListener('pointerleave', hideHover);
  svg.addEventListener('pointerdown', (e) => moveHover(e.clientX));

  /* --- legend doubles as the series toggle --- */
  if (!compact || names.length > 1) {
    const legend = document.createElement('div');
    legend.className = 'chart-legend';
    for (const n of names) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'legend-item';
      b.setAttribute('aria-pressed', 'true');
      b.innerHTML = `<span class="sw" style="background:${colorOf(n)}"></span>${n}`;
      b.addEventListener('click', () => {
        const on = !traces[n].on;
        traces[n].on = on;
        b.setAttribute('aria-pressed', String(on));
        traces[n].gain.style.opacity = on ? '1' : '0';
        if (traces[n].phase) traces[n].phase.style.opacity = on ? '1' : '0';
      });
      legend.append(b);
    }
    root.append(legend);
  }

  /* --- one orchestrated draw-in, hero only --- */
  if (opts.animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (const n of names) {
      for (const p of [traces[n].gain, traces[n].phase]) {
        if (!p) continue;
        const len = p.getTotalLength();
        p.style.strokeDasharray = `${len}`;
        p.style.strokeDashoffset = `${len}`;
        p.animate(
          [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
          { duration: 1100, easing: 'cubic-bezier(.32,.72,.32,1)', fill: 'forwards' },
        );
      }
    }
    gNote.animate([{ opacity: 0 }, { opacity: 0 }, { opacity: 1 }],
      { duration: 1500, easing: 'ease-out', fill: 'forwards' });
  }

  return { svg, traces };
}

/* ------------------------------------------------------------------ *
 * Histogram — Monte Carlo distribution against a spec window
 * ------------------------------------------------------------------ */

export interface McData {
  meta: { title: string; conditions: string; xLabel: string; xUnit: string };
  n: number;
  specLimitMv: number;
  stats: { meanMv: number; sigmaMv: number; yieldPct: number; passing: number };
  samples: number[];
}

export function mountHistogram(root: HTMLElement, data: McData) {
  const W = 880, Hh = 300;
  const padL = 48, padR = 20, padT = 16, padB = 44;
  const plotH = Hh - padT - padB;

  const lim = data.specLimitMv;
  const xMin = Math.min(-lim * 1.25, Math.min(...data.samples) * 1.1);
  const xMax = Math.max(lim * 1.25, Math.max(...data.samples) * 1.1);
  const BINS = 42;
  const binW = (xMax - xMin) / BINS;
  const counts = new Array(BINS).fill(0);
  for (const s of data.samples) counts[clamp(Math.floor((s - xMin) / binW), 0, BINS - 1)]++;
  const cMax = Math.max(...counts);

  const X = (v: number) => padL + ((v - xMin) / (xMax - xMin)) * (W - padL - padR);
  const Y = (c: number) => padT + plotH - (c / cMax) * plotH;

  const frame = new Frame(
    { width: W, height: Hh, padL, padR, padT, padB },
    data.meta.title,
    `Histogram of ${data.n} Monte Carlo samples. Mean ${data.stats.meanMv} mV, ` +
      `sigma ${data.stats.sigmaMv} mV, ${data.stats.passing} of ${data.n} inside the ` +
      `plus or minus ${lim} mV specification window.`,
  );
  const svg = frame.svg;
  const gGrid = svgEl('g', { 'aria-hidden': 'true' });
  const gBars = svgEl('g');
  const gNote = svgEl('g', { 'aria-hidden': 'true' });
  svg.append(gGrid, gBars, gNote);

  const step = cMax > 40 ? 20 : 10;
  for (let c = 0; c <= cMax; c += step) {
    gGrid.append(svgEl('line', {
      x1: padL, x2: W - padR, y1: Y(c), y2: Y(c), stroke: 'var(--grid-line)', 'stroke-width': 1,
    }));
    gGrid.append(svgEl('text', {
      x: padL - 8, y: Y(c) + 3.5, fill: 'var(--ink-3)', 'font-size': 11,
      'text-anchor': 'end', 'font-family': 'var(--mono)',
    }, String(c)));
  }

  // Bars: 2px surface gap between neighbours, 3px rounded top anchored to baseline.
  const barW = (W - padL - padR) / BINS;
  counts.forEach((c, i) => {
    if (!c) return;
    const x = padL + i * barW;
    const y = Y(c);
    const h = padT + plotH - y;
    const inSpec = Math.abs(xMin + (i + 0.5) * binW) <= lim;
    const bar = svgEl('path', {
      d: `M${x + 1} ${padT + plotH} L${x + 1} ${y + 3} Q${x + 1} ${y} ${x + 4} ${y} ` +
         `L${x + barW - 4} ${y} Q${x + barW - 1} ${y} ${x + barW - 1} ${y + 3} L${x + barW - 1} ${padT + plotH} Z`,
      fill: inSpec ? 'var(--series-1)' : 'var(--critical)',
      opacity: inSpec ? 1 : 0.85,
    });
    const t = svgEl('title', {}, `${(xMin + i * binW).toFixed(1)} to ${(xMin + (i + 1) * binW).toFixed(1)} mV: ${c} samples`);
    bar.append(t);
    gBars.append(bar);
    if (h < 0) return;
  });

  // baseline + x ticks
  gNote.append(svgEl('line', {
    x1: padL, x2: W - padR, y1: padT + plotH, y2: padT + plotH, stroke: 'var(--rule-strong)', 'stroke-width': 1,
  }));
  for (const v of linTicks(xMin, xMax, 5)) {
    gNote.append(svgEl('text', {
      x: X(v), y: padT + plotH + 17, fill: 'var(--ink-3)', 'font-size': 11,
      'text-anchor': 'middle', 'font-family': 'var(--mono)',
    }, String(v)));
  }
  gNote.append(svgEl('text', {
    x: (padL + W - padR) / 2, y: Hh - 6, fill: 'var(--ink-2)', 'font-size': 11.5, 'text-anchor': 'middle',
  }, `${data.meta.xLabel} (${data.meta.xUnit})`));

  for (const s of [-lim, lim]) {
    gNote.append(svgEl('line', {
      x1: X(s), x2: X(s), y1: padT, y2: padT + plotH,
      stroke: 'var(--critical)', 'stroke-width': 2, 'stroke-dasharray': '5 4',
    }));
    gNote.append(svgEl('text', {
      x: X(s) + (s < 0 ? 5 : -5), y: padT + 12, fill: 'var(--critical)', 'font-size': 11,
      'text-anchor': s < 0 ? 'start' : 'end', 'font-family': 'var(--mono)', 'font-weight': 500,
    }, `${s > 0 ? '+' : ''}${s} mV spec`));
  }
  gNote.append(svgEl('line', {
    x1: X(data.stats.meanMv), x2: X(data.stats.meanMv), y1: padT, y2: padT + plotH,
    stroke: 'var(--ink)', 'stroke-width': 1.5,
  }));
  // Sits at the top of the plot: at the baseline it fell across the tallest bars.
  gNote.append(svgEl('text', {
    x: X(data.stats.meanMv) + 6, y: padT + 12, fill: 'var(--ink)', 'font-size': 11,
    'font-family': 'var(--mono)', 'font-weight': 500,
  }, `µ = ${data.stats.meanMv} mV`));

  root.append(svg);
  return svg;
}

/* ------------------------------------------------------------------ *
 * Line chart — linear axes (bandgap V(ref) over temperature)
 * ------------------------------------------------------------------ */

export interface LineData {
  meta: { title: string; conditions: string; xLabel: string; xUnit: string; yLabel: string; yUnit: string };
  temp_c: number[];
  corners: Record<string, number[]>;
}

export function mountLine(root: HTMLElement, data: LineData) {
  const names = Object.keys(data.corners);
  const colorOf = (n: string) => `var(${SERIES_VARS[names.indexOf(n) % SERIES_VARS.length]})`;
  const W = 880, Hh = 320;
  const padL = 68, padR = 58, padT = 16, padB = 42;
  const plotH = Hh - padT - padB;

  const xs = data.temp_c;
  const xMin = xs[0], xMax = xs[xs.length - 1];
  let yLo = Infinity, yHi = -Infinity;
  for (const n of names) for (const v of data.corners[n]) { if (v < yLo) yLo = v; if (v > yHi) yHi = v; }
  const padY = (yHi - yLo) * 0.18 || 0.001;
  yLo -= padY; yHi += padY;

  const X = (v: number) => padL + ((v - xMin) / (xMax - xMin)) * (W - padL - padR);
  const Y = (v: number) => padT + ((yHi - v) / (yHi - yLo)) * plotH;

  const frame = new Frame({ width: W, height: Hh, padL, padR, padT, padB }, data.meta.title,
    `${data.meta.yLabel} versus ${data.meta.xLabel} for corners ${names.join(', ')}.`);
  const svg = frame.svg;
  const gGrid = svgEl('g', { 'aria-hidden': 'true' });
  const gData = svgEl('g');
  const gHover = svgEl('g', { 'aria-hidden': 'true', style: 'pointer-events:none;opacity:0' });
  svg.append(gGrid, gData, gHover);

  for (const t of linTicks(xMin, xMax, 25)) {
    gGrid.append(svgEl('line', { x1: X(t), x2: X(t), y1: padT, y2: padT + plotH, stroke: 'var(--grid-line)', 'stroke-width': 1 }));
    gGrid.append(svgEl('text', {
      x: X(t), y: padT + plotH + 17, fill: 'var(--ink-3)', 'font-size': 11,
      'text-anchor': 'middle', 'font-family': 'var(--mono)',
    }, String(t)));
  }
  const yStep = Math.pow(10, Math.floor(Math.log10((yHi - yLo) / 4)));
  for (const v of linTicks(yLo, yHi, yStep)) {
    gGrid.append(svgEl('line', { x1: padL, x2: W - padR, y1: Y(v), y2: Y(v), stroke: 'var(--grid-line)', 'stroke-width': 1 }));
    gGrid.append(svgEl('text', {
      x: padL - 8, y: Y(v) + 3.5, fill: 'var(--ink-3)', 'font-size': 11,
      'text-anchor': 'end', 'font-family': 'var(--mono)',
    }, v.toFixed(4)));
  }
  gGrid.append(svgEl('text', {
    x: (padL + W - padR) / 2, y: Hh - 6, fill: 'var(--ink-2)', 'font-size': 11.5, 'text-anchor': 'middle',
  }, `${data.meta.xLabel} (${data.meta.xUnit})`));
  gGrid.append(svgEl('text', {
    x: padL, y: padT - 3, fill: 'var(--ink-2)', 'font-size': 11.5, 'font-weight': 500,
  }, `${data.meta.yLabel} (${data.meta.yUnit})`));

  // <= 4 series, so each is direct-labelled at its right end as well as legended.
  for (const n of names) {
    const ys = data.corners[n];
    let d = '';
    ys.forEach((v, i) => { d += (i ? 'L' : 'M') + X(xs[i]).toFixed(2) + ' ' + Y(v).toFixed(2); });
    gData.append(svgEl('path', {
      d, fill: 'none', stroke: colorOf(n), 'stroke-width': 2,
      'stroke-linejoin': 'round', 'stroke-linecap': 'round',
    }));
    gData.append(svgEl('text', {
      x: W - padR + 7, y: Y(ys[ys.length - 1]) + 4, fill: 'var(--ink)', 'font-size': 11.5,
      'font-family': 'var(--mono)', 'font-weight': 500,
    }, n));
  }

  const vline = svgEl('line', { y1: padT, y2: padT + plotH, stroke: 'var(--ink)', 'stroke-width': 1, opacity: 0.5 });
  gHover.append(vline);
  const dots: SVGCircleElement[] = [];
  const tip = document.createElement('div');
  tip.className = 'chart-tip';
  tip.hidden = true;
  const holder = document.createElement('div');
  holder.className = 'chart-holder';
  holder.append(svg, tip);
  root.append(holder);

  svg.addEventListener('pointermove', (e) => {
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    if (px < padL || px > W - padR) return;
    const t = xMin + ((px - padL) / (W - padL - padR)) * (xMax - xMin);
    const i = nearestIndex(xs, t);
    vline.setAttribute('x1', String(X(xs[i])));
    vline.setAttribute('x2', String(X(xs[i])));
    dots.forEach((d) => d.remove()); dots.length = 0;
    const rows = names.map((n) => {
      const y = Y(data.corners[n][i]);
      const ring = svgEl('circle', { cx: X(xs[i]), cy: y, r: 5, fill: 'var(--panel)' });
      const dot = svgEl('circle', { cx: X(xs[i]), cy: y, r: 3.2, fill: colorOf(n) });
      gHover.append(ring, dot); dots.push(ring, dot);
      return `<tr><td><span class="sw" style="background:${colorOf(n)}"></span>${n}</td>` +
             `<td class="num">${(data.corners[n][i] * 1e3).toFixed(2)} mV</td></tr>`;
    });
    tip.innerHTML = `<div class="chart-tip-head num">${xs[i]} °C</div><table><tbody>${rows.join('')}</tbody></table>`;
    tip.hidden = false;
    gHover.setAttribute('style', 'pointer-events:none;opacity:1');
    tip.style.left = `${clamp((X(xs[i]) / W) * rect.width + 14, 8, rect.width - tip.offsetWidth - 8)}px`;
    tip.style.top = '8px';
  });
  svg.addEventListener('pointerleave', () => {
    tip.hidden = true;
    gHover.setAttribute('style', 'pointer-events:none;opacity:0');
    dots.forEach((d) => d.remove()); dots.length = 0;
  });

  return svg;
}
