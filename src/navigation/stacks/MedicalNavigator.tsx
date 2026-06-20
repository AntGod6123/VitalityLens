import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from '../../constants';
import MedicalHomeScreen from '../../screens/Medical/MedicalHomeScreen';
import UploadDocumentScreen from '../../screens/Medical/UploadDocumentScreen';
import InjuryDashboardScreen from '../../screens/Medical/InjuryDashboardScreen';
import AddInjuryScreen from '../../screens/Medical/AddInjuryScreen';
import DocumentDetailScreen from '../../screens/Medical/DocumentDetailScreen';

const Stack = createNativeStackNavigator();

const headerOpts = {
  headerStyle: { backgroundColor: COLORS.surface },
  headerTintColor: COLORS.text,
  headerTitleStyle: { fontWeight: '600' as const },
};

export default function MedicalNavigator() {
  return (
    <Stack.Navigator screenOptions={headerOpts}>
      <Stack.Screen name="MedicalHome" component={MedicalHomeScreen} options={{ title: 'Medical' }} />
      <Stack.Screen name="UploadDocument" component={UploadDocumentScreen} options={{ title: 'Upload Document' }} />
      <Stack.Screen name="InjuryDashboard" component={InjuryDashboardScreen} options={{ title: 'Injury Dashboard' }} />
      <Stack.Screen name="AddInjury" component={AddInjuryScreen} options={{ title: 'Log Injury' }} />
      <Stack.Screen name="DocumentDetail" component={DocumentDetailScreen} options={{ title: 'Document' }} />
    </Stack.Navigator>
  );
}
