/**
 * Eye got you — HomeScreen
 * ------------------------------------------------------------------
 * The medication list. Each row is a large tap target that opens the
 * MedicationDetail route. A prominent "Scan a bottle" button routes to
 * the scanner. Shows the soonest upcoming dose across all schedules.
 */

import React, { useEffect, useMemo } from 'react';
import {
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
import { PupilSpinner } from '../components/PupilSpinner';
import { preloadFeedback, confirmTap } from '../lib/feedback';
import { useMedStore } from '../state/useMedStore';
import {
  computeExpiry,
  minutesToClock,
  nextDoseAcross,
} from '../logic/clinicalEngine';
import { LATERALITY_SHORT, Medication } from '../models/medication';
import type { HomeProps } from '../navigation/types';

export default function HomeScreen({ navigation }: HomeProps) {
  const insets = useSafeAreaInsets();
  const medications = useMedStore((s) => s.medications.filter((m) => !m.archived));
  const schedules = useMedStore((s) => s.schedules);

  useEffect(() => {
    preloadFeedback();
  }, []);

  const next = useMemo(() => {
    const active = new Set(medications.map((m) => m.id));
    return nextDoseAcross(schedules.filter((s) => active.has(s.medicationId)));
  }, [medications, schedules]);

  const nextMed = medications.find((m) => m.id === next?.medicationId);

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
        <View style={styles.header}>
          <PupilSpinner size={56} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Eye got you</Text>
            <Text style={styles.subtitle}>
              {medications.length === 0
                ? 'No bottles yet'
                : `${medications.length} medication${medications.length > 1 ? 's' : ''} tracked`}
            </Text>
          </View>
        </View>

        {next && nextMed ? (
          <View style={styles.nextBanner}>
            <Text style={styles.nextLabel}>Next dose</Text>
            <Text style={styles.nextValue}>
              {nextMed.name} · {minutesToClock(next.minutesFromMidnight)}
            </Text>
          </View>
        ) : null}

        <Pressable
          style={styles.scanBtn}
          onPress={() => {
            confirmTap();
            navigation.navigate('Scan');
          }}
          accessibilityRole="button"
          accessibilityLabel="Scan a bottle"
        >
          <Text style={styles.scanBtnText}>＋  Scan a bottle</Text>
        </Pressable>

        {medications.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Let's add your first drop</Text>
            <Text style={styles.emptyBody}>
              Tap “Scan a bottle”, hold the bottle inside the glowing box, and
              Eye got you reads the label for you — no typing.
            </Text>
          </View>
        ) : (
          medications.map((m) => (
            <MedRow
              key={m.id}
              med={m}
              onPress={() =>
                navigation.navigate('MedicationDetail', { medicationId: m.id })
              }
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function MedRow({ med, onPress }: { med: Medication; onPress: () => void }) {
  const schedule = useMedStore((s) => s.scheduleFor(med.id));
  const expiry = useMemo(
    () => computeExpiry(med),
    [med.openedAt, med.discardAfterDays],
  );

  const expColor = expiry.isExpired
    ? palette.danger
    : expiry.isCritical
    ? palette.confirmYellow
    : palette.cyan;
  const expLabel =
    expiry.daysRemaining == null
      ? null
      : expiry.isExpired
      ? 'Discard now'
      : `${expiry.daysRemaining}d left`;

  return (
    <Pressable
      style={[styles.row, { borderLeftColor: med.colorHex }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${med.name} details`}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.rowName}>{med.name}</Text>
        <Text style={styles.rowMeta}>
          {[med.strength, `${LATERALITY_SHORT[med.laterality]}`,
            schedule?.timesPerDay ? `${schedule.timesPerDay}×/day` : null]
            .filter(Boolean)
            .join('  ·  ')}
        </Text>
      </View>

      {expLabel ? (
        <View style={[styles.expiryPill, { borderColor: expColor }]}>
          <Text style={[styles.expiryText, { color: expColor }]}>{expLabel}</Text>
        </View>
      ) : null}
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink900 },
  scroll: { paddingHorizontal: space.lg, gap: space.md },

  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.xs },
  title: { color: palette.textHi, fontSize: t.title, fontWeight: t.weightBlack },
  subtitle: { color: palette.textMid, fontSize: t.label, marginTop: 2 },

  nextBanner: {
    borderRadius: radius.md,
    backgroundColor: '#06282B',
    borderWidth: 1,
    borderColor: palette.cyan,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  nextLabel: { color: palette.cyan, fontSize: t.caption, fontWeight: t.weightBold, letterSpacing: 1 },
  nextValue: { color: palette.textHi, fontSize: t.body, fontWeight: t.weightBold, marginTop: 2 },

  scanBtn: {
    minHeight: touch.minTarget,
    borderRadius: radius.pill,
    backgroundColor: palette.cyan,
    alignItems: 'center',
    justifyContent: 'center',
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

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: touch.minTarget + 8,
    borderRadius: radius.lg,
    backgroundColor: palette.ink700,
    borderLeftWidth: 6,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  rowName: { color: palette.textHi, fontSize: t.heading, fontWeight: t.weightBold },
  rowMeta: { color: palette.textMid, fontSize: t.label },
  expiryPill: {
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 2,
  },
  expiryText: { fontSize: t.caption, fontWeight: t.weightBlack },
  chevron: { color: palette.textLow, fontSize: 34, fontWeight: t.weightBold },
});
