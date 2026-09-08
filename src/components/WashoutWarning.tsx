/**
 * Eye got you — WashoutWarning
 * ------------------------------------------------------------------
 * Full-screen danger takeover shown when a patient tries to log a
 * DIFFERENT drop inside the 5-minute washout window. Huge red type,
 * a live countdown, and a heavy warning buzz on mount.
 */

import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radius, space, touch, type as t } from '../theme/theme';
import { warnBuzz } from '../lib/feedback';
import { formatCountdown } from '../logic/clinicalEngine';

export interface WashoutWarningProps {
  visible: boolean;
  /** ms remaining when the warning opened. */
  remainingMs: number;
  blockingName?: string;
  attemptedName?: string;
  onDismiss: () => void;
  /** Patient chose to log anyway — writes a WashoutConflict record. */
  onOverride?: () => void;
}

export function WashoutWarning({
  visible,
  remainingMs,
  blockingName,
  attemptedName,
  onDismiss,
  onOverride,
}: WashoutWarningProps) {
  const [ms, setMs] = useState(remainingMs);

  useEffect(() => {
    if (!visible) return;
    setMs(remainingMs);
    warnBuzz();
    const start = Date.now();
    const id = setInterval(() => {
      const next = remainingMs - (Date.now() - start);
      setMs(next);
      if (next <= 0) {
        clearInterval(id);
        onDismiss(); // window cleared — safe now
      }
    }, 250);
    return () => clearInterval(id);
  }, [visible, remainingMs, onDismiss]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.bang}>⚠</Text>
          <Text style={styles.headline} accessibilityRole="header">
            WAIT!
          </Text>
          <Text style={styles.body}>
            The second drop will{'\n'}
            <Text style={styles.bodyEm}>wash out the first!</Text>
          </Text>

          {blockingName && attemptedName ? (
            <Text style={styles.detail}>
              You just used {blockingName}. Give it time before {attemptedName}.
            </Text>
          ) : null}

          <View style={styles.timerWrap}>
            <Text style={styles.timerLabel}>Safe to use in</Text>
            <Text style={styles.timer} accessibilityLiveRegion="assertive">
              {formatCountdown(ms)}
            </Text>
          </View>

          <Pressable
            style={styles.waitBtn}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Okay, I'll wait"
          >
            <Text style={styles.waitText}>OK, I'LL WAIT</Text>
          </Pressable>

          {onOverride ? (
            <Pressable
              style={styles.overrideBtn}
              onPress={onOverride}
              accessibilityRole="button"
              accessibilityLabel="Log anyway, I understand the risk"
            >
              <Text style={styles.overrideText}>Log anyway</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(42,2,9,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  card: {
    width: '100%',
    borderRadius: radius.lg,
    borderWidth: 4,
    borderColor: palette.danger,
    backgroundColor: palette.dangerDeep,
    padding: space.xl,
    alignItems: 'center',
    gap: space.md,
  },
  bang: { fontSize: 72, color: palette.danger },
  headline: { color: palette.danger, fontSize: t.giant, fontWeight: t.weightBlack, letterSpacing: 2 },
  body: { color: palette.white, fontSize: t.heading, fontWeight: t.weightBold, textAlign: 'center', lineHeight: 34 },
  bodyEm: { color: palette.danger, fontWeight: t.weightBlack },
  detail: { color: palette.textMid, fontSize: t.body, textAlign: 'center', lineHeight: 26 },
  timerWrap: { alignItems: 'center', marginTop: space.sm },
  timerLabel: { color: palette.textMid, fontSize: t.label, fontWeight: t.weightMed },
  timer: { color: palette.confirmYellow, fontSize: t.display, fontWeight: t.weightBlack, fontVariant: ['tabular-nums'] },
  waitBtn: {
    marginTop: space.md,
    minHeight: touch.minTarget,
    alignSelf: 'stretch',
    borderRadius: radius.pill,
    backgroundColor: palette.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitText: { color: palette.white, fontSize: t.body, fontWeight: t.weightBlack, letterSpacing: 1 },
  overrideBtn: { paddingVertical: space.sm, paddingHorizontal: space.lg },
  overrideText: { color: palette.textLow, fontSize: t.label, textDecorationLine: 'underline' },
});

export default WashoutWarning;
