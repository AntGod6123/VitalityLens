/**
 * Workout energy expenditure using W = F × d (work = force × distance).
 *
 * F = weight lifted × gravity (9.81 m/s²)
 * d = range of motion in metres, derived from the user's limb lengths
 *
 * Gross energy = mechanical work / mechanical efficiency (≈ 25% for weight training)
 * Aerobic vs anaerobic split: determined by rep range and workout type.
 */

import {
  ExerciseSet,
  LimbLengths,
  ROMType,
  WorkoutEnergyResult,
  ExerciseEnergyBreakdown,
  WorkoutType,
} from '../types';

const GRAVITY = 9.81;            // m/s²
const JOULES_PER_KCAL = 4184;
const MECHANICAL_EFFICIENCY = 0.25;  // 25% — standard for resistance training

// ─── ROM lookup ──────────────────────────────────────────────────────────────

/**
 * Returns range of motion in metres for a given ROM type and the user's limb lengths.
 * Falls back to anatomically reasonable defaults when measurements are missing.
 */
export function getROMMeters(romType: ROMType, limbs: LimbLengths, squatDepth?: 'parallel' | 'full' | 'quarter'): number {
  const thigh = (limbs.thighLengthCm ?? 45) / 100;
  const lowerLeg = (limbs.lowerLegLengthCm ?? 40) / 100;
  const upperArm = (limbs.upperArmLengthCm ?? 30) / 100;
  const forearm = (limbs.forearmLengthCm ?? 27) / 100;
  const torso = (limbs.torsoLengthCm ?? 55) / 100;
  const foot = (limbs.footLengthCm ?? 26) / 100;

  switch (romType) {
    case 'squat_parallel':
      return thigh;                           // hip descends ~thigh length
    case 'squat_full':
    case 'bodyweight_squat':
      if (squatDepth === 'parallel') return thigh;
      if (squatDepth === 'quarter') return thigh * 0.4;
      return thigh + lowerLeg * 0.6;          // full squat: additional lower leg contribution
    case 'hinge':
      return torso + lowerLeg * 0.5;          // deadlift / RDL — bar travels from floor to hip
    case 'horizontal_push':
      return upperArm * 0.9;                  // bench press: ROM ≈ upper arm
    case 'horizontal_pull':
      return forearm * 0.85;                  // rows: pulling forearm range
    case 'vertical_pull':
      return upperArm + forearm * 0.6;        // pull-up / pulldown: full arm extension
    case 'vertical_push':
      return upperArm + forearm * 0.5;        // OHP: press from shoulder to lockout
    case 'elbow_flex':
      return forearm;                          // curl: elbow ROM ≈ forearm length
    case 'elbow_ext':
      return forearm * 0.9;                   // pushdown / skull crusher
    case 'hip_thrust':
      return torso * 0.4;                     // hip travels ~40% of torso length
    case 'lunge':
      return thigh;                            // rear knee drops thigh-length
    case 'calf':
      return foot * 0.3;                      // ankle plantar flexion ≈ 30% foot length
    case 'lateral_raise':
      return upperArm;                         // arm sweeps upper-arm radius
    case 'fixed_30cm':
    default:
      return 0.30;                             // default 30 cm for unmapped exercises
  }
}

// ─── Metabolic type ──────────────────────────────────────────────────────────

/**
 * Classify whether a set is primarily aerobic or anaerobic.
 * < 8 reps heavy → anaerobic (ATP-PC + glycolytic)
 * 8–15 reps → mixed
 * > 15 reps or cardio → aerobic
 */
export function getMetabolicType(
  reps: number,
  workoutType: WorkoutType,
): 'aerobic' | 'anaerobic' | 'mixed' {
  if (workoutType === 'cardio' || workoutType === 'flexibility') return 'aerobic';
  if (workoutType === 'hiit') return 'mixed';
  if (reps <= 5) return 'anaerobic';
  if (reps <= 15) return 'mixed';
  return 'aerobic';
}

// ─── Core calculation ─────────────────────────────────────────────────────────

interface SetEnergyInput {
  reps: number;
  weightKg: number;
  romMeters: number;
}

function setWorkJoules({ reps, weightKg, romMeters }: SetEnergyInput): number {
  // W = F × d, F = m × g
  // Multiply by 2 to account for eccentric (lowering) phase — body must control the weight down too
  const forceNewtons = weightKg * GRAVITY;
  const joules = forceNewtons * romMeters * reps * 2;
  return joules;
}

function joulesToKcal(joules: number): number {
  return joules / JOULES_PER_KCAL / MECHANICAL_EFFICIENCY;
}

// ─── Session-level calculation ────────────────────────────────────────────────

