import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from '../../constants';
import WorkoutHomeScreen from '../../screens/Workout/WorkoutHomeScreen';
import WorkoutLogScreen from '../../screens/Workout/WorkoutLogScreen';
import ExerciseLibraryScreen from '../../screens/Workout/ExerciseLibraryScreen';
import ExerciseDetailScreen from '../../screens/Workout/ExerciseDetailScreen';
import WorkoutBuilderScreen from '../../screens/Workout/WorkoutBuilderScreen';
import MuscleGrowthScreen from '../../screens/Workout/MuscleGrowthScreen';
import ProgressiveOverloadScreen from '../../screens/Workout/ProgressiveOverloadScreen';
import WorkoutCritiqueScreen from '../../screens/Workout/WorkoutCritiqueScreen';

const Stack = createNativeStackNavigator();

const headerOpts = {
  headerStyle: { backgroundColor: COLORS.surface },
  headerTintColor: COLORS.text,
  headerTitleStyle: { fontWeight: '600' as const },
};

export default function WorkoutNavigator() {
  return (
    <Stack.Navigator screenOptions={headerOpts}>
      <Stack.Screen name="WorkoutHome" component={WorkoutHomeScreen} options={{ title: 'Workout' }} />
      <Stack.Screen name="WorkoutLog" component={WorkoutLogScreen} options={{ title: 'Log Session' }} />
      <Stack.Screen name="WorkoutBuilder" component={WorkoutBuilderScreen} options={{ title: 'Workout Builder' }} />
      <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} options={{ title: 'Exercise Library' }} />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} options={{ title: 'Exercise' }} />
      <Stack.Screen name="MuscleGrowthProjection" component={MuscleGrowthScreen} options={{ title: 'Muscle Growth' }} />
      <Stack.Screen name="ProgressiveOverload" component={ProgressiveOverloadScreen} options={{ title: 'Progressive Overload' }} />
      <Stack.Screen name="WorkoutCritique" component={WorkoutCritiqueScreen} options={{ title: 'AI Workout Critique' }} />
    </Stack.Navigator>
  );
}
