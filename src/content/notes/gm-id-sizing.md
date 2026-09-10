---
title: Sizing with gm/ID instead of square-law
summary: Why the hand equations stop working below about 200 mV of overdrive, and what to use once they do.
date: 2026-03-08
tags: [analog, sky130, methodology]
draft: true
---

The square-law model taught in a first electronics course says drain current
rises with the square of overdrive voltage, and that transconductance follows as
`gm = 2·ID/Vov`. In a modern short-channel process that relationship is roughly
right in strong inversion and quietly wrong everywhere designers actually bias.

## The problem

Analog designers want transconductance per unit current, because that ratio is
what turns a power budget into a bandwidth. Square-law says `gm/ID = 2/Vov`,
which predicts unbounded efficiency as overdrive goes to zero. Real devices
saturate at `gm/ID ≈ 1/(n·V_T)`, somewhere near 25–28 V⁻¹ at room temperature,
because in weak inversion the device is exponential rather than quadratic.

Bias a sky130 NFET at 100 mV of overdrive and square-law will promise 20 V⁻¹
where the device delivers something closer to 22 V⁻¹ — and, more importantly,
will give the wrong `f_T`, so the pole positions the whole compensation scheme
depends on are wrong.

## The method

Stop solving for W/L directly. Instead:

1. Pick `gm/ID` from what the stage needs. Roughly: 5–10 V⁻¹ for a stage that
   must be fast, 15–20 V⁻¹ for one that must be efficient and low-noise, above
   20 V⁻¹ only when speed genuinely does not matter.
2. Get `gm` from the specification — for a Miller amplifier,
   `gm₁ = 2π · GBW · C_C`.
3. Divide: `ID = gm / (gm/ID)`. That is the current the stage costs.
4. Look up `ID/W` at that `gm/ID` and channel length in a characterisation sweep,
   and read off the width.

Step 4 is why this is a lookup method rather than a formula. It needs one sweep
per channel length, run once and reused for every design in that process.

## Generating the tables

A DC sweep of a single device, stepped over length, gives everything:

```spice
* gm/ID characterisation, sky130 NFET
.include $PDK_ROOT/sky130A/libs.tech/ngspice/sky130.lib.spice
XM1 d g 0 0 sky130_fd_pr__nfet_01v8 W=10 L={L}
VG g 0 0.9
VD d 0 0.9
.dc VG 0 1.8 0.005
.control
  foreach len 0.15 0.25 0.5 1 2
    alterparam L=$len
    reset
    run
    write gmid_L$len.raw all
  end
.endc
```

Post-process with `gm = d(ID)/d(VGS)` and plot `gm/ID` against `ID/W`. The
result is process knowledge that outlives any single project — the same chart
sizes the input pair of an amplifier, the tail of a comparator, and the mirror
in a bias cell.

## The part that matters

The method's real value is not accuracy. It is that it makes the trade explicit:
`gm/ID` *is* the efficiency knob, and choosing it is choosing where on the
speed-versus-power curve the stage sits. Square-law hides that decision inside a
width.
