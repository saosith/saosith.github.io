---
title: Getting ngspice results onto this site without redrawing them
summary: A rawfile-to-JSON step that keeps every published plot traceable to the simulation that produced it.
date: 2026-05-21
tags: [tooling, ngspice, methodology]
---

Screenshotting a simulator window is the fastest way to publish a result and the
fastest way to publish a stale one. Six months later nobody — including you —
can say which netlist produced the picture, what the load was, or whether it
predates the bug you fixed.

The pipeline behind every plot on this site is three steps, all scripted.

## 1. Write ASCII rawfiles

ngspice writes binary by default, which is compact and unreadable. One option
changes that:

```spice
.option filetype=ascii
```

Then run headless, one rawfile per corner:

```bash
for c in TT FF SS FS SF; do
  ngspice -b -D corner=$c -r sim/ac_$c.raw sim/opamp_ac.spice
done
```

## 2. Convert to JSON

`scripts/raw-to-json.mjs` parses the rawfile header, pulls the requested node,
and — for a complex-valued AC analysis — derives gain in dB, unwrapped phase,
the 0 dB crossover and the phase margin:

```bash
node scripts/raw-to-json.mjs \
  --out public/data/opamp-ac.json \
  --node "v(out)" \
  --source simulated \
  --conditions "VDD = 1.8 V, T = 27 °C, CL = 2 pF" \
  TT=sim/ac_TT.raw FF=sim/ac_FF.raw SS=sim/ac_SS.raw
```

Phase unwrapping is the part worth writing carefully. `atan2` returns a
principal value, so a raw phase trace jumps by 360° somewhere in the middle of
the sweep and the phase margin computed from it is nonsense. Accumulating an
offset whenever consecutive samples differ by more than 180° fixes it.

## 3. Let the page derive its own numbers

The chart reads that JSON, and the summary table underneath is computed from the
same array the curve is drawn from. Nothing is typed in twice, so the table and
the trace cannot disagree — and re-running the simulation updates the prose
numbers, the table and the plot together.

Two habits fall out of this that are worth keeping regardless of tooling:

- **The conditions travel with the data.** They live in the JSON's `meta` block
  and are rendered above every plot, so a bandwidth is never quoted without the
  load it was measured into.
- **The provenance travels too.** A `source` field distinguishes hand model from
  simulation from measured silicon, and the page renders it as a visible badge.
  It is much harder to accidentally present a model as a measurement when the
  page states which one it is.
