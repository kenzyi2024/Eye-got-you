/**
 * Eye got you — ConfirmationScreen
 * ------------------------------------------------------------------
 * Ultra-high-contrast confirmation shown right after a scan.
 * Yellow-on-black, massive type, and two giant touch targets so an
 * elderly / low-vision patient can confirm at arm's length.
 *
 * "Is this Latanoprost?"   [ YES ]   [ NO ]
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radius, space, touch, type as t } from '../theme/theme';
import { confirmTap, warnBuzz } from '../lib/feedback';
import type { ScannedBottle } from '../state/useMedStore';
import { LATERALITY_LABEL, Laterality } from '../models/medication';

export interface ConfirmationScreenProps {
  bottle: ScannedBottle;
  /** Patient confirmed — persist the medication. */
  onYes: (bottle: ScannedBottle) => void;
  /** Wrong read — go back to the scanner. */
  onNo: () => void;
}

export function ConfirmationScreen({ bottle, onYes, onNo }: ConfirmationScreenProps) {
  const name = bottle.name?.trim() || 'this medication';
  const detail = [bottle.strength, bottle.laterality ? LATERALITY_LABEL[bottle.laterality] : null]
    .filter(Boolean)
    .join(' · ');

  const handleYes = () => {
    confirmTap();
    onYes(bottle);
  };

  const handleNo = () => {
    warnBuzz();
    onNo();
  };

  return (
    <View style={styles.screen}>
      <View style={styles.questionWrap}>
        <Text style={styles.prompt} accessibilityRole="header">
          Is this
        </Text>
        <Text style={styles.medName} accessibilityLabel={`Is this ${name}?`}>
          {name}?
        </Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.btn, styles.yes, pressed && styles.pressedYes]}
          onPress={handleYes}
          accessibilityRole="button"
          accessibilityLabel={`Yes, this is ${name}`}
        >
          <Text style={styles.yesText}>YES</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.btn, styles.no, pressed && styles.pressedNo]}
          onPress={handleNo}
          accessibilityRole="button"
          accessibilityLabel="No, scan again"
        >
          <Text style={styles.noText}>NO</Text>
        </Pressable>
      </View>

      <Text style={styles.hint}>Tap NO to scan the bottle again</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.confirmBlack, // pure black for max contrast
    paddingHorizontal: space.lg,
    paddingVertical: space.xxl,
    justifyContent: 'space-between',
  },
  questionWrap: { alignItems: 'center', marginTop: space.xl, gap: space.sm },
  prompt: {
    color: palette.confirmYellow,
    fontSize: t.title,
    fontWeight: t.weightBold,
    letterSpacing: 1,
  },
  medName: {
    color: palette.confirmYellow,
    fontSize: t.giant,
    lineHeight: t.giant + 6,
    fontWeight: t.weightBlack,
    textAlign: 'center',
  },
  detail: {
    color: palette.white,
    fontSize: t.heading,
    fontWeight: t.weightMed,
    marginTop: space.sm,
    textAlign: 'center',
  },

  actions: { gap: space.lg },
  btn: {
    minHeight: touch.giantTarget,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
  },
  yes: { backgroundColor: palette.confirmYellow, borderColor: palette.confirmYellow },
  pressedYes: { backgroundColor: '#D8C400' },
  yesText: { color: palette.confirmBlack, fontSize: t.display, fontWeight: t.weightBlack, letterSpacing: 2 },

  no: { backgroundColor: palette.confirmBlack, borderColor: palette.confirmYellow },
  pressedNo: { backgroundColor: '#1A1A00' },
  noText: { color: palette.confirmYellow, fontSize: t.display, fontWeight: t.weightBlack, letterSpacing: 2 },

  hint: { color: palette.white, fontSize: t.body, textAlign: 'center', opacity: 0.85 },
});

export default ConfirmationScreen;
