/**
 * Eye got you — DisclaimerGate
 * ------------------------------------------------------------------
 * First-run medical disclaimer. Blocks the app until the user
 * acknowledges that Eye got you is an organizing aid, not medical
 * advice. Acceptance is persisted, so it appears only once.
 */

import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { gradients, palette, radius, space, touch, type as t } from '../theme/theme';
import { confirmTap } from '../lib/feedback';
import { useMedStore } from '../state/useMedStore';
import { DISCLAIMER_SHORT } from '../content/legal';

export function DisclaimerGate({ children }: { children: React.ReactNode }) {
  const accepted = useMedStore((s) => s.disclaimerAcceptedAt != null);
  const acceptDisclaimer = useMedStore((s) => s.acceptDisclaimer);
  const insets = useSafeAreaInsets();

  return (
    <>
      {children}
      <Modal visible={!accepted} animationType="fade" transparent={false}>
        <View style={styles.root}>
          <LinearGradient colors={gradients.ground} style={StyleSheet.absoluteFill} />
          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.lg },
            ]}
          >
            <Text style={styles.icon} accessibilityElementsHidden importantForAccessibility="no">
              👁️
            </Text>
            <Text style={styles.title} accessibilityRole="header">
              Before you start
            </Text>

            <View style={styles.card}>
              <Text style={styles.body}>{DISCLAIMER_SHORT}</Text>
            </View>

            <View style={styles.points}>
              <Bullet text="Always confirm each medication against the actual bottle label." />
              <Bullet text="Follow your doctor’s and pharmacist’s instructions first." />
              <Bullet text="Don’t rely on reminders alone. In an emergency, call your local emergency number." />
              <Bullet text="Your data stays on this device — encrypted, never uploaded." />
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
            <Pressable
              style={styles.acceptBtn}
              onPress={() => {
                confirmTap();
                acceptDisclaimer();
              }}
              accessibilityRole="button"
              accessibilityLabel="I understand and agree to continue"
            >
              <Text style={styles.acceptText}>I understand</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink900 },
  scroll: { paddingHorizontal: space.lg, gap: space.md, alignItems: 'stretch' },
  icon: { fontSize: 56, textAlign: 'center' },
  title: { color: palette.textHi, fontSize: t.title, fontWeight: t.weightBlack, textAlign: 'center' },
  card: {
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: palette.cyan,
    backgroundColor: '#06282B',
    padding: space.lg,
  },
  body: { color: palette.textHi, fontSize: t.body, lineHeight: 28 },
  points: { gap: space.sm, marginTop: space.sm },
  bulletRow: { flexDirection: 'row', gap: space.sm },
  bulletDot: { color: palette.cyan, fontSize: t.body, fontWeight: t.weightBlack },
  bulletText: { color: palette.textMid, fontSize: t.label, lineHeight: 24, flex: 1 },
  footer: { paddingHorizontal: space.lg, paddingTop: space.sm },
  acceptBtn: {
    minHeight: touch.giantTarget - 40,
    borderRadius: radius.lg,
    backgroundColor: palette.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: { color: palette.confirmBlack, fontSize: t.heading, fontWeight: t.weightBlack },
});

export default DisclaimerGate;
