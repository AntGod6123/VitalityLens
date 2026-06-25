export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  SignUp: undefined;
  Onboarding: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Workout: undefined;
  Nutrition: undefined;
  Body: undefined;
  Longevity: undefined;
};

export type WorkoutStackParamList = {
  WorkoutHome: undefined;
  WorkoutLog: { sessionId?: string };
  WorkoutBuilder: undefined;
  ExerciseLibrary: undefined;
  ExerciseDetail: { exerciseId: string };
  ProgressiveOverload: undefined;
  MuscleGrowthProjection: undefined;
};

export type BodyStackParamList = {
  BodyHome: undefined;
  Measurements: undefined;
  AddMeasurement: { bodyFatPercent?: number; bodyFatMethod?: string } | undefined;
  FFMIDetail: undefined;
  FMIDetail: undefined;
  EnergyMetrics: undefined;
  DexaInput: undefined;
  GoalTracker: undefined;
  BodyFatMethod: { method: string; sex: 'male' | 'female'; ageYears: number };
  ProgressCharts: undefined;
};

export type SettingsStackParamList = {
  AISettings: undefined;
};

export type NutritionStackParamList = {
  NutritionHome: undefined;
  FoodLog: { date: string };
  FoodSearch: undefined;
  SupplementLog: undefined;
  MacroTargets: undefined;
};

export type MedicalStackParamList = {
  MedicalHome: undefined;
  UploadDocument: undefined;
  DocumentDetail: { documentId: string };
  InjuryDashboard: undefined;
  AddInjury: undefined;
  AIRecommendations: undefined;
};
