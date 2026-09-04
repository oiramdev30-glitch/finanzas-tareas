import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { MotiView } from 'moti';
import { duration, easing } from '../../theme/animations';

export interface ScreenTransitionProps {
  children?: ReactNode;
  delay?: number;
  translateY?: number;
  style?: StyleProp<ViewStyle>;
}

export function ScreenTransition({
  children,
  delay = 0,
  translateY = 16,
  style,
}: ScreenTransitionProps) {
  return (
    <MotiView
      style={style}
      from={{ opacity: 0, translateY, scale: 0.995 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={{ type: 'timing' as const, duration: duration.normal, delay, easing: easing.emphasized }}
    >
      {children}
    </MotiView>
  );
}