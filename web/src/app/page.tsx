'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  CalendarClock,
  ListChecks,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/GlassCard';
import { GlassButton } from '@/components/GlassButton';
import ProgressBar from '@/components/ProgressBar';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { useTaskStore } from '@/stores/useTaskStore';
import { computeDailyBrief, computeMonthSummary, computeTotalBalance, computeWeekSummary } from '@/lib/finance';
import { isOpenTask } from '@/lib/tasks';
import { getWeeklyCompletion } from '@/lib/tasks';
import { formatCurrency, formatDueLabel, monthKey } from '@/lib/format';
import { staggerContainer, fadeUp } from '@/lib/motion';

export default function HomePage() {
  const accounts = useFinanceStore((state) => state.accounts);
  const transactions = useFinanceStore((state) => state.transactions);
  const tasks = useTaskStore((state) => state.tasks);

  useEffect(() => {
    void useFinanceStore.getState().loadAll().catch(() => undefined);
    void useTaskStore.getState().loadTasks();
  }, []);

  const summary = useMemo(
    () => computeMonthSummary(transactions, monthKey()),
    [transactions],
  );
  const balance = useMemo(() => computeTotalBalance(accounts), [accounts]);
  const week = useMemo(() => computeWeekSummary(transactions, 7), [transactions]);
  const weekDone = useMemo(
    () => getWeeklyCompletion(tasks).reduce((sum, d) => sum + d.completed, 0),
    [tasks],
  );
  const brief = useMemo(
    () => computeDailyBrief(transactions, tasks, monthKey()),
    [transactions, tasks],
  );
  const pendingTasks = useMemo(
    () =>
      tasks
        .filter(isOpenTask)
        .sort((a, b) => b.urgency_score - a.urgency_score)
        .slice(0, 3),
    [tasks],
  );

  const today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex flex-col gap-6">
      <motion.div variants={fadeUp}>
        <h1 className="text-[28px] font-bold tracking-wide text-textPrimary">
          Bienvenido
        </h1>
        <p className="mt-1 text-[14px] capitalize text-textSecondary">{today}</p>
      </motion.div>

      <motion.div variants={fadeUp}>
        <GlassCard compact className="flex items-center gap-3 border-accent/30 bg-accent/[0.05]">
          <Sparkles size={16} strokeWidth={2} className="shrink-0 text-accent" />
          <p className="flex-1 text-[13px] leading-5 text-textPrimary">
            Hoy tienes <span className="font-bold">{brief.urgentCount} tarea{brief.urgentCount === 1 ? '' : 's'} urgente{brief.urgentCount === 1 ? '' : 's'}</span>
            {brief.dueTodayCount > 0 ? ` (${brief.dueTodayCount} vencen hoy)` : ''} y tu presupuesto
            diario sugerido es de <span className="font-bold tabular-nums">{formatCurrency(brief.dailyBudget)}</span>.
          </p>
        </GlassCard>
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

      <motion.div variants={fadeUp} className="flex items-stretch gap-3">
        <Link href="/finanzas" className="flex flex-1">
          <GlassButton title="Ver finanzas" variant="secondary" icon={Wallet} className="flex-1" />
        </Link>
        <Link href="/tareas" className="flex flex-1">
          <GlassButton title="Ver tareas" variant="secondary" icon={ListChecks} className="flex-1" />
        </Link>
        <Link href="/tareas/nueva" className="flex flex-1">
          <GlassButton title="Tarea" variant="secondary" icon={Plus} className="flex-1" />
        </Link>
      </motion.div>

      <motion.div variants={fadeUp}>
        <GlassCard compact className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-textSecondary">Últimos 7 días</span>
            <span className="text-[14px] font-semibold tabular-nums text-textPrimary">
              {formatCurrency(week.income)} · <span className="text-danger">{formatCurrency(week.expense)}</span>
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[11px] text-textSecondary">Tareas hechas</span>
            <span className="text-[14px] font-semibold tabular-nums text-success">{weekDone}</span>
          </div>
        </GlassCard>
      </motion.div>

      <motion.div variants={fadeUp}>
        <h2 className="mb-4 mt-1 text-[18px] font-semibold text-textPrimary">Urgentes</h2>
        {pendingTasks.length === 0 ? (
          <GlassCard compact>
            <p className="text-[14px] text-textSecondary">
              No tienes tareas pendientes. Perfecto.
            </p>
          </GlassCard>
        ) : (
          <div className="flex flex-col gap-4">
            {pendingTasks.map((task) => (
              <Link key={task.id} href={`/tareas/${task.id}`}>
                <GlassCard compact className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-1 items-center gap-2">
                      <span className="truncate text-[15px] font-semibold text-textPrimary">
                        {task.title}
                      </span>
                    </div>
                    <span className="text-[16px] font-bold text-accent">
                      {task.urgency_score}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    {task.due_date ? (
                      <div className="flex items-center gap-1">
                        <CalendarClock size={13} strokeWidth={2} className="text-textSecondary" />
                        <span className="text-[12px] text-textSecondary">
                          {formatDueLabel(task.due_date)}
                        </span>
                      </div>
                    ) : null}
                    {task.subject ? (
                      <span className="text-[12px] font-medium text-info">{task.subject}</span>
                    ) : null}
                  </div>
                  <ProgressBar value={task.urgency_score} />
                </GlassCard>
              </Link>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
