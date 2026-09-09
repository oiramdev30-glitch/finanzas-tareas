'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { BellRing, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/GlassCard';
import { GlassButton } from '@/components/GlassButton';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { useReminderStore } from '@/stores/useReminderStore';
import { computeMonthSummary, computeTotalBalance, computeWeekSummary } from '@/lib/finance';
import { formatCurrency, monthKey } from '@/lib/format';
import { staggerContainer, fadeUp } from '@/lib/motion';

export default function HomePage() {
  const accounts = useFinanceStore((state) => state.accounts);
  const transactions = useFinanceStore((state) => state.transactions);
  const reminders = useReminderStore((state) => state.items);

  useEffect(() => {
    void useFinanceStore.getState().loadAll().catch(() => undefined);
    useReminderStore.getState().load();
  }, []);

  const summary = useMemo(
    () => computeMonthSummary(transactions, monthKey()),
    [transactions],
  );
  const balance = useMemo(() => computeTotalBalance(accounts), [accounts]);
  const week = useMemo(() => computeWeekSummary(transactions, 7), [transactions]);
  const activeReminders = useMemo(() => reminders.filter((r) => r.enabled).length, [reminders]);

  const today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex flex-col gap-6">
      <motion.div variants={fadeUp}>
        <h1 className="text-[28px] font-bold tracking-wide text-textPrimary">Bienvenido</h1>
        <p className="mt-1 text-[14px] capitalize text-textSecondary">{today}</p>
      </motion.div>

      <motion.div variants={fadeUp}>
      <GlassCard glow className="flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] text-textSecondary">Balance total</p>
            <p className="text-[34px] font-bold tracking-wide text-textPrimary">
              {formatCurrency(balance)}
            </p>
          </div>
          <span className="rounded-full border border-border bg-white/5 px-2.5 py-1 text-[11px] text-textSecondary">
            {monthKey()}
          </span>
        </div>
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} strokeWidth={2} className="text-success" />
            <span className="text-[15px] font-semibold text-textPrimary">
              {formatCurrency(summary.income)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown size={16} strokeWidth={2} className="text-danger" />
            <span className="text-[15px] font-semibold text-textPrimary">
              {formatCurrency(summary.expense)}
            </span>
          </div>
        </div>
      </GlassCard>
      </motion.div>

      <motion.div variants={fadeUp} className="flex gap-3">
        <Link href="/finanzas" className="flex-1">
          <GlassButton title="Finanzas" variant="secondary" icon={Wallet} className="w-full" />
        </Link>
        <Link href="/config" className="flex-1">
          <GlassButton title="Recordatorios" variant="secondary" icon={BellRing} className="w-full" />
        </Link>
      </motion.div>

      <motion.div variants={fadeUp}>
        <GlassCard compact className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-textSecondary">Últimos 7 días — ingresos / gastos</span>
            <span className="text-[14px] font-semibold tabular-nums text-textPrimary">
              {formatCurrency(week.income)} · <span className="text-danger">{formatCurrency(week.expense)}</span>
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[11px] text-textSecondary">Recordatorios activos</span>
            <span className="text-[14px] font-semibold tabular-nums text-accent">{activeReminders}</span>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
