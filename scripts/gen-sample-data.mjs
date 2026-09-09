/**
 * Generates MODEL data for the site's charts so the pages render before real
 * silicon/simulation data exists.
 *
 * These are analytical pole-zero models, NOT simulation output. Every project
 * whose frontmatter says `dataStatus: model` renders a visible badge saying so.
 * Replace with real data via `npm run data -- --help` -> scripts/raw-to-json.mjs,
 * then flip the frontmatter to `simulated` or `measured`.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = (p) => {
  const f = resolve(root, 'public/data', p);
  mkdirSync(dirname(f), { recursive: true });
  return f;
};

/* ---------- tiny complex helpers ---------- */
const cMul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cDiv = (a, b) => {
  const d = b[0] * b[0] + b[1] * b[1];
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
};
const cAbs = (a) => Math.hypot(a[0], a[1]);
const cArg = (a) => Math.atan2(a[1], a[0]);

/* ---------- deterministic RNG (mulberry32) ---------- */
function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r) => {
  const u = Math.max(r(), 1e-12), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

/* =========================================================================
   1. Two-stage Miller op-amp: open-loop AC response across process corners
   A(s) = Adc * (1 + s/wz) / ((1 + s/wp1)(1 + s/wp2)(1 + s/wp3))
   ========================================================================= */
// Targets are the headline numbers; `fp1` is solved below so the plotted
// 0 dB crossover lands exactly on `gbwTarget` -- the curve and the spec table
// can never drift apart.
const CORNERS = {
  TT: { adcDb: 110.0, gbwTarget: 25.0e6, fp2: 45e6, fp3: 250e6, fz: 110e6 },
  FF: { adcDb: 104.2, gbwTarget: 27.4e6, fp2: 62e6, fp3: 330e6, fz: 150e6 },
  SS: { adcDb: 115.1, gbwTarget: 22.1e6, fp2: 33e6, fp3: 180e6, fz: 80e6  },
  FS: { adcDb: 107.4, gbwTarget: 26.0e6, fp2: 52e6, fp3: 290e6, fz: 130e6 },
  SF: { adcDb: 112.3, gbwTarget: 23.3e6, fp2: 38e6, fp3: 210e6, fz: 92e6  },
};

function response(p, f) {
  const w = 2 * Math.PI * f;
  const num = cMul([Math.pow(10, p.adcDb / 20), 0], [1, w / (2 * Math.PI * p.fz)]);
  let den = [1, 0];
  for (const fp of [p.fp1, p.fp2, p.fp3]) den = cMul(den, [1, w / (2 * Math.PI * fp)]);
  const H = cDiv(num, den);
  // Loop-gain convention: 0 deg at DC, PM = 180 + phase(fc).
  return { mag: 20 * Math.log10(cAbs(H)), phase: (cArg(H) * 180) / Math.PI };
}

/** Bisect on the dominant pole until |A(j2*pi*fc)| = 0 dB at the target GBW. */
function solveFp1(p) {
  let lo = 1e-3, hi = 1e6;
  for (let i = 0; i < 200; i++) {
    const mid = Math.sqrt(lo * hi);
    const g = response({ ...p, fp1: mid }, p.gbwTarget).mag;
    if (g > 0) hi = mid; else lo = mid;
  }
  return Math.sqrt(lo * hi);
}
for (const p of Object.values(CORNERS)) p.fp1 = solveFp1(p);

const DEC_START = 0, DEC_END = 9, PPD = 24;
const freq = [];
for (let i = 0; i <= (DEC_END - DEC_START) * PPD; i++) {
  freq.push(Math.pow(10, DEC_START + i / PPD));
}

const corners = {};
const metrics = {};
for (const [name, p] of Object.entries(CORNERS)) {
  const gain = [], phase = [];
  for (const f of freq) {
    const r = response(p, f);
    gain.push(+r.mag.toFixed(4));
    phase.push(+r.phase.toFixed(4));
  }
  // Unity-gain crossover by log-linear interpolation on the 0 dB crossing.
  let fc = null, pm = null;
  for (let i = 1; i < gain.length; i++) {
    if (gain[i - 1] > 0 && gain[i] <= 0) {
      const t = gain[i - 1] / (gain[i - 1] - gain[i]);
      fc = Math.pow(10, Math.log10(freq[i - 1]) + t * (Math.log10(freq[i]) - Math.log10(freq[i - 1])));
      pm = 180 + (phase[i - 1] + t * (phase[i] - phase[i - 1]));
      break;
    }
  }
  corners[name] = { gain_db: gain, phase_deg: phase };
  metrics[name] = {
    dcGainDb: +p.adcDb.toFixed(1),
    gbwHz: fc,
    phaseMarginDeg: pm === null ? null : +pm.toFixed(1),
    dominantPoleHz: p.fp1,
  };
}

writeFileSync(out('opamp-ac.json'), JSON.stringify({
  meta: {
    title: 'Open-loop frequency response vs. process corner',
    source: 'model',
    model: 'Three-pole / one-LHP-zero Miller-compensated two-stage macromodel',
    conditions: 'VDD = 1.8 V, T = 27 °C, CL = 2 pF, CC = 1.6 pF, IBIAS = 20 µA',
    generated: new Date().toISOString().slice(0, 10),
    xLabel: 'Frequency', xUnit: 'Hz', yLabel: 'Open-loop gain', yUnit: 'dB',
  },
  freq_hz: freq.map((f) => +f.toPrecision(8)),
  corners, metrics,
}, null, 1));

/* =========================================================================
   2. Monte Carlo: input-referred offset from device mismatch
   ========================================================================= */
{
  const r = rng(20260908);
  const N = 500, SPEC = 5; // mV, ±
  const samples = [];
  for (let i = 0; i < N; i++) {
    samples.push(+(0.31 + 2.42 * gauss(r)).toFixed(4)); // mean 0.31 mV, sigma 2.42 mV
  }
  const mean = samples.reduce((a, b) => a + b, 0) / N;
  const sd = Math.sqrt(samples.reduce((a, b) => a + (b - mean) ** 2, 0) / (N - 1));
  const pass = samples.filter((s) => Math.abs(s) <= SPEC).length;
  writeFileSync(out('opamp-mc.json'), JSON.stringify({
    meta: {
      title: 'Input-referred offset, 500-point Monte Carlo',
      source: 'model',
      conditions: 'VDD = 1.8 V, T = 27 °C, mismatch only (no process corner)',
      generated: new Date().toISOString().slice(0, 10),
      xLabel: 'Input-referred offset', xUnit: 'mV',
    },
    n: N, specLimitMv: SPEC,
    stats: { meanMv: +mean.toFixed(3), sigmaMv: +sd.toFixed(3), yieldPct: +((100 * pass) / N).toFixed(1), passing: pass },
    samples,
  }, null, 1));
}

/* =========================================================================
   3. Bandgap reference: Vref vs. temperature across corners
   ========================================================================= */
{
  const temps = [];
  for (let t = -40; t <= 125; t += 5) temps.push(t);
  const bg = { TT: { v0: 1.2004, curv: -6.1e-7, t0: 42 },
               FF: { v0: 1.1932, curv: -6.8e-7, t0: 38 },
               SS: { v0: 1.2081, curv: -5.4e-7, t0: 47 } };
  const series = {}, tc = {};
  for (const [name, p] of Object.entries(bg)) {
    const v = temps.map((t) => +(p.v0 + p.curv * (t - p.t0) ** 2).toFixed(7));
    const vmin = Math.min(...v), vmax = Math.max(...v);
    series[name] = v;
    tc[name] = {
      vrefMeanV: +((vmin + vmax) / 2).toFixed(5),
      spreadMv: +((vmax - vmin) * 1e3).toFixed(3),
      tcPpmPerC: +(((vmax - vmin) / ((vmax + vmin) / 2) / 165) * 1e6).toFixed(1),
    };
  }
  writeFileSync(out('bandgap-tc.json'), JSON.stringify({
    meta: {
      title: 'Reference voltage vs. temperature',
      source: 'model',
      conditions: 'VDD = 1.8 V, ILOAD = 0 A, curvature-corrected topology',
      generated: new Date().toISOString().slice(0, 10),
      xLabel: 'Temperature', xUnit: '°C', yLabel: 'V(ref)', yUnit: 'V',
    },
    temp_c: temps, corners: series, metrics: tc,
  }, null, 1));
}

console.log('Wrote public/data/{opamp-ac,opamp-mc,bandgap-tc}.json');
for (const [k, m] of Object.entries(metrics)) {
  console.log(`  ${k}: Adc ${m.dcGainDb} dB, GBW ${(m.gbwHz / 1e6).toFixed(2)} MHz, PM ${m.phaseMarginDeg}°`);
}
