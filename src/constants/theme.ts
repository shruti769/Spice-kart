import { Platform, type TextStyle } from 'react-native';

/** Design tokens taken 1:1 from the Spice Kart prototype. */
export const C = {
  // brand
  lime: '#8BE000',
  limeHover: '#9BF200',
  limeBorder: '#7CC500',
  forest: '#0B3D1F',
  forestHover: '#124F2A',
  green: '#0B7A32',
  greenDeep: '#0C2B1A',
  greenMuted: '#4C6B52',
  greenOk: '#2F7A3E',

  // surfaces
  bg: '#F5F6F3',
  white: '#FFFFFF',
  field: '#FAFAF8',
  selectedBg: '#F7FCEE',
  selectedBgAlt: '#F1F9DF',

  // text
  ink: '#1F1F1F',
  ink2: '#3F3F3B',
  muted: '#7A7A75',
  muted2: '#8C8C86',
  muted3: '#9A9A95',
  placeholder: '#C9C9C3',

  // lines
  border: '#E3E3DE',
  borderCard: '#EAEAE6',
  borderSoft: '#E7E7E4',
  divider: '#EDEDE9',
  dividerSoft: '#F0F0EC',
  radioOff: '#C6D2C9',
  radioOff2: '#C9C9C3',
  toggleOff: '#DDDDD8',

  danger: '#B3402F',
  toast: '#1F1F1F',
} as const;

/** Gradients as [colors, locations, start, end] ready for expo-linear-gradient. */
type Grad = {
  colors: readonly [string, string, ...string[]];
  locations?: readonly [number, number, ...number[]];
  start: { x: number; y: number };
  end: { x: number; y: number };
};

/** Convert a CSS angle (deg) into LinearGradient start/end points. */
export function cssAngle(deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  const x = Math.cos(rad) / 2;
  const y = Math.sin(rad) / 2;
  return { start: { x: 0.5 - x, y: 0.5 - y }, end: { x: 0.5 + x, y: 0.5 + y } };
}

export const G = {
  /** Splash / login hero: linear-gradient(158deg,#08351A 0%,#0F4A24 46%,#22773A 100%) */
  hero: { colors: ['#08351A', '#0F4A24', '#22773A'], locations: [0, 0.46, 1], ...cssAngle(158) },
  /** Tinted header: linear-gradient(124deg,#DCEFBC 0%,#EDF7DA 46%,#F8FBF1 100%) */
  header: { colors: ['#DCEFBC', '#EDF7DA', '#F8FBF1'], locations: [0, 0.46, 1], ...cssAngle(124) },
  /** Floating cart bar: linear-gradient(122deg,#EAF7D4 0%,#F4FBE8 55%,#FBFEF5 100%) */
  cartBar: { colors: ['#EAF7D4', '#F4FBE8', '#FBFEF5'], locations: [0, 0.55, 1], ...cssAngle(122) },
  /** Wallet card: linear-gradient(122deg,#0B3D1F 0%,#14572A 56%,#1F7135 100%) */
  wallet: { colors: ['#0B3D1F', '#14572A', '#1F7135'], locations: [0, 0.56, 1], ...cssAngle(122) },
} satisfies Record<string, Grad>;

const FAMILY: Record<number, string> = {
  400: 'Inter_400Regular',
  500: 'Inter_500Medium',
  600: 'Inter_600SemiBold',
  700: 'Inter_700Bold',
  800: 'Inter_800ExtraBold',
};

/**
 * Mirrors CSS `font: <weight> <size>px/<lineHeight> Inter`.
 * `f(700, 15, 1.25)` === `font:700 15px/1.25 Inter`.
 */
export function f(weight: 400 | 500 | 600 | 700 | 800, size: number, lineHeight = 1.2): TextStyle {
  // A line-height of exactly 1 clips Inter's descenders on Android.
  const lh = Platform.OS === 'android' && lineHeight < 1.15 ? 1.15 : lineHeight;
  return {
    fontFamily: FAMILY[weight],
    fontSize: size,
    lineHeight: Math.round(size * lh * 10) / 10,
    includeFontPadding: false,
  };
}

/** `box-shadow: 0 1px 2px rgba(16,24,16,.045)` used on most cards. */
export const cardShadow = {
  boxShadow: '0 1px 2px rgba(16,24,16,0.045)',
} as const;
