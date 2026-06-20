// ─── User & Body Composition ────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  dateOfBirth: string;
  sex: 'male' | 'female';
  createdAt: string;
  /** Limb lengths used for range-of-motion energy calculations */
  limbs?: LimbLengths;
  activityLevel: ActivityLevel;
  aiProvider: AIProvider;
  aiApiKeys: Partial<Record<AIProvider, string>>;
  onboardingComplete: boolean;
}

/** Segment lengths in cm, measured from joint to joint */
export interface LimbLengths {
  thighLengthCm?: number;       // hip crease to knee centre
  lowerLegLengthCm?: number;    // knee centre to ankle
  upperArmLengthCm?: number;    // shoulder to elbow
  forearmLengthCm?: number;     // elbow to wrist
  torsoLengthCm?: number;       // shoulder to hip crease
  footLengthCm?: number;        // heel to toe (for calf raise ROM)
  armSpanCm?: number;           // fingertip to fingertip (derived bench width)
}

export interface BodyMeasurement {
  id: string;
  date: string;
  weightKg: number;
  heightCm: number;
  bodyFatPercent?: number;
  bodyFatMethod?: BodyFatMethod;
  leanBodyMassKg?: number;
  fatMassKg?: number;
  /** Fat-Free Mass Index = LBM(kg) / height(m)^2 */
  ffmi?: number;
  /** Fat Mass Index = FM(kg) / height(m)^2 */
  fmi?: number;
  /** Body Mass Index (legacy reference only) */
  bmi?: number;
  /** Circumference measurements */
  waistCm?: number;
  hipCm?: number;
  neckCm?: number;
  chestCm?: number;
  armCm?: number;
  thighCm?: number;
  calfCm?: number;
  /** Raw inputs for each BF method */
  caliperSites?: CaliperSiteData;
  dexaInput?: DexaData;
  isBaseline?: boolean;   // user-marked anchor measurement
  estimatedFromEnergy?: boolean; // calculated between baselines, not directly measured
}

/** Which method was used to measure body fat */
export type BodyFatMethod =
  | 'tape_navy'        // US Navy circumference formula
  | 'caliper_jp3'      // Jackson-Pollock 3-site
  | 'caliper_jp7'      // Jackson-Pollock 7-site
  | 'bioimpedance'     // BIA scale/device
  | 'bodpod'           // Air displacement plethysmography
  | 'dexa'             // Dual-energy X-ray absorptiometry
  | 'visual'           // User estimate
  | 'estimated';       // App-calculated between baselines

export interface CaliperSiteData {
  // Jackson-Pollock 3-site (male: chest, abdomen, thigh | female: tricep, suprailiac, thigh)
  chest_mm?: number;
  abdomen_mm?: number;
  thigh_mm?: number;
  tricep_mm?: number;
  suprailiac_mm?: number;
  // JP7 additional sites
  subscapular_mm?: number;
  midaxillary_mm?: number;
}

export interface DexaData {
  date: string;
  totalBodyFatPercent: number;
  leanMassKg: number;
  fatMassKg: number;
  boneMineralDensity?: number;
  visceralFatMass?: number;
  androidFatPercent?: number;
  gynoidFatPercent?: number;
}

// ─── Energy & Metabolism ────────────────────────────────────────────────────

export interface EnergyMetrics {
  date: string;
  rmr: number;
  bmr: number;
  tdee: number;
  workoutKcal?: number;       // energy from W=Fd workout calculation
  activityKcal?: number;      // from activity multiplier (non-workout movement)
  vo2max?: number;
  activityLevel: ActivityLevel;
}

/** Per-session energy expenditure breakdown */
export interface WorkoutEnergyResult {
  sessionId: string;
  totalWorkJoules: number;
  totalKcal: number;           // accounting for mechanical efficiency
  aerobicKcal: number;
  anaerobicKcal: number;
  exerciseBreakdown: ExerciseEnergyBreakdown[];
}

export interface ExerciseEnergyBreakdown {
  exerciseId: string;
  exerciseName: string;
  romMeters: number;           // range of motion used
  totalWeightLifted: number;   // kg
  totalRepsCompleted: number;
  workJoules: number;
  kcal: number;
  metabolicType: 'aerobic' | 'anaerobic' | 'mixed';
}

export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extra_active';

// ─── Workout ────────────────────────────────────────────────────────────────

export interface WorkoutSession {
  id: string;
  date: string;
  name: string;
  type: WorkoutType;
  durationMinutes: number;
  caloriesBurned?: number;
  energyResult?: WorkoutEnergyResult;
  notes?: string;
  exercises: ExerciseSet[];
}

export type WorkoutType = 'strength' | 'cardio' | 'flexibility' | 'hiit' | 'sport' | 'other';

export interface ExerciseSet {
  exerciseId: string;
  exerciseName: string;
  muscleGroups: MuscleGroup[];
  /** Programmed target — what the plan says */
  programmedSets?: number;
  programmedReps?: number;
  programmedWeightKg?: number;
  /** Squat depth variant — affects distance calculation */
  squatDepth?: 'parallel' | 'full' | 'quarter';
  sets: SetEntry[];
}

export interface SetEntry {
  setNumber: number;
  /** Programmed target for this set */
  targetReps?: number;
  targetWeightKg?: number;
  /** Actual completed */
  reps?: number;
  weightKg?: number;
  completed?: boolean;        // false = failed set / stopped early
  durationSeconds?: number;
  distanceMeters?: number;
  rpe?: number;
}

export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'forearms'
  | 'core' | 'glutes' | 'quads' | 'hamstrings' | 'calves' | 'traps' | 'lats';

export interface Exercise {
  id: string;
  name: string;
  muscleGroups: MuscleGroup[];
  equipment: string[];
  instructions?: string;
  isRestricted?: boolean;
  /** Which limb lengths govern ROM for this exercise */
  romType: ROMType;
}

/** How the exercise range-of-motion is calculated from limb lengths */
export type ROMType =
  | 'squat_parallel'     // thigh length
  | 'squat_full'         // thigh + lower leg
  | 'hinge'              // torso + lower leg (deadlift, RDL)
  | 'horizontal_push'    // upper arm (bench press)
  | 'horizontal_pull'    // forearm (row)
  | 'vertical_pull'      // upper arm + forearm (pull-up, lat pulldown)
  | 'vertical_push'      // upper arm (OHP)
  | 'elbow_flex'         // forearm (curl)
  | 'elbow_ext'          // forearm (pushdown, skull crusher)
  | 'hip_thrust'         // torso length
  | 'lunge'              // thigh length
  | 'calf'               // foot length
  | 'lateral_raise'      // upper arm
  | 'cardio_distance'    // uses distanceMeters from SetEntry
  | 'fixed_30cm'         // default for unmapped exercises
  | 'bodyweight_squat';  // same as squat_full

// ─── Workout Plans ──────────────────────────────────────────────────────────

export type PlanGoal = 'strength' | 'hypertrophy' | 'endurance' | 'weight_loss';
export type PlanSplit = 'full_body' | 'upper_lower' | 'push_pull_legs' | 'bro_split' | 'custom';

export interface PlannedExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroups: MuscleGroup[];
  sets: number;
  repsMin: number;
  repsMax: number;
  /** Current target weight — updated by progressive overload engine after each session */
  weightKg?: number;
  rpe?: number;
  notes?: string;
}

export interface PlannedDay {
  dayIndex: number;   // 0-based within the cycle
  label: string;      // e.g. "Push Day", "Rest"
  isRest: boolean;
  type: WorkoutType;
  exercises: PlannedExercise[];
}

export interface WorkoutPlan {
  id: string;
  name: string;
  description?: string;
  goal: PlanGoal;
  split: PlanSplit;
  createdAt: string;
  /** Whether this is the currently running plan */
  isActive: boolean;
  /** ISO date when the plan was activated (used to determine current day index) */
  startDate?: string;
  /** Ordered list of days in the cycle */
  days: PlannedDay[];
}

// ─── Progressive Overload ───────────────────────────────────────────────────

export interface MuscleGrowthProjection {
  muscleGroup: MuscleGroup;
  currentEstimatedMassKg: number;
  projectedMassKg: number;
  naturalCeilingKg: number;
  weeksToProjected: number;
  percentageOfPotential: number;
}

export interface ProgressiveOverloadTarget {
  exerciseId: string;
  currentWeightKg: number;
  targetWeightKg: number;
  currentReps: number;
  targetReps: number;
  weeklyIncrementKg: number;
}

// ─── Longevity Biomarkers ─────────────────────────────────────────────────────

export type BiomarkerType =
  | 'vo2max'          // mL/kg/min — aerobic capacity
  | 'resting_hr'      // bpm — cardiovascular efficiency
  | 'hrv'             // ms RMSSD — autonomic nervous system recovery
  | 'grip_strength'   // kg — musculoskeletal function, all-cause mortality predictor
  | 'sleep_hours'     // h — recovery duration
  | 'sleep_quality'   // 1–10 subjective
  | 'systolic_bp'     // mmHg
  | 'diastolic_bp'    // mmHg
  | 'steps';          // daily step count

export interface BiomarkerLog {
  id: string;
  date: string;
  type: BiomarkerType;
  value: number;
  notes?: string;
  /** How was this value obtained */
  source: 'manual' | 'wearable' | 'lab';
}

