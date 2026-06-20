import { Exercise } from '../types';

export const EXERCISE_DB: Exercise[] = [
  // Chest
  { id: 'bench-press', name: 'Barbell Bench Press', muscleGroups: ['chest', 'triceps', 'shoulders'], equipment: ['barbell', 'bench'], romType: 'horizontal_push' },
  { id: 'incline-bench', name: 'Incline Bench Press', muscleGroups: ['chest', 'shoulders', 'triceps'], equipment: ['barbell', 'bench'], romType: 'horizontal_push' },
  { id: 'db-fly', name: 'Dumbbell Fly', muscleGroups: ['chest'], equipment: ['dumbbells', 'bench'], romType: 'horizontal_push' },
  { id: 'push-up', name: 'Push-Up', muscleGroups: ['chest', 'triceps', 'shoulders'], equipment: ['bodyweight'], romType: 'horizontal_push' },
  { id: 'cable-crossover', name: 'Cable Crossover', muscleGroups: ['chest'], equipment: ['cable machine'], romType: 'horizontal_push' },

  // Back
  { id: 'deadlift', name: 'Deadlift', muscleGroups: ['back', 'glutes', 'hamstrings', 'traps'], equipment: ['barbell'], romType: 'hinge' },
  { id: 'pull-up', name: 'Pull-Up', muscleGroups: ['lats', 'biceps', 'back'], equipment: ['pull-up bar'], romType: 'vertical_pull' },
  { id: 'barbell-row', name: 'Barbell Row', muscleGroups: ['back', 'lats', 'biceps'], equipment: ['barbell'], romType: 'horizontal_pull' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', muscleGroups: ['lats', 'biceps'], equipment: ['cable machine'], romType: 'vertical_pull' },
  { id: 'seated-row', name: 'Seated Cable Row', muscleGroups: ['back', 'biceps', 'lats'], equipment: ['cable machine'], romType: 'horizontal_pull' },
  { id: 'face-pull', name: 'Face Pull', muscleGroups: ['shoulders', 'traps', 'back'], equipment: ['cable machine'], romType: 'horizontal_pull' },

  // Shoulders
  { id: 'ohp', name: 'Overhead Press', muscleGroups: ['shoulders', 'triceps'], equipment: ['barbell'], romType: 'vertical_push' },
  { id: 'db-ohp', name: 'Dumbbell Shoulder Press', muscleGroups: ['shoulders', 'triceps'], equipment: ['dumbbells'], romType: 'vertical_push' },
  { id: 'lateral-raise', name: 'Lateral Raise', muscleGroups: ['shoulders'], equipment: ['dumbbells'], romType: 'lateral_raise' },
  { id: 'front-raise', name: 'Front Raise', muscleGroups: ['shoulders'], equipment: ['dumbbells'], romType: 'lateral_raise' },

  // Arms
  { id: 'barbell-curl', name: 'Barbell Curl', muscleGroups: ['biceps'], equipment: ['barbell'], romType: 'elbow_flex' },
  { id: 'hammer-curl', name: 'Hammer Curl', muscleGroups: ['biceps', 'forearms'], equipment: ['dumbbells'], romType: 'elbow_flex' },
  { id: 'tricep-pushdown', name: 'Tricep Pushdown', muscleGroups: ['triceps'], equipment: ['cable machine'], romType: 'elbow_ext' },
  { id: 'skull-crusher', name: 'Skull Crusher', muscleGroups: ['triceps'], equipment: ['barbell', 'bench'], romType: 'elbow_ext' },
  { id: 'dip', name: 'Dip', muscleGroups: ['triceps', 'chest', 'shoulders'], equipment: ['dip bars'], romType: 'vertical_push' },

  // Legs
  { id: 'squat', name: 'Barbell Back Squat', muscleGroups: ['quads', 'glutes', 'hamstrings'], equipment: ['barbell', 'rack'], romType: 'squat_full' },
  { id: 'front-squat', name: 'Front Squat', muscleGroups: ['quads', 'glutes'], equipment: ['barbell', 'rack'], romType: 'squat_full' },
  { id: 'rdl', name: 'Romanian Deadlift', muscleGroups: ['hamstrings', 'glutes', 'back'], equipment: ['barbell'], romType: 'hinge' },
  { id: 'leg-press', name: 'Leg Press', muscleGroups: ['quads', 'glutes', 'hamstrings'], equipment: ['leg press machine'], romType: 'squat_parallel' },
  { id: 'leg-curl', name: 'Leg Curl', muscleGroups: ['hamstrings'], equipment: ['leg curl machine'], romType: 'elbow_flex' },
  { id: 'leg-extension', name: 'Leg Extension', muscleGroups: ['quads'], equipment: ['leg extension machine'], romType: 'elbow_ext' },
  { id: 'lunge', name: 'Walking Lunge', muscleGroups: ['quads', 'glutes', 'hamstrings'], equipment: ['dumbbells', 'bodyweight'], romType: 'lunge' },
  { id: 'calf-raise', name: 'Standing Calf Raise', muscleGroups: ['calves'], equipment: ['barbell', 'bodyweight'], romType: 'calf' },
  { id: 'hip-thrust', name: 'Hip Thrust', muscleGroups: ['glutes', 'hamstrings'], equipment: ['barbell', 'bench'], romType: 'hip_thrust' },

  // Core
  { id: 'plank', name: 'Plank', muscleGroups: ['core'], equipment: ['bodyweight'], romType: 'fixed_30cm' },
  { id: 'crunch', name: 'Crunch', muscleGroups: ['core'], equipment: ['bodyweight'], romType: 'fixed_30cm' },
  { id: 'ab-wheel', name: 'Ab Wheel Rollout', muscleGroups: ['core'], equipment: ['ab wheel'], romType: 'fixed_30cm' },
  { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', muscleGroups: ['core'], equipment: ['pull-up bar'], romType: 'fixed_30cm' },

  // Cardio
  { id: 'treadmill', name: 'Treadmill Run', muscleGroups: ['quads', 'hamstrings', 'calves'], equipment: ['treadmill'], romType: 'cardio_distance' },
  { id: 'rowing', name: 'Rowing Machine', muscleGroups: ['back', 'core', 'legs'], equipment: ['rowing machine'], romType: 'cardio_distance' },
  { id: 'cycling', name: 'Stationary Bike', muscleGroups: ['quads', 'hamstrings', 'calves'], equipment: ['bike'], romType: 'cardio_distance' },
];
