// ─── User & Body Composition ────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  dateOfBirth: string;
  sex: 'male' | 'female';
  createdAt: string;
}

export interface BodyMeasurement {
  id: string;
  date: string;
  weightKg: number;
  heightCm: number;
  bodyFatPercent?: number;
  leanBodyMassKg?: number;
  fatMassKg?: number;
  /** Fat-Free Mass Index = LBM(kg) / height(m)^2 */
  ffmi?: number;
  /** Fat Mass Index = FM(kg) / height(m)^2 */
  fmi?: number;
  /** Body Mass Index (legacy reference only) */
  bmi?: number;
  waistCm?: number;
  hipCm?: number;
  neckCm?: number;
  chestCm?: number;
  armCm?: number;
  thighCm?: number;
  calfCm?: number;
  dexaInput?: DexaData;
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
  rmr: number;        // Resting Metabolic Rate (Katch-McArdle formula)
  bmr: number;        // BMR as baseline reference
  tdee: number;       // Total Daily Energy Expenditure
  vo2max?: number;    // mL/kg/min
  activityLevel: ActivityLevel;
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
  notes?: string;
  exercises: ExerciseSet[];
}

export type WorkoutType = 'strength' | 'cardio' | 'flexibility' | 'hiit' | 'sport' | 'other';

export interface ExerciseSet {
  exerciseId: string;
  exerciseName: string;
  muscleGroups: MuscleGroup[];
  sets: SetEntry[];
}

export interface SetEntry {
  setNumber: number;
  reps?: number;
  weightKg?: number;
  durationSeconds?: number;
  distanceMeters?: number;
  rpe?: number; // Rate of Perceived Exertion 1-10
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
  isRestricted?: boolean; // disabled by AI due to injury
}

// ─── Progressive Overload & Muscle Potential ────────────────────────────────

export interface MuscleGrowthProjection {
  muscleGroup: MuscleGroup;
  currentEstimatedMassKg: number;
  projectedMassKg: number;
  naturalCeilingKg: number;    // from Berkhan/Martin natural potential models
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

// ─── Nutrition ───────────────────────────────────────────────────────────────

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
  summary?: string;           // AI-generated summary
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
  | 'weight_loss'
  | 'muscle_gain'
  | 'strength'
  | 'endurance'
  | 'body_fat'
  | 'ffmi'
  | 'fmi'
  | 'nutrition'
  | 'longevity'
  | 'custom';
