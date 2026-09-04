import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  CalendarClock,
  ListChecks,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassCard } from '../../components/ui/GlassCard';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ScreenTransition } from '../../components/ui/ScreenTransition';
import { useFinanceStore } from '../../stores/useFinanceStore';
import { useTaskStore } from '../../stores/useTaskStore';
import { formatCurrency, formatDueLabel, monthKey } from '../../lib/format';
import { computeDailyBrief, computeWeekSummary } from '../../lib/finance';
import { getWeeklyCompletion } from '../../lib/tasks';
import { palette, withAlpha } from '../../theme/colors';
import { spacing } from '../../theme/glass';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const financeLoading = useFinanceStore((state) => state.isLoading);
  const taskLoading = useTaskStore((state) => state.isLoading);
  const accounts = useFinanceStore((state) => state.accounts);
  const transactions = useFinanceStore((state) => state.transactions);
  const tasks = useTaskStore((state) => state.tasks);

  useEffect(() => {
    void useFinanceStore.getState().loadAll().catch(() => undefined);
    void useTaskStore.getState().loadTasks();
  }, []);

  const summary = useMemo(
    () => useFinanceStore.getState().getMonthSummary(monthKey()),
    [transactions],
  );
  const balance = useMemo(() => useFinanceStore.getState().totalBalance(), [accounts]);
  const pendingTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.status !== 'done' && task.status !== 'archived')
        .sort((a, b) => b.urgency_score - a.urgency_score)
        .slice(0, 3),
    [tasks],
  );

  const reload = () => {
    void useFinanceStore.getState().loadAll().catch(() => undefined);
    void useTaskStore.getState().loadTasks();
  };

  const week = useMemo(() => computeWeekSummary(transactions, 7), [transactions]);
  const weekDone = useMemo(
    () => getWeeklyCompletion(tasks).reduce((sum, d) => sum + d.completed, 0),
    [tasks],
  );
  const brief = useMemo(
    () => computeDailyBrief(transactions, tasks, monthKey()),
    [transactions, tasks],
  );

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + 96 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={financeLoading || taskLoading}
          onRefresh={reload}
          tintColor={palette.accent}
          colors={[palette.accent]}
        />
      }
    >
      <ScreenTransition>
        <Text style={styles.greeting}>Hola</Text>
        <Text style={styles.date}>
          {new Date().toLocaleDateString('es-MX', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </Text>

        <GlassCard compact style={styles.briefCard}>
          <Sparkles size={16} color={palette.accent} strokeWidth={2} />
          <Text style={styles.briefText}>
            Hoy tienes <Text style={styles.briefBold}>{brief.urgentCount} urgentes</Text>
            {brief.dueTodayCount > 0 ? ` (${brief.dueTodayCount} vencen hoy)` : ''} y tu
            presupuesto diario sugerido es de{' '}
            <Text style={styles.briefBold}>{formatCurrency(brief.dailyBudget)}</Text>.
          </Text>
        </GlassCard>

        <GlassCard style={styles.block}>
          <View style={styles.balanceHeader}>
            <View>
              <Text style={styles.label}>Balance total</Text>
              <Text style={styles.balance}>{formatCurrency(balance)}</Text>
            </View>
            <View style={styles.monthBadge}>
              <Text style={styles.monthBadgeText}>{monthKey()}</Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <TrendingUp size={16} color={palette.success} strokeWidth={2} />
              <Text style={styles.summaryValue}>{formatCurrency(summary.income)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <TrendingDown size={16} color={palette.danger} strokeWidth={2} />
              <Text style={styles.summaryValue}>{formatCurrency(summary.expense)}</Text>
            </View>
          </View>
        </GlassCard>

        <View style={styles.quickRow}>
          <GlassButton
            title="Ver finanzas"
            variant="secondary"
            icon={Wallet}
            style={styles.quickButton}
            onPress={() => router.push('/finanzas')}
          />
          <GlassButton
            title="Ver tareas"
            variant="secondary"
            icon={ListChecks}
            style={styles.quickButton}
            onPress={() => router.push('/tareas')}
          />
        </View>

        <GlassCard compact style={styles.weekCard}>
          <View>
            <Text style={styles.weekLabel}>Últimos 7 días</Text>
            <Text style={styles.weekValue}>
              {formatCurrency(week.income)}{' '}
              <Text style={styles.weekExpense}>{formatCurrency(week.expense)}</Text>
            </Text>
          </View>
          <View style={styles.weekRight}>
            <Text style={styles.weekLabel}>Tareas hechas</Text>
            <Text style={styles.weekDone}>{weekDone}</Text>
          </View>
        </GlassCard>

        <Text style={styles.sectionTitle}>Urgentes</Text>
        {pendingTasks.length === 0 ? (
          <GlassCard compact>
            <Text style={styles.emptyText}>No tienes tareas pendientes. Perfecto.</Text>
          </GlassCard>
        ) : (
          pendingTasks.map((task) => (
            <GlassCard key={task.id} compact style={styles.taskCard}>
              <View style={styles.taskHeader}>
                <View style={styles.taskTitleWrap}>
                  <Text style={styles.taskTitle} numberOfLines={1}>
                    {task.title}
                  </Text>
                </View>
                <Text style={styles.urgency}>{task.urgency_score}</Text>
              </View>
              <View style={styles.taskMeta}>
                {task.due_date ? (
                  <View style={styles.metaItem}>
                    <CalendarClock size={13} color={palette.textSecondary} strokeWidth={2} />
                    <Text style={styles.metaText}>{formatDueLabel(task.due_date)}</Text>
                  </View>
                ) : null}
                {task.subject ? <Text style={styles.subject}>{task.subject}</Text> : null}
              </View>
              <ProgressBar
                value={task.urgency_score}
                height={4}
                gradient={[palette.info, palette.accent]}
                rounded
              />
            </GlassCard>
          ))
        )}
      </ScreenTransition>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  greeting: {
    color: palette.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  date: {
    color: palette.textSecondary,
    fontSize: 14,
    marginTop: -12,
  },
  block: {
    gap: spacing.lg,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  label: {
    color: palette.textSecondary,
    fontSize: 13,
  },
  balance: {
    color: palette.textPrimary,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  monthBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  monthBadgeText: {
    color: palette.textSecondary,
    fontSize: 11,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryValue: {
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  quickRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickButton: {
    flex: 1,
  },
  weekCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekLabel: {
    color: palette.textSecondary,
    fontSize: 11,
  },
  weekValue: {
    color: palette.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  weekExpense: {
    color: palette.danger,
  },
  weekRight: {
    alignItems: 'flex-end',
  },
  weekDone: {
    color: palette.success,
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  briefCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderColor: withAlpha(palette.accent, 0.3),
    backgroundColor: withAlpha(palette.accent, 0.05),
  },
  briefText: {
    flex: 1,
    color: palette.textPrimary,
    fontSize: 13,
    lineHeight: 19,
  },
  briefBold: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  sectionTitle: {
    color: palette.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  taskCard: {
    gap: spacing.md,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  taskTitle: {
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  urgency: {
    color: palette.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: palette.textSecondary,
    fontSize: 12,
  },
  subject: {
    color: palette.info,
    fontSize: 12,
    fontWeight: '500',
  },
  emptyText: {
    color: palette.textSecondary,
    fontSize: 14,
  },
});