import { StyleSheet, Text, View } from 'react-native';
import type { DailyCompletion } from '../../lib/tasks';
import { palette, withAlpha } from '../../theme/colors';
import { spacing } from '../../theme/glass';

export function WeeklyProgressChart({ days }: { days: DailyCompletion[] }) {
  const max = Math.max(1, ...days.map((d) => d.completed));
  const total = days.reduce((sum, d) => sum + d.completed, 0);
  return (
    <View style={styles.root}>
      <View style={styles.bars}>
        {days.map((d) => (
          <View key={d.key} style={styles.column}>
            <Text style={styles.count}>{d.completed > 0 ? d.completed : ''}</Text>
            <View
              style={[
                styles.bar,
                d.completed > 0 ? styles.active : styles.idle,
                { height: Math.max(4, (d.completed / max) * 80) },
              ]}
            />
            <Text style={styles.label}>{d.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.total}>
        {total} tarea{total === 1 ? '' : 's'} completada{total === 1 ? '' : 's'} en 7 días
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    gap: spacing.xs,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  count: {
    color: palette.accent,
    fontSize: 11,
    fontWeight: '700',
    height: 14,
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  active: {
    backgroundColor: withAlpha(palette.accent, 0.85),
  },
  idle: {
    backgroundColor: withAlpha(palette.textPrimary, 0.1),
  },
  label: {
    color: palette.textTertiary,
    fontSize: 10,
    textTransform: 'capitalize',
  },
  total: {
    color: palette.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
});
