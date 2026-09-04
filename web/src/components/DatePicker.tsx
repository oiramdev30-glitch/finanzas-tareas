'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function parseIso(value: string): { y: number; m: number; d: number } | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

function toIso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function formatLong(iso: string): string {
  const parsed = parseIso(iso);
  if (!parsed) return 'Elegir fecha';
  return new Date(parsed.y, parsed.m - 1, parsed.d).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function DatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const now = new Date();
    const parsed = parseIso(value);
    return { y: parsed?.y ?? now.getFullYear(), m: parsed?.m ?? now.getMonth() + 1 };
  });

  useEffect(() => {
    const parsed = parseIso(value);
    if (parsed) {
      setView((prev) => (prev.y === parsed.y && prev.m === parsed.m ? prev : { y: parsed.y, m: parsed.m }));
    }
  }, [value]);

  const today = new Date();
  const todayIso = toIso(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const first = new Date(view.y, view.m - 1, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(view.y, view.m, 0).getDate();
  const daysInPrevMonth = new Date(view.y, view.m - 1, 0).getDate();
  const cells: { iso: string; day: number; outside: boolean }[] = [];
  for (let i = 0; i < 42; i += 1) {
    const dayNum = i - startOffset + 1;
    if (dayNum < 1) {
      const d = daysInPrevMonth + dayNum;
      const pm = view.m === 1 ? 12 : view.m - 1;
      const py = view.m === 1 ? view.y - 1 : view.y;
      cells.push({ iso: toIso(py, pm, d), day: d, outside: true });
    } else if (dayNum > daysInMonth) {
      const d = dayNum - daysInMonth;
      const nm = view.m === 12 ? 1 : view.m + 1;
      const ny = view.m === 12 ? view.y + 1 : view.y;
      cells.push({ iso: toIso(ny, nm, d), day: d, outside: true });
    } else {
      cells.push({ iso: toIso(view.y, view.m, dayNum), day: dayNum, outside: false });
    }
  }

  const monthLabel = new Date(view.y, view.m - 1, 1).toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  });

  const shift = (delta: number) => {
    setView((prev) => {
      const d = new Date(prev.y, prev.m - 1 + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() + 1 };
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.07] px-4 py-3 text-left text-[15px] text-textPrimary outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/25"
      >
        <CalendarDays size={16} strokeWidth={2} className="shrink-0 text-accent" />
        <span className={value ? 'capitalize' : 'text-textTertiary'}>{formatLong(value)}</span>
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full z-[61] mt-1 rounded-2xl border border-white/10 bg-zinc-900 p-3 shadow-xl sm:left-auto sm:w-72">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => shift(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-textSecondary hover:bg-white/10 hover:text-textPrimary"
                aria-label="Mes anterior"
              >
                <ChevronLeft size={16} strokeWidth={2} />
              </button>
              <span className="text-[14px] font-semibold capitalize text-textPrimary">{monthLabel}</span>
              <button
                type="button"
                onClick={() => shift(1)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-textSecondary hover:bg-white/10 hover:text-textPrimary"
                aria-label="Mes siguiente"
              >
                <ChevronRight size={16} strokeWidth={2} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((w, i) => (
                <span
                  key={i}
                  className="flex h-8 items-center justify-center text-[11px] font-bold text-textTertiary"
                >
                  {w}
                </span>
              ))}
              {cells.map((cell) => {
                const selected = cell.iso === value;
                const isToday = cell.iso === todayIso;
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => {
                      onChange(cell.iso);
                      setOpen(false);
                    }}
                    className={`flex h-9 items-center justify-center rounded-xl text-[13px] tabular-nums transition-colors ${
                      selected
                        ? 'bg-accent/25 font-bold text-accent'
                        : cell.outside
                          ? 'text-textTertiary/50 hover:bg-white/5 hover:text-textSecondary'
                          : 'text-textPrimary hover:bg-purple-600/20 hover:text-purple-300'
                    } ${!selected && isToday ? 'ring-1 ring-accent/60' : ''}`}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                onChange(todayIso);
                setView({ y: today.getFullYear(), m: today.getMonth() + 1 });
                setOpen(false);
              }}
              className="mt-2 w-full rounded-xl border border-accent/40 bg-accent/10 py-2 text-[13px] font-semibold text-accent hover:bg-accent/20"
            >
              Hoy
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
