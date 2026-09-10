'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, Archive, ChevronLeft, ChevronRight, Download, Pencil, Plus, Repeat, Tag, Target, Trash2, Wallet } from 'lucide-react';
import GlassCard from '@/components/GlassCard';
import { GlassButton } from '@/components/GlassButton';
import ProgressBar from '@/components/ProgressBar';
import SpendingChart, { type ChartSlice } from '@/components/SpendingChart';
import MonthlyTrendChart from '@/components/MonthlyTrendChart';
import FinanceAdvisor from '@/components/FinanceAdvisor';
import Skeleton from '@/components/Skeleton';
import {
  EditTransactionModal,
  ManageCategoriesModal,
  NewAccountModal,
  NewBudgetModal,
  NewCategoryModal,
  NewTransactionModal,
  TransferModal,
} from '@/components/FinanceForms';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { accountTypeLabel, formatCurrency, formatDate, formatMonthLabel, monthKey, shiftMonthKey } from '@/lib/format';
import {
  budgetsForMonth,
  buildExpenseChartSlices,
  computeFinanceInsights,
  computeMonthSummary,
  computeTotalBalance,
  filterTransactionsByAccount,
  getMonthlyTrend,
  sumCategorySlices,
  transactionsForMonth,
} from '@/lib/finance';
import { staggerContainer, fadeUp } from '@/lib/motion';
import type { Account, AppTransaction } from '@/lib/types';

