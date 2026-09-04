import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BrainCircuit, CheckCircle2, Lightbulb, Target } from 'lucide-react-native';
import { GlassButton } from './GlassButton';
import { GlassCard } from './GlassCard';
import { ProgressBar } from './ProgressBar';
import {
  buildFinanceSummaryText,
  type FinanceInsights,
  type MonthPoint,
} from '../../lib/finance';
import { analyzeFinances, type FinanceAdvice } from '../../lib/openai';
import { toErrorMessage } from '../../lib/errors';
import { formatCurrency } from '../../lib/format';
import { palette, withAlpha } from '../../theme/colors';
import { spacing } from '../../theme/glass';

function scoreColor(score: number): string {
  if (score >= 70) return palette.success;
  if (score >= 40) return palette.warning;
  return palette.danger;
}

export function FinanceAdvisor({
  insights,
  trend,
  balance,
}: {
  insights: FinanceInsights;
  trend: MonthPoint[];
  balance: number;
}) {
  const [advice, setAdvice] = useState<FinanceAdvice | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const metrics = useMemo(
    () => [
      {
        label: 'Tasa de ahorro',
        value: `${(insights.savingsRate * 100).toFixed(0)}%`,
        hint: `Neto ${formatCurrency(insights.net)}`,
      },
      {
        label: 'Gasto diario',
        value: formatCurrency(insights.dailyBurn),
        hint: `Día ${insights.dayOfMonth}/${insights.daysInMonth}`,
      },
      {
        label: 'Proyección fin de mes',
        value: formatCurrency(insights.projectedNet),
        hint: `Gasto proj. ${formatCurrency(insights.projectedExpense)}`,
      },
      {
        label: 'Vs mes anterior',
        value:
          insights.expenseDeltaPct === null
            ? '—'
            : `${insights.expenseDeltaPct >= 0 ? '+' : ''}${(insights.expenseDeltaPct * 100).toFixed(0)}%`,
        hint: `Gastabas ${formatCurrency(insights.prevExpense)}`,
      },
    ],
    [insights],
  );

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const summaryText = buildFinanceSummaryText(insights, trend, balance);
      const result = await analyzeFinances(summaryText);
      setAdvice(result);
    } catch (err) {
      setError(toErrorMessage(err, 'La IA no está disponible por ahora. Revisa tus métricas locales.'));
    } finally {
      setAnalyzing(false);
    }
  };

  const color = advice ? scoreColor(advice.healthScore) : palette.accent;

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <BrainCircuit size={17} color={palette.accent} strokeWidth={2} />
        <Text style={styles.title}>Gestor financiero IA</Text>
      </View>

      <View style={styles.metrics}>
        {metrics.map((m) => (
          <View key={m.label} style={styles.metric}>
            <Text style={styles.metricLabel}>{m.label}</Text>
            <Text style={styles.metricValue}>{m.value}</Text>
            <Text style={styles.metricHint} numberOfLines={1}>
              {m.hint}
            </Text>
          </View>
        ))}
      </View>

      {!advice ? (
        <GlassButton
          title={analyzing ? 'Analizando...' : 'Analizar mis finanzas con IA'}
          variant="primary"
          icon={BrainCircuit}
          loading={analyzing}
          onPress={() => void handleAnalyze()}
        />
      ) : (
        <View style={styles.advice}>
          <View style={styles.scoreRow}>
            <View style={[styles.score, { backgroundColor: withAlpha(color, 0.14), borderColor: withAlpha(color, 0.4) }]}>
              <Text style={[styles.scoreText, { color }]}>{advice.healthScore}</Text>
            </View>
            <Text style={styles.verdict}>{advice.verdict}</Text>
          </View>
          {advice.insights.length > 0 ? (
            <View style={styles.block}>
              <View style={styles.blockTitle}>
                <Lightbulb size={13} color={palette.accent} strokeWidth={2} />
                <Text style={[styles.blockTitleText, { color: palette.accent }]}>Hallazgos</Text>
              </View>
              {advice.insights.map((item, i) => (
                <Text key={i} style={styles.item}>• {item}</Text>
              ))}
            </View>
          ) : null}
          {advice.actions.length > 0 ? (
            <View style={styles.block}>
              <View style={styles.blockTitle}>
                <CheckCircle2 size={13} color={palette.success} strokeWidth={2} />
                <Text style={[styles.blockTitleText, { color: palette.success }]}>Acciones recomendadas</Text>
              </View>
              {advice.actions.map((item, i) => (
                <Text key={i} style={styles.item}>• {item}</Text>
              ))}
            </View>
          ) : null}
          {advice.suggestedBudgets.length > 0 ? (
            <View style={styles.block}>
              <View style={styles.blockTitle}>
                <Target size={13} color={palette.info} strokeWidth={2} />
                <Text style={[styles.blockTitleText, { color: palette.info }]}>Presupuestos sugeridos</Text>
              </View>
              {advice.suggestedBudgets.map((b) => (
                <View key={b.category} style={styles.budgetRow}>
                  <View style={styles.budgetLabel}>
                    <Text style={styles.item}>{b.category}</Text>
                    <Text style={styles.budgetAmount}>{formatCurrency(b.amount)}</Text>
                  </View>
                  <ProgressBar value={100} color={palette.info} />
                </View>
              ))}
            </View>
          ) : null}
          <GlassButton
            title={analyzing ? 'Analizando...' : 'Reanalizar'}
            variant="secondary"
            size="sm"
            icon={BrainCircuit}
            loading={analyzing}
            onPress={() => void handleAnalyze()}
          />
        </View>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: palette.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metric: {
    flexBasis: '48%',
    flexGrow: 1,
    gap: 2,
    borderWidth: 1,
    borderColor: withAlpha(palette.textPrimary, 0.1),
    backgroundColor: withAlpha(palette.textPrimary, 0.04),
    borderRadius: 16,
    padding: spacing.md,
  },
  metricLabel: {
    color: palette.textSecondary,
    fontSize: 11,
  },
  metricValue: {
    color: palette.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  metricHint: {
    color: palette.textTertiary,
    fontSize: 11,
  },
  advice: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: withAlpha(palette.accent, 0.3),
    backgroundColor: withAlpha(palette.accent, 0.06),
    borderRadius: 16,
    padding: spacing.md,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  score: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '700',
  },
  verdict: {
    flex: 1,
    color: palette.textPrimary,
    fontSize: 13,
    lineHeight: 19,
  },
  block: {
    gap: 6,
  },
  blockTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  blockTitleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  item: {
    color: palette.textPrimary,
    fontSize: 13,
    lineHeight: 19,
  },
  budgetRow: {
    gap: 4,
  },
  budgetLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetAmount: {
    color: palette.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  error: {
    color: palette.danger,
    fontSize: 13,
  },
});
