/**
 * Eye got you — ScanScreen
 * ------------------------------------------------------------------
 * Route wrapper around ScanFlow. On a confirmed scan it replaces itself
 * with the new medication's detail screen; cancelling returns home.
 */

import React from 'react';
import ScanFlow from './ScanFlow';
import type { ScanProps } from '../navigation/types';

export default function ScanScreen({ navigation }: ScanProps) {
  return (
    <ScanFlow
      onCancel={() => navigation.goBack()}
      onComplete={(med) =>
        // replace so Back from the detail returns Home, not the camera
        navigation.replace('MedicationDetail', { medicationId: med.id })
      }
    />
  );
}
