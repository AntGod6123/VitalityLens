import { BiomarkerLog, BiomarkerRating, BiomarkerType } from '../types';

// ─── Reference data ───────────────────────────────────────────────────────────

export const BIOMARKER_META: Record<
  BiomarkerType,
  {
    label: string;
    unit: string;
    icon: string;
    higherIsBetter: boolean;
    description: string;
  }
> = {
  vo2max:       { label: 'VO₂ Max',        unit: 'mL/kg/min', icon: 'fitness-outline',      higherIsBetter: true,  description: 'Maximal aerobic capacity — the single strongest predictor of longevity.' },
  resting_hr:   { label: 'Resting HR',     unit: 'bpm',       icon: 'heart-outline',         higherIsBetter: false, description: 'Lower resting heart rate indicates stronger cardiovascular fitness.' },
  hrv:          { label: 'HRV',            unit: 'ms',        icon: 'pulse-outline',          higherIsBetter: true,  description: 'Heart rate variability (RMSSD) — reflects autonomic recovery capacity.' },
  grip_strength:{ label: 'Grip Strength',  unit: 'kg',        icon: 'barbell-outline',        higherIsBetter: true,  description: 'Grip strength is a strong predictor of all-cause mortality and muscle function.' },
  sleep_hours:  { label: 'Sleep Duration', unit: 'h',         icon: 'moon-outline',           higherIsBetter: true,  description: 'Adults need 7–9 hours for optimal recovery and longevity.' },
  sleep_quality:{ label: 'Sleep Quality',  unit: '/10',       icon: 'star-outline',           higherIsBetter: true,  description: 'Subjective sleep quality from 1 (poor) to 10 (excellent).' },
  systolic_bp:  { label: 'Systolic BP',    unit: 'mmHg',      icon: 'thermometer-outline',    higherIsBetter: false, description: 'Upper blood pressure number. Optimal is below 120 mmHg.' },
  diastolic_bp: { label: 'Diastolic BP',   unit: 'mmHg',      icon: 'thermometer-outline',    higherIsBetter: false, description: 'Lower blood pressure number. Optimal is below 80 mmHg.' },
  steps:        { label: 'Daily Steps',    unit: 'steps',     icon: 'footsteps-outline',      higherIsBetter: true,  description: 'Daily step count — each 1,000 steps reduces mortality risk by ~6%.' },
};

// Score weight per marker (must sum to 1)
const WEIGHTS: Partial<Record<BiomarkerType, number>> = {
  vo2max:        0.25,
  resting_hr:    0.15,
  hrv:           0.18,
  grip_strength: 0.14,
  sleep_hours:   0.14,
  sleep_quality: 0.08,
  systolic_bp:   0.03,
  diastolic_bp:  0.03,
};

// ─── Per-marker normalisation (0–100) ─────────────────────────────────────────

function normaliseVo2Max(v: number, sex: 'male' | 'female'): number {
  const [poor, fair, good, excellent, elite] =
    sex === 'male' ? [28, 36, 44, 52, 60] : [23, 30, 38, 47, 55];
  if (v >= elite)     return 100;
  if (v >= excellent) return 80 + 20 * ((v - excellent) / (elite - excellent));
  if (v >= good)      return 60 + 20 * ((v - good) / (excellent - good));
  if (v >= fair)      return 40 + 20 * ((v - fair) / (good - fair));
  if (v >= poor)      return 20 + 20 * ((v - poor) / (fair - poor));
  return Math.max(0, 20 * (v / poor));
}

function normaliseRHR(v: number): number {
  // lower is better; <45 elite, 45-59 excellent, 60-69 good, 70-79 average, ≥80 poor
  if (v < 45) return 100;
  if (v < 60) return 80 + 20 * ((60 - v) / 15);
  if (v < 70) return 60 + 20 * ((70 - v) / 10);
  if (v < 80) return 40 + 20 * ((80 - v) / 10);
  return Math.max(0, 40 * ((100 - v) / 20));
}

function normaliseHRV(v: number): number {
  // RMSSD ms: <20 poor, 20-39 fair, 40-59 good, 60-99 excellent, ≥100 elite
  if (v >= 100) return 100;
  if (v >= 60)  return 80 + 20 * ((v - 60) / 40);
  if (v >= 40)  return 60 + 20 * ((v - 40) / 20);
  if (v >= 20)  return 30 + 30 * ((v - 20) / 20);
  return Math.max(0, 30 * (v / 20));
}

