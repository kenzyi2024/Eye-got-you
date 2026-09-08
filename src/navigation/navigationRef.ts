/**
 * Eye got you — Navigation ref
 * ------------------------------------------------------------------
 * A container-level ref so non-React code (a tapped notification) can
 * navigate without a component in scope.
 */

import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function openMedication(medicationId: string): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate('MedicationDetail', { medicationId });
  }
}
