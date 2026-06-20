/**
 * Progressive overload engine.
 *
 * Rule: if a user completes ≥ 93% of their programmed volume for an exercise
 * in a session, the next appearance of that exercise should increase weight.
 *
 * Volume completion = sum(actual reps) / sum(target reps)
 *   - Uses targetReps per set when available, falls back to programmedReps on ExerciseSet.
 *   - Sets with completed === false are included at their actual reps (could be 0).
 *
 * Weight increment table (based on exercise type heuristics by typical load):
 *   Heavy compound (squat, deadlift, bench, row, OHP): +2.5 kg
 *   Light compound / machine:                          +2.0 kg
 *   Isolation / accessory:                             +1.0 kg
 *   Bodyweight / cardio:                               +0 kg (no weight prescription)
 */

import { ExerciseSet, WorkoutSession } from '../types';

export const COMPLETION_THRESHOLD = 0.93; // 93%

// Increment buckets by exercise id pattern
const HEAVY_COMPOUNDS = new Set([
  'squat', 'front-squat', 'deadlift', 'rdl', 'barbell-row',
  'bench-press', 'incline-bench', 'ohp', 'hip-thrust',
]);
const LIGHT_COMPOUNDS = new Set([
  'leg-press', 'leg-curl', 'leg-extension', 'lat-pulldown', 'seated-row',
  'db-ohp', 'dip', 'skull-crusher', 'cable-crossover', 'face-pull', 'lunge',
]);

function weightIncrement(exerciseId: string): number {
  if (HEAVY_COMPOUNDS.has(exerciseId)) return 2.5;
  if (LIGHT_COMPOUNDS.has(exerciseId)) return 2.0;
  return 1.0;
}

export interface SetCompletion {
  setNumber: number;
  targetReps: number;
  actualReps: number;
  targetWeight: number;
  actualWeight: number;
  completionPct: number;
}

export interface ExerciseOverloadResult {
  exerciseId: string;
  exerciseName: string;
  /** Last session this exercise appeared in */
  lastSessionDate: string;
  lastSessionName: string;
  /** Volume completion for that session (0–1) */
  completionRate: number;
  /** Whether the 93% threshold was met */
  thresholdMet: boolean;
  /** Weight used in the last session */
  lastWeightKg: number;
  /** Recommended weight for next session */
  nextWeightKg: number;
  /** Increment applied (0 if threshold not met) */
  incrementKg: number;
  /** Total reps completed vs programmed */
  totalActualReps: number;
  totalTargetReps: number;
  /** Average RPE if logged */
  avgRpe: number | null;
  /** Per-set breakdown */
  sets: SetCompletion[];
  /** All-time personal best weight */
  allTimeBestKg: number;
  /** Number of sessions this exercise has appeared in */
  sessionCount: number;
  /** Completion rate history (last 8 sessions, newest last) */
  completionHistory: number[];
}

/**
 * Derive completion rate for a single ExerciseSet entry within a session.
 */
export function exerciseCompletionRate(ex: ExerciseSet): {
  rate: number;
  totalActual: number;
  totalTarget: number;
  sets: SetCompletion[];
} {
  let totalActual = 0;
  let totalTarget = 0;
  const sets: SetCompletion[] = [];

  for (const s of ex.sets) {
    const target = s.targetReps ?? ex.programmedReps ?? s.reps ?? 0;
    const actual = s.reps ?? 0;
    const targetWeight = s.targetWeightKg ?? ex.programmedWeightKg ?? s.weightKg ?? 0;
    const actualWeight = s.weightKg ?? 0;

    totalActual += actual;
    totalTarget += target;

    sets.push({
      setNumber: s.setNumber,
      targetReps: target,
      actualReps: actual,
      targetWeight,
      actualWeight,
      completionPct: target > 0 ? actual / target : 1,
    });
  }

  return {
    rate: totalTarget > 0 ? totalActual / totalTarget : 1,
    totalActual,
    totalTarget,
    sets,
  };
}

/**
 * Scan all sessions (sorted oldest→newest) and produce one
 * ExerciseOverloadResult per unique exercise, based on the LAST session
 * each exercise appeared in.
 */
export function computeOverloadTargets(sessions: WorkoutSession[]): ExerciseOverloadResult[] {
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // Track per-exercise across sessions
  const map = new Map<
    string,
    {
      name: string;
      allTimeBest: number;
      sessionCount: number;
      completionHistory: number[];
      lastResult: Omit<ExerciseOverloadResult, 'allTimeBestKg' | 'sessionCount' | 'completionHistory'>;
    }
  >();

  for (const session of sorted) {
    for (const ex of session.exercises) {
      const { rate, totalActual, totalTarget, sets } = exerciseCompletionRate(ex);

      const maxWeight = Math.max(...ex.sets.map(s => s.weightKg ?? 0), 0);
      const lastWeight = ex.sets[ex.sets.length - 1]?.weightKg ?? 0;
      const rpeValues = ex.sets.map(s => s.rpe).filter((r): r is number => r !== undefined);
      const avgRpe = rpeValues.length > 0
        ? rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length
        : null;

      const thresholdMet = rate >= COMPLETION_THRESHOLD;
      const inc = thresholdMet ? weightIncrement(ex.exerciseId) : 0;
      const nextWeight = lastWeight + inc;

      const existing = map.get(ex.exerciseId);
      const allTimeBest = Math.max(existing?.allTimeBest ?? 0, maxWeight);

      map.set(ex.exerciseId, {
        name: ex.exerciseName,
        allTimeBest,
        sessionCount: (existing?.sessionCount ?? 0) + 1,
        completionHistory: [...(existing?.completionHistory ?? []), Math.round(rate * 100) / 100].slice(-8),
        lastResult: {
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          lastSessionDate: session.date,
          lastSessionName: session.name,
          completionRate: rate,
          thresholdMet,
          lastWeightKg: lastWeight,
          nextWeightKg: nextWeight,
          incrementKg: inc,
          totalActualReps: totalActual,
          totalTargetReps: totalTarget,
          avgRpe,
          sets,
        },
      });
    }
  }

  return [...map.values()]
    .map(v => ({
      ...v.lastResult,
      allTimeBestKg: v.allTimeBest,
      sessionCount: v.sessionCount,
      completionHistory: v.completionHistory,
    }))
    .sort((a, b) => {
      // Threshold-met first, then by session count
      if (a.thresholdMet !== b.thresholdMet) return a.thresholdMet ? -1 : 1;
      return b.sessionCount - a.sessionCount;
    });
}