/** Rating band for a biomarker reading relative to reference data */
export type BiomarkerRating = 'elite' | 'excellent' | 'good' | 'average' | 'poor';

/** Longevity Biomarkers — structured output for AI longevity_analysis skill */
export interface LongevityAnalysisOutput {
  overallAssessment: string;
  topStrengths: string[];
  topRisks: string[];
  priorityActions: {
    biomarker: string;
    action: string;
    timeframe: string;
  }[];
  biologicalAgeEstimate?: number;
}

export interface NutritionLog {
  id: string;
  date: string;
  meals: Meal[];
  supplements: SupplementEntry[];
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  totalFiberG?: number;
  waterMl?: number;
}

export interface Meal {
  id: string;
  name: string;
  timeEaten: string;
  foods: FoodEntry[];
}

export interface FoodEntry {
  foodId: string;
  foodName: string;
  servingG: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  micronutrients?: Record<string, number>;
}

export interface SupplementEntry {
  id: string;
  name: string;
  doseAmount: number;
  doseUnit: string;
  timeTaken: string;
  brand?: string;
  notes?: string;
}

// ─── Medical & Injury ───────────────────────────────────────────────────────

export interface MedicalDocument {
  id: string;
  uploadDate: string;
  fileName: string;
  fileType: 'pdf' | 'image' | 'other';
  fileUri: string;
  summary?: string;
  extractedConditions?: string[];
  extractedRestrictions?: string[];
  recommendations?: string[];
  processedAt?: string;
}

export interface InjuryRecord {
  id: string;
  date: string;
  bodyPart: string;
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
  restrictedMuscleGroups?: MuscleGroup[];
  restrictedExerciseIds?: string[];
  expectedRecoveryDate?: string;
  isActive: boolean;
  linkedDocumentId?: string;
}

// ─── Goals ──────────────────────────────────────────────────────────────────

export interface Goal {
  id: string;
  type: GoalType;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  targetDate?: string;
  createdAt: string;
  isCompleted: boolean;
}

export type GoalType =
  | 'weight_loss' | 'muscle_gain' | 'strength' | 'endurance'
  | 'body_fat' | 'ffmi' | 'fmi' | 'nutrition' | 'longevity' | 'custom';

// ─── AI Provider ─────────────────────────────────────────────────────────────

export type AIProvider = 'claude' | 'openai' | 'none';

export type AITier = 'free' | 'basic' | 'pro';

/** Structured output format every AI skill must return */
export interface AISkillResponse<T = unknown> {
  success: boolean;
  provider: AIProvider;
  skill: AISkillName;
  data: T;
  rawText?: string;
  error?: string;
  tokensUsed?: number;
}

export type AISkillName =
  | 'document_analysis'
  | 'injury_filter'
  | 'qol_recommendations'
  | 'energy_coaching'
  | 'nutrition_analysis'
  | 'workout_critique'
  | 'longevity_analysis';

/** Structured output for document_analysis skill */
export interface DocumentAnalysisOutput {
  summary: string;
  conditions: string[];
  workoutRestrictions: string[];
  restrictedMuscleGroups: MuscleGroup[];
  recommendations: string[];
  urgencyLevel: 'none' | 'monitor' | 'consult_doctor';
}

/** Structured output for injury_filter skill */
export interface InjuryFilterOutput {
  safeExerciseIds: string[];
  restrictedExerciseIds: string[];
  modifiedExercises: { exerciseId: string; modification: string }[];
  reasoning: string;
}

/** Structured output for qol_recommendations skill */
export interface QoLRecommendationsOutput {
  recommendations: {
    category: 'training' | 'nutrition' | 'recovery' | 'medical' | 'lifestyle';
    priority: 'high' | 'medium' | 'low';
    title: string;
    detail: string;
  }[];
  longevityScore?: number;  // 0-100
}

/** Structured output for energy_coaching skill */
export interface EnergyCoachingOutput {
  tdeeAssessment: string;
  calorieGuidance: string;
  workoutIntensityFeedback: string;
  suggestions: string[];
}

/** Structured output for nutrition_analysis skill */
export interface NutritionAnalysisOutput {
  assessment: string;
  calorieBalance: 'surplus' | 'deficit' | 'maintenance';
  proteinAdequacy: 'adequate' | 'low' | 'high';
  micronutrientFlags: string[];
  suggestions: string[];
  mealTimingTips: string[];
}

/** Structured output for workout_critique skill */
export interface WorkoutCritiqueOutput {
  overallRating: number;
  volumeAssessment: string;
  intensityAssessment: string;
  recoveryRisk: 'low' | 'moderate' | 'high';
  strongPoints: string[];
  improvements: string[];
  nextSessionFocus: string;
}
