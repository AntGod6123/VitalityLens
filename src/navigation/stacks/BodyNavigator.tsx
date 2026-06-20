import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from '../../constants';
import BodyHomeScreen from '../../screens/Body/BodyHomeScreen';
import AddMeasurementScreen from '../../screens/Body/AddMeasurementScreen';
import FFMIDetailScreen from '../../screens/Body/FFMIDetailScreen';
import FMIDetailScreen from '../../screens/Body/FMIDetailScreen';
import EnergyMetricsScreen from '../../screens/Body/EnergyMetricsScreen';
import BodyFatMethodScreen from '../../screens/Body/BodyFatMethodScreen';

const Stack = createNativeStackNavigator();

const headerOpts = {
  headerStyle: { backgroundColor: COLORS.surface },
  headerTintColor: COLORS.text,
  headerTitleStyle: { fontWeight: '600' as const },
};

export default function BodyNavigator() {
  return (
    <Stack.Navigator screenOptions={headerOpts}>
      <Stack.Screen name="BodyHome" component={BodyHomeScreen} options={{ title: 'Body Composition' }} />
      <Stack.Screen name="AddMeasurement" component={AddMeasurementScreen} options={{ title: 'Add Measurement' }} />
      <Stack.Screen name="FFMIDetail" component={FFMIDetailScreen} options={{ title: 'FFMI — Muscle Index' }} />
      <Stack.Screen name="FMIDetail" component={FMIDetailScreen} options={{ title: 'FMI — Fat Index' }} />
      <Stack.Screen name="EnergyMetrics" component={EnergyMetricsScreen} options={{ title: 'Energy & Metabolism' }} />
      <Stack.Screen name="BodyFatMethod" component={BodyFatMethodScreen} options={{ title: 'Measure Body Fat' }} />
    </Stack.Navigator>
  );
}
