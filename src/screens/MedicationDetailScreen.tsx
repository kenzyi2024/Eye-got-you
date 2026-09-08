/**
 * Eye got you — MedicationDetailScreen
 * ------------------------------------------------------------------
 * Full controls for one bottle:
 *   • 30-day expiry status + discard date
 *   • laterality selector (OS / OU / OD)
 *   • "times per day" stepper → live-recomputed dose times + interval
 *   • reminders EyeToggle (the blinking eye)
 *   • Log dose (enforces the 5-min washout via WashoutWarning)
 *   • Preview reminder animation, and Archive
 */

import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { gradients, palette, radius, space, touch, type as t } from '../theme/theme';
import { EyeToggle } from '../components/EyeToggle';
import { DropReminder } from '../components/DropReminder';
import { WashoutWarning } from '../components/WashoutWarning';
import { useDoseLogger } from '../hooks/useDoseLogger';
import { useMedStore } from '../state/useMedStore';
import {
  computeExpiry,
  minutesToClock,
  optimalIntervalHours,
} from '../logic/clinicalEngine';
import {
  LATERALITY_LABEL,
  LATERALITY_SHORT,
  Laterality,
} from '../models/medication';
import type { MedicationDetailProps } from '../navigation/types';

const MAX_TIMES = 6;

