/**
 * Eye got you — useDoseLogger
 * ------------------------------------------------------------------
 * Wraps the store's logDose with the UI state a screen needs to show
 * the WashoutWarning. Any screen can log a dose and get correct
 * washout handling with one hook.
 */

import { useCallback, useState } from 'react';

import { useMedStore } from '../state/useMedStore';
import { confirmTap } from '../lib/feedback';

export interface WashoutModalState {
  visible: boolean;
  remainingMs: number;
  blockingName?: string;
  attemptedName?: string;
  medicationId?: string;
}

const CLOSED: WashoutModalState = { visible: false, remainingMs: 0 };

export function useDoseLogger() {
  const [washout, setWashout] = useState<WashoutModalState>(CLOSED);

  const attempt = useCallback((medicationId: string) => {
    const store = useMedStore.getState();
    const decision = store.logDose(medicationId);

    if (decision.allowed) {
      confirmTap();
      return { logged: true };
    }

    // Blocked — surface the takeover with the names involved.
    const blockingId = store.washout().blockingMedicationId;
    const blocking = store.medications.find((m) => m.id === blockingId);
    const attempted = store.medications.find((m) => m.id === medicationId);

    setWashout({
      visible: true,
      remainingMs: decision.remainingMs,
      blockingName: blocking?.name,
      attemptedName: attempted?.name,
      medicationId,
    });
    return { logged: false };
  }, []);

  const dismiss = useCallback(() => setWashout(CLOSED), []);

  const override = useCallback(() => {
    if (washout.medicationId) {
      // Patient accepted the risk — write a WashoutConflict record.
      useMedStore.getState().logDose(washout.medicationId, { force: true });
    }
    setWashout(CLOSED);
  }, [washout.medicationId]);

  return { attempt, washout, dismiss, override };
}
