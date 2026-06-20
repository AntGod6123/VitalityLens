import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from '../../constants';
import LongevityHomeScreen from '../../screens/Longevity/LongevityHomeScreen';
import LogBiomarkerScreen from '../../screens/Longevity/LogBiomarkerScreen';
import BiomarkerDetailScreen from '../../screens/Longevity/BiomarkerDetailScreen';

const Stack = createNativeStackNavigator();

const headerOpts = {
  headerStyle: { backgroundColor: COLORS.surface },
  headerTintColor: COLORS.text,
  headerTitleStyle: { fontWeight: '600' as const },
};

export default function LongevityNavigator() {
  return (
    <Stack.Navigator screenOptions={headerOpts}>
      <Stack.Screen name="LongevityHome" component={LongevityHomeScreen} options={{ title: 'Longevity' }} />
      <Stack.Screen name="LogBiomarker" component={LogBiomarkerScreen} options={{ title: 'Log Biomarker' }} />
      <Stack.Screen name="BiomarkerDetail" component={BiomarkerDetailScreen} options={{ title: 'Biomarker Detail' }} />
    </Stack.Navigator>
  );
}
