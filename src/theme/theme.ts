/**
 * Eye got you — Design tokens
 * ------------------------------------------------------------------
 * Dark-mode-first palette tuned for light-sensitive eyes. Confirmation
 * and warning surfaces jump to ultra-high-contrast (WCAG AAA) yellow-on
 * -black so low-vision patients can read them at arm's length.
 */

export const palette = {
  /** Deep near-black grounds. */
  ink900: '#04060B',
  ink800: '#080B14',
  ink700: '#0E1320',
  ink600: '#161C2C',
  ink500: '#212A3E',

  /** Iris gradient stops — used for backgrounds, pills, the pupil spinner. */
  iris1: '#0B1E3B',
  iris2: '#123A63',
  iris3: '#1E6E8C',
  iris4: '#2EC5CE',

  /** Primary "alive" cyan/green — toggles ON, success chime states. */
  cyan: '#2EC5CE',
  mint: '#3BE8B0',

  /** Ultra-high-contrast confirmation pair. */
  confirmYellow: '#FFE500',
  confirmBlack: '#000000',

  /** Danger — washout warning takeover. */
  danger: '#FF3B5C',
  dangerDeep: '#2A0209',

  /** Text. */
  textHi: '#F4F8FF',
  textMid: '#AEB9D0',
  textLow: '#6C7893',

  white: '#FFFFFF',
};

/** Reusable multi-stop gradients (consumed by expo-linear-gradient). */
export const gradients = {
  iris: [palette.iris1, palette.iris2, palette.iris3, palette.iris4],
  irisRadialCore: [palette.iris4, palette.iris2, palette.ink900],
  ground: [palette.ink900, palette.ink800],
  danger: [palette.dangerDeep, '#7A0A1E'],
};

/**
 * Type scale sized for low-vision. Base body is 20 — deliberately large.
 * Confirmation copy uses `display` / `giant`.
 */
export const type = {
  giant: 64,
  display: 44,
  title: 32,
  heading: 26,
  body: 20,
  label: 17,
  caption: 15,
  weightBlack: '800' as const,
  weightBold: '700' as const,
  weightMed: '600' as const,
};

/** 8pt spacing scale. */
export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 10,
  md: 18,
  lg: 28,
  pill: 999,
};

/** Minimum interactive size — large for elderly / low-vision touch. */
export const touch = {
  minTarget: 64,
  giantTarget: 120,
};

export const timing = {
  blink: 260,
  pupilCycle: 2400,
  rippleFall: 900,
  rippleSpread: 700,
};

export type Theme = {
  palette: typeof palette;
  gradients: typeof gradients;
  type: typeof type;
  space: typeof space;
  radius: typeof radius;
  touch: typeof touch;
  timing: typeof timing;
};

export const theme: Theme = {
  palette,
  gradients,
  type,
  space,
  radius,
  touch,
  timing,
};