export function calculateSessionEnergy(
  sessionId: string,
  exercises: ExerciseSet[],
  limbs: LimbLengths,
  workoutType: WorkoutType,
): WorkoutEnergyResult {
  let totalJoules = 0;
  let aerobicKcal = 0;
  let anaerobicKcal = 0;
  const breakdown: ExerciseEnergyBreakdown[] = [];

  for (const ex of exercises) {
    // Import exercise ROM type from the exercise DB lookup (resolved at call site)
    const romType: ROMType = (ex as any)._romType ?? 'fixed_30cm';
    const squatDepth = ex.squatDepth;
    const romMeters = getROMMeters(romType, limbs, squatDepth);

    let exJoules = 0;
    let exReps = 0;
    let exWeight = 0;

    for (const set of ex.sets) {
      const reps = set.reps ?? 0;
      const weight = set.weightKg ?? 0;
      if (reps === 0) continue;

      const joules = setWorkJoules({ reps, weightKg: weight, romMeters });
      exJoules += joules;
      exReps += reps;
      exWeight = Math.max(exWeight, weight);
    }

    const kcal = joulesToKcal(exJoules);
    const metabolicType = getMetabolicType(
      ex.sets.reduce((s, r) => s + (r.reps ?? 0), 0) / Math.max(ex.sets.length, 1),
      workoutType,
    );

    if (metabolicType === 'aerobic') aerobicKcal += kcal;
    else if (metabolicType === 'anaerobic') anaerobicKcal += kcal;
    else { aerobicKcal += kcal * 0.5; anaerobicKcal += kcal * 0.5; }

    totalJoules += exJoules;
    breakdown.push({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      romMeters,
      totalWeightLifted: exWeight,
      totalRepsCompleted: exReps,
      workJoules: exJoules,
      kcal,
      metabolicType,
    });
  }

  return {
    sessionId,
    totalWorkJoules: totalJoules,
    totalKcal: joulesToKcal(totalJoules),
    aerobicKcal,
    anaerobicKcal,
    exerciseBreakdown: breakdown,
  };
}

// ─── TDEE with workout energy ─────────────────────────────────────────────────

/**
 * Full TDEE = BMR × activity_multiplier + workout_kcal_today
 *
 * The activity multiplier covers non-exercise activity thermogenesis (NEAT).
 * Workout energy is additive on top, calculated from actual work done.
 */
export function calculateFullTDEE(
  bmr: number,
  activityLevel: string,
  workoutKcalToday: number,
): { tdee: number; activityKcal: number; workoutKcal: number } {
  const MULTIPLIERS: Record<string, number> = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extra_active: 1.9,
  };
  const multiplier = MULTIPLIERS[activityLevel] ?? 1.2;
  const activityKcal = bmr * (multiplier - 1);   // surplus above BMR from NEAT
  const tdee = bmr + activityKcal + workoutKcalToday;
  return { tdee: Math.round(tdee), activityKcal: Math.round(activityKcal), workoutKcal: Math.round(workoutKcalToday) };
}

// ─── Body composition estimation between baselines ─────────────────────────

/**
 * Estimate current body fat % between measured baselines using:
 *   - Cumulative caloric surplus/deficit
 *   - Aerobic vs anaerobic energy expenditure
 *   - ~3,500 kcal ≈ 0.45 kg fat
 *   - Anaerobic work → prioritises muscle retention / gain
 *
 * Returns estimated delta in body fat kg and LBM kg.
 */
export function estimateBodyCompChange(params: {
  daysSinceBaseline: number;
  cumulativeCalorieBalance: number;  // negative = deficit
  cumulativeAerobicKcal: number;
  cumulativeAnaerobicKcal: number;
  baselineWeightKg: number;
  baselineBFPercent: number;
}): { estimatedBFPercent: number; estimatedWeightKg: number; deltaFatKg: number; deltaLBMKg: number } {
  const {
    cumulativeCalorieBalance,
    cumulativeAerobicKcal,
    cumulativeAnaerobicKcal,
    baselineWeightKg,
    baselineBFPercent,
  } = params;

  const KCAL_PER_KG_FAT = 7700;
  const KCAL_PER_KG_MUSCLE = 5000;  // muscle has water, less calorie-dense than fat

  // Fat loss/gain from calorie balance
  const fatDeltaFromBalance = cumulativeCalorieBalance / KCAL_PER_KG_FAT;

  // Anaerobic work promotes muscle retention — partially offsets fat catabolism during deficit
  const muscleSparingEffect = cumulativeAnaerobicKcal / 15000;  // rough estimate
  const muscleGainFromAnabolic = Math.max(0, cumulativeAnaerobicKcal / 20000);

  const deltaFatKg = -Math.abs(fatDeltaFromBalance) * Math.sign(-cumulativeCalorieBalance)
    + (cumulativeCalorieBalance > 0 ? Math.abs(fatDeltaFromBalance) * 0.3 : 0);

  const deltaLBMKg = muscleSparingEffect + muscleGainFromAnabolic;

  const baseFat = baselineWeightKg * (baselineBFPercent / 100);
  const baseLBM = baselineWeightKg - baseFat;

  const newFat = Math.max(0, baseFat + deltaFatKg);
  const newLBM = Math.max(0, baseLBM + deltaLBMKg);
  const newWeight = newFat + newLBM;
  const newBFPct = (newFat / newWeight) * 100;

  return {
    estimatedBFPercent: Math.round(newBFPct * 10) / 10,
    estimatedWeightKg: Math.round(newWeight * 10) / 10,
    deltaFatKg: Math.round(deltaFatKg * 100) / 100,
    deltaLBMKg: Math.round(deltaLBMKg * 100) / 100,
  };
}
