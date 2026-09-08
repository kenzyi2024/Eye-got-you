/**
 * Eye got you — EyeToggle
 * ------------------------------------------------------------------
 * A switch shaped like an eye. When ON it "blinks open" to reveal a
 * glowing green/cyan iris; when OFF the lid closes to a thin line.
 * Built on Reanimated so the blink runs on the UI thread.
 *
 * Install deps:
 *   npx expo install react-native-reanimated react-native-svg expo-haptics
 *   (add 'react-native-reanimated/plugin' to babel.config.js plugins)
 *
 * Accessibility: exposes a real switch role + state, 72pt tall target,
 * and an optional text label. Never relies on color alone — the lid
 * shape itself communicates state.
 */

import React, { useEffect } from 'react';
import {
  AccessibilityProps,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { palette, timing } from '../theme/theme';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

const W = 128;
const H = 72;
const CX = W / 2;
const CY = H / 2;

export interface EyeToggleProps extends AccessibilityProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function EyeToggle({
  value,
  onValueChange,
  label,
  disabled = false,
  ...a11y
}: EyeToggleProps) {
  // 0 = closed (OFF), 1 = open (ON)
  const open = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    open.value = withTiming(value ? 1 : 0, {
      duration: timing.blink,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
  }, [value, open]);

  const handlePress = () => {
    if (disabled) return;
    Haptics.selectionAsync().catch(() => {});
    onValueChange(!value);
  };

  /* The upper + lower lids are ellipses whose radiusY grows as we open.
     At value 0 the aperture collapses to a slit. */
  const lidRy = useDerivedValue(() => interpolate(open.value, [0, 1], [1.5, H / 2 - 6]));

  const upperLidProps = useAnimatedProps(() => ({
    ry: lidRy.value,
  }));
  const lowerLidProps = useAnimatedProps(() => ({
    ry: lidRy.value,
  }));

  const irisStyle = useAnimatedStyle(() => ({
    opacity: interpolate(open.value, [0, 0.55, 1], [0, 0.2, 1]),
    transform: [{ scale: interpolate(open.value, [0, 1], [0.4, 1]) }],
  }));

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      open.value,
      [0, 1],
      [palette.ink600, '#06282B'],
    ),
    borderColor: interpolateColor(
      open.value,
      [0, 1],
      [palette.ink500, palette.cyan],
    ),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(open.value, [0, 1], [0, 0.9]),
  }));

  return (
    <View style={styles.row}>
      {label ? (
        <Text
          style={[styles.label, disabled && styles.labelDisabled]}
          numberOfLines={2}
        >
          {label}
        </Text>
      ) : null}

      <Pressable
        onPress={handlePress}
        disabled={disabled}
        hitSlop={12}
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled }}
        accessibilityLabel={a11y.accessibilityLabel ?? label ?? 'Toggle'}
        accessibilityValue={{ text: value ? 'On' : 'Off' }}
        {...a11y}
      >
        <Animated.View style={[styles.track, trackStyle, disabled && styles.disabled]}>
          {/* soft cyan glow bleeding past the eye when open */}
          <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none" />

          <Svg width={W} height={H}>
            <Defs>
              <RadialGradient id="iris" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={palette.mint} />
                <Stop offset="55%" stopColor={palette.cyan} />
                <Stop offset="100%" stopColor={palette.iris2} />
              </RadialGradient>
            </Defs>

            {/* Iris + pupil, revealed as the lids open */}
            <AnimatedIris style={irisStyle} />

            {/* Eyelids — two ellipses meeting at the aperture line.
                As ry shrinks toward 0 they close over the iris. */}
            <AnimatedEllipse
              cx={CX}
              cy={CY - (H / 2 - 6)}
              rx={CX}
              animatedProps={upperLidProps}
              fill={palette.ink800}
            />
            <AnimatedEllipse
              cx={CX}
              cy={CY + (H / 2 - 6)}
              rx={CX}
              animatedProps={lowerLidProps}
              fill={palette.ink800}
            />
          </Svg>
        </Animated.View>
      </Pressable>
    </View>
  );
}

/** The iris/pupil group, scaled + faded by the parent open value. */
function AnimatedIris({ style }: { style: any }) {
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.center, style]}
      pointerEvents="none"
    >
      <Svg width={W} height={H}>
        <Circle cx={CX} cy={CY} r={22} fill="url(#iris)" />
        <Circle cx={CX} cy={CY} r={9} fill={palette.confirmBlack} />
        {/* catch-light */}
        <Circle cx={CX - 7} cy={CY - 7} r={3.5} fill={palette.white} opacity={0.85} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  label: {
    flex: 1,
    color: palette.textHi,
    fontSize: 20,
    fontWeight: '600',
  },
  labelDisabled: { color: palette.textLow },
  track: {
    width: W + 8,
    height: H + 8,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  glow: {
    position: 'absolute',
    width: W,
    height: H,
    borderRadius: 999,
    backgroundColor: palette.cyan,
    shadowColor: palette.cyan,
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
});

export default EyeToggle;
