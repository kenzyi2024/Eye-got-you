/**
 * Eye got you — ScanFlow
 * ------------------------------------------------------------------
 * Container that wires the scanner to the confirmation screen and the
 * store. Drop <ScanFlow onComplete={...} /> into your navigator.
 */

import React, { useState } from 'react';
import { View } from 'react-native';

import ScannerScreen from './ScannerScreen';
import ConfirmationScreen from './ConfirmationScreen';
import { useMedStore, ScannedBottle } from '../state/useMedStore';
import type { Medication } from '../models/medication';

export interface ScanFlowProps {
  onComplete: (med: Medication) => void;
  onCancel?: () => void;
}

export function ScanFlow({ onComplete, onCancel }: ScanFlowProps) {
  const [pending, setPending] = useState<ScannedBottle | null>(null);
  const addScannedMedication = useMedStore((s) => s.addScannedMedication);

  if (pending) {
    return (
      <ConfirmationScreen
        bottle={pending}
        onNo={() => setPending(null)} // back to scanner
        onYes={(bottle) => {
          const med = addScannedMedication(bottle); // starts 30-day clock
          setPending(null);
          onComplete(med);
        }}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScannerScreen onRecognized={setPending} onClose={onCancel} />
    </View>
  );
}

export default ScanFlow;
