import { memo, useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { LucideIcon } from 'lucide-react-native';
import { color, radius, spacing } from '../../theme/glass';
import { palette, withAlpha } from '../../theme/colors';
import { spring } from '../../theme/animations';

export type GlassButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type GlassButtonSize = 'sm' | 'md' | 'lg';

export interface GlassButtonProps {
  title: string;
  onPress?: () => void;
  variant?: GlassButtonVariant;
  size?: GlassButtonSize;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

const variantConfig: Record<
  GlassButtonVariant,
  { background: string; border: string; text: string }
> = {
  primary: {
    background: withAlpha(palette.accent, 0.24),
    border: withAlpha(palette.accent, 0.55),
    text: palette.onAccent,
  },
  secondary: {
    background: color.surface,
    border: color.border,
    text: palette.textPrimary,
  },
  ghost: {
    background: 'transparent',
    border: 'transparent',
    text: palette.textSecondary,
  },
  danger: {
    background: withAlpha(palette.danger, 0.18),
    border: withAlpha(palette.danger, 0.5),
    text: '#ffffff',
  },
};

const sizeConfig: Record<
  GlassButtonSize,
  {
    height: number;
    paddingHorizontal: number;
    fontSize: number;
    borderRadius: number;
    iconSize: number;
    indicatorSize: 'small' | 'large';
  }
> = {
  sm: {
    height: 38,
    paddingHorizontal: spacing.md,
    fontSize: 13,
    borderRadius: radius.sm,
    iconSize: 16,
    indicatorSize: 'small',
  },
  md: {
    height: 48,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    borderRadius: radius.md,
    iconSize: 18,
    indicatorSize: 'small',
  },
  lg: {
    height: 56,
    paddingHorizontal: spacing.xl,
    fontSize: 16,
    borderRadius: radius.lg,
    iconSize: 20,
    indicatorSize: 'large',
  },
};

function GlassButtonInternal({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  style,
  textStyle,
  accessibilityLabel,
}: GlassButtonProps) {
  const scale = useSharedValue(1);
  const config = variantConfig[variant] ?? variantConfig.primary;
  const sizeStyle = sizeConfig[size] ?? sizeConfig.md;
  const isDisabled = disabled || loading;

  const pressIn = useCallback(() => {
    if (isDisabled) {
      return;
    }
    scale.value = withSpring(0.96, spring.snappy);
  }, [isDisabled, scale]);

  const pressOut = useCallback(() => {
    scale.value = withSpring(1, spring.snappy);
  }, [scale]);

  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[scaleStyle, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={isDisabled}
        android_ripple={{ color: 'rgba(255, 255, 255, 0.12)', borderless: false }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityState={{ disabled: isDisabled }}
        style={[
          styles.base,
          {
            height: sizeStyle.height,
            paddingHorizontal: sizeStyle.paddingHorizontal,
            borderRadius: sizeStyle.borderRadius,
            backgroundColor: config.background,
            borderColor: config.border,
            opacity: isDisabled ? 0.45 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator size={sizeStyle.indicatorSize} color={config.text} />
        ) : (
          <>
            {Icon && iconPosition === 'left' ? (
              <Icon size={sizeStyle.iconSize} color={config.text} strokeWidth={2} />
            ) : null}
            <Text
              style={[styles.label, { color: config.text, fontSize: sizeStyle.fontSize }, textStyle]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {Icon && iconPosition === 'right' ? (
              <Icon size={sizeStyle.iconSize} color={config.text} strokeWidth={2} />
            ) : null}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

export const GlassButton = memo(GlassButtonInternal);

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
  },
  label: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});