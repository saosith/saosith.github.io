#!/usr/bin/env node
/**
 * Convert ngspice ASCII rawfiles into the JSON the site's charts read.
 *
 *   ngspice -b -r ac_TT.raw opamp_ac.spice      # note: write ASCII with
 *   # .option filetype=ascii   (or run `write ac_TT.raw` from the ngspice prompt)
 *
 *   node scripts/raw-to-json.mjs \
 *     --out public/data/opamp-ac.json \
 *     --node "v(out)" \
 *     --conditions "VDD = 1.8 V, T = 27 degC, CL = 2 pF" \
 *     --source simulated \
 *     TT=sim/ac_TT.raw FF=sim/ac_FF.raw SS=sim/ac_SS.raw
 *
 * AC (complex) rawfiles produce gain_db / phase_deg per corner and derive
 * DC gain, 0 dB crossover and phase margin. Real-valued rawfiles (DC sweep,
 * e.g. a bandgap TC run) produce a plain y-series per corner instead.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

function parseRaw(text) {
  const lines = text.split(/\r?\n/);
  const head = {};
  let i = 0, vars = [];
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (/^Variables:/i.test(line)) {
      const n = Number(head['no. variables']);
      for (let k = 1; k <= n; k++) {
        const parts = lines[i + k].trim().split(/\s+/);
        vars.push({ index: Number(parts[0]), name: parts[1], type: parts[2] });
      }
      i += n;
      continue;
    }
    if (/^Values:/i.test(line)) { i++; break; }
    if (/^Binary:/i.test(line)) throw new Error('Binary rawfile. Re-run ngspice with `.option filetype=ascii`.');
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (m) head[m[1].trim().toLowerCase()] = m[2].trim();
  }
  const nPoints = Number(head['no. points']);
  const complex = /complex/i.test(head.flags || '');
  const cols = vars.map(() => []);
  let row = -1, col = 0;
  for (; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    const toks = t.split(/\s+/);
    if (/^\d+$/.test(toks[0]) && toks.length > 1) { row = Number(toks[0]); col = 0; toks.shift(); }
    for (const tok of toks) {
      if (col >= vars.length) break;
      cols[col].push(complex ? tok.split(',').map(Number) : Number(tok));
      col++;
    }
    if (row >= nPoints - 1 && col >= vars.length) break;
  }
  return { head, vars, cols, complex, nPoints };
}

const args = process.argv.slice(2);
const opt = (name, def) => {
  const k = args.indexOf(`--${name}`);
  return k === -1 ? def : args[k + 1];
};
if (args.includes('--help') || args.length === 0) {
  console.log(readFileSync(new URL(import.meta.url)).toString().split('*/')[0].replace(/^\/\*\*?/, ''));
  process.exit(0);
}
const outPath = opt('out', 'public/data/out.json');
const nodeName = (opt('node', 'v(out)') || '').toLowerCase();
const source = opt('source', 'simulated');
const conditions = opt('conditions', '');
const title = opt('title', 'Simulated response');
const pairs = args.filter((a) => /^[A-Za-z0-9_]+=.+/.test(a)).map((a) => {
  const k = a.indexOf('=');
  return [a.slice(0, k), a.slice(k + 1)];
});
if (!pairs.length) { console.error('No CORNER=file.raw arguments given. See --help.'); process.exit(1); }

let xAxis = null, isComplex = false;
const corners = {}, metrics = {};
for (const [corner, file] of pairs) {
  const { vars, cols, complex } = parseRaw(readFileSync(file, 'utf8'));
  isComplex = complex;
  const yi = vars.findIndex((v) => v.name.toLowerCase() === nodeName);
  if (yi === -1) throw new Error(`Node "${nodeName}" not in ${file}. Available: ${vars.map((v) => v.name).join(', ')}`);
  const x = cols[0].map((v) => (Array.isArray(v) ? v[0] : v));
  if (!xAxis) xAxis = x;

  if (complex) {
    const gain = cols[yi].map(([re, im]) => +(20 * Math.log10(Math.hypot(re, im))).toFixed(4));
    // Unwrap phase so the trace does not jump +-360 deg mid-plot.
    let prev = 0, acc = 0;
    const phase = cols[yi].map(([re, im], k) => {
      let p = (Math.atan2(im, re) * 180) / Math.PI;
      if (k > 0) { const d = p + acc - prev; if (d > 180) acc -= 360; else if (d < -180) acc += 360; }
      prev = p + acc;
      return +prev.toFixed(4);
    });
    let fc = null, pm = null;
    for (let k = 1; k < gain.length; k++) {
      if (gain[k - 1] > 0 && gain[k] <= 0) {
        const t = gain[k - 1] / (gain[k - 1] - gain[k]);
        fc = Math.pow(10, Math.log10(x[k - 1]) + t * (Math.log10(x[k]) - Math.log10(x[k - 1])));
        pm = 180 + (phase[k - 1] + t * (phase[k] - phase[k - 1]));
        break;
      }
    }
    corners[corner] = { gain_db: gain, phase_deg: phase };
    metrics[corner] = {
      dcGainDb: +gain[0].toFixed(1),
      gbwHz: fc,
      phaseMarginDeg: pm === null ? null : +pm.toFixed(1),
    };
  } else {
    corners[corner] = cols[yi].map((v) => +Number(v).toFixed(7));
  }
}

const payload = isComplex
  ? { meta: { title, source, conditions, generated: new Date().toISOString().slice(0, 10),
              xLabel: 'Frequency', xUnit: 'Hz', yLabel: 'Open-loop gain', yUnit: 'dB' },
      freq_hz: xAxis, corners, metrics }
  : { meta: { title, source, conditions, generated: new Date().toISOString().slice(0, 10),
              xLabel: 'Sweep', xUnit: '', yLabel: nodeName, yUnit: '' },
      x: xAxis, corners };

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(payload, null, 1));
console.log(`Wrote ${outPath} (${pairs.length} corner(s), ${xAxis.length} points).`);
if (isComplex) for (const [k, m] of Object.entries(metrics)) {
  console.log(`  ${k}: Adc ${m.dcGainDb} dB, GBW ${m.gbwHz ? (m.gbwHz / 1e6).toFixed(2) + ' MHz' : 'no crossover'}, PM ${m.phaseMarginDeg ?? 'n/a'}`);
}
