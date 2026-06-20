import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from './types';
import { COLORS } from '../constants';
import DashboardNavigator from './stacks/DashboardNavigator';
import WorkoutNavigator from './stacks/WorkoutNavigator';
import BodyNavigator from './stacks/BodyNavigator';
import NutritionNavigator from './stacks/NutritionNavigator';
import MedicalNavigator from './stacks/MedicalNavigator';
import LongevityNavigator from './stacks/LongevityNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<keyof MainTabParamList, { active: IoniconsName; inactive: IoniconsName }> = {
  Dashboard: { active: 'home', inactive: 'home-outline' },
  Workout: { active: 'barbell', inactive: 'barbell-outline' },
  Body: { active: 'body', inactive: 'body-outline' },
  Nutrition: { active: 'nutrition', inactive: 'nutrition-outline' },
  Medical: { active: 'medkit', inactive: 'medkit-outline' },
  Longevity: { active: 'heart', inactive: 'heart-outline' },
};

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: { fontSize: 11 },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name as keyof MainTabParamList];
          return (
            <Ionicons
              name={focused ? icons.active : icons.inactive}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardNavigator} />
      <Tab.Screen name="Workout" component={WorkoutNavigator} />
      <Tab.Screen name="Body" component={BodyNavigator} />
      <Tab.Screen name="Nutrition" component={NutritionNavigator} />
      <Tab.Screen name="Medical" component={MedicalNavigator} />
      <Tab.Screen name="Longevity" component={LongevityNavigator} />
    </Tab.Navigator>
  );
}
