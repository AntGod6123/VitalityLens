import { Exercise } from '../types';

export const EXERCISE_DB: Exercise[] = [
  // Chest
  { id: 'bench-press', name: 'Barbell Bench Press', muscleGroups: ['chest', 'triceps', 'shoulders'], equipment: ['barbell', 'bench'] },
  { id: 'incline-bench', name: 'Incline Bench Press', muscleGroups: ['chest', 'shoulders', 'triceps'], equipment: ['barbell', 'bench'] },
  { id: 'db-fly', name: 'Dumbbell Fly', muscleGroups: ['chest'], equipment: ['dumbbells', 'bench'] },
  { id: 'push-up', name: 'Push-Up', muscleGroups: ['chest', 'triceps', 'shoulders'], equipment: ['bodyweight'] },
  { id: 'cable-crossover', name: 'Cable Crossover', muscleGroups: ['chest'], equipment: ['cable machine'] },

  // Back
  { id: 'deadlift', name: 'Deadlift', muscleGroups: ['back', 'glutes', 'hamstrings', 'traps'], equipment: ['barbell'] },
  { id: 'pull-up', name: 'Pull-Up', muscleGroups: ['lats', 'biceps', 'back'], equipment: ['pull-up bar'] },
  { id: 'barbell-row', name: 'Barbell Row', muscleGroups: ['back', 'lats', 'biceps'], equipment: ['barbell'] },
  { id: 'lat-pulldown', name: 'Lat Pulldown', muscleGroups: ['lats', 'biceps'], equipment: ['cable machine'] },
  { id: 'seated-row', name: 'Seated Cable Row', muscleGroups: ['back', 'biceps', 'lats'], equipment: ['cable machine'] },
  { id: 'face-pull', name: 'Face Pull', muscleGroups: ['shoulders', 'traps', 'back'], equipment: ['cable machine'] },

  // Shoulders
  { id: 'ohp', name: 'Overhead Press', muscleGroups: ['shoulders', 'triceps'], equipment: ['barbell'] },
  { id: 'db-ohp', name: 'Dumbbell Shoulder Press', muscleGroups: ['shoulders', 'triceps'], equipment: ['dumbbells'] },
  { id: 'lateral-raise', name: 'Lateral Raise', muscleGroups: ['shoulders'], equipment: ['dumbbells'] },
  { id: 'front-raise', name: 'Front Raise', muscleGroups: ['shoulders'], equipment: ['dumbbells'] },

  // Arms
  { id: 'barbell-curl', name: 'Barbell Curl', muscleGroups: ['biceps'], equipment: ['barbell'] },
  { id: 'hammer-curl', name: 'Hammer Curl', muscleGroups: ['biceps', 'forearms'], equipment: ['dumbbells'] },
  { id: 'tricep-pushdown', name: 'Tricep Pushdown', muscleGroups: ['triceps'], equipment: ['cable machine'] },
  { id: 'skull-crusher', name: 'Skull Crusher', muscleGroups: ['triceps'], equipment: ['barbell', 'bench'] },
  { id: 'dip', name: 'Dip', muscleGroups: ['triceps', 'chest', 'shoulders'], equipment: ['dip bars'] },

  // Legs
  { id: 'squat', name: 'Barbell Back Squat', muscleGroups: ['quads', 'glutes', 'hamstrings'], equipment: ['barbell', 'rack'] },
  { id: 'front-squat', name: 'Front Squat', muscleGroups: ['quads', 'glutes'], equipment: ['barbell', 'rack'] },
  { id: 'rdl', name: 'Romanian Deadlift', muscleGroups: ['hamstrings', 'glutes', 'back'], equipment: ['barbell'] },
  { id: 'leg-press', name: 'Leg Press', muscleGroups: ['quads', 'glutes', 'hamstrings'], equipment: ['leg press machine'] },
  { id: 'leg-curl', name: 'Leg Curl', muscleGroups: ['hamstrings'], equipment: ['leg curl machine'] },
  { id: 'leg-extension', name: 'Leg Extension', muscleGroups: ['quads'], equipment: ['leg extension machine'] },
  { id: 'lunge', name: 'Walking Lunge', muscleGroups: ['quads', 'glutes', 'hamstrings'], equipment: ['dumbbells', 'bodyweight'] },
  { id: 'calf-raise', name: 'Standing Calf Raise', muscleGroups: ['calves'], equipment: ['barbell', 'bodyweight'] },
  { id: 'hip-thrust', name: 'Hip Thrust', muscleGroups: ['glutes', 'hamstrings'], equipment: ['barbell', 'bench'] },

  // Core
  { id: 'plank', name: 'Plank', muscleGroups: ['core'], equipment: ['bodyweight'] },
  { id: 'crunch', name: 'Crunch', muscleGroups: ['core'], equipment: ['bodyweight'] },
  { id: 'ab-wheel', name: 'Ab Wheel Rollout', muscleGroups: ['core'], equipment: ['ab wheel'] },
  { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', muscleGroups: ['core'], equipment: ['pull-up bar'] },

  // Cardio
  { id: 'treadmill', name: 'Treadmill Run', muscleGroups: ['quads', 'hamstrings', 'calves'], equipment: ['treadmill'] },
  { id: 'rowing', name: 'Rowing Machine', muscleGroups: ['back', 'core', 'legs'], equipment: ['rowing machine'] },
  { id: 'cycling', name: 'Stationary Bike', muscleGroups: ['quads', 'hamstrings', 'calves'], equipment: ['bike'] },
];