export default function FinanzasPage() {
  const accounts = useFinanceStore((state) => state.accounts);
  const categories = useFinanceStore((state) => state.categories);
  const transactions = useFinanceStore((state) => state.transactions);
  const budgets = useFinanceStore((state) => state.budgets);
  const isLoading = useFinanceStore((state) => state.isLoading);
  const [visibleMonth, setVisibleMonth] = useState(monthKey());
  const [accountFilter, setAccountFilter] = useState('');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showEditAccountModal, setShowEditAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showManageCategoriesModal, setShowManageCategoriesModal] = useState(false);
  const [showEditTxnModal, setShowEditTxnModal] = useState(false);
  const [editingTxn, setEditingTxn] = useState<AppTransaction | null>(null);
  const [txnInitial, setTxnInitial] = useState<{ amount?: number; description?: string } | undefined>(undefined);

  useEffect(() => {
    void useFinanceStore.getState().loadAll().catch(() => undefined);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const amount = Number(params.get('expenseAmount'));
    const desc = params.get('expenseDesc');
    if (Number.isFinite(amount) && amount > 0) {
      setTxnInitial({ amount, description: desc ? decodeURIComponent(desc) : undefined });
      setShowTransactionModal(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const balance = useMemo(() => computeTotalBalance(accounts), [accounts]);

  const monthTransactions = useMemo(
    () => transactionsForMonth(transactions, visibleMonth),
    [transactions, visibleMonth],
  );

  const summary = useMemo(
    () => computeMonthSummary(monthTransactions, visibleMonth),
    [monthTransactions, visibleMonth],
  );

  const currentBudgets = useMemo(
    () => budgetsForMonth(budgets, visibleMonth),
    [budgets, visibleMonth],
  );

  const filteredTransactions = useMemo(
    () => filterTransactionsByAccount(monthTransactions, accountFilter),
    [monthTransactions, accountFilter],
  );

  const recent = useMemo(() => filteredTransactions.slice(0, 12), [filteredTransactions]);

  const chartSlices = useMemo<ChartSlice[]>(
    () => buildExpenseChartSlices(monthTransactions, categories),
    [monthTransactions, categories],
  );

  const expenseThisMonth = sumCategorySlices(chartSlices);

  const trend = useMemo(() => getMonthlyTrend(transactions, 6), [transactions]);

  const insights = useMemo(
    () => computeFinanceInsights(transactions, budgets, categories, visibleMonth),
    [transactions, budgets, categories, visibleMonth],
  );

  const handleExport = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      accounts,
      categories,
      transactions,
      budgets,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finanzas-backup-${monthKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openEditAccount = (account: Account) => {
    setEditingAccount(account);
    setShowEditAccountModal(true);
  };

  const openEditTxn = (txn: AppTransaction) => {
    setEditingTxn(txn);
    setShowEditTxnModal(true);
  };

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex flex-col gap-6 overflow-x-hidden">
      <motion.div variants={fadeUp} className="flex flex-col gap-3">
        <h1 className="text-[28px] font-bold tracking-wide text-textPrimary">Finanzas</h1>
        <div className="grid grid-cols-3 gap-2">
          <GlassButton title="Cuenta" variant="secondary" size="sm" icon={Wallet} onClick={() => setShowAccountModal(true)} />
          <GlassButton title="Gasto" variant="secondary" size="sm" icon={Plus} onClick={() => setShowTransactionModal(true)} />
          <GlassButton title="Transferir" variant="secondary" size="sm" icon={Repeat} onClick={() => setShowTransferModal(true)} />
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVisibleMonth((m) => shiftMonthKey(m, -1))}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white/5 text-textSecondary hover:bg-white/10"
            aria-label="Mes anterior"
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          <span className="w-36 text-center text-[15px] font-semibold capitalize text-textPrimary">
            {formatMonthLabel(visibleMonth)}
          </span>
          <button
            onClick={() => setVisibleMonth((m) => shiftMonthKey(m, 1))}
            disabled={visibleMonth >= monthKey()}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white/5 text-textSecondary hover:bg-white/10 disabled:opacity-40"
            aria-label="Mes siguiente"
          >
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        </div>
        <div className="flex gap-2">
          <GlassButton title="" variant="secondary" size="sm" icon={Download} onClick={handleExport} />
          <GlassButton title="Categorías" variant="secondary" size="sm" icon={Tag} onClick={() => setShowManageCategoriesModal(true)} />
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <GlassCard glow className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-accent/30 to-[#22d3ee]/20 blur-2xl" />
          <p className="text-[13px] tracking-wide text-textSecondary">Balance total</p>
          {isLoading && accounts.length === 0 ? (
            <Skeleton className="mt-2 h-11 w-56" />
          ) : (
            <p className="mt-1 text-[36px] font-bold tabular-nums tracking-wide text-textPrimary">
              {formatCurrency(balance)}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success/15">
                <ArrowDownLeft size={15} strokeWidth={2} className="text-success" />
              </span>
              <span className="text-[15px] font-semibold tabular-nums text-textPrimary">{formatCurrency(summary.income)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-danger/15">
                <ArrowUpRight size={15} strokeWidth={2} className="text-danger" />
              </span>
              <span className="text-[15px] font-semibold tabular-nums text-textPrimary">{formatCurrency(summary.expense)}</span>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      <motion.div variants={fadeUp}>
        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[17px] font-semibold text-textPrimary">Gastos del mes</h2>
            <GlassButton title="Nueva" variant="secondary" size="sm" icon={Plus} onClick={() => setShowCategoryModal(true)} />
          </div>
          <SpendingChart slices={chartSlices} total={expenseThisMonth} />
        </GlassCard>
      </motion.div>

      <motion.div variants={fadeUp}>
        <GlassCard>
          <h2 className="mb-4 text-[17px] font-semibold text-textPrimary">Progreso: ingresos vs gastos</h2>
          <MonthlyTrendChart points={trend} />
        </GlassCard>
      </motion.div>

      <motion.div variants={fadeUp}>
        <FinanceAdvisor insights={insights} trend={trend} balance={balance} />
      </motion.div>

      <motion.div variants={fadeUp}>
        <h2 className="mb-4 mt-1 text-[18px] font-semibold text-textPrimary">Cuentas</h2>
        {accounts.length === 0 ? (
          <GlassCard compact>
            <p className="text-[14px] text-textSecondary">Sin cuentas todavía — crea una para empezar.</p>
          </GlassCard>
        ) : (
          <div className="flex flex-col gap-3">
            {accounts.map((account) => (
              <GlassCard key={account.id} compact className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: account.color ?? '#8b7cf7' }} />
                  <div className="flex-1">
                    <p className="truncate text-[15px] font-semibold text-textPrimary">{account.name}</p>
                    <p className="text-[12px] text-textSecondary">{accountTypeLabel(account.type)}</p>
                  </div>
                  <span className="text-[16px] font-semibold text-textPrimary">
                    {formatCurrency(account.balance, account.currency)}
                  </span>
                  {account.archived_at === null ? (
                    <button
                      onClick={() => openEditAccount(account)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white/5 text-textSecondary hover:bg-white/10"
                      aria-label={`Editar ${account.name}`}
                    >
                      <Pencil size={15} strokeWidth={2} />
                    </button>
                  ) : null}
                  {account.archived_at === null ? (
                    <button
                      onClick={() =>
                        void useFinanceStore.getState().archiveAccount(account.id).catch(() => undefined)
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white/5 text-textSecondary hover:bg-white/10"
                      aria-label={`Archivar ${account.name}`}
                    >
                      <Archive size={15} strokeWidth={2} />
                    </button>
                  ) : null}
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div variants={fadeUp}>
        <h2 className="mb-4 mt-1 text-[18px] font-semibold text-textPrimary">Presupuestos del mes</h2>
        {currentBudgets.length === 0 ? (
          <GlassCard compact>
            <p className="text-[14px] text-textSecondary">Sin presupuestos este mes — define tu meta.</p>
          </GlassCard>
        ) : (
          <div className="flex flex-col gap-4">
            {currentBudgets.map((budget) => {
              const category = categories.find((item) => item.id === budget.category_id) ?? null;
              const percent =
                budget.amount > 0
                  ? Math.max(0, Math.min(100, Math.round((budget.spent / budget.amount) * 100)))
                  : 0;
              const overBudget = budget.amount > 0 && budget.spent > budget.amount;
              return (
                <GlassCard key={budget.id} compact className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-1 items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category?.color ?? '#8b7cf7' }} />
                      <span className="truncate text-[15px] font-semibold text-textPrimary">
                        {category?.name ?? 'Presupuesto'}
                      </span>
                    </div>
                    {overBudget ? <span className="text-[12px] font-semibold text-danger">Excedido</span> : null}
                  </div>
                  <ProgressBar value={percent} color={overBudget ? '#f87171' : '#8b7cf7'} />
                  <p className="text-[12px] text-textSecondary">
                    {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                  </p>
                </GlassCard>
              );
            })}
          </div>
        )}
      </motion.div>

      <motion.div variants={fadeUp}>
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-semibold text-textPrimary">Movimientos</h2>
            <div className="flex items-center gap-2">
              {accounts.length > 0 ? (
                <SelectsCuenta
                  accounts={accounts}
                  value={accountFilter}
                  onChange={setAccountFilter}
                />
              ) : null}
              <GlassButton title="Nuevo" variant="primary" size="sm" icon={Plus} onClick={() => setShowTransactionModal(true)} />
            </div>
          </div>
        </div>
        {recent.length === 0 ? (
          <GlassCard compact>
            <p className="text-[14px] text-textSecondary">No hay movimientos para este mes.</p>
          </GlassCard>
        ) : (
          <div className="flex flex-col gap-3">
            {recent.map((transaction) => {
              const category = categories.find((item) => item.id === transaction.category_id) ?? null;
              const Icon =
                transaction.type === 'income' ? ArrowDownLeft : transaction.type === 'expense' ? ArrowUpRight : Repeat;
              const amountColor =
                transaction.type === 'expense' ? '#f87171' : transaction.type === 'income' ? '#4ade80' : '#9ca3af';
              return (
                <GlassCard key={transaction.id} compact>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: category?.color ? `${category.color}2e` : 'rgba(255,255,255,0.06)',
                      }}
                    >
                      <Icon size={16} strokeWidth={2} className={category?.color ? undefined : 'text-textPrimary'} style={category?.color ? { color: category.color } : { color: amountColor }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {transaction.is_opening_balance ? (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-info">Inicial</span>
                        ) : null}
                        <p className="truncate text-[15px] font-medium text-textPrimary">
                          {transaction.description ?? transaction.merchant ?? 'Movimiento'}
                        </p>
                      </div>
                      <p className="text-[12px] text-textSecondary">
                        {category?.name ?? 'Sin categoría'} · {formatDate(transaction.date)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[15px] font-semibold" style={{ color: amountColor }}>
                      {transaction.type === 'expense' ? '-' : transaction.type === 'income' ? '+' : ''}
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </span>
                    {transaction.type !== 'transfer' ? (
                      <button
                        onClick={() => openEditTxn(transaction)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-white/5 text-textSecondary hover:bg-white/10"
                        aria-label="Editar movimiento"
                      >
                        <Pencil size={14} strokeWidth={2} />
                      </button>
                    ) : null}
                    <button
                      onClick={() =>
                        void useFinanceStore.getState().deleteTransaction(transaction.id).catch(() => undefined)
                      }
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20"
                      aria-label="Eliminar movimiento"
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </motion.div>

      <GlassButton title="Nueva meta" variant="secondary" icon={Target} onClick={() => setShowBudgetModal(true)} className="w-full" />

      <NewAccountModal open={showAccountModal} onClose={() => setShowAccountModal(false)} account={null} />
      <NewAccountModal open={showEditAccountModal} onClose={() => { setShowEditAccountModal(false); setEditingAccount(null); }} account={editingAccount} />
      <NewBudgetModal open={showBudgetModal} onClose={() => setShowBudgetModal(false)} />
      <NewTransactionModal open={showTransactionModal} onClose={() => { setShowTransactionModal(false); setTxnInitial(undefined); }} initial={txnInitial} />
      <TransferModal open={showTransferModal} onClose={() => setShowTransferModal(false)} />
      <NewCategoryModal open={showCategoryModal} onClose={() => setShowCategoryModal(false)} />
      <ManageCategoriesModal open={showManageCategoriesModal} onClose={() => setShowManageCategoriesModal(false)} />
      <EditTransactionModal open={showEditTxnModal} onClose={() => { setShowEditTxnModal(false); setEditingTxn(null); }} transaction={editingTxn} />
    </motion.div>
  );
}

function SelectsCuenta({ accounts, value, onChange }: { accounts: Account[]; value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-white/15 bg-white/[0.07] px-3 py-2 text-[13px] text-textPrimary outline-none focus:border-accent"
    >
      <option value="">Todas</option>
      {accounts.map((a) => (
        <option key={a.id} value={a.id} className="bg-bg-bottom text-textPrimary">
          {a.name}
        </option>
      ))}
    </select>
  );
}
