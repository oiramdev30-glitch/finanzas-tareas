import { Easing } from 'react-native-reanimated';

export const duration = {
  fast: 150,
  normal: 260,
  slow: 420,
} as const;

export const easing = {
  standard: Easing.bezier(0.25, 0.1, 0.25, 1),
  emphasized: Easing.bezier(0.16, 1, 0.3, 1),
  decelerate: Easing.bezier(0, 0, 0.2, 1),
} as const;

export const spring = {
  snappy: { damping: 20, stiffness: 260, mass: 0.9 } as const,
  soft: { damping: 24, stiffness: 180, mass: 1 } as const,
} as const;