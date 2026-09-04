'use client';

import { motion } from 'framer-motion';
import type { DailyCompletion } from '@/lib/tasks';

export default function WeeklyProgressChart({ days }: { days: DailyCompletion[] }) {
  const max = Math.max(1, ...days.map((d) => d.completed));
  const total = days.reduce((sum, d) => sum + d.completed, 0);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-2" style={{ height: 120 }}>
        {days.map((d, i) => (
          <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[11px] font-semibold text-accent">
              {d.completed > 0 ? d.completed : ''}
            </span>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(4, (d.completed / max) * 100)}%` }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className={`h-[80px] w-full rounded-t-lg ${d.completed > 0 ? 'bg-accent/80' : 'bg-white/10'}`}
            />
            <span className="text-[10px] capitalize text-textTertiary">{d.label}</span>
          </div>
        ))}
      </div>
      <p className="text-center text-[12px] text-textSecondary">
        {total} tarea{total === 1 ? '' : 's'} completada{total === 1 ? '' : 's'} en 7 días
      </p>
    </div>
  );
}
