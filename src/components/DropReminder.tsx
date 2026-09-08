/**
 * Eye got you — DropReminder
 * ------------------------------------------------------------------
 * Dose-reminder animation: a water drop falls from the top, hits the
 * bottom, and expands a ripple ring. Overlay it above any screen when
 * a reminder fires. Auto-plays once, then calls onDone.
 */

import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { palette, timing, type as t } from '../theme/theme';

const { height: SCREEN_H } = Dimensions.get('window');

export interface DropReminderProps {
  medicationName: string;
  onDone?: () => void;
}

export function DropReminder({ medicationName, onDone }: DropReminderProps) {
  const fall = useSharedValue(0); // 0 top -> 1 bottom
  const ripple = useSharedValue(0); // 0 -> 1 spread
  const splashY = SCREEN_H - 120;

  useEffect(() => {
    fall.value = withTiming(1, {
      duration: timing.rippleFall,
      easing: Easing.in(Easing.quad), // accelerate like gravity
    });
    ripple.value = withDelay(
      timing.rippleFall,
      withTiming(
        1,
        { duration: timing.rippleSpread, easing: Easing.out(Easing.ease) },
        (finished) => {
          if (finished && onDone) runOnJS(onDone)();
        },
      ),
    );
  }, [fall, ripple, onDone, splashY]);

  const dropStyle = useAnimatedStyle(() => ({
    opacity: fall.value < 0.98 ? 1 : 0,
    transform: [
      { translateY: fall.value * splashY },
      // slight squash as it nears the surface
      { scaleY: 1 - Math.max(0, fall.value - 0.85) * 1.5 },
    ],
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: (1 - ripple.value) * 0.8,
    transform: [{ scale: 0.2 + ripple.value * 3.4 }],
  }));

  const ripple2Style = useAnimatedStyle(() => ({
    opacity: (1 - ripple.value) * 0.5,
    transform: [{ scale: 0.2 + ripple.value * 2.2 }],
  }));

  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* falling drop */}
      <Animated.View style={[styles.dropWrap, dropStyle]}>
        <Svg width={48} height={64} viewBox="0 0 48 64">
          <Defs>
            <RadialGradient id="dropGrad" cx="40%" cy="35%" r="70%">
              <Stop offset="0%" stopColor={palette.mint} />
              <Stop offset="60%" stopColor={palette.cyan} />
              <Stop offset="100%" stopColor={palette.iris2} />
            </RadialGradient>
          </Defs>
          {/* classic teardrop path */}
          <Path
            d="M24 2 C24 2 44 30 44 44 A20 20 0 1 1 4 44 C4 30 24 2 24 2 Z"
            fill="url(#dropGrad)"
          />
        </Svg>
      </Animated.View>

      {/* ripple rings at the splash point */}
      <View style={[styles.rippleAnchor, { top: splashY }]}>
        <Animated.View style={[styles.ring, rippleStyle]} />
        <Animated.View style={[styles.ring, ripple2Style]} />
      </View>

      <View style={styles.caption}>
        <Text style={styles.captionText}>Time for {medicationName}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', zIndex: 50 },
  dropWrap: { position: 'absolute', top: 0 },
  rippleAnchor: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: palette.cyan,
  },
  caption: {
    position: 'absolute',
    bottom: 48,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(6,40,43,0.9)',
    borderWidth: 1,
    borderColor: palette.cyan,
  },
  captionText: {
    color: palette.textHi,
    fontSize: t.label,
    fontWeight: t.weightBold,
  },
});

export default DropReminder;
