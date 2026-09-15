/**
 * Eye got you — PupilSpinner
 * ------------------------------------------------------------------
 * A minimalist pupil that smoothly dilates and constricts on a loop.
 * Used as the app's loading indicator. Pure Reanimated, no GIFs.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { palette, timing } from '../theme/theme';

export interface PupilSpinnerProps {
  size?: number;
  /** Screen-reader label. Omit to treat the spinner as decorative. */
  label?: string;
}

export function PupilSpinner({ size = 96, label }: PupilSpinnerProps) {
  // 0 = constricted, 1 = dilated
  const dilation = useSharedValue(0.2);

  useEffect(() => {
    dilation.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: timing.pupilCycle / 2,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0.2, {
          duration: timing.pupilCycle / 2,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      false,
    );
  }, [dilation]);

  const pupilStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.35 + dilation.value * 0.65 }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + dilation.value * 0.55,
    transform: [{ scale: 0.9 + dilation.value * 0.25 }],
  }));

  const r = size / 2;

  return (
    <View
      style={[styles.wrap, { width: size, height: size }]}
      accessible={!!label}
      accessibilityRole={label ? 'progressbar' : undefined}
      accessibilityLabel={label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
    >
      {/* iris ring */}
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="spinnerIris" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={palette.iris3} />
            <Stop offset="70%" stopColor={palette.iris2} />
            <Stop offset="100%" stopColor={palette.iris1} />
          </RadialGradient>
        </Defs>
        <Circle cx={r} cy={r} r={r - 2} fill="url(#spinnerIris)" />
        <Circle
          cx={r}
          cy={r}
          r={r - 2}
          fill="none"
          stroke={palette.cyan}
          strokeWidth={2}
          opacity={0.6}
        />
      </Svg>

      {/* cyan glow that breathes with dilation */}
      <Animated.View
        style={[
          styles.glow,
          { width: size, height: size, borderRadius: size / 2 },
          glowStyle,
        ]}
        pointerEvents="none"
      />

      {/* the pupil itself */}
      <Animated.View
        style={[
          styles.pupil,
          { width: size * 0.6, height: size * 0.6, borderRadius: size * 0.3 },
          pupilStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  pupil: { backgroundColor: palette.confirmBlack },
  glow: {
    position: 'absolute',
    backgroundColor: 'transparent',
    shadowColor: palette.cyan,
    shadowOpacity: 0.9,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    borderWidth: 1,
    borderColor: palette.cyan,
  },
});

export default PupilSpinner;
