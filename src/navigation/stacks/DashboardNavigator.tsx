import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from '../../constants';
import DashboardScreen from '../../screens/Dashboard/DashboardScreen';
import AISettingsScreen from '../../screens/Settings/AISettingsScreen';
import QoLRecommendationsScreen from '../../screens/Dashboard/QoLRecommendationsScreen';
import ProfileEditScreen from '../../screens/Settings/ProfileEditScreen';
import DataManagementScreen from '../../screens/Settings/DataManagementScreen';
import NotificationSettingsScreen from '../../screens/Settings/NotificationSettingsScreen';
import LongevityHomeScreen from '../../screens/Longevity/LongevityHomeScreen';
import LogBiomarkerScreen from '../../screens/Longevity/LogBiomarkerScreen';
import BiomarkerDetailScreen from '../../screens/Longevity/BiomarkerDetailScreen';

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
      <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="DataManagement" component={DataManagementScreen} options={{ title: 'Data & Backup' }} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ title: 'Reminders' }} />
      <Stack.Screen name="LongevityHome" component={LongevityHomeScreen} options={{ title: 'Longevity' }} />
      <Stack.Screen name="LogBiomarker" component={LogBiomarkerScreen} options={{ title: 'Log Biomarker' }} />
      <Stack.Screen name="BiomarkerDetail" component={BiomarkerDetailScreen} options={{ title: 'Biomarker Detail' }} />
    </Stack.Navigator>
  );
}
