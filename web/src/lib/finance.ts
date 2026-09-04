import type { Account, AppTransaction, Budget, Category, Task } from './types';

export interface MonthSummary {
  income: number;
  expense: number;
  net: number;
}

export interface CategorySlice {
  label: string;
  value: number;
  color: string;
}

export function transactionMonthKey(dateIso: string): string {
  const date = new Date(dateIso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function computeTotalBalance(accounts: Account[]): number {
  return accounts
    .filter((account) => account.include_in_balance && account.archived_at === null)
    .reduce((sum, account) => sum + account.balance, 0);
}

export interface MonthSummaryOptions {
  includeOpeningBalance?: boolean;
}

export function computeMonthSummary(
  transactions: AppTransaction[],
  monthKey: string,
  options: MonthSummaryOptions = {},
): MonthSummary {
  let income = 0;
  let expense = 0;
  for (const transaction of transactions) {
    if (transaction.type === 'transfer') continue;
    if (!options.includeOpeningBalance && transaction.is_opening_balance) continue;
    if (transactionMonthKey(transaction.date) !== monthKey) continue;
    if (transaction.type === 'income') {
      income += transaction.amount;
    } else if (transaction.type === 'expense') {
      expense += transaction.amount;
    }
  }
  return { income, expense, net: income - expense };
}

export function transactionsForMonth(
  transactions: AppTransaction[],
  monthKey: string,
): AppTransaction[] {
  return transactions.filter(
    (transaction) => transactionMonthKey(transaction.date) === monthKey,
  );
}

export function computeWeekSummary(
  transactions: AppTransaction[],
  days = 7,
  now = new Date(),
): MonthSummary {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1)).getTime();
  let income = 0;
  let expense = 0;
  for (const transaction of transactions) {
    if (transaction.type === 'transfer' || transaction.is_opening_balance) continue;
    const time = new Date(transaction.date).getTime();
    if (Number.isNaN(time) || time < start) continue;
    if (transaction.type === 'income') income += transaction.amount;
    else if (transaction.type === 'expense') expense += transaction.amount;
  }
  return { income, expense, net: income - expense };
}

export function budgetsForMonth(budgets: Budget[], monthKey: string): Budget[] {
  return budgets.filter((budget) => budget.month === monthKey);
}

export interface BudgetSpent {
  id: string;
  spent: number;
}

export function computeBudgetSpent(
  transactions: AppTransaction[],
  budgets: Budget[],
): BudgetSpent[] {
  return budgets.map((budget) => {
    let spent = 0;
    for (const transaction of transactions) {
      if (transaction.type !== 'expense') continue;
      if (transaction.is_opening_balance) continue;
      if (transaction.category_id !== budget.category_id) continue;
      if (transactionMonthKey(transaction.date) !== budget.month) continue;
      spent += transaction.amount;
    }
    return { id: budget.id, spent };
  });
}

export function filterTransactionsByAccount(
  transactions: AppTransaction[],
  accountId: string,
): AppTransaction[] {
  if (!accountId) return transactions;
  return transactions.filter((transaction) => transaction.account_id === accountId);
}