function normaliseGrip(v: number, sex: 'male' | 'female'): number {
  const [poor, fair, good, excellent, elite] =
    sex === 'male' ? [28, 36, 44, 52, 60] : [16, 22, 28, 34, 42];
  if (v >= elite)     return 100;
  if (v >= excellent) return 80 + 20 * ((v - excellent) / (elite - excellent));
  if (v >= good)      return 60 + 20 * ((v - good) / (excellent - good));
  if (v >= fair)      return 40 + 20 * ((v - fair) / (good - fair));
  if (v >= poor)      return 20 + 20 * ((v - poor) / (fair - poor));
  return Math.max(0, 20 * (v / poor));
}

function normaliseSleepHours(v: number): number {
  // Optimal 7–9h. Penalty below 6 and above 10.
  if (v >= 7 && v <= 9) return 100;
  if (v >= 6 && v < 7)  return 70 + 30 * (v - 6);
  if (v > 9  && v <= 10) return 70 + 30 * (10 - v);
  if (v >= 5 && v < 6)  return 40 + 30 * (v - 5);
  if (v > 10 && v <= 11) return 40 + 30 * (11 - v);
  return Math.max(0, 40 * (v / 5));
}

function normaliseSleepQuality(v: number): number {
  return Math.min(100, Math.max(0, (v / 10) * 100));
}

function normaliseBP(systolic: number, diastolic: number): { sys: number; dia: number } {
  // Systolic: <120 excellent, 120-129 elevated, 130-139 stage1, ≥140 stage2
  const sys = systolic < 120 ? 100
    : systolic < 130 ? 80 - 20 * ((systolic - 120) / 10)
    : systolic < 140 ? 60 - 20 * ((systolic - 130) / 10)
    : Math.max(0, 40 - 40 * ((systolic - 140) / 40));
  // Diastolic: <80 excellent, 80-89 stage1, ≥90 stage2
  const dia = diastolic < 80 ? 100
    : diastolic < 90 ? 80 - 40 * ((diastolic - 80) / 10)
    : Math.max(0, 40 - 40 * ((diastolic - 90) / 20));
  return { sys, dia };
}

function normaliseSteps(v: number): number {
  if (v >= 12000) return 100;
  if (v >= 10000) return 85 + 15 * ((v - 10000) / 2000);
  if (v >= 7500)  return 65 + 20 * ((v - 7500) / 2500);
  if (v >= 5000)  return 40 + 25 * ((v - 5000) / 2500);
  return Math.max(0, 40 * (v / 5000));
}

// ─── Rating label from normalised score ───────────────────────────────────────

export function ratingFromScore(score: number): BiomarkerRating {
  if (score >= 90) return 'elite';
  if (score >= 75) return 'excellent';
  if (score >= 55) return 'good';
  if (score >= 35) return 'average';
  return 'poor';
}

export const RATING_COLORS: Record<BiomarkerRating, string> = {
  elite:     '#8B5CF6',
  excellent: '#22C55E',
  good:      '#3B82F6',
  average:   '#F97316',
  poor:      '#EF4444',
};

// ─── Per-marker score ─────────────────────────────────────────────────────────

export function scoreBiomarker(
  type: BiomarkerType,
  value: number,
  sex: 'male' | 'female' = 'male',
): number {
  switch (type) {
    case 'vo2max':        return normaliseVo2Max(value, sex);
    case 'resting_hr':    return normaliseRHR(value);
    case 'hrv':           return normaliseHRV(value);
    case 'grip_strength': return normaliseGrip(value, sex);
    case 'sleep_hours':   return normaliseSleepHours(value);
    case 'sleep_quality': return normaliseSleepQuality(value);
    case 'systolic_bp':   return normaliseBP(value, 75).sys;
    case 'diastolic_bp':  return normaliseBP(120, value).dia;
    case 'steps':         return normaliseSteps(value);
    default: return 50;
  }
}

// ─── Composite longevity score ────────────────────────────────────────────────

export interface MarkerSummary {
  type: BiomarkerType;
  latestValue: number;
  latestDate: string;
  score: number;
  rating: BiomarkerRating;
  history: { date: string; value: number; score: number }[];
  trend: 'up' | 'down' | 'stable';
}

export interface LongevityScoreResult {
  composite: number;                // 0–100
  rating: BiomarkerRating;
  markers: MarkerSummary[];
  trackedCount: number;
}

