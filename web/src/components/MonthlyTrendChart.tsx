'use client';

import { motion } from 'framer-motion';
import type { MonthPoint } from '@/lib/finance';
import { formatCurrency } from '@/lib/format';

export default function MonthlyTrendChart({ points }: { points: MonthPoint[] }) {
  const max = Math.max(1, ...points.flatMap((p) => [p.income, p.expense]));
  if (points.length === 0) {
    return <p className="text-[13px] text-textSecondary">Aún no hay datos suficientes.</p>;
  }
  return (
    <div className="flex w-full max-w-full flex-col gap-3 overflow-hidden">
      <div className="flex w-full max-w-full items-end justify-between gap-1 overflow-hidden" style={{ height: 140 }}>
        {points.map((p, i) => (
          <div key={p.key} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-[110px] w-full items-end justify-center gap-1">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(3, (p.income / max) * 100)}%` }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className="w-3 rounded-t-md bg-success/80"
                title={`Ingresos: ${formatCurrency(p.income)}`}
              />
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(3, (p.expense / max) * 100)}%` }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className="w-3 rounded-t-md bg-danger/80"
                title={`Gastos: ${formatCurrency(p.expense)}`}
              />
            </div>
            <span className="text-[10px] capitalize text-textTertiary">{p.label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-4 text-[11px] text-textSecondary">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-success/80" /> Ingresos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-danger/80" /> Gastos
        </span>
      </div>
    </div>
  );
}
