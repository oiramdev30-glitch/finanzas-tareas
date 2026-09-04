import { useEffect, useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowDownLeft, ArrowUpRight, Repeat } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '../../components/ui/GlassCard';
import { LoadingView } from '../../components/ui/LoadingView';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ScreenTransition } from '../../components/ui/ScreenTransition';
import { MonthlyTrendChart } from '../../components/ui/MonthlyTrendChart';
import { FinanceAdvisor } from '../../components/ui/FinanceAdvisor';
import { useFinanceStore } from '../../stores/useFinanceStore';
import {
  accountTypeLabel,
  formatCurrency,
  formatDate,
  monthKey,
} from '../../lib/format';
import {
  computeFinanceInsights,
  getMonthlyTrend,
} from '../../lib/finance';
import { palette, withAlpha } from '../../theme/colors';
import { color, spacing } from '../../theme/glass';

function EmptyCard({ text }: { text: string }) {
  return (
    <GlassCard compact>
      <Text style={styles.emptyText}>{text}</Text>
    </GlassCard>
  );
}

export default function FinanceScreen() {
  const insets = useSafeAreaInsets();
  const accounts = useFinanceStore((state) => state.accounts);
  const categories = useFinanceStore((state) => state.categories);
  const transactions = useFinanceStore((state) => state.transactions);
  const budgets = useFinanceStore((state) => state.budgets);
  const isLoading = useFinanceStore((state) => state.isLoading);

  useEffect(() => {
    void useFinanceStore.getState().loadAll().catch(() => undefined);
  }, []);

  const balance = useMemo(() => useFinanceStore.getState().totalBalance(), [accounts]);
  const summary = useMemo(
    () => useFinanceStore.getState().getMonthSummary(monthKey()),
    [transactions],
  );
  const currentBudgets = useMemo(
    () => budgets.filter((budget) => budget.month === monthKey()),
    [budgets],
  );
  const recent = useMemo(() => transactions.slice(0, 8), [transactions]);
  const trend = useMemo(() => getMonthlyTrend(transactions, 6), [transactions]);
  const insights = useMemo(
    () => computeFinanceInsights(transactions, budgets, categories, monthKey()),
    [transactions, budgets, categories],
  );

  if (isLoading && accounts.length === 0 && transactions.length === 0) {
    return <LoadingView />;
  }

  const reload = () => {
    void useFinanceStore.getState().loadAll().catch(() => undefined);
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + 96 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={reload}
          tintColor={palette.accent}
          colors={[palette.accent]}
        />
      }
    >
      <ScreenTransition>
        <Text style={styles.title}>Finanzas</Text>

        <GlassCard style={styles.block}>
          <Text style={styles.label}>Balance total</Text>
          <Text style={styles.balance}>{formatCurrency(balance)}</Text>
          <Text style={styles.net}>{formatCurrency(summary.net)} este mes</Text>
        </GlassCard>

        <Text style={styles.sectionTitle}>Progreso: ingresos vs gastos</Text>
        <GlassCard style={styles.block}>
          <MonthlyTrendChart points={trend} />
        </GlassCard>

        <FinanceAdvisor insights={insights} trend={trend} balance={balance} />

        <Text style={styles.sectionTitle}>Cuentas</Text>
        {accounts.length === 0 ? (
          <EmptyCard text="Sin cuentas todavía" />
        ) : (
          accounts.map((account) => (
            <GlassCard key={account.id} compact>
              <View style={styles.accountRow}>
                <View
                  style={[styles.dot, { backgroundColor: account.color ?? palette.accent }]}
                />
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName} numberOfLines={1}>
                    {account.name}
                  </Text>
                  <Text style={styles.accountMeta}>{accountTypeLabel(account.type)}</Text>
                </View>
                <Text style={styles.accountBalance}>
                  {formatCurrency(account.balance, account.currency)}
                </Text>
              </View>
            </GlassCard>
          ))
        )}

        <Text style={styles.sectionTitle}>Presupuestos del mes</Text>
        {currentBudgets.length === 0 ? (
          <EmptyCard text="Sin presupuestos este mes" />
        ) : (
          currentBudgets.map((budget) => {
            const category = categories.find((item) => item.id === budget.category_id) ?? null;
            const percent =
              budget.amount > 0
                ? Math.max(0, Math.min(100, Math.round((budget.spent / budget.amount) * 100)))
                : 0;
            const overBudget = budget.amount > 0 && budget.spent > budget.amount;
            return (
              <GlassCard key={budget.id} compact style={styles.block}>
                <View style={styles.budgetHeader}>
                  <View style={styles.budgetTitleWrap}>
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: category?.color ?? palette.accent },
                      ]}
                    />
                    <Text style={styles.budgetTitle} numberOfLines={1}>
                      {category?.name ?? 'Presupuesto'}
                    </Text>
                  </View>
                  {overBudget ? (
                    <Text style={styles.overBudget}>Excedido</Text>
                  ) : null}
                </View>
                <ProgressBar
                  value={percent}
                  height={6}
                  color={overBudget ? palette.danger : palette.accent}
                  gradient={[palette.info, palette.accent]}
                  rounded
                />
                <Text style={styles.budgetAmount}>
                  {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                </Text>
              </GlassCard>
            );
          })
        )}

        <Text style={styles.sectionTitle}>Movimientos recientes</Text>
        {recent.length === 0 ? (
          <EmptyCard text="Aún no hay movimientos" />
        ) : (
          recent.map((transaction) => {
            const category = categories.find((item) => item.id === transaction.category_id) ?? null;
            const TransactionIcon =
              transaction.type === 'income'
                ? ArrowDownLeft
                : transaction.type === 'expense'
                  ? ArrowUpRight
                  : Repeat;
            const amountColor =
              transaction.type === 'expense'
                ? palette.danger
                : transaction.type === 'income'
                  ? palette.success
                  : palette.textPrimary;
            return (
              <GlassCard key={transaction.id} compact>
                <View style={styles.txRow}>
                  <View
                    style={[
                      styles.txIcon,
                      {
                        backgroundColor: category?.color
                          ? withAlpha(category.color, 0.18)
                          : color.surface,
                      },
                    ]}
                  >
                    <TransactionIcon
                      size={16}
                      color={
                        category?.color
                          ? category.color
                          : transaction.type === 'expense'
                            ? palette.danger
                            : palette.success
                      }
                      strokeWidth={2}
                    />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txTitle} numberOfLines={1}>
                      {transaction.description ?? transaction.merchant ?? 'Movimiento'}
                    </Text>
                    <Text style={styles.txMeta}>
                      {category?.name ?? 'Sin categoría'} · {formatDate(transaction.date)}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, { color: amountColor }]}>
                    {transaction.type === 'expense' ? '-' : transaction.type === 'income' ? '+' : ''}
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </Text>
                </View>
              </GlassCard>
            );
          })
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
  title: {
    color: palette.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  block: {
    gap: spacing.md,
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
  net: {
    color: palette.success,
    fontSize: 14,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  sectionTitle: {
    color: palette.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  emptyText: {
    color: palette.textSecondary,
    fontSize: 14,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  accountMeta: {
    color: palette.textSecondary,
    fontSize: 12,
  },
  accountBalance: {
    color: palette.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  budgetTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  budgetTitle: {
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  overBudget: {
    color: palette.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  budgetAmount: {
    color: palette.textSecondary,
    fontSize: 12,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  txMeta: {
    color: palette.textSecondary,
    fontSize: 12,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
});