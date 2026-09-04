'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Sparkles, X } from 'lucide-react';
import { GlassButton } from '@/components/GlassButton';
import GlassCard from '@/components/GlassCard';
import { useTaskStore } from '@/stores/useTaskStore';
import { breakdownTask, type SubtaskSuggestion } from '@/lib/openai';
import type { TaskPriority, TaskRecurrence } from '@/lib/types';

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

const RECURRENCE_OPTIONS: { value: TaskRecurrence; label: string }[] = [
  { value: 'none', label: 'No repetir' },
  { value: 'daily', label: 'Diaria' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
];

const inputClass =
  'w-full rounded-2xl border border-white/15 bg-white/[0.07] px-4 py-3 text-[15px] text-textPrimary placeholder:text-textTertiary outline-none focus:border-accent transition-all focus:ring-2 focus:ring-accent/25';

const inputErrorClass =
  'w-full rounded-2xl border border-danger bg-danger/[0.08] px-4 py-3 text-[15px] text-textPrimary placeholder:text-textTertiary outline-none focus:border-danger transition-all focus:ring-2 focus:ring-danger/25';

function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-[12px] text-danger">{message}</p>;
}

export default function NuevaTareaPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('none');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [estimatedError, setEstimatedError] = useState<string | null>(null);
  const [breakingDown, setBreakingDown] = useState(false);
  const [suggestions, setSuggestions] = useState<SubtaskSuggestion[]>([]);

  const handleBreakdown = async () => {
    if (!title.trim()) {
      setTitleError('Escribe un título para poder desglosar la tarea.');
      return;
    }
    setTitleError(null);
    setBreakingDown(true);
    setError(null);
    try {
      const result = await breakdownTask(title.trim(), description.trim() || undefined);
      setSuggestions(result);
    } catch {
      setError('No se pudo desglosar la tarea con IA.');
    } finally {
      setBreakingDown(false);
    }
  };

  const handleSubmit = async () => {
    let hasError = false;
    if (!title.trim()) {
      setTitleError('Escribe un título para la tarea.');
      hasError = true;
    } else {
      setTitleError(null);
    }
    if (estimatedMinutes.trim()) {
      const minutes = Number(estimatedMinutes);
      if (!Number.isFinite(minutes) || minutes < 1) {
        setEstimatedError('El tiempo estimado debe ser mayor a 0.');
        hasError = true;
      } else {
        setEstimatedError(null);
      }
    } else {
      setEstimatedError(null);
    }
    if (hasError) {
      setError(null);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const task = await useTaskStore.getState().createTask({
        title: title.trim(),
        description: description.trim() || null,
        subject: subject.trim() || null,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        estimated_minutes: estimatedMinutes ? Number(estimatedMinutes) : null,
        estimated_cost: estimatedCost ? Number(estimatedCost) : null,
        recurrence,
        reminder_enabled: reminderEnabled,
        reminder_at: reminderEnabled && dueDate ? new Date(dueDate).toISOString() : null,
      });
      if (suggestions.length > 0) {
        await useTaskStore.getState().addAiSubtasks(
          task.id,
          suggestions.map((s) => ({ title: s.title, is_ai_generated: true })),
        );
      }
      router.push('/tareas');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la tarea.');
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold tracking-wide text-textPrimary">Nueva tarea</h1>
        <button
          onClick={() => router.push('/tareas')}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-textSecondary hover:bg-surface-strong"
          aria-label="Cancelar"
        >
          <X size={18} strokeWidth={2} />
        </button>
      </div>

      <GlassCard className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-[13px] text-textSecondary">Título *</label>
          <input
            className={titleError ? inputErrorClass : inputClass}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError) setTitleError(null);
            }}
            placeholder="Ej. Terminar reporte de química"
          />
          <FieldError message={titleError} />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[13px] text-textSecondary">Descripción</label>
          <textarea
            className={`${inputClass} min-h-[90px] resize-none`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalles de la tarea"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[13px] text-textSecondary">Materia</label>
          <input
            className={inputClass}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ej. Química"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[13px] text-textSecondary">Prioridad</label>
          <div className="flex flex-wrap gap-2">
            {PRIORITY_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setPriority(value)}
                className={`rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  priority === value
                    ? 'border-accent bg-accent/20 text-accent'
                    : 'border-border bg-surface text-textSecondary hover:bg-surface-strong'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[13px] text-textSecondary">Fecha de entrega</label>
          <input
            type="date"
            className={inputClass}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[13px] text-textSecondary">Tiempo estimado (minutos)</label>
          <input
            type="number"
            min={1}
            className={estimatedError ? inputErrorClass : inputClass}
            value={estimatedMinutes}
            onChange={(e) => {
              setEstimatedMinutes(e.target.value);
              if (estimatedError) setEstimatedError(null);
            }}
            placeholder="Ej. 45"
          />
          <FieldError message={estimatedError} />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[13px] text-textSecondary">Costo estimado (opcional, $)</label>
          <input
            type="number"
            min={0}
            className={inputClass}
            value={estimatedCost}
            onChange={(e) => setEstimatedCost(e.target.value)}
            placeholder="Ej. 150"
          />
          <p className="-mt-1 text-[11px] text-textTertiary">
            Si la tarea requiere comprar materiales, al completarla te sugeriremos registrar el gasto.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[13px] text-textSecondary">Repetir</label>
          <div className="flex flex-wrap gap-2">
            {RECURRENCE_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setRecurrence(value)}
                className={`rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  recurrence === value
                    ? 'border-accent bg-accent/20 text-accent'
                    : 'border-border bg-surface text-textSecondary hover:bg-surface-strong'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-3 text-[14px] text-textPrimary">
          <input
            type="checkbox"
            checked={reminderEnabled}
            onChange={(e) => setReminderEnabled(e.target.checked)}
            className="h-4 w-4 accent-[#8b7cf7]"
          />
          Recordarme cuando se acerque
        </label>

        {error ? <p className="text-[13px] text-danger">{error}</p> : null}

        {suggestions.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-2xl border border-accent/30 bg-accent/[0.06] p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-accent">
                <Sparkles size={13} strokeWidth={2} />
                Desglose generado por IA
              </span>
              <button
                onClick={() => setSuggestions([])}
                className="text-[12px] text-textSecondary hover:text-danger"
              >
                Quitar
              </button>
            </div>
            <ul className="flex flex-col gap-1.5">
              {suggestions.map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-[13px] text-textPrimary">
                  <span className="flex-1">{s.title}</span>
                  {s.estimatedMinutes > 0 ? (
                    <span className="text-[11px] text-textTertiary">{s.estimatedMinutes} min</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <GlassButton
          title={breakingDown ? 'Desglosando...' : 'Desglosar con IA'}
          variant="secondary"
          icon={Sparkles}
          loading={breakingDown}
          onClick={() => void handleBreakdown()}
        />

        <GlassButton
          title="Guardar tarea"
          icon={Check}
          loading={saving}
          onClick={() => void handleSubmit()}
        />
      </GlassCard>
    </div>
  );
}
