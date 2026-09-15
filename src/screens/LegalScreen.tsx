/**
 * Eye got you — LegalScreen
 * ------------------------------------------------------------------
 * Renders the Privacy Policy or Terms from the shared legal content.
 * Reached from the Reminders/Settings screen.
 */

import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { gradients, palette, space, type as t } from '../theme/theme';
import { LEGAL_DOCS } from '../content/legal';
import type { LegalProps } from '../navigation/types';

export default function LegalScreen({ route }: LegalProps) {
  const insets = useSafeAreaInsets();
  const doc = LEGAL_DOCS[route.params.doc];

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
        <Text style={styles.title} accessibilityRole="header">
          {doc.title}
        </Text>
        <Text style={styles.updated}>Last updated {doc.updated}</Text>
        <Text style={styles.intro}>{doc.intro}</Text>

        {doc.sections.map((s) => (
          <View key={s.heading} style={styles.section}>
            <Text style={styles.heading} accessibilityRole="header">
              {s.heading}
            </Text>
            <Text style={styles.body}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink900 },
  scroll: { paddingHorizontal: space.lg, gap: space.md },
  title: { color: palette.textHi, fontSize: t.title, fontWeight: t.weightBlack },
  updated: { color: palette.textLow, fontSize: t.caption, fontWeight: t.weightMed },
  intro: { color: palette.textMid, fontSize: t.body, lineHeight: 28 },
  section: { gap: space.xs, marginTop: space.sm },
  heading: { color: palette.textHi, fontSize: t.heading, fontWeight: t.weightBold },
  body: { color: palette.textMid, fontSize: t.label, lineHeight: 26 },
});
