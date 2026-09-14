/**
 * Eye got you — Local dose reminders
 * ------------------------------------------------------------------
 * Schedules a repeating DAILY local notification for every dose slot of
 * every active, reminder-enabled, non-expired bottle. Reschedules from
 * scratch on any change so the OS-scheduled set always matches state.
 *
 * Install deps:
 *   npx expo install expo-notifications expo-device
 *
 * Local scheduled notifications work in a dev/production build and on
 * iOS in Expo Go. Android Expo Go has limited notification support —
 * use a dev build (`npx expo run:android`) to test reminders there.
 */

import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import {
  DosingSchedule,
  LATERALITY_LABEL,
  Medication,
  ReminderSettings,
  SNOOZE_MINUTES,
} from '../models/medication';
import { computeExpiry, isDoseMuted } from '../logic/clinicalEngine';

const ANDROID_CHANNEL = 'dose-reminders';

/** Tag we stamp on every notification we own, so we never touch others. */
const OWNER_TAG = 'eye-got-you';

let configured = false;

/**
 * Install the foreground handler + Android channel. Call once at startup
 * (safe to call more than once — it no-ops after the first).
 */
export async function configureNotifications(): Promise<void> {
  if (configured) return;
  configured = true;

  // Show reminders even when the app is foregrounded.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: 'Dose reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2EC5CE',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
}

/**
 * Ask for permission if not already granted. Returns true when the app
 * may post notifications. Safe to call repeatedly.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    // Simulators/emulators can schedule but may not display — allow anyway.
    return true;
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;

  const req = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return req.granted;
}

/** minutes-from-midnight → { hour, minute } for a DAILY trigger. */
function toHourMinute(minutes: number): { hour: number; minute: number } {
  const m = ((minutes % 1440) + 1440) % 1440;
  return { hour: Math.floor(m / 60), minute: m % 60 };
}

/** Reminder kinds we schedule. Recurring 'daily' vs one-off 'snooze'/'test'. */
type ReminderKind = 'daily' | 'snooze' | 'test';

function isOwned(n: Notifications.NotificationRequest, kind?: ReminderKind): boolean {
  const data = n.content?.data;
  if (data?.owner !== OWNER_TAG) return false;
  return kind ? data?.kind === kind : true;
}

/**
 * Cancel the recurring daily reminders we scheduled, leaving one-off
 * snoozes (and any unrelated notifications) in place.
 */
export async function cancelRecurringReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => isOwned(n, 'daily'))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/** Cancel a single scheduled reminder by identifier (from the list screen). */
export async function cancelOneReminder(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

export interface RescheduleResult {
  /** Reminders actually scheduled to fire. */
  scheduled: number;
  /** Dose slots skipped because they fell inside quiet hours. */
  muted: number;
}

/**
 * Rebuild the recurring reminder set from current state. Idempotent:
 * cancels our previous daily reminders, then schedules one DAILY
 * notification per dose slot of each eligible medication — skipping any
 * slot that falls inside quiet hours.
 */
export async function rescheduleAllReminders(
  medications: Medication[],
  schedules: DosingSchedule[],
  settings: ReminderSettings,
): Promise<RescheduleResult> {
  const granted = await ensureNotificationPermission();
  await cancelRecurringReminders();
  if (!granted) return { scheduled: 0, muted: 0 };

  const byId = new Map(medications.map((m) => [m.id, m]));
  let scheduled = 0;
  let muted = 0;

  for (const schedule of schedules) {
    if (!schedule.remindersEnabled) continue;
    const med = byId.get(schedule.medicationId);
    if (!med || med.archived) continue;

    // Don't nag about a bottle that should already be discarded.
    if (computeExpiry(med).isExpired) continue;

    const eye = LATERALITY_LABEL[med.laterality];

    for (const slot of schedule.doseTimesMinutes) {
      if (isDoseMuted(slot, med.quietOverride, settings)) {
        muted++;
        continue;
      }

      const { hour, minute } = toHourMinute(slot);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Time for ${med.name}`,
          body: med.strength
            ? `${med.strength} · ${eye}`
            : `${eye} — tap to log your dose`,
          sound: 'default',
          data: {
            owner: OWNER_TAG,
            kind: 'daily' as ReminderKind,
            medicationId: med.id,
            scheduleId: schedule.id,
            slot,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          // channelId on the trigger routes Android delivery to our channel.
          ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : null),
        },
      });
      scheduled++;
    }
  }

  return { scheduled, muted };
}

/**
 * Push a one-off reminder for a bottle `minutes` from now (default 10).
 * Snoozes survive a reschedule (they aren't 'daily'), and fire once.
 * Returns the scheduled notification id.
 */
export async function snoozeReminder(
  med: Medication,
  minutes: number = SNOOZE_MINUTES,
): Promise<string | null> {
  const granted = await ensureNotificationPermission();
  if (!granted) return null;

  const eye = LATERALITY_LABEL[med.laterality];
  const fireAt = Date.now() + minutes * 60_000;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: `Reminder: ${med.name}`,
      body: `Snoozed ${minutes} min · ${eye} — tap to log your dose`,
      sound: 'default',
      data: {
        owner: OWNER_TAG,
        kind: 'snooze' as ReminderKind,
        medicationId: med.id,
        fireAt,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, Math.round(minutes * 60)),
      repeats: false,
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : null),
    },
  });
}

/**
 * Fire a one-off test reminder after `seconds` (default 10) so a patient
 * can confirm on-device that notifications actually arrive. Tagged 'test'
 * so it shows in the queue and is never touched by a reschedule.
 */
export async function sendTestReminder(seconds: number = 10): Promise<string | null> {
  const granted = await ensureNotificationPermission();
  if (!granted) return null;

  const fireAt = Date.now() + seconds * 1000;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Eye got you — test reminder',
      body: `If you can see this, reminders are working. 👁️`,
      sound: 'default',
      data: { owner: OWNER_TAG, kind: 'test' as ReminderKind, fireAt },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, Math.round(seconds)),
      repeats: false,
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : null),
    },
  });
}

/** Read back everything we currently have scheduled (settings screen). */
export async function listOwnedReminders(): Promise<Notifications.NotificationRequest[]> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.filter((n) => isOwned(n));
}
