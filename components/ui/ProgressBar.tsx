import { memo, useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { palette } from '../../theme/colors';
import { color, radius } from '../../theme/glass';
import { duration, easing } from '../../theme/animations';

export interface ProgressBarProps {
  value: number;
  height?: number;
  color?: string;
  trackColor?: string;
  gradient?: readonly [string, string] | null;
  rounded?: boolean;
  showTip?: boolean;
  style?: StyleProp<ViewStyle>;
  animated?: boolean;
}

function ProgressBarInternal({
  value,
  height = 8,
  color: fillColor = palette.accent,
  trackColor: track = color.surface,
  gradient = null,
  rounded = true,
  showTip = true,
  style,
  animated = true,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = animated
      ? withTiming(clamped, { duration: duration.slow, easing: easing.decelerate })
      : clamped;
  }, [animated, clamped, progress]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value}%` }));
  const borderRadius = rounded ? height / 2 : radius.sm;

  return (
    <View
      style={[styles.track, { height, borderRadius, backgroundColor: track }, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
    >
      <Animated.View style={[styles.fill, fillStyle, { borderRadius }]}>
        {gradient ? (
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: fillColor }]} />
        )}
        {showTip && rounded ? <View style={styles.tip} /> : null}
      </Animated.View>
    </View>
  );
}

export const ProgressBar = memo(ProgressBarInternal);

const styles = StyleSheet.create({
  track: {
    overflow: 'hidden',
  },
  fill: {
    position: 'relative',
    height: '100%',
  },
  tip: {
    position: 'absolute',
    right: 2,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 2,
  },
});