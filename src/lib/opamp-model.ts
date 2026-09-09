/**
 * First-order design model for a two-stage Miller-compensated op-amp.
 *
 * This is a hand model — square-law drain current, single-pole-pair
 * compensation, lumped output pole — of the kind used to pick a starting point
 * before the first simulation. It is NOT a simulator, and the explorer that
 * uses it says so on the page. Its job is to show which way each knob pushes
 * the trade-off, at roughly the right magnitude.
 *
 * Process constants are order-of-magnitude sky130 values; replace them with
 * your own extracted numbers if you want the explorer to track your PDK.
 */

export interface DesignInputs {
  /** Tail current of the input pair, in microamps. */
  ibiasUa: number;
  /** Input-pair aspect ratio W/L. */
  wl1: number;
  /** Miller compensation capacitor, in picofarads. */
  ccPf: number;
  /** Load capacitance, in picofarads. */
  clPf: number;
  /** Second-stage current as a multiple of the tail current. */
  stage2Ratio: number;
}

export interface DesignOutputs {
  dcGainDb: number;
  gbwMhz: number;
  phaseMarginDeg: number;
  slewRateVus: number;
  powerUw: number;
  secondPoleMhz: number;
  zeroMhz: number;
  inputVovMv: number;
}

const KP_N = 120e-6;   // µnCox, A/V²
const KP_P = 40e-6;    // µpCox, A/V²
// Channel-length modulation for the long devices this design uses. Short
// devices would put lambda near 0.06 and cost roughly 35 dB of DC gain, which
// is why gain-critical stages here are drawn long.
const LAMBDA_N = 0.010; // 1/V
const LAMBDA_P = 0.013;
const VDD = 1.8;
const WL2 = 75;        // second-stage device W/L — wide, to buy gm6 without current

export function solveDesign(i: DesignInputs): DesignOutputs {
  const ibias = i.ibiasUa * 1e-6;
  const cc = i.ccPf * 1e-12;
  const cl = i.clPf * 1e-12;

  // --- input pair ---
  const id1 = ibias / 2;
  const gm1 = Math.sqrt(2 * KP_N * i.wl1 * id1);
  const vov1 = (2 * id1) / gm1;
  const ro1 = 1 / (LAMBDA_N * id1);
  const ro3 = 1 / (LAMBDA_P * id1);
  const rout1 = (ro1 * ro3) / (ro1 + ro3);
  const av1 = gm1 * rout1;

  // --- second stage ---
  const id6 = ibias * i.stage2Ratio;
  const gm6 = Math.sqrt(2 * KP_P * WL2 * id6);
  const ro6 = 1 / (LAMBDA_P * id6);
  const ro7 = 1 / (LAMBDA_N * id6);
  const rout2 = (ro6 * ro7) / (ro6 + ro7);
  const av2 = gm6 * rout2;

  const adc = av1 * av2;

  // --- dynamics ---
  const gbw = gm1 / (2 * Math.PI * cc);                    // Hz
  const fp2 = gm6 / (2 * Math.PI * (cl + cc * 0.25));      // output pole, loaded
  const fz = gm6 / (2 * Math.PI * cc);                     // where the RHP zero would sit

  // The nulling resistor is sized at RZ = 1/gm6, which pushes that zero to
  // infinity, so only the two poles set the phase at crossover.
  const phase = -90 - (Math.atan(gbw / fp2) * 180) / Math.PI;
  const pm = 180 + phase;

  const sr = ibias / cc;                                   // V/s
  const itotal = ibias * (1 + i.stage2Ratio) + ibias * 0.25; // + bias branch
  const power = VDD * itotal;

  return {
    dcGainDb: 20 * Math.log10(adc),
    gbwMhz: gbw / 1e6,
    phaseMarginDeg: pm,
    slewRateVus: sr / 1e6,
    powerUw: power * 1e6,
    secondPoleMhz: fp2 / 1e6,
    zeroMhz: fz / 1e6,
    inputVovMv: vov1 * 1e3,
  };
}

/**
 * Render the model as a Bode dataset, in the same shape the corner plots use,
 * so the explorer and the simulated plots share one drawing routine.
 *
 * A(s) = Adc / ((1 + s/wp1)(1 + s/wp2))  — the nulling resistor removes the zero,
 * so the plotted curve and the phase-margin readout come from the same two poles.
 */
export function modelResponse(i: DesignInputs) {
  const d = solveDesign(i);
  const adc = Math.pow(10, d.dcGainDb / 20);
  const fp1 = (d.gbwMhz * 1e6) / adc;
  const fp2 = d.secondPoleMhz * 1e6;

  const freq: number[] = [];
  for (let k = 0; k <= 9 * 24; k++) freq.push(Math.pow(10, k / 24));

  const gain: number[] = [], phase: number[] = [];
  for (const f of freq) {
    // |A| and arg(A) from the pole-zero form, evaluated on the jw axis.
    const mag = adc / (Math.sqrt(1 + (f / fp1) ** 2) * Math.sqrt(1 + (f / fp2) ** 2));
    const ph = -Math.atan(f / fp1) - Math.atan(f / fp2);
    gain.push(+(20 * Math.log10(mag)).toFixed(4));
    phase.push(+((ph * 180) / Math.PI).toFixed(4));
  }

  let fc: number | null = null, pm: number | null = null;
  for (let k = 1; k < gain.length; k++) {
    if (gain[k - 1] > 0 && gain[k] <= 0) {
      const t = gain[k - 1] / (gain[k - 1] - gain[k]);
      fc = Math.pow(10, Math.log10(freq[k - 1]) + t * (Math.log10(freq[k]) - Math.log10(freq[k - 1])));
      pm = 180 + (phase[k - 1] + t * (phase[k] - phase[k - 1]));
      break;
    }
  }

  return {
    meta: {
      title: 'Open-loop response from the design model',
      conditions: `IBIAS = ${i.ibiasUa} µA, CC = ${i.ccPf} pF, CL = ${i.clPf} pF, (W/L)₁ = ${i.wl1}`,
      source: 'model',
    },
    freq_hz: freq,
    corners: { Design: { gain_db: gain, phase_deg: phase } },
    metrics: {
      Design: {
        dcGainDb: +d.dcGainDb.toFixed(1),
        gbwHz: fc,
        phaseMarginDeg: pm === null ? null : +pm.toFixed(1),
      },
    },
    outputs: d,
  };
}

/** Spec window used to colour each readout. */
export const TARGETS = {
  dcGainDb: { min: 100, label: 'DC gain', unit: 'dB', digits: 1 },
  gbwMhz: { min: 20, label: 'Gain–bandwidth', unit: 'MHz', digits: 2 },
  phaseMarginDeg: { min: 60, label: 'Phase margin', unit: '°', digits: 1 },
  slewRateVus: { min: 10, label: 'Slew rate', unit: 'V/µs', digits: 2 },
  powerUw: { max: 350, label: 'Static power', unit: 'µW', digits: 1 },
  secondPoleMhz: { label: 'Second pole', unit: 'MHz', digits: 1 },
} as const;

export type TargetKey = keyof typeof TARGETS;

export function meets(key: TargetKey, value: number): boolean {
  const t = TARGETS[key] as { min?: number; max?: number };
  if (t.min !== undefined && value < t.min) return false;
  if (t.max !== undefined && value > t.max) return false;
  return true;
}
