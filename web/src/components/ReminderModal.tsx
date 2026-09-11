'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { GlassButton } from './GlassButton';
import {
  ALL_DAYS,
  DAY_NAMES,
  type ReminderInput,
  type ScheduledReminder,
} from '@/stores/useReminderStore';

const inputClass =
  'w-full rounded-2xl border border-white/15 bg-white/[0.07] px-4 py-3 text-[15px] text-textPrimary placeholder:text-textTertiary outline-none focus:border-accent transition-all focus:ring-2 focus:ring-accent/25';

const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

const WHEEL_ITEM_H = 40;
const WHEEL_VISIBLE = 5;
const WHEEL_H = WHEEL_ITEM_H * WHEEL_VISIBLE;
const WHEEL_PAD = (WHEEL_H - WHEEL_ITEM_H) / 2;

function WheelColumn({
  values,
  value,
  onChange,
  label,
}: {
  values: string[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const index = Math.max(0, values.indexOf(value));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = index * WHEEL_ITEM_H;
    if (Math.abs(el.scrollTop - target) > 1) {
      el.scrollTo({ top: target, behavior: 'smooth' });
    }
  }, [index]);

  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    const i = Math.round(el.scrollTop / WHEEL_ITEM_H);
    const next = values[Math.min(values.length - 1, Math.max(0, i))];
    if (next && next !== value) onChange(next);
  };

  return (
    <div className="relative flex-1">
      <div
        ref={ref}
        onScroll={handleScroll}
        role="listbox"
        aria-label={label}
        style={{ height: WHEEL_H }}
        className="snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div style={{ height: WHEEL_PAD }} />
        {values.map((v) => (
          <div
            key={v}
            role="option"
            aria-selected={v === value}
            style={{ height: WHEEL_ITEM_H }}
            className={`flex snap-center items-center justify-center text-[18px] tabular-nums transition-colors ${
              v === value ? 'font-bold text-textPrimary' : 'text-textTertiary'
            }`}
          >
            {v}
          </div>
        ))}
        <div style={{ height: WHEEL_PAD }} />
      </div>
      <div
        aria-hidden
        style={{ height: WHEEL_ITEM_H }}
        className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-white/10"
      />
    </div>
  );
}

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS: Record<number, string> = {
  0: 'D',
  1: 'L',
  2: 'M',
  3: 'Mi',
  4: 'J',
  5: 'V',
  6: 'S',
};

function to24h(hour12: string, minute: string, ampm: 'AM' | 'PM'): string {
  const h = Number(hour12) % 12;
  const h24 = ampm === 'AM' ? h : h + 12;
  return `${String(h24).padStart(2, '0')}:${minute}`;
}

export default function ReminderModal({
  open,
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  initial: ScheduledReminder | null;
  onClose: () => void;
  onSave: (input: ReminderInput) => string | null;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [times, setTimes] = useState<string[]>([]);
  const [selHour, setSelHour] = useState('8');
  const [selMinute, setSelMinute] = useState('00');
  const [selAmpm, setSelAmpm] = useState<'AM' | 'PM'>('AM');
  const [days, setDays] = useState<number[]>([...ALL_DAYS]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? '');
      setTimes(initial ? [...initial.times] : []);
      setSelHour('8');
      setSelMinute('00');
      setSelAmpm('AM');
      setDays(initial ? [...initial.days] : [...ALL_DAYS]);
      setFormError(null);
      const prevOverflow = document.body.style.overflow;
      const prevPaddingRight = document.body.style.paddingRight;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
      return () => {
        document.body.style.overflow = prevOverflow;
        document.body.style.paddingRight = prevPaddingRight;
      };
    }
  }, [open, initial]);

  if (!open) return null;

  const toggleDay = (day: number) => {
    setDays((prev) => {
      const next = prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day];
      return next.sort((a, b) => a - b);
    });
  };

  const addTime = () => {
    const normalized = to24h(selHour, selMinute, selAmpm);
    if (!times.includes(normalized)) {
      setTimes((prev) => [...prev, normalized].sort());
    }
    setFormError(null);
  };

  const handleSave = () => {
    if (!title.trim()) {
      setFormError('Ponle un nombre al recordatorio.');
      return;
    }
    if (times.length === 0) {
      setFormError('Agrega al menos una hora.');
      return;
    }
    if (days.length === 0) {
      setFormError('Elige al menos un día.');
      return;
    }
    const error = onSave({ title: title.trim(), times, days, sound: 'default' });
    if (error) setFormError(error);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-strong flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-hidden rounded-3xl p-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-textPrimary">
            {initial ? 'Editar recordatorio' : 'Nuevo recordatorio'}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white/5 text-textSecondary hover:bg-white/10"
            aria-label="Cerrar"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[13px] text-textSecondary">Título</label>
          <input
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Revisar tareas de la escuela"
            maxLength={120}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[13px] text-textSecondary">Horas</label>
          {times.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {times.map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[13px] font-semibold tabular-nums text-accent"
                >
                  {t}
                  <button
                    onClick={() => setTimes((prev) => prev.filter((x) => x !== t))}
                    className="text-accent/70 hover:text-danger"
                    aria-label={`Quitar hora ${t}`}
                  >
                    <X size={13} strokeWidth={2} />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <div className="flex items-stretch gap-2">
            <WheelColumn values={HOURS_12} value={selHour} onChange={setSelHour} label="Hora" />
            <WheelColumn values={MINUTES} value={selMinute} onChange={setSelMinute} label="Minutos" />
            <WheelColumn
              values={['AM', 'PM']}
              value={selAmpm}
              onChange={(v) => setSelAmpm(v as 'AM' | 'PM')}
              label="Período"
            />
            <GlassButton
              title=""
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={addTime}
              className="h-10 w-10 shrink-0 self-center !rounded-full !p-0"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[13px] text-textSecondary">Días de la semana</label>
          <div className="flex gap-1.5">
            {DAY_ORDER.map((d) => (
              <button
                key={d}
                onClick={() => toggleDay(d)}
                title={DAY_NAMES[d]}
                className={`flex h-10 flex-1 items-center justify-center rounded-full border text-[13px] font-bold transition-colors ${
                  days.includes(d)
                    ? 'border-accent bg-accent/20 text-accent'
                    : 'border-border bg-white/5 text-textTertiary hover:bg-white/10'
                }`}
              >
                {DAY_LABELS[d]}
              </button>
            ))}
          </div>
        </div>

        {formError ? <p className="text-[13px] text-danger">{formError}</p> : null}

        <div className="flex gap-2">
          <GlassButton title={initial ? 'Guardar' : 'Crear'} onClick={handleSave} className="flex-1" />
          {initial ? (
            <GlassButton
              title="Eliminar"
              variant="danger"
              onClick={() => onDelete(initial.id)}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
