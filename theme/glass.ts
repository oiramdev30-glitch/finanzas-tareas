import { withAlpha } from './colors';

const white = '#ffffff';
const black = '#000000';

export const color = {
  surface: withAlpha(white, 0.06),
  surfaceStrong: withAlpha(white, 0.12),
  surfaceSoft: withAlpha(white, 0.03),
  highlight: withAlpha(white, 0.08),
  border: withAlpha(white, 0.1),
  borderStrong: withAlpha(white, 0.24),
  scrim: 'rgba(0, 0, 0, 0.32)',
} as const;

export const blur = {
  card: 18,
  button: 12,
  tabBar: 26,
  overlay: 40,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const shadow = {
  card: {
    shadowColor: black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  floating: {
    shadowColor: black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;