import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store, persistor } from './src/store';
import { COLORS } from './src/constants';
import RootNavigator from './src/navigation/RootNavigator';

function LoadingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={COLORS.primary} size="large" />
    </View>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingScreen />} persistor={persistor}>
        <SafeAreaProvider>
          <NavigationContainer>
            <StatusBar style="light" backgroundColor="#0F172A" />
            <RootNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}
