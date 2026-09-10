'use client';

import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/format';

export interface ChartSlice {
  label: string;
  value: number;
  color: string;
}

export default function SpendingChart({ slices, total }: {
  slices: ChartSlice[];
  total: number;
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const rendered = slices.filter((s) => s.value > 0);
  const shown = rendered.length > 0 ? rendered : [{ label: 'Sin gastos', value: 1, color: '#2a2a3a' }];
  const sum = shown.reduce((acc, s) => acc + s.value, 0);
  let offset = 0;

  return (
    <div className="flex w-full max-w-full flex-wrap items-center gap-6 overflow-hidden">
      <div className="relative h-40 w-40 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
          {shown.map((slice, index) => {
            const frac = slice.value / sum;
            const dash = (frac * circumference).toFixed(2);
            const start = offset;
            offset += frac * circumference;
            return (
              <motion.circle
                key={slice.label + index}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circumference}`}
                strokeDashoffset={-start}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.08, duration: 0.5 }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[22px] font-bold tracking-wide text-textPrimary">
            {formatCurrency(total)}
          </span>
          <span className="text-[11px] text-textSecondary">este mes</span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-hidden">
        {rendered.slice(0, 6).map((slice) => (
          <div key={slice.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
            <span className="flex-1 truncate text-[12px] text-textPrimary">{slice.label}</span>
            <span className="text-[11px] tabular-nums text-textTertiary">
              {sum > 0 ? `${Math.round((slice.value / sum) * 100)}%` : '—'}
            </span>
            <span className="text-[12px] font-semibold tabular-nums text-textSecondary">
              {formatCurrency(slice.value)}
            </span>
          </div>
        ))}
        {rendered.length === 0 ? (
          <p className="text-[12px] text-textSecondary">Aún no hay gastos este mes</p>
        ) : null}
      </div>
    </div>
  );
}
