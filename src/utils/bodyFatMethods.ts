/**
 * Body fat percentage estimation from multiple measurement methods.
 *
 * Methods supported:
 *  - US Navy tape measure (circumference)
 *  - Jackson-Pollock 3-site caliper
 *  - Jackson-Pollock 7-site caliper
 *  - Bio-impedance (direct input + correction)
 *  - Bod Pod / air displacement (direct input)
 *  - DEXA (direct input — gold standard)
 */

// ─── Navy Tape Method ────────────────────────────────────────────────────────

/**
 * US Navy circumference formula (Hodgdon & Beckett, 1984).
 * All inputs in cm, age in years.
 */
export function navyTapeBFPercent(params: {
  sex: 'male' | 'female';
  heightCm: number;
  waistCm: number;
  neckCm: number;
  hipCm?: number;   // required for female
}): number {
  const { sex, heightCm, waistCm, neckCm, hipCm } = params;

  if (sex === 'male') {
    // %BF = 86.010 × log10(abdomen − neck) − 70.041 × log10(height) + 36.76
    return 86.010 * Math.log10(waistCm - neckCm) - 70.041 * Math.log10(heightCm) + 36.76;
  } else {
    if (!hipCm) throw new Error('Hip circumference required for female Navy method');
    // %BF = 163.205 × log10(waist + hip − neck) − 97.684 × log10(height) − 78.387
    return 163.205 * Math.log10(waistCm + hipCm - neckCm) - 97.684 * Math.log10(heightCm) - 78.387;
  }
}

// ─── Jackson-Pollock 3-site caliper ─────────────────────────────────────────

/**
 * JP3 body density formula, then converted to BF% via Siri equation.
 * Sites for male: chest, abdomen, thigh (mm)
 * Sites for female: tricep, suprailiac, thigh (mm)
 */
export function jp3BFPercent(params: {
  sex: 'male' | 'female';
  ageYears: number;
  site1_mm: number;   // chest (M) or tricep (F)
  site2_mm: number;   // abdomen (M) or suprailiac (F)
  site3_mm: number;   // thigh (both)
}): number {
  const { sex, ageYears, site1_mm, site2_mm, site3_mm } = params;
  const sum = site1_mm + site2_mm + site3_mm;

  let density: number;
  if (sex === 'male') {
    density = 1.10938 - 0.0008267 * sum + 0.0000016 * sum * sum - 0.0002574 * ageYears;
  } else {
    density = 1.0994921 - 0.0009929 * sum + 0.0000023 * sum * sum - 0.0001392 * ageYears;
  }

  return siriEquation(density);
}

/**
 * JP7 body density (7-site: chest, midaxillary, tricep, subscapular, abdomen, suprailiac, thigh).
 */
export function jp7BFPercent(params: {
  sex: 'male' | 'female';
  ageYears: number;
  chest_mm: number;
  midaxillary_mm: number;
  tricep_mm: number;
  subscapular_mm: number;
  abdomen_mm: number;
  suprailiac_mm: number;
  thigh_mm: number;
}): number {
  const { sex, ageYears } = params;
  const sum = params.chest_mm + params.midaxillary_mm + params.tricep_mm +
    params.subscapular_mm + params.abdomen_mm + params.suprailiac_mm + params.thigh_mm;

  let density: number;
  if (sex === 'male') {
    density = 1.112 - 0.00043499 * sum + 0.00000055 * sum * sum - 0.00028826 * ageYears;
  } else {
    density = 1.097 - 0.00046971 * sum + 0.00000056 * sum * sum - 0.00012828 * ageYears;
  }

  return siriEquation(density);
}

/** Siri (1956) body density → body fat % */
function siriEquation(bodyDensity: number): number {
  return (495 / bodyDensity - 450);
}

// ─── Bio-impedance correction ────────────────────────────────────────────────

/**
 * BIA devices are accurate ±3–5%. Apply a correction factor based on
 * hydration status. Device reading passed directly; no formula applied
 * since devices vary significantly in accuracy.
 *
 * For best results: measure fasted, same time of day, consistent hydration.
 */
export function biaBFPercent(deviceReading: number, hydrationCorrection: number = 0): number {
  return Math.max(1, deviceReading + hydrationCorrection);
}

// ─── Accuracy ranking ────────────────────────────────────────────────────────

export const BF_METHOD_ACCURACY: Record<string, { relativeError: string; notes: string }> = {
  dexa: {
    relativeError: '±1–2%',
    notes: 'Gold standard. Also measures bone density and regional fat distribution.',
  },
  bodpod: {
    relativeError: '±1–3%',
    notes: 'Air displacement plethysmography. Accurate, non-invasive. Requires lab visit.',
  },
  caliper_jp7: {
    relativeError: '±3–4%',
    notes: '7-site Jackson-Pollock. Most accurate caliper method; requires skilled technician.',
  },
  caliper_jp3: {
    relativeError: '±3–5%',
    notes: '3-site Jackson-Pollock. Good for tracking trends when done by same person consistently.',
  },
  tape_navy: {
    relativeError: '±3–5%',
    notes: 'US Navy circumference formula. Underestimates muscular individuals.',
  },
  bioimpedance: {
    relativeError: '±3–8%',
    notes: 'Varies by device quality and hydration. Best used for trend tracking, not absolute values.',
  },
  visual: {
    relativeError: '±5–15%',
    notes: 'Reference photo comparison. Highly subjective.',
  },
  estimated: {
    relativeError: 'variable',
    notes: 'App-calculated from energy balance between baseline measurements.',
  },
};

export const BF_METHOD_LABELS: Record<string, string> = {
  tape_navy: 'Tape Measure (Navy)',
  caliper_jp3: 'Calipers (3-site JP)',
  caliper_jp7: 'Calipers (7-site JP)',
  bioimpedance: 'Bio-impedance (BIA)',
  bodpod: 'Bod Pod / Air Displacement',
  dexa: 'DEXA Scan',
  visual: 'Visual Estimate',
  estimated: 'App Estimated',
};
