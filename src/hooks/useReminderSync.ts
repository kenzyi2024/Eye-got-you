/**
 * Eye got you — useReminderSync
 * ------------------------------------------------------------------
 * Keeps the OS-scheduled reminders in lock-step with the store. Any
 * change to medications or schedules (add, retime, toggle, archive)
 * triggers a debounced full reschedule.
 *
 * Also wires notification taps → the matching MedicationDetail screen.
 */

import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';

import { useMedStore } from '../state/useMedStore';
import {
  configureNotifications,
  rescheduleAllReminders,
} from '../lib/notifications';
import { openMedication } from '../navigation/navigationRef';

/** Debounce window so a burst of edits results in one reschedule. */
const DEBOUNCE_MS = 600;

export function useReminderSync(): void {
  const medications = useMedStore((s) => s.medications);
  const schedules = useMedStore((s) => s.schedules);
  const settings = useMedStore((s) => s.settings);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Configure handler/channel + handle taps once.
  useEffect(() => {
    configureNotifications();

    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const medId = resp.notification.request.content.data?.medicationId;
      if (typeof medId === 'string') openMedication(medId);
    });

    return () => sub.remove();
  }, []);

  // Reschedule whenever the relevant state changes (debounced).
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      rescheduleAllReminders(medications, schedules, settings).catch((err) => {
        if (__DEV__) console.warn('[reminders] reschedule failed', err);
      });
    }, DEBOUNCE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [medications, schedules, settings]);
}
