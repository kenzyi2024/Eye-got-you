/**
 * Eye got you — ReminderSettingsScreen
 * ------------------------------------------------------------------
 * One place to manage reminders:
 *   • Quiet hours — mute dose slots inside a window (wraps past midnight)
 *   • Per-bottle "Snooze 10 min" — one-off nudge that survives reschedules
 *   • Everything currently queued (live, via listOwnedReminders())
 */

import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import type * as Notifications from 'expo-notifications';

import { gradients, palette, radius, space, touch, type as t } from '../theme/theme';
import { EyeToggle } from '../components/EyeToggle';
import { PupilSpinner } from '../components/PupilSpinner';
import { useMedStore } from '../state/useMedStore';
import {
  cancelOneReminder,
  listOwnedReminders,
  sendTestReminder,
  snoozeReminder,
} from '../lib/notifications';
import { track } from '../lib/analytics';
import { wipeAllData } from '../lib/secureStorage';
import { minutesToClock } from '../logic/clinicalEngine';
import {
  LATERALITY_SHORT,
  Medication,
  SNOOZE_MINUTES,
} from '../models/medication';
import type { ReminderSettingsProps } from '../navigation/types';

const STEP = 30; // quiet-hours adjust granularity, minutes
const STORE_NAME = 'eye-got-you/med-store/v1';

export default function ReminderSettingsScreen({ navigation }: ReminderSettingsProps) {
  const insets = useSafeAreaInsets();

  const medications = useMedStore((s) => s.medications.filter((m) => !m.archived));
  const settings = useMedStore((s) => s.settings);
  const analyticsOptedOut = useMedStore((s) => s.analyticsOptedOut);
  const setAnalyticsOptedOut = useMedStore((s) => s.setAnalyticsOptedOut);
  const setQuietHoursEnabled = useMedStore((s) => s.setQuietHoursEnabled);
  const setQuietHours = useMedStore((s) => s.setQuietHours);

  const [queued, setQueued] = useState<Notifications.NotificationRequest[] | null>(null);
  const [snoozed, setSnoozed] = useState<string | null>(null);
  const [testState, setTestState] = useState<'idle' | 'sent' | 'blocked'>('idle');

  const refresh = useCallback(async () => {
    const list = await listOwnedReminders();
    setQueued(list);
  }, []);

  // Reload the queue every time the screen comes into focus.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      listOwnedReminders().then((l) => alive && setQueued(l));
      return () => {
        alive = false;
      };
    }, []),
  );

  const adjustStart = (delta: number) =>
    setQuietHours(wrap(settings.quietStartMinutes + delta), settings.quietEndMinutes);
  const adjustEnd = (delta: number) =>
    setQuietHours(settings.quietStartMinutes, wrap(settings.quietEndMinutes + delta));

  const onSnooze = async (med: Medication) => {
    const id = await snoozeReminder(med, SNOOZE_MINUTES);
    setSnoozed(id ? med.id : null);
    await refresh();
    // clear the confirmation flash after a moment
    setTimeout(() => setSnoozed(null), 2500);
  };

  const onCancel = async (id: string) => {
    await cancelOneReminder(id);
    await refresh();
  };

  const onTest = async () => {
    const id = await sendTestReminder(10);
    setTestState(id ? 'sent' : 'blocked');
    track('reminder_test_sent');
    await refresh();
    setTimeout(() => setTestState('idle'), 4000);
  };

  const onQuietToggle = (enabled: boolean) => {
    setQuietHoursEnabled(enabled);
    track('quiet_hours_toggled', { quietEnabled: enabled });
  };

  const onDeleteAll = () => {
    Alert.alert(
      'Delete all data?',
      'This permanently removes every medication, schedule, and log from this ' +
        'device and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            await wipeAllData(STORE_NAME);
            // Reset the in-memory store so the UI reflects the wipe immediately.
            useMedStore.setState({ medications: [], schedules: [], logs: [] });
            await refresh();
            navigation.popToTop();
          },
        },
      ],
    );
  };

  const medName = (id?: unknown) =>
    medications.find((m) => m.id === id)?.name ??
    useMedStore.getState().medications.find((m) => m.id === id)?.name ??
    'Medication';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={gradients.ground} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xxl },
        ]}
      >
        {/* Test reminder --------------------------------------------------- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Check it works</Text>
          <Text style={styles.quietNote}>
            Sends one notification in 10 seconds so you can confirm reminders
            arrive on this device.
          </Text>
          {testState === 'sent' ? (
            <View style={[styles.testBtn, styles.testSent]}>
              <Text style={styles.testSentText}>✓ Coming in 10 seconds…</Text>
            </View>
          ) : testState === 'blocked' ? (
            <View style={[styles.testBtn, styles.testBlocked]}>
              <Text style={styles.testBlockedText}>
                Notifications are turned off — enable them in Settings
              </Text>
            </View>
          ) : (
            <Pressable
              style={styles.testBtn}
              onPress={onTest}
              accessibilityRole="button"
              accessibilityLabel="Send a test reminder in 10 seconds"
            >
              <Text style={styles.testBtnText}>Test reminder in 10s</Text>
            </Pressable>
          )}
        </View>

        {/* Quiet hours ------------------------------------------------------ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quiet hours</Text>
          <EyeToggle
            label="Mute reminders overnight"
            value={settings.quietHoursEnabled}
            onValueChange={onQuietToggle}
          />

          {settings.quietHoursEnabled ? (
            <>
              <View style={styles.timeRow}>
                <TimeStepper
                  label="From"
                  value={settings.quietStartMinutes}
                  onDown={() => adjustStart(-STEP)}
                  onUp={() => adjustStart(STEP)}
                />
                <TimeStepper
                  label="Until"
                  value={settings.quietEndMinutes}
                  onDown={() => adjustEnd(-STEP)}
                  onUp={() => adjustEnd(STEP)}
                />
              </View>
              <Text style={styles.quietNote}>
                Doses scheduled between {minutesToClock(settings.quietStartMinutes)} and{' '}
                {minutesToClock(settings.quietEndMinutes)} won't ring. You'll still see
                them on the medication screen.
              </Text>
            </>
          ) : (
            <Text style={styles.quietNote}>
              When on, reminders inside your chosen window stay silent.
            </Text>
          )}
        </View>

        {/* Per-bottle snooze ---------------------------------------------- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Snooze a bottle</Text>
          {medications.length === 0 ? (
            <Text style={styles.emptyLine}>No medications yet.</Text>
          ) : (
            medications.map((m) => (
              <View key={m.id} style={styles.snoozeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.snoozeName}>{m.name}</Text>
                  <Text style={styles.snoozeMeta}>{LATERALITY_SHORT[m.laterality]}</Text>
                </View>
                {snoozed === m.id ? (
                  <View style={[styles.snoozeBtn, styles.snoozedBtn]}>
                    <Text style={styles.snoozedText}>✓ In {SNOOZE_MINUTES} min</Text>
                  </View>
                ) : (
                  <Pressable
                    style={styles.snoozeBtn}
                    onPress={() => onSnooze(m)}
                    accessibilityRole="button"
                    accessibilityLabel={`Snooze ${m.name} for ${SNOOZE_MINUTES} minutes`}
                  >
                    <Text style={styles.snoozeBtnText}>Snooze {SNOOZE_MINUTES} min</Text>
                  </Pressable>
                )}
              </View>
            ))
          )}
        </View>

        {/* Currently queued ------------------------------------------------ */}
        <View style={styles.section}>
          <View style={styles.queueHeader}>
            <Text style={styles.sectionTitle}>Currently scheduled</Text>
            <Pressable
              onPress={refresh}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Refresh scheduled reminders"
            >
              <Text style={styles.refresh}>↻</Text>
            </Pressable>
          </View>

          {queued == null ? (
            <View style={styles.loading}>
              <PupilSpinner size={44} label="Loading scheduled reminders" />
            </View>
          ) : queued.length === 0 ? (
            <Text style={styles.emptyLine}>
              Nothing queued. Reminders appear here once a bottle has them enabled.
            </Text>
          ) : (
            sortQueue(queued).map((n) => (
              <QueueRow
                key={n.identifier}
                request={n}
                name={medName(n.content?.data?.medicationId)}
                onCancel={() => onCancel(n.identifier)}
              />
            ))
          )}
        </View>

        {/* Data & privacy -------------------------------------------------- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & privacy</Text>

          <Text style={styles.quietNote}>
            Your data stays on this device, encrypted. Nothing is uploaded and we
            can't see it.
          </Text>

          <EyeToggle
            label="Share anonymous usage (no health data)"
            value={!analyticsOptedOut}
            onValueChange={(on) => setAnalyticsOptedOut(!on)}
          />

          <View style={styles.linkRow}>
            <Pressable
              style={styles.linkBtn}
              onPress={() => navigation.navigate('Legal', { doc: 'privacy' })}
              accessibilityRole="button"
              accessibilityLabel="Read the Privacy Policy"
            >
              <Text style={styles.linkText}>Privacy Policy</Text>
            </Pressable>
            <Pressable
              style={styles.linkBtn}
              onPress={() => navigation.navigate('Legal', { doc: 'terms' })}
              accessibilityRole="button"
              accessibilityLabel="Read the Terms and Conditions"
            >
              <Text style={styles.linkText}>Terms & Conditions</Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.deleteBtn}
            onPress={onDeleteAll}
            accessibilityRole="button"
            accessibilityLabel="Delete all app data"
          >
            <Text style={styles.deleteText}>Delete all my data</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

/* -------------------------------------------------------------------------- */

function QueueRow({
  request,
  name,
  onCancel,
}: {
  request: Notifications.NotificationRequest;
  name: string;
  onCancel: () => void;
}) {
  const data = request.content?.data ?? {};
  const kind = data.kind as 'daily' | 'snooze' | 'test' | undefined;
  const isOneOff = kind === 'snooze' || kind === 'test';

  const when = isOneOff
    ? typeof data.fireAt === 'number'
      ? new Date(data.fireAt).toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'soon'
    : typeof data.slot === 'number'
    ? minutesToClock(data.slot)
    : '—';

  const meta =
    kind === 'snooze'
      ? `Snoozed · once at ${when}`
      : kind === 'test'
      ? `Test · once at ${when}`
      : `Daily · ${when}`;
  const dotColor = kind === 'test' ? palette.confirmYellow : isOneOff ? palette.mint : palette.cyan;
  const rowName = kind === 'test' ? 'Test reminder' : name;

  return (
    <View style={styles.queueRow}>
      <View style={[styles.kindDot, { backgroundColor: dotColor }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.queueName}>{rowName}</Text>
        <Text style={styles.queueMeta}>{meta}</Text>
      </View>
      <Pressable
        onPress={onCancel}
        hitSlop={12}
        style={styles.cancelBtn}
        accessibilityRole="button"
        accessibilityLabel={`Cancel ${name} reminder at ${when}`}
      >
        <Text style={styles.cancelX}>✕</Text>
      </Pressable>
    </View>
  );
}

function TimeStepper({
  label,
  value,
  onDown,
  onUp,
}: {
  label: string;
  value: number;
  onDown: () => void;
  onUp: () => void;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable
          style={styles.stepBtn}
          onPress={onDown}
          accessibilityRole="button"
          accessibilityLabel={`${label} earlier`}
        >
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{minutesToClock(value)}</Text>
        <Pressable
          style={styles.stepBtn}
          onPress={onUp}
          accessibilityRole="button"
          accessibilityLabel={`${label} later`}
        >
          <Text style={styles.stepBtnText}>＋</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Wrap minutes into [0, 1440). */
function wrap(minutes: number): number {
  return ((minutes % 1440) + 1440) % 1440;
}

/** Daily first (by time), then snoozes (by fire time). */
function sortQueue(list: Notifications.NotificationRequest[]) {
  const key = (n: Notifications.NotificationRequest) => {
    const d = n.content?.data ?? {};
    if (d.kind === 'snooze' || d.kind === 'test') {
      return 100000 + (typeof d.fireAt === 'number' ? d.fireAt : 0);
    }
    return typeof d.slot === 'number' ? d.slot : 0;
  };
  return [...list].sort((a, b) => key(a) - key(b));
}

/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink900 },
  scroll: { paddingHorizontal: space.lg, gap: space.md },

  section: {
    borderRadius: radius.lg,
    backgroundColor: palette.ink700,
    padding: space.lg,
    gap: space.md,
  },
  sectionTitle: {
    color: palette.textLow,
    fontSize: t.caption,
    fontWeight: t.weightBold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  timeRow: { flexDirection: 'row', gap: space.md },
  stepper: { flex: 1, gap: space.sm },
  stepperLabel: { color: palette.textMid, fontSize: t.label, fontWeight: t.weightMed },
  stepperControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: palette.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { color: palette.cyan, fontSize: t.heading, fontWeight: t.weightBlack },
  stepperValue: {
    color: palette.textHi,
    fontSize: t.heading,
    fontWeight: t.weightBlack,
    fontVariant: ['tabular-nums'],
  },
  quietNote: { color: palette.textMid, fontSize: t.label, lineHeight: 24 },

  testBtn: {
    minHeight: touch.minTarget,
    borderRadius: radius.pill,
    backgroundColor: palette.cyan,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  testBtnText: { color: palette.confirmBlack, fontSize: t.body, fontWeight: t.weightBlack },
  testSent: { backgroundColor: '#06282B', borderWidth: 2, borderColor: palette.mint },
  testSentText: { color: palette.mint, fontSize: t.body, fontWeight: t.weightBold },
  testBlocked: { backgroundColor: palette.dangerDeep, borderWidth: 2, borderColor: palette.danger },
  testBlockedText: { color: palette.danger, fontSize: t.label, fontWeight: t.weightBold, textAlign: 'center' },

  emptyLine: { color: palette.textMid, fontSize: t.body },

  snoozeRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  snoozeName: { color: palette.textHi, fontSize: t.body, fontWeight: t.weightBold },
  snoozeMeta: { color: palette.textMid, fontSize: t.caption },
  snoozeBtn: {
    minHeight: touch.minTarget - 8,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: palette.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snoozeBtnText: { color: palette.cyan, fontSize: t.label, fontWeight: t.weightBold },
  snoozedBtn: { borderColor: palette.mint, backgroundColor: '#06282B' },
  snoozedText: { color: palette.mint, fontSize: t.label, fontWeight: t.weightBold },

  linkRow: { flexDirection: 'row', gap: space.sm },
  linkBtn: {
    flex: 1,
    minHeight: touch.minTarget - 8,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: palette.cyan,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  linkText: { color: palette.cyan, fontSize: t.label, fontWeight: t.weightBold, textAlign: 'center' },
  deleteBtn: {
    minHeight: touch.minTarget - 8,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: palette.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { color: palette.danger, fontSize: t.label, fontWeight: t.weightBlack },

  queueHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  refresh: { color: palette.cyan, fontSize: t.heading, fontWeight: t.weightBlack },
  loading: { alignItems: 'center', paddingVertical: space.md },

  queueRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  kindDot: { width: 12, height: 12, borderRadius: 6 },
  queueName: { color: palette.textHi, fontSize: t.body, fontWeight: t.weightBold },
  queueMeta: { color: palette.textMid, fontSize: t.caption },
  cancelBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.ink500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelX: { color: palette.textMid, fontSize: t.body, fontWeight: t.weightBold },
});
