import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from '../../constants';
import NutritionHomeScreen from '../../screens/Nutrition/NutritionHomeScreen';
import FoodLogScreen from '../../screens/Nutrition/FoodLogScreen';
import SupplementLogScreen from '../../screens/Nutrition/SupplementLogScreen';
import MacroTargetsScreen from '../../screens/Nutrition/MacroTargetsScreen';
import NutritionAnalysisScreen from '../../screens/Nutrition/NutritionAnalysisScreen';
import MealPlannerScreen from '../../screens/Nutrition/MealPlannerScreen';

const Stack = createNativeStackNavigator();

const headerOpts = {
  headerStyle: { backgroundColor: COLORS.surface },
  headerTintColor: COLORS.text,
  headerTitleStyle: { fontWeight: '600' as const },
};

export default function NutritionNavigator() {
  return (
    <Stack.Navigator screenOptions={headerOpts}>
      <Stack.Screen name="NutritionHome" component={NutritionHomeScreen} options={{ title: 'Nutrition' }} />
      <Stack.Screen name="FoodLog" component={FoodLogScreen} options={{ title: 'Food Log' }} />
      <Stack.Screen name="SupplementLog" component={SupplementLogScreen} options={{ title: 'Supplements' }} />
      <Stack.Screen name="MacroTargets" component={MacroTargetsScreen} options={{ title: 'Macro Targets' }} />
      <Stack.Screen name="NutritionAnalysis" component={NutritionAnalysisScreen} options={{ title: 'AI Nutrition Analysis' }} />
      <Stack.Screen name="MealPlanner" component={MealPlannerScreen} options={{ title: 'Meal Planner' }} />
    </Stack.Navigator>
  );
}
