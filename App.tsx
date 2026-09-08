/**
 * Eye got you — App entry / demo home screen
 * ------------------------------------------------------------------
 * A runnable screen that exercises the pieces built so far:
 *   • "Scan a bottle" launches the auto-capture ScanFlow
 *   • each medication row shows its 30-day expiry countdown,
 *     a laterality (OS/OD/OU) selector, and an EyeToggle for reminders
 *   • "Log dose" enforces the 5-minute washout via WashoutWarning
 *   • a demo button fires the falling-drop DropReminder
 *
 * This is intentionally a single screen (no navigator) so it runs the
 * moment you open the project. Swap in React Navigation when you grow.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { gradients, palette, radius, space, touch, type as t } from './src/theme/theme';
import { EyeToggle } from './src/components/EyeToggle';
import { PupilSpinner } from './src/components/PupilSpinner';
import { DropReminder } from './src/components/DropReminder';
import { WashoutWarning } from './src/components/WashoutWarning';
import ScanFlow from './src/screens/ScanFlow';
import { preloadFeedback, confirmTap } from './src/lib/feedback';
import { useMedStore } from './src/state/useMedStore';
import {
  computeExpiry,
  minutesToClock,
  optimalIntervalHours,
} from './src/logic/clinicalEngine';
import {
  LATERALITY_LABEL,
  LATERALITY_SHORT,
  Laterality,
  Medication,
} from './src/models/medication';

export default function App() {
  const [scanning, setScanning] = useState(false);
  const [reminderFor, setReminderFor] = useState<string | null>(null);
  const [washout, setWashout] = useState<{
    remainingMs: number;
    blockingName?: string;
    attemptedName?: string;
    medId: string;
  } | null>(null);

  const medications = useMedStore((s) => s.medications.filter((m) => !m.archived));

  useEffect(() => {
    preloadFeedback();
  }, []);

  if (scanning) {
    return (
      <ScanFlow
        onComplete={() => setScanning(false)}
        onCancel={() => setScanning(false)}
      />
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={gradients.ground} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Header count={medications.length} />

          <Pressable
            style={styles.scanBtn}
            onPress={() => {
              confirmTap();
              setScanning(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Scan a bottle"
          >
            <Text style={styles.scanBtnText}>＋  Scan a bottle</Text>
          </Pressable>

          {medications.length === 0 ? (
            <EmptyState />
          ) : (
            medications.map((m) => (
              <MedCard
                key={m.id}
                med={m}
                onRemind={() => setReminderFor(m.name)}
                onWashoutBlocked={(info) => setWashout({ ...info, medId: m.id })}
              />
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Dose reminder overlay */}
      <Modal visible={!!reminderFor} transparent animationType="fade">
        <LinearGradient colors={gradients.ground} style={StyleSheet.absoluteFill} />
        {reminderFor ? (
          <DropReminder
            medicationName={reminderFor}
            onDone={() => setReminderFor(null)}
          />
        ) : null}
      </Modal>

      {/* Washout takeover */}
      <WashoutWarning
        visible={!!washout}
        remainingMs={washout?.remainingMs ?? 0}
        blockingName={washout?.blockingName}
        attemptedName={washout?.attemptedName}
        onDismiss={() => setWashout(null)}
        onOverride={() => {
          if (washout) {
            useMedStore.getState().logDose(washout.medId, { force: true });
          }
          setWashout(null);
        }}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */

function Header({ count }: { count: number }) {
  return (
    <View style={styles.header}>
      <PupilSpinner size={56} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Eye got you</Text>
        <Text style={styles.subtitle}>
          {count === 0
            ? 'No bottles yet'
            : `${count} medication${count > 1 ? 's' : ''} tracked`}
        </Text>
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>Let's add your first drop</Text>
      <Text style={styles.emptyBody}>
        Tap “Scan a bottle”, hold the bottle inside the glowing box, and Eye
        got you reads the label for you — no typing.
      </Text>
    </View>
  );
}

function MedCard({
  med,
  onRemind,
  onWashoutBlocked,
}: {
  med: Medication;
  onRemind: () => void;
  onWashoutBlocked: (info: {
    remainingMs: number;
    blockingName?: string;
    attemptedName?: string;
  }) => void;
}) {
  const schedule = useMedStore((s) => s.scheduleFor(med.id));
  const setLaterality = useMedStore((s) => s.setLaterality);
  const toggleReminders = useMedStore((s) => s.toggleReminders);
  const logDose = useMedStore((s) => s.logDose);
  const medications = useMedStore((s) => s.medications);

  const expiry = useMemo(() => computeExpiry(med), [med.openedAt, med.discardAfterDays]);
  const doseTimes = schedule?.doseTimesMinutes ?? [];
  const interval =
    schedule?.timesPerDay
      ? optimalIntervalHours(schedule.timesPerDay, schedule.window)
      : null;

  const handleLog = () => {
    const decision = logDose(med.id);
    if (!decision.allowed) {
      const blocker = medications.find(
        (x) => x.id !== med.id && x.id === useMedStore.getState().washout().blockingMedicationId,
      );
      onWashoutBlocked({
        remainingMs: decision.remainingMs,
        blockingName: blocker?.name,
        attemptedName: med.name,
      });
    } else {
      confirmTap();
    }
  };

  return (
    <View style={[styles.card, { borderLeftColor: med.colorHex }]}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.medName}>{med.name}</Text>
          {med.strength ? <Text style={styles.medStrength}>{med.strength}</Text> : null}
        </View>
        <ExpiryPill expiry={expiry} />
      </View>

      {/* schedule summary */}
      {doseTimes.length > 0 ? (
        <Text style={styles.scheduleLine}>
          {doseTimes.map(minutesToClock).join('  •  ')}
          {interval ? `   (~${interval}h apart)` : ''}
        </Text>
      ) : null}

      {/* laterality selector */}
      <View style={styles.latRow}>
        {[Laterality.OS, Laterality.OU, Laterality.OD].map((lat) => {
          const active = med.laterality === lat;
          return (
            <Pressable
              key={lat}
              onPress={() => setLaterality(med.id, lat)}
              style={[styles.latChip, active && styles.latChipActive]}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={LATERALITY_LABEL[lat]}
            >
              <Text style={[styles.latShort, active && styles.latShortActive]}>
                {LATERALITY_SHORT[lat]}
              </Text>
              <Text style={[styles.latLabel, active && styles.latLabelActive]}>
                {LATERALITY_LABEL[lat]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* reminders toggle (the blinking eye) */}
      {schedule ? (
        <EyeToggle
          label="Dose reminders"
          value={schedule.remindersEnabled}
          onValueChange={(v) => toggleReminders(schedule.id, v)}
        />
      ) : null}

      {/* actions */}
      <View style={styles.actionsRow}>
        <Pressable
          style={[styles.actionBtn, styles.logBtn]}
          onPress={handleLog}
          accessibilityRole="button"
          accessibilityLabel={`Log a dose of ${med.name}`}
        >
          <Text style={styles.logText}>Log dose</Text>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, styles.remindBtn]}
          onPress={onRemind}
          accessibilityRole="button"
          accessibilityLabel="Preview reminder animation"
        >
          <Text style={styles.remindText}>Preview reminder</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ExpiryPill({ expiry }: { expiry: ReturnType<typeof computeExpiry> }) {
  if (expiry.daysRemaining == null) return null;
  const expired = expiry.isExpired;
  const critical = expiry.isCritical;
  const color = expired ? palette.danger : critical ? palette.confirmYellow : palette.cyan;
  const label = expired
    ? 'Discard now'
    : `${expiry.daysRemaining}d left`;
  return (
    <View style={[styles.expiryPill, { borderColor: color }]}>
      <Text style={[styles.expiryText, { color }]}>{label}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink900 },
  safe: { flex: 1 },
  scroll: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },

  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm },
  title: { color: palette.textHi, fontSize: t.title, fontWeight: t.weightBlack },
  subtitle: { color: palette.textMid, fontSize: t.label, marginTop: 2 },

  scanBtn: {
    minHeight: touch.minTarget,
    borderRadius: radius.pill,
    backgroundColor: palette.cyan,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  scanBtnText: { color: palette.confirmBlack, fontSize: t.body, fontWeight: t.weightBlack },

  empty: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.ink500,
    backgroundColor: palette.ink700,
    padding: space.xl,
    gap: space.sm,
  },
  emptyTitle: { color: palette.textHi, fontSize: t.heading, fontWeight: t.weightBold },
  emptyBody: { color: palette.textMid, fontSize: t.body, lineHeight: 28 },

  card: {
    borderRadius: radius.lg,
    backgroundColor: palette.ink700,
    borderLeftWidth: 6,
    padding: space.lg,
    gap: space.md,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  medName: { color: palette.textHi, fontSize: t.heading, fontWeight: t.weightBold },
  medStrength: { color: palette.textMid, fontSize: t.label, marginTop: 2 },

  scheduleLine: { color: palette.textMid, fontSize: t.label, fontWeight: t.weightMed },

  expiryPill: {
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 2,
  },
  expiryText: { fontSize: t.caption, fontWeight: t.weightBlack },

  latRow: { flexDirection: 'row', gap: space.sm },
  latChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: palette.ink500,
    backgroundColor: palette.ink600,
    gap: 2,
  },
  latChipActive: { borderColor: palette.cyan, backgroundColor: '#06282B' },
  latShort: { color: palette.textMid, fontSize: t.body, fontWeight: t.weightBlack },
  latShortActive: { color: palette.mint },
  latLabel: { color: palette.textLow, fontSize: 12 },
  latLabelActive: { color: palette.textHi },

  actionsRow: { flexDirection: 'row', gap: space.sm },
  actionBtn: {
    flex: 1,
    minHeight: touch.minTarget,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logBtn: { backgroundColor: palette.mint },
  logText: { color: palette.confirmBlack, fontSize: t.body, fontWeight: t.weightBlack },
  remindBtn: { borderWidth: 2, borderColor: palette.cyan },
  remindText: { color: palette.cyan, fontSize: t.label, fontWeight: t.weightBold },
});