export function buildExpenseChartSlices(
  transactions: AppTransaction[],
  categories: Category[],
): CategorySlice[] {
  const map = new Map<string, CategorySlice>();
  for (const transaction of transactions) {
    if (transaction.type !== 'expense') continue;
    const category = categories.find((item) => item.id === transaction.category_id) ?? null;
    const label = category?.name ?? 'Sin categoría';
    const color = category?.color ?? '#8b7cf7';
    const existing = map.get(label);
    if (existing) {
      existing.value += transaction.amount;
    } else {
      map.set(label, { label, value: transaction.amount, color });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.value - a.value);
}

export function sumCategorySlices(slices: CategorySlice[]): number {
  return slices.reduce((sum, slice) => sum + slice.value, 0);
}

export interface MonthPoint {
  key: string;
  label: string;
  income: number;
  expense: number;
}

export function shiftMonthKeyLocal(base: Date, delta: number): string {
  const d = new Date(base.getFullYear(), base.getMonth() + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthlyTrend(
  transactions: AppTransaction[],
  monthsCount = 6,
  now = new Date(),
): MonthPoint[] {
  const points: MonthPoint[] = [];
  for (let i = monthsCount - 1; i >= 0; i -= 1) {
    const key = shiftMonthKeyLocal(now, -i);
    const [year, month] = key.split('-').map(Number);
    const summary = computeMonthSummary(transactions, key);
    points.push({
      key,
      label: new Date(year, (month ?? 1) - 1, 1).toLocaleDateString('es-MX', { month: 'short' }),
      income: summary.income,
      expense: summary.expense,
    });
  }
  return points;
}

export interface TopCategory {
  label: string;
  value: number;
  color: string;
  share: number;
}

export interface BudgetAlert {
  label: string;
  spent: number;
  amount: number;
  percent: number;
  over: boolean;
}

export interface FinanceInsights {
  monthKey: string;
  income: number;
  expense: number;
  net: number;
  savingsRate: number;
  dayOfMonth: number;
  daysInMonth: number;
  dailyBurn: number;
  projectedExpense: number;
  projectedNet: number;
  topCategories: TopCategory[];
  budgetAlerts: BudgetAlert[];
  prevExpense: number;
  expenseDeltaPct: number | null;
}

export function computeFinanceInsights(
  transactions: AppTransaction[],
  budgets: Budget[],
  categories: Category[],
  currentMonthKey: string,
  now = new Date(),
): FinanceInsights {
  const summary = computeMonthSummary(transactions, currentMonthKey);
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayOfMonth = Math.min(Math.max(now.getDate(), 1), daysInMonth);
  const dailyBurn = summary.expense / dayOfMonth;
  const projectedExpense = dailyBurn * daysInMonth;
  const savingsRate = summary.income > 0 ? Math.max(0, (summary.income - summary.expense) / summary.income) : 0;

  const slices = buildExpenseChartSlices(transactionsForMonth(transactions, currentMonthKey), categories);
  const totalSliced = sumCategorySlices(slices);
  const topCategories: TopCategory[] = slices.slice(0, 5).map((s) => ({
    label: s.label,
    value: s.value,
    color: s.color,
    share: totalSliced > 0 ? s.value / totalSliced : 0,
  }));

  const monthBudgets = budgetsForMonth(budgets, currentMonthKey);
  const budgetAlerts: BudgetAlert[] = monthBudgets.map((b) => {
    const category = categories.find((c) => c.id === b.category_id) ?? null;
    const percent = b.amount > 0 ? Math.min(100, Math.round((b.spent / b.amount) * 100)) : 0;
    return {
      label: category?.name ?? 'Presupuesto',
      spent: b.spent,
      amount: b.amount,
      percent,
      over: b.amount > 0 && b.spent > b.amount,
    };
  });

  const prevKey = shiftMonthKeyLocal(now, -1);
  const prevExpense = computeMonthSummary(transactions, prevKey).expense;
  const expenseDeltaPct = prevExpense > 0 ? (summary.expense - prevExpense) / prevExpense : null;

  return {
    monthKey: currentMonthKey,
    income: summary.income,
    expense: summary.expense,
    net: summary.net,
    savingsRate,
    dayOfMonth,
    daysInMonth,
    dailyBurn,
    projectedExpense,
    projectedNet: summary.income - projectedExpense,
    topCategories,
    budgetAlerts,
    prevExpense,
    expenseDeltaPct,
  };
}

export function buildFinanceSummaryText(
  insights: FinanceInsights,
  trend: MonthPoint[],
  balance: number,
): string {  const lines: string[] = [];
  lines.push(`Balance total: ${balance.toFixed(2)} MXN.`);
  lines.push(
    `Mes ${insights.monthKey}: ingresos ${insights.income.toFixed(2)}, gastos ${insights.expense.toFixed(2)}, neto ${insights.net.toFixed(2)}.`,
  );
  lines.push(`Tasa de ahorro: ${(insights.savingsRate * 100).toFixed(1)}%.`);
  lines.push(
    `Día ${insights.dayOfMonth}/${insights.daysInMonth}: gasto diario promedio ${insights.dailyBurn.toFixed(2)}, proyección de gasto a fin de mes ${insights.projectedExpense.toFixed(2)}, neto proyectado ${insights.projectedNet.toFixed(2)}.`,
  );
  if (insights.expenseDeltaPct !== null) {
    lines.push(
      `Vs mes anterior (${insights.prevExpense.toFixed(2)}): ${(insights.expenseDeltaPct * 100).toFixed(1)}%.`,
    );
  }
  if (insights.topCategories.length > 0) {
    lines.push(
      'Top categorías: ' +
        insights.topCategories
          .map((c) => `${c.label} ${c.value.toFixed(2)} (${(c.share * 100).toFixed(0)}%)`)
          .join(', ') +
        '.',
    );
  }
  if (insights.budgetAlerts.length > 0) {
    lines.push(
      'Presupuestos: ' +
        insights.budgetAlerts
          .map((b) => `${b.label} ${b.spent.toFixed(2)}/${b.amount.toFixed(2)} (${b.percent}%)`)
          .join(', ') +
        '.',
    );
  }
  if (trend.length > 0) {
    lines.push(
      'Tendencia: ' +
        trend.map((p) => `${p.label} ing ${p.income.toFixed(0)}/gas ${p.expense.toFixed(0)}`).join(', ') +
        '.',
    );
  }
  return lines.join('\n');
}

export interface DailyBrief {
  urgentCount: number;
  dueTodayCount: number;
  dailyBudget: number;
  daysLeft: number;
}

export function computeDailyBrief(
  transactions: AppTransaction[],
  tasks: Task[],
  currentMonthKey: string,
  now = new Date(),
): DailyBrief {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const tomorrowStart = todayStart + 86_400_000;
  let urgentCount = 0;
  let dueTodayCount = 0;
  for (const task of tasks) {
    if (task.status === 'done' || task.status === 'archived') continue;
    const due = task.due_date ? new Date(task.due_date).getTime() : NaN;
    const overdue = Number.isFinite(due) && due < todayStart;
    const isToday = Number.isFinite(due) && due >= todayStart && due < tomorrowStart;
    if (isToday) dueTodayCount += 1;
    if (overdue || isToday || task.priority === 'urgent') urgentCount += 1;
  }
  const summary = computeMonthSummary(transactions, currentMonthKey);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - now.getDate() + 1);
  const remaining = summary.income - summary.expense;
  const dailyBudget = remaining > 0 ? remaining / daysLeft : 0;
  return { urgentCount, dueTodayCount, dailyBudget, daysLeft };
}
