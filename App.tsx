/**
 * Eye got you — App root
 * ------------------------------------------------------------------
 * Wires the navigation stack and app-wide providers. Three routes:
 *   Home  →  Scan  →  MedicationDetail
 *
 * Dark theme is applied to the navigation container so headers and the
 * gaps between screens stay near-black for light-sensitive eyes.
 */

import 'react-native-reanimated'; // must be imported once, before anything animated
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  DarkTheme,
  NavigationContainer,
  Theme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { palette } from './src/theme/theme';
import { preloadFeedback } from './src/lib/feedback';
import { track } from './src/lib/analytics';
import { useReminderSync } from './src/hooks/useReminderSync';
import { navigationRef } from './src/navigation/navigationRef';
import type { RootStackParamList } from './src/navigation/types';
import { DisclaimerGate } from './src/components/DisclaimerGate';
import HomeScreen from './src/screens/HomeScreen';
import ScanScreen from './src/screens/ScanScreen';
import MedicationDetailScreen from './src/screens/MedicationDetailScreen';
import ReminderSettingsScreen from './src/screens/ReminderSettingsScreen';
import LegalScreen from './src/screens/LegalScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: palette.ink900,
    card: palette.ink800,
    text: palette.textHi,
    border: palette.ink600,
    primary: palette.cyan,
    notification: palette.mint,
  },
};

export default function App() {
  // Keep OS reminders in sync with the store + handle notification taps.
  useReminderSync();

  useEffect(() => {
    preloadFeedback();
    track('app_opened');
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <DisclaimerGate>
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: { backgroundColor: palette.ink800 },
            headerTintColor: palette.textHi,
            headerTitleStyle: { fontWeight: '800' },
            contentStyle: { backgroundColor: palette.ink900 },
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Scan"
            component={ScanScreen}
            options={{ headerShown: false, presentation: 'fullScreenModal' }}
          />
          <Stack.Screen
            name="MedicationDetail"
            component={MedicationDetailScreen}
            options={{ title: 'Medication' }}
          />
          <Stack.Screen
            name="ReminderSettings"
            component={ReminderSettingsScreen}
            options={{ title: 'Reminders' }}
          />
          <Stack.Screen
            name="Legal"
            component={LegalScreen}
            options={{ title: 'Legal' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      </DisclaimerGate>
    </SafeAreaProvider>
  );
}
