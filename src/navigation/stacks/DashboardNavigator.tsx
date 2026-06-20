import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from '../../constants';
import DashboardScreen from '../../screens/Dashboard/DashboardScreen';
import AISettingsScreen from '../../screens/Settings/AISettingsScreen';
import QoLRecommendationsScreen from '../../screens/Dashboard/QoLRecommendationsScreen';

const Stack = createNativeStackNavigator();

export default function DashboardNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="DashboardHome" component={DashboardScreen} options={{ title: 'VitalityLens' }} />
      <Stack.Screen name="AISettings" component={AISettingsScreen} options={{ title: 'AI & Settings' }} />
      <Stack.Screen name="QoLRecommendations" component={QoLRecommendationsScreen} options={{ title: 'AI Recommendations' }} />
    </Stack.Navigator>
  );
}