export function computeLongevityScore(
  logs: BiomarkerLog[],
  sex: 'male' | 'female' = 'male',
): LongevityScoreResult {
  // Group logs by type, sorted oldest→newest
  const byType = new Map<BiomarkerType, BiomarkerLog[]>();
  for (const log of [...logs].sort((a, b) => a.date.localeCompare(b.date))) {
    const arr = byType.get(log.type) ?? [];
    arr.push(log);
    byType.set(log.type, arr);
  }

  const markers: MarkerSummary[] = [];
  let weightedSum = 0;
  let weightedTotal = 0;

  for (const [type, entries] of byType.entries()) {
    if (entries.length === 0) continue;

    const latest = entries[entries.length - 1];
    const score = scoreBiomarker(type, latest.value, sex);
    const rating = ratingFromScore(score);

    const history = entries.slice(-8).map(e => ({
      date: e.date,
      value: e.value,
      score: scoreBiomarker(type, e.value, sex),
    }));

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (history.length >= 2) {
      const prev = history[history.length - 2].score;
      const diff = score - prev;
      if (Math.abs(diff) >= 3) trend = diff > 0 ? 'up' : 'down';
    }

    markers.push({ type, latestValue: latest.value, latestDate: latest.date, score, rating, history, trend });

    const weight = WEIGHTS[type] ?? 0;
    weightedSum += score * weight;
    weightedTotal += weight;
  }

  const composite = weightedTotal > 0 ? Math.round(weightedSum / weightedTotal) : 0;

  return {
    composite,
    rating: ratingFromScore(composite),
    markers: markers.sort((a, b) => a.score - b.score), // worst first so user sees what to fix
    trackedCount: markers.length,
  };
}

// ─── Biological age estimate ──────────────────────────────────────────────────

export function estimateBiologicalAge(
  chronologicalAge: number,
  compositeScore: number,
): number {
  // Each 10 points above/below 50 = +/- 2 years
  const delta = ((compositeScore - 50) / 10) * -2;
  return Math.round(chronologicalAge + delta);
}

// ─── Interpretation text ──────────────────────────────────────────────────────

export function markerInterpretation(type: BiomarkerType, value: number, sex: 'male' | 'female' = 'male'): string {
  const score = scoreBiomarker(type, value, sex);
  const r = ratingFromScore(score);
  const interpretations: Record<BiomarkerType, Record<BiomarkerRating, string>> = {
    vo2max:        { elite: 'Elite aerobic capacity. Top 5% of your demographic.', excellent: 'Excellent VO₂ Max. Low cardiovascular disease risk.', good: 'Good aerobic fitness. Continue building.', average: 'Average aerobic capacity. Cardio training recommended.', poor: 'Below-average aerobic fitness. Priority area.' },
    resting_hr:    { elite: 'Exceptional cardiac efficiency.', excellent: 'Very strong cardiovascular fitness.', good: 'Good resting HR. Keep training.', average: 'Average. Consistent aerobic work will lower it.', poor: 'Elevated RHR. Consider cardio and stress management.' },
    hrv:           { elite: 'Elite recovery capacity.', excellent: 'Excellent HRV — well-recovered nervous system.', good: 'Good HRV. Maintain sleep and stress habits.', average: 'Average recovery. Focus on sleep and parasympathetic tone.', poor: 'Low HRV — possible under-recovery or chronic stress.' },
    grip_strength: { elite: 'Elite grip — exceptional musculoskeletal health.', excellent: 'Excellent strength marker. Strong mortality predictor.', good: 'Good grip strength. Keep progressive training.', average: 'Average. Add resistance training.', poor: 'Low grip strength — significant longevity risk. Priority.' },
    sleep_hours:   { elite: 'Optimal sleep duration.', excellent: 'Excellent sleep schedule.', good: 'Good sleep duration.', average: 'Borderline. Aim for 7–9 hours consistently.', poor: 'Insufficient sleep — major longevity risk. Address urgently.' },
    sleep_quality: { elite: 'Exceptional sleep quality.', excellent: 'Very restorative sleep.', good: 'Good sleep quality.', average: 'Moderate quality. Try sleep hygiene improvements.', poor: 'Poor sleep quality. Consider sleep study.' },
    systolic_bp:   { elite: 'Optimal blood pressure.', excellent: 'Excellent systolic.', good: 'Good range.', average: 'Elevated — lifestyle modifications recommended.', poor: 'High systolic — medical review advised.' },
    diastolic_bp:  { elite: 'Optimal diastolic.', excellent: 'Excellent diastolic.', good: 'Good range.', average: 'Elevated diastolic — monitor closely.', poor: 'High diastolic — consult a physician.' },
    steps:         { elite: 'Very active lifestyle. Maximum longevity benefit.', excellent: 'Highly active — strong mortality reduction.', good: 'Good activity level.', average: 'Moderate activity. Aim for 10,000 steps.', poor: 'Low step count. Sedentary lifestyle is a major risk factor.' },
  };
  return interpretations[type][r];
}
