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
} from '../models/medication';
import { computeExpiry } from '../logic/clinicalEngine';

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

/**
 * Cancel every reminder this app scheduled (identified by OWNER_TAG),
 * leaving any unrelated notifications untouched.
 */
export async function cancelAllReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.content?.data?.owner === OWNER_TAG)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/**
 * Rebuild the full reminder set from current state. Idempotent: cancels
 * our previous reminders, then schedules one DAILY notification per dose
 * slot of each eligible medication.
 *
 * Returns the number of reminders scheduled (handy for a settings badge).
 */
export async function rescheduleAllReminders(
  medications: Medication[],
  schedules: DosingSchedule[],
): Promise<number> {
  const granted = await ensureNotificationPermission();
  await cancelAllReminders();
  if (!granted) return 0;

  const byId = new Map(medications.map((m) => [m.id, m]));
  let count = 0;

  for (const schedule of schedules) {
    if (!schedule.remindersEnabled) continue;
    const med = byId.get(schedule.medicationId);
    if (!med || med.archived) continue;

    // Don't nag about a bottle that should already be discarded.
    if (computeExpiry(med).isExpired) continue;

    const eye = LATERALITY_LABEL[med.laterality];

    for (const slot of schedule.doseTimesMinutes) {
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
      count++;
    }
  }

  return count;
}

/** Read back what we currently have scheduled (debug / settings screen). */
export async function listOwnedReminders() {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.filter((n) => n.content?.data?.owner === OWNER_TAG);
}
