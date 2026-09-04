import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { blur, color, radius, shadow, spacing } from '../../theme/glass';
import { duration, easing } from '../../theme/animations';

export interface GlassCardProps {
  children?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  onPress?: () => void;
  animateIn?: boolean;
  delay?: number;
  intensity?: number;
  compact?: boolean;
  elevated?: boolean;
}

export function GlassCard({
  children,
  header,
  footer,
  style,
  contentStyle,
  onPress,
  animateIn = true,
  delay = 0,
  intensity = blur.card,
  compact = false,
  elevated = false,
}: GlassCardProps) {
  const cornerRadius = compact ? radius.md : radius.lg;
  const padding = compact ? spacing.md : spacing.lg;

  const from = animateIn
    ? { opacity: 0, translateY: 16, scale: 0.98 }
    : { opacity: 1, translateY: 0, scale: 1 };
  const animate = { opacity: 1, translateY: 0, scale: 1 };
  const transition = animateIn
    ? { type: 'timing' as const, duration: duration.normal, delay, easing: easing.emphasized }
    : { type: 'timing' as const, duration: 0, delay: 0 };

  const gradientColors = [
    'rgba(255, 255, 255, 0.08)',
    'rgba(255, 255, 255, 0.02)',
    'rgba(0, 0, 0, 0.16)',
  ] as const;

  return (
    <MotiView
      style={[elevated ? shadow.floating : shadow.card, { borderRadius: cornerRadius }, style]}
      from={from}
      animate={animate}
      transition={transition}
    >
      <BlurView
        intensity={intensity}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={[styles.glass, { borderRadius: cornerRadius }]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
        {header ? (
          <View style={[styles.header, { padding, paddingBottom: spacing.sm }]}>{header}</View>
        ) : null}
        {onPress ? (
          <Pressable
            onPress={onPress}
            android_ripple={{ color: 'rgba(255, 255, 255, 0.08)', borderless: false }}
            style={({ pressed }) => [
              styles.content,
              { padding },
              pressed && styles.pressed,
              contentStyle,
            ]}
            accessibilityRole="button"
          >
            {children}
          </Pressable>
        ) : (
          <View style={[styles.content, { padding }, contentStyle]}>{children}</View>
        )}
        {footer ? (
          <View style={[styles.footer, { padding, paddingTop: spacing.sm }]}>{footer}</View>
        ) : null}
      </BlurView>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  glass: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: color.border,
  },
  content: {
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
});