import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { LucideIcon } from 'lucide-react-native';
import { blur, color, radius, shadow } from '../../theme/glass';
import { palette } from '../../theme/colors';
import { duration, easing, spring } from '../../theme/animations';

const floatingShadow = shadow.floating;

export interface TabItem {
  key: string;
  label: string;
  icon: LucideIcon;
}

export interface AnimatedTabBarProps {
  tabs: readonly TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  style?: StyleProp<ViewStyle>;
}

const TAB_HEIGHT = 54;
const ROW_INSET = 8;
const INDICATOR_HEIGHT = 40;
const INDICATOR_INSET_X = 6;
const INDICATOR_TOP = ROW_INSET + (TAB_HEIGHT - INDICATOR_HEIGHT) / 2;

interface TabButtonProps {
  item: TabItem;
  isActive: boolean;
  onMeasure: (key: string, x: number, width: number) => void;
  onSelect: (key: string) => void;
}

function TabButtonImpl({ item, isActive, onMeasure, onSelect }: TabButtonProps) {
  const progress = useSharedValue(isActive ? 1 : 0);
  const pressed = useSharedValue(1);
  const IconComponent = useMemo(() => Animated.createAnimatedComponent(item.icon), [item.icon]);

  useEffect(() => {
    progress.value = withTiming(isActive ? 1 : 0, { duration: duration.fast, easing: easing.standard });
  }, [isActive, progress]);

  const iconAnimatedProps = useAnimatedProps(() => ({
    color: interpolateColor(progress.value, [0, 1], [palette.textSecondary, palette.textPrimary]),
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: (1 + 0.1 * progress.value) * pressed.value }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [palette.textTertiary, palette.textPrimary]),
  }));

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      onMeasure(item.key, x, width);
    },
    [item.key, onMeasure],
  );

  const handlePressIn = useCallback(() => {
    pressed.value = withSpring(0.92, spring.snappy);
  }, [pressed]);

  const handlePressOut = useCallback(() => {
    pressed.value = withSpring(1, spring.snappy);
  }, [pressed]);

  const handlePress = useCallback(() => onSelect(item.key), [item.key, onSelect]);

  return (
    <Animated.View style={[styles.tab, iconStyle]} onLayout={handleLayout}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        android_ripple={{ color: 'rgba(255, 255, 255, 0.08)', borderless: false }}
        style={styles.pressable}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={item.label}
      >
        <View style={styles.iconWrap}>
          <IconComponent animatedProps={iconAnimatedProps} size={22} strokeWidth={2} />
        </View>
        <Animated.Text style={[styles.label, labelStyle]} numberOfLines={1}>
          {item.label}
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

const TabButton = memo(TabButtonImpl);

export function AnimatedTabBar({ tabs, activeKey, onChange, style }: AnimatedTabBarProps) {
  const insets = useSafeAreaInsets();
  const [sizes, setSizes] = useState<Record<string, { x: number; width: number }>>({});
  const indicatorLeft = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const indicatorOpacity = useSharedValue(0);

  useEffect(() => {
    const size = sizes[activeKey];
    if (!size) {
      return;
    }
    indicatorLeft.value = withSpring(size.x + INDICATOR_INSET_X, spring.snappy);
    indicatorWidth.value = withSpring(size.width - INDICATOR_INSET_X * 2, spring.snappy);
    indicatorOpacity.value = withTiming(1, { duration: duration.fast });
  }, [activeKey, sizes, indicatorLeft, indicatorWidth, indicatorOpacity]);

  const handleMeasure = useCallback((key: string, x: number, width: number) => {
    setSizes((previous) => {
      const existing = previous[key];
      if (existing && Math.abs(existing.x - x) < 1 && Math.abs(existing.width - width) < 1) {
        return previous;
      }
      return { ...previous, [key]: { x, width } };
    });
  }, []);

  const handleSelect = useCallback((key: string) => onChange(key), [onChange]);

  const indicatorStyle = useAnimatedStyle(() => ({
    left: indicatorLeft.value,
    width: indicatorWidth.value,
    opacity: indicatorOpacity.value,
  }));

  return (
    <View style={[styles.shadow, style]}>
      <BlurView
        intensity={blur.tabBar}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={styles.bar}
      >
        <View style={[styles.row, { paddingBottom: ROW_INSET + Math.max(insets.bottom, 0) }]}>
          <Animated.View pointerEvents="none" style={[styles.indicator, indicatorStyle]} />
          {tabs.map((tab) => (
            <TabButton
              key={tab.key}
              item={tab}
              isActive={tab.key === activeKey}
              onMeasure={handleMeasure}
              onSelect={handleSelect}
            />
          ))}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: radius.xl,
    ...floatingShadow,
  },
  bar: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: ROW_INSET,
    paddingHorizontal: ROW_INSET,
  },
  indicator: {
    position: 'absolute',
    top: INDICATOR_TOP,
    height: INDICATOR_HEIGHT,
    borderRadius: INDICATOR_HEIGHT / 2,
    backgroundColor: color.surfaceStrong,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  tab: {
    flex: 1,
    height: TAB_HEIGHT,
  },
  pressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  iconWrap: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});