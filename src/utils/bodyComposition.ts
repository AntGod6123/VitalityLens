/**
 * Body composition calculation utilities.
 * Formulas sourced from:
 *  - Katch-McArdle BMR/RMR: https://www.omnicalculator.com/health/bmr-katch-mcardle
 *  - FFMI: https://mennohenselmans.com/ffmi-calculator/
 *  - Natural muscle potential: https://natfitpro.com/natural-muscle-potential-calculator/
 */

// ─── BMR / RMR ──────────────────────────────────────────────────────────────

/**
 * Katch-McArdle BMR using lean body mass.
 * BMR = 370 + (21.6 × LBM in kg)
 */
export function katchMcArdleBMR(leanBodyMassKg: number): number {
  return 370 + 21.6 * leanBodyMassKg;
}

/**
 * Mifflin-St Jeor BMR as a fallback when body fat % is unavailable.
 */
export function mifflinStJeorBMR(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: 'male' | 'female',
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return sex === 'male' ? base + 5 : base - 161;
}

// ─── TDEE ───────────────────────────────────────────────────────────────────

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

export function calculateTDEE(bmr: number, activityLevel: string): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.2;
  return Math.round(bmr * multiplier);
}

// ─── LBM ────────────────────────────────────────────────────────────────────

export function calculateLBM(weightKg: number, bodyFatPercent: number): number {
  return weightKg * (1 - bodyFatPercent / 100);
}

export function calculateFatMass(weightKg: number, bodyFatPercent: number): number {
  return weightKg * (bodyFatPercent / 100);
}

// ─── FFMI / FMI / BMI ───────────────────────────────────────────────────────

/**
 * Fat-Free Mass Index = LBM(kg) / height(m)²
 * Normalised FFMI adds (6.1 × (1.8 − height_m)) per Kouri et al.
 */
export function calculateFFMI(leanBodyMassKg: number, heightCm: number): number {
  const h = heightCm / 100;
  return leanBodyMassKg / (h * h);
}

export function calculateNormalisedFFMI(leanBodyMassKg: number, heightCm: number): number {
  const h = heightCm / 100;
  const ffmi = leanBodyMassKg / (h * h);
  return ffmi + 6.1 * (1.8 - h);
}

/**
 * Fat Mass Index = FatMass(kg) / height(m)²
 * Provides a height-normalised view of fat mass separate from BMI.
 */
export function calculateFMI(fatMassKg: number, heightCm: number): number {
  const h = heightCm / 100;
  return fatMassKg / (h * h);
}

export function calculateBMI(weightKg: number, heightCm: number): number {
  const h = heightCm / 100;
  return weightKg / (h * h);
}

// ─── VO2max Estimates ────────────────────────────────────────────────────────

/** Rockport Walk Test estimate */
export function vo2maxRockport(
  weightKg: number,
  ageYears: number,
  sex: 'male' | 'female',
  walkTimeMinutes: number,
  heartRateBpm: number,
): number {
  const sexFactor = sex === 'male' ? 1 : 0;
  return (
    132.853 -
    0.0769 * (weightKg * 2.205) -
    0.3877 * ageYears +
    6.315 * sexFactor -
    3.2649 * walkTimeMinutes -
    0.1565 * heartRateBpm
  );
}

// ─── Natural Muscle Potential ────────────────────────────────────────────────

/**
 * Berkhan / Martin model: max LBM at ~5–6% body fat.
 * Peak LBM (kg) = height_cm − 100
 * At competition leanness (~5% BF).
 */
export function naturalLBMCeiling(heightCm: number): number {
  return heightCm - 100;
}

/**
 * Casey Butt wrist & ankle formula for maximum muscular potential.
 * Returns estimated max body weight at ~5% body fat.
 */
export function caseyButtPotential(
  heightCm: number,
  wristCm: number,
  ankleCm: number,
): number {
  const h = heightCm / 2.54; // inches
  const w = wristCm / 2.54;
  const a = ankleCm / 2.54;
  return (
    (h * 0.10212 + w * 0.085155 + a * 0.14363 - 14.507) * 0.453592
  );
}

// ─── Calorie Targets ────────────────────────────────────────────────────────

export function cuttingCalories(tdee: number, deficitPercent = 20): number {
  return Math.round(tdee * (1 - deficitPercent / 100));
}

export function bulkingCalories(tdee: number, surplusPercent = 10): number {
  return Math.round(tdee * (1 + surplusPercent / 100));
}

export function proteinTargetG(leanBodyMassKg: number, multiplier = 2.2): number {
  return Math.round(leanBodyMassKg * multiplier);
}
