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
  Medical: undefined;
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
  AddMeasurement: undefined;
  FFMIDetail: undefined;
  FMIDetail: undefined;
  EnergyMetrics: undefined;
  DexaInput: undefined;
  GoalTracker: undefined;
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
