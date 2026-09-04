'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Archive, CalendarClock, Check, ChevronLeft, GraduationCap, Pencil, Plus, Repeat, Sparkles, Timer, Trash2, Wallet } from 'lucide-react';
import GlassCard from '@/components/GlassCard';
import { GlassButton } from '@/components/GlassButton';
import ProgressBar from '@/components/ProgressBar';
import FocusTimer from '@/components/FocusTimer';
import { useTaskStore } from '@/stores/useTaskStore';
import { breakdownTask } from '@/lib/openai';
import { formatCurrency, formatDueLabel, formatMinutes } from '@/lib/format';
import { staggerContainer, fadeUp } from '@/lib/motion';
import type { TaskPriority, TaskRecurrence } from '@/lib/types';

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

const RECURRENCE_LABEL: Record<TaskRecurrence, string> = {
  none: 'No repetir',
  daily: 'Diaria',
  weekly: 'Semanal',
  monthly: 'Mensual',
};

const inputClass =
  'w-full rounded-2xl border border-white/15 bg-white/[0.07] px-4 py-3 text-[15px] text-textPrimary placeholder:text-textTertiary outline-none focus:border-accent transition-all focus:ring-2 focus:ring-accent/25';

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const task = useTaskStore((state) => state.tasks.find((t) => t.id === id));
  const subtasks = useTaskStore((state) => state.subtasks.filter((s) => s.task_id === id));
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('none');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [breakingDown, setBreakingDown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusOpen, setFocusOpen] = useState(false);

  const progress = useMemo(() => {
    const total = subtasks.length;
    const done = subtasks.filter((s) => s.is_completed).length;
    return { total, done };
  }, [subtasks]);

  if (!task) {
    return (
      <div className="flex flex-col gap-6">
        <GlassCard compact>
          <p className="text-[14px] text-textSecondary">La tarea no existe o no la encuentras aquí.</p>
        </GlassCard>
        <GlassButton title="Volver a Tareas" variant="secondary" onClick={() => router.push('/tareas')} />
      </div>
    );
  }

  const openEdit = () => {
    setTitle(task.title);
    setDescription(task.description ?? '');
    setSubject(task.subject ?? '');
    setPriority(task.priority);
    setDueDate(task.due_date ? task.due_date.slice(0, 10) : '');
    setEstimatedMinutes(task.estimated_minutes ? String(task.estimated_minutes) : '');
    setEstimatedCost(task.estimated_cost ? String(task.estimated_cost) : '');
    setRecurrence(task.recurrence ?? 'none');
    setReminderEnabled(task.reminder_enabled ?? false);
    setEditing(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Escribe un título para la tarea.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await useTaskStore.getState().updateTask(task.id, {
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
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la tarea.');
      setSaving(false);
    }
  };

  const handleBreakdown = async () => {
    setBreakingDown(true);
    setError(null);
    try {
      const suggestions = await breakdownTask(task.title, task.description ?? undefined);
      if (suggestions.length === 0) {
        setError('La IA no pudo desglosar la tarea. Intenta de nuevo.');
        return;
      }
      await useTaskStore.getState().addAiSubtasks(
        task.id,
        suggestions.map((s) => ({ title: s.title, is_ai_generated: true })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo desglosar la tarea.');
    } finally {
      setBreakingDown(false);
    }
  };

  const handleArchive = async () => {
    await useTaskStore.getState().updateTask(task.id, { status: 'archived' });
    router.push('/tareas');
  };

  const handleDelete = async () => {
    await useTaskStore.getState().deleteTask(task.id);
    router.push('/tareas');
  };

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/tareas')}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white/5 text-textSecondary hover:bg-white/10"
          aria-label="Volver"
        >
          <ChevronLeft size={18} strokeWidth={2} />
        </button>
        <div className="flex gap-2">
          {task.status !== 'done' ? (
            <GlassButton title="Enfocar" variant="secondary" size="sm" icon={Timer} onClick={() => setFocusOpen(true)} />
          ) : null}
          {!editing ? (
            <GlassButton title="Editar" variant="secondary" size="sm" icon={Pencil} onClick={openEdit} />
          ) : null}
          <button
            onClick={() => void handleDelete()}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20"
            aria-label="Eliminar tarea"
          >
            <Trash2 size={15} strokeWidth={2} />
          </button>
          <button
            onClick={() => void handleArchive()}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white/5 text-textSecondary hover:bg-white/10"
            aria-label="Archivar tarea"
          >
            <Archive size={15} strokeWidth={2} />
          </button>
        </div>
      </div>

      {!editing ? (
        <motion.div variants={fadeUp}>
          <GlassCard glow className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-1 flex-wrap items-center gap-2">
                {task.source === 'classroom' ? (
                  <GraduationCap size={16} strokeWidth={2} className="text-info" />
                ) : null}
                <h1 className="text-[24px] font-bold leading-tight tracking-wide text-textPrimary">
                  {task.title}
                </h1>
              </div>
              {task.status === 'done' ? (
                <span className="rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-success">
                  Hecha
                </span>
              ) : (
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    task.priority === 'urgent'
                      ? 'bg-danger/15 text-danger'
                      : task.priority === 'high'
                        ? 'bg-warning/15 text-warning'
                        : 'bg-white/10 text-textSecondary'
                  }`}
                >
                  {PRIORITY_LABEL[task.priority]}
                </span>
              )}
            </div>

            {task.description ? (
              <p className="whitespace-pre-wrap text-[14px] leading-6 text-textSecondary">{task.description}</p>
            ) : null}

            <div className="flex flex-wrap items-center gap-4 text-[13px] text-textSecondary">
              {task.due_date ? (
                <div className="flex items-center gap-1.5">
                  <CalendarClock size={14} strokeWidth={2} />
                  {formatDueLabel(task.due_date)}
                </div>
              ) : null}
              {task.subject ? <span className="text-[13px] font-medium text-info">{task.subject}</span> : null}
              {task.estimated_minutes ? <span>{formatMinutes(task.estimated_minutes)}</span> : null}
              {task.estimated_cost ? (
                <span className="font-semibold tabular-nums text-warning">
                  Costo est. {formatCurrency(task.estimated_cost)}
                </span>
              ) : null}
              {task.recurrence && task.recurrence !== 'none' ? (
                <span className="flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                  <Repeat size={11} strokeWidth={2} />
                  {RECURRENCE_LABEL[task.recurrence]}
                </span>
              ) : null}
            </div>
          </GlassCard>
        </motion.div>
      ) : (
        <motion.div variants={fadeUp}>
          <GlassCard className="flex flex-col gap-4">
            <h2 className="text-[18px] font-semibold text-textPrimary">Editar tarea</h2>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] text-textSecondary">Título *</label>
              <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] text-textSecondary">Descripción</label>
              <textarea className={`${inputClass} min-h-[80px] resize-none`} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] text-textSecondary">Materia</label>
              <input className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] text-textSecondary">Prioridad</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(PRIORITY_LABEL) as TaskPriority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                      priority === p
                        ? 'border-accent bg-accent/20 text-accent'
                        : 'border-border bg-white/5 text-textSecondary hover:bg-white/10'
                    }`}
                  >
                    {PRIORITY_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] text-textSecondary">Fecha de entrega</label>
              <input type="date" className={inputClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] text-textSecondary">Tiempo estimado (minutos)</label>
              <input type="number" min={1} className={inputClass} value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] text-textSecondary">Costo estimado (opcional, $)</label>
              <input type="number" min={0} className={inputClass} value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} placeholder="Ej. 150" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] text-textSecondary">Repetir</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(RECURRENCE_LABEL) as TaskRecurrence[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRecurrence(r)}
                    className={`rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                      recurrence === r
                        ? 'border-accent bg-accent/20 text-accent'
                        : 'border-border bg-white/5 text-textSecondary hover:bg-white/10'
                    }`}
                  >
                    {RECURRENCE_LABEL[r]}
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
            <div className="flex gap-2">
              <GlassButton title="Guardar" icon={Check} loading={saving} onClick={() => void handleSave()} className="flex-1" />
              <GlassButton title="Cancelar" variant="secondary" onClick={() => setEditing(false)} />
            </div>
          </GlassCard>
        </motion.div>
      )}

      {task.estimated_cost && task.estimated_cost > 0 && task.status !== 'done' ? (
        <motion.div variants={fadeUp}>
          <GlassCard compact className="flex flex-col gap-3 border-warning/40 bg-warning/[0.06]">
            <p className="text-[13px] leading-5 text-textPrimary">
              Esta tarea tiene un costo estimado de{' '}
              <span className="font-bold tabular-nums">{formatCurrency(task.estimated_cost)}</span>.
              Al completarla puedes registrar el gasto en Finanzas.
            </p>
            <GlassButton
              title="Registrar gasto en Finanzas"
              variant="secondary"
              size="sm"
              icon={Wallet}
              onClick={() =>
                router.push(
                  `/finanzas?expenseAmount=${task.estimated_cost}&expenseDesc=${encodeURIComponent(task.title)}`,
                )
              }
            />
          </GlassCard>
        </motion.div>
      ) : null}

      <motion.div variants={fadeUp}>
        <GlassCard className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-semibold text-textPrimary">Pasos</h2>            <span className="text-[13px] text-textSecondary">
              {progress.done}/{progress.total}
            </span>
          </div>
          {subtasks.length > 0 ? (
            <ProgressBar
              value={progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0}
              color={progress.done === progress.total && progress.total > 0 ? '#4ade80' : '#8b7cf7'}
            />
          ) : null}

          {subtasks.length === 0 ? (
            <p className="py-2 text-[13px] text-textSecondary">
              Aún no hay pasos. Desglosa la tarea con IA o crea pasos manualmente.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {subtasks.map((subtask) => (
                <motion.button
                  key={subtask.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => void useTaskStore.getState().toggleSubtask(subtask)}
                  className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                    subtask.is_completed
                      ? 'border-success/20 bg-success/5'
                      : 'border-border bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      subtask.is_completed
                        ? 'border-success bg-success text-black'
                        : 'border-border-strong bg-white/5 text-transparent'
                    }`}
                  >
                    <Check size={13} strokeWidth={3} />
                  </span>
                  <span
                    className={`flex-1 text-[14px] ${
                      subtask.is_completed ? 'text-textSecondary line-through' : 'text-textPrimary'
                    }`}
                  >
                    {subtask.title}
                  </span>
                  {subtask.is_ai_generated ? (
                    <Sparkles size={13} strokeWidth={2} className="text-accent" />
                  ) : null}
                </motion.button>
              ))}
            </div>
          )}

          <div className="mt-1 flex flex-wrap gap-2">
            <GlassButton
              title={breakingDown ? 'Desglosando...' : 'Desglosar con IA'}
              variant="secondary"
              icon={Sparkles}
              loading={breakingDown}
              onClick={() => void handleBreakdown()}
            />
            <AddSubtaskButton taskId={task.id} />
          </div>
        </GlassCard>
      </motion.div>

      <FocusTimer
        open={focusOpen}
        onClose={() => setFocusOpen(false)}
        taskTitle={task.title}
        onLogMinutes={(minutes) => {
          const current = task.estimated_minutes ?? 0;
          void useTaskStore
            .getState()
            .updateTask(task.id, { estimated_minutes: current + minutes })
            .catch(() => undefined);
        }}
      />
    </motion.div>
  );
}

function AddSubtaskButton({ taskId }: { taskId: string }) {
  const [title, setTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!title.trim()) return;
    setAdding(true);
    try {
      await useTaskStore.getState().addAiSubtasks(taskId, [
        { title: title.trim(), is_ai_generated: false },
      ]);
      setTitle('');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-1 items-center gap-2">
      <input
        className={inputClass}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Agregar un paso..."
        onKeyDown={(e) => {
          if (e.key === 'Enter') void handleAdd();
        }}
      />
      <GlassButton title="" size="sm" icon={Plus} loading={adding} onClick={() => void handleAdd()} />
    </div>
  );
}
