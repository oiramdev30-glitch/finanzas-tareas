import { StyleSheet, Text, View } from 'react-native';
import type { MonthPoint } from '../../lib/finance';
import { palette, withAlpha } from '../../theme/colors';
import { spacing } from '../../theme/glass';

export function MonthlyTrendChart({ points }: { points: MonthPoint[] }) {
  const max = Math.max(1, ...points.flatMap((p) => [p.income, p.expense]));
  if (points.length === 0) {
    return <Text style={styles.empty}>Aún no hay datos suficientes.</Text>;
  }
  return (
    <View style={styles.root}>
      <View style={styles.bars}>
        {points.map((p) => (
          <View key={p.key} style={styles.column}>
            <View style={styles.pair}>
              <View
                style={[
                  styles.bar,
                  styles.income,
                  { height: Math.max(4, (p.income / max) * 100) },
                ]}
              />
              <View
                style={[
                  styles.bar,
                  styles.expense,
                  { height: Math.max(4, (p.expense / max) * 100) },
                ]}
              />
            </View>
            <Text style={styles.label}>{p.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, styles.income]} />
          <Text style={styles.legendText}>Ingresos</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, styles.expense]} />
          <Text style={styles.legendText}>Gastos</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
  empty: {
    color: palette.textSecondary,
    fontSize: 13,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    gap: spacing.xs,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  pair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 110,
  },
  bar: {
    width: 12,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  income: {
    backgroundColor: withAlpha(palette.success, 0.85),
  },
  expense: {
    backgroundColor: withAlpha(palette.danger, 0.85),
  },
  label: {
    color: palette.textTertiary,
    fontSize: 10,
    textTransform: 'capitalize',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: palette.textSecondary,
    fontSize: 11,
  },
});