export default function MedicationDetailScreen({
  route,
  navigation,
}: MedicationDetailProps) {
  const { medicationId } = route.params;
  const insets = useSafeAreaInsets();

  const med = useMedStore((s) => s.medications.find((m) => m.id === medicationId));
  const schedule = useMedStore((s) => s.scheduleFor(medicationId));
  const setLaterality = useMedStore((s) => s.setLaterality);
  const setTimesPerDay = useMedStore((s) => s.setTimesPerDay);
  const toggleReminders = useMedStore((s) => s.toggleReminders);
  const archive = useMedStore((s) => s.archiveMedication);

  const { attempt, washout, dismiss, override } = useDoseLogger();
  const [reminderVisible, setReminderVisible] = useState(false);

  const expiry = useMemo(
    () => (med ? computeExpiry(med) : null),
    [med?.openedAt, med?.discardAfterDays],
  );

  // Guard: medication may have been archived/removed while on this screen.
  if (!med) {
    return (
      <View style={styles.rootCentered}>
        <LinearGradient colors={gradients.ground} style={StyleSheet.absoluteFill} />
        <Text style={styles.gone}>This medication is no longer available.</Text>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const times = schedule?.timesPerDay ?? 1;
  const interval = schedule ? optimalIntervalHours(times, schedule.window) : null;
  const doseTimes = schedule?.doseTimesMinutes ?? [];

  const discardDate =
    expiry?.discardAt != null
      ? new Date(expiry.discardAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : null;

  const expColor = expiry?.isExpired
    ? palette.danger
    : expiry?.isCritical
    ? palette.confirmYellow
    : palette.cyan;

  const onArchive = () => {
    archive(med.id);
    navigation.goBack();
  };

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
        {/* Title */}
        <View style={[styles.titleCard, { borderLeftColor: med.colorHex }]}>
          <Text style={styles.name}>{med.name}</Text>
          {med.strength ? <Text style={styles.strength}>{med.strength}</Text> : null}
        </View>

        {/* Expiry */}
        {expiry?.daysRemaining != null ? (
          <Section title="Bottle life">
            <View style={styles.expiryRow}>
              <Text style={[styles.expiryBig, { color: expColor }]}>
                {expiry.isExpired ? 'Discard now' : `${expiry.daysRemaining} days left`}
              </Text>
              {discardDate ? (
                <Text style={styles.expirySub}>
                  {expiry.isExpired ? 'Expired' : 'Throw away by'} {discardDate}
                </Text>
              ) : null}
            </View>
            {expiry.isCritical || expiry.isExpired ? (
              <Text style={styles.refillNote}>
                Time to get a refill — an opened bottle is only safe for
                {' '}{med.discardAfterDays} days.
              </Text>
            ) : null}
          </Section>
        ) : null}

        {/* Laterality */}
        <Section title="Which eye">
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
        </Section>

        {/* Frequency stepper */}
        {schedule ? (
          <Section title="How often">
            <View style={styles.stepperRow}>
              <StepBtn
                label="−"
                disabled={times <= 1}
                onPress={() => setTimesPerDay(med.id, Math.max(1, times - 1))}
              />
              <View style={styles.stepValue}>
                <Text style={styles.stepNumber}>{times}×</Text>
                <Text style={styles.stepUnit}>per day</Text>
              </View>
              <StepBtn
                label="＋"
                disabled={times >= MAX_TIMES}
                onPress={() => setTimesPerDay(med.id, Math.min(MAX_TIMES, times + 1))}
              />
            </View>

            <Text style={styles.timesLine}>
              {doseTimes.map(minutesToClock).join('   •   ')}
            </Text>
            {interval ? (
              <Text style={styles.intervalLine}>
                ≈ {interval}h between doses, spread across waking hours
              </Text>
            ) : null}
          </Section>
        ) : null}

        {/* Reminders */}
        {schedule ? (
          <Section title="Reminders">
            <EyeToggle
              label="Dose reminders"
              value={schedule.remindersEnabled}
              onValueChange={(v) => toggleReminders(schedule.id, v)}
            />
          </Section>
        ) : null}

        {/* Actions */}
        <Pressable
          style={styles.logBtn}
          onPress={() => attempt(med.id)}
          accessibilityRole="button"
          accessibilityLabel={`Log a dose of ${med.name}`}
        >
          <Text style={styles.logText}>Log dose now</Text>
        </Pressable>

        <View style={styles.secondaryRow}>
          <Pressable
            style={[styles.secondaryBtn, styles.previewBtn]}
            onPress={() => setReminderVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Preview the reminder animation"
          >
            <Text style={styles.previewText}>Preview reminder</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryBtn, styles.archiveBtn]}
            onPress={onArchive}
            accessibilityRole="button"
            accessibilityLabel={`Archive ${med.name}`}
          >
            <Text style={styles.archiveText}>Archive</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Reminder preview overlay */}
      <Modal visible={reminderVisible} transparent animationType="fade">
        <LinearGradient colors={gradients.ground} style={StyleSheet.absoluteFill} />
        {reminderVisible ? (
          <DropReminder
            medicationName={med.name}
            onDone={() => setReminderVisible(false)}
          />
        ) : null}
      </Modal>

      {/* Washout takeover */}
      <WashoutWarning
        visible={washout.visible}
        remainingMs={washout.remainingMs}
        blockingName={washout.blockingName}
        attemptedName={washout.attemptedName}
        onDismiss={dismiss}
        onOverride={override}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function StepBtn({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.stepBtn, disabled && styles.stepBtnDisabled]}
      accessibilityRole="button"
      accessibilityLabel={label === '＋' ? 'Increase frequency' : 'Decrease frequency'}
    >
      <Text style={styles.stepBtnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink900 },
  rootCentered: {
    flex: 1,
    backgroundColor: palette.ink900,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    padding: space.xl,
  },
  gone: { color: palette.textMid, fontSize: t.body, textAlign: 'center' },
  scroll: { paddingHorizontal: space.lg, gap: space.md },

  titleCard: {
    borderRadius: radius.lg,
    backgroundColor: palette.ink700,
    borderLeftWidth: 6,
    padding: space.lg,
  },
  name: { color: palette.textHi, fontSize: t.title, fontWeight: t.weightBlack },
  strength: { color: palette.textMid, fontSize: t.body, marginTop: 4 },

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

  expiryRow: { gap: 4 },
  expiryBig: { fontSize: t.display, fontWeight: t.weightBlack },
  expirySub: { color: palette.textMid, fontSize: t.label },
  refillNote: { color: palette.confirmYellow, fontSize: t.label, lineHeight: 24 },

  latRow: { flexDirection: 'row', gap: space.sm },
  latChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: palette.ink500,
    backgroundColor: palette.ink600,
    gap: 4,
  },
  latChipActive: { borderColor: palette.cyan, backgroundColor: '#06282B' },
  latShort: { color: palette.textMid, fontSize: t.heading, fontWeight: t.weightBlack },
  latShortActive: { color: palette.mint },
  latLabel: { color: palette.textLow, fontSize: 13 },
  latLabelActive: { color: palette.textHi },

  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: {
    width: touch.minTarget,
    height: touch.minTarget,
    borderRadius: touch.minTarget / 2,
    borderWidth: 2,
    borderColor: palette.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: { borderColor: palette.ink500, opacity: 0.5 },
  stepBtnText: { color: palette.cyan, fontSize: t.title, fontWeight: t.weightBlack },
  stepValue: { alignItems: 'center' },
  stepNumber: { color: palette.textHi, fontSize: t.display, fontWeight: t.weightBlack },
  stepUnit: { color: palette.textMid, fontSize: t.label },

  timesLine: { color: palette.textHi, fontSize: t.body, fontWeight: t.weightBold, textAlign: 'center' },
  intervalLine: { color: palette.textMid, fontSize: t.label, textAlign: 'center' },

  logBtn: {
    minHeight: touch.giantTarget,
    borderRadius: radius.lg,
    backgroundColor: palette.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logText: { color: palette.confirmBlack, fontSize: t.heading, fontWeight: t.weightBlack },

  secondaryRow: { flexDirection: 'row', gap: space.sm },
  secondaryBtn: {
    flex: 1,
    minHeight: touch.minTarget,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBtn: { borderWidth: 2, borderColor: palette.cyan },
  previewText: { color: palette.cyan, fontSize: t.label, fontWeight: t.weightBold },
  archiveBtn: { borderWidth: 2, borderColor: palette.textLow },
  archiveText: { color: palette.textMid, fontSize: t.label, fontWeight: t.weightBold },

  backBtn: {
    minHeight: touch.minTarget,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    backgroundColor: palette.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: palette.confirmBlack, fontSize: t.body, fontWeight: t.weightBlack },
});
