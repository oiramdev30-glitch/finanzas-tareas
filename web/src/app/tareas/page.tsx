'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  CircleCheck,
  GripVertical,
  Plus,
  Search,
  Timer,
} from 'lucide-react';
import { GlassButton } from '@/components/GlassButton';
import GlassCard from '@/components/GlassCard';
import ProgressBar from '@/components/ProgressBar';
import WeeklyProgressChart from '@/components/WeeklyProgressChart';
import FocusTimer from '@/components/FocusTimer';
import { useTaskStore } from '@/stores/useTaskStore';
import { formatDueLabel, formatMinutes, dueStatus } from '@/lib/format';
import {
  countByStatus,
  countTasksDoneToday,
  filterTasks,
  getCompletedTasks,
  getPendingTasks,
  getTaskSubjects,
  getUpcomingTasks,
  getWeeklyCompletion,
  groupTasksBySubject,
} from '@/lib/tasks';
import { staggerContainer, fadeUp } from '@/lib/motion';
import { AnimatePresence, motion } from 'framer-motion';
import type { Task, TaskPriority } from '@/lib/types';

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: 'rgba(242, 243, 247, 0.38)',
  medium: '#60a5fa',
  high: '#fbbf24',
  urgent: '#f87171',
};

function subjectColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360;
  }
  return `hsl(${hash}, 70%, 62%)`;
}

interface TaskProgress {
  total: number;
  done: number;
}

function TaskRow({
  task,
  progress,
  onComplete,
  onOpen,
  onFocus,
  done,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  draggable,
}: {
  task: Task;
  progress: TaskProgress;
  onComplete?: () => void;
  onOpen?: () => void;
  onFocus?: () => void;
  done: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  draggable?: boolean;
}) {
  const priorityColor = PRIORITY_COLOR[task.priority] ?? PRIORITY_COLOR.medium;
  const toggle = done ? null : onComplete;
  const status = dueStatus(task.due_date);
  const urgent =
    !done && (status === 'overdue' || status === 'today' || task.priority === 'urgent');
  return (
    <div
      className={`flex gap-3 ${urgent ? 'rounded-2xl ring-1 ring-danger/40' : ''}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {toggle ? (
        <button
          onClick={toggle}
          className="flex w-7 shrink-0 items-center justify-center"
          aria-label={`Completar ${task.title}`}
        >
          <Circle size={22} strokeWidth={2} className="text-textSecondary" />
        </button>
      ) : (
        <div className="flex w-7 shrink-0 items-center justify-center">
          <CircleCheck size={22} strokeWidth={2} className="text-success" />
        </div>
      )}
      {!done && onFocus ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFocus();
          }}
          className="flex w-7 shrink-0 items-center justify-center text-textTertiary hover:text-accent"
          aria-label={`Enfocarse en ${task.title}`}
          title="Modo enfoque"
        >
          <Timer size={18} strokeWidth={2} />
        </button>
      ) : null}
      <button onClick={onOpen} className="flex flex-1 flex-col gap-2 text-left">
        <div className="flex items-start justify-between gap-2">
          <motion.span
            initial={false}
            animate={
              done
                ? { backgroundSize: '100% 2px', opacity: 0.55 }
                : { backgroundSize: '0% 2px', opacity: 1 }
            }
            transition={{ duration: 0.3 }}
            style={{
              backgroundImage: 'linear-gradient(currentColor, currentColor)',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: '0 55%',
            }}
            className={`flex-1 text-[15px] font-semibold ${
              done ? 'text-textTertiary' : 'text-textPrimary'
            }`}
          >
            {task.title}
          </motion.span>
          {urgent && (
            <span className="flex items-center gap-1 rounded-xl border border-danger/50 bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger">
              <AlertTriangle size={11} strokeWidth={2} />
              {status === 'overdue' ? 'Atrasada' : status === 'today' ? 'Hoy' : 'Urgente'}
            </span>
          )}
          <span
            className="rounded-xl border px-2 py-0.5 text-[11px] font-semibold"
            style={{
              backgroundColor: `${priorityColor}24`,
              borderColor: `${priorityColor}66`,
              color: priorityColor,
            }}
          >
            {PRIORITY_LABEL[task.priority] ?? 'Media'}
          </span>
          {onMoveUp || onMoveDown ? (
            <span className="flex shrink-0 flex-col">
              {onMoveUp ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
                  className="flex h-5 w-5 items-center justify-center rounded text-textSecondary hover:bg-white/10 hover:text-textPrimary"
                  aria-label="Mover arriba"
                >
                  <ChevronUp size={14} strokeWidth={2} />
                </button>
              ) : null}
              {onMoveDown ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
                  className="flex h-5 w-5 items-center justify-center rounded text-textSecondary hover:bg-white/10 hover:text-textPrimary"
                  aria-label="Mover abajo"
                >
                  <ChevronDown size={14} strokeWidth={2} />
                </button>
              ) : null}
            </span>
          ) : null}
          {draggable ? (
            <span className="flex h-5 shrink-0 cursor-grab items-center text-textTertiary">
              <GripVertical size={16} strokeWidth={2} />
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {task.due_date ? (
            <div className="flex items-center gap-1">
              <CalendarClock size={13} strokeWidth={2} className="text-textSecondary" />
              <span className="text-[12px] text-textSecondary">
                {formatDueLabel(task.due_date)}
              </span>
            </div>
          ) : null}
          {task.estimated_minutes ? (
            <div className="flex items-center gap-1">
              <Timer size={13} strokeWidth={2} className="text-textSecondary" />
              <span className="text-[12px] text-textSecondary">
                {formatMinutes(task.estimated_minutes)}
              </span>
            </div>
          ) : null}
          {task.subject ? (
            <span className="text-[12px] font-medium text-info">{task.subject}</span>
          ) : null}
        </div>
        {progress.total > 0 ? (
          <div className="flex items-center gap-2">
            <span className="w-9 text-[11px] text-textTertiary">
              {progress.done}/{progress.total}
            </span>
            <ProgressBar
              value={Math.round((progress.done / progress.total) * 100)}
              className="flex-1"
            />
          </div>
        ) : null}
      </button>
    </div>
  );
}

export default function TareasPage() {
  const router = useRouter();
  const tasks = useTaskStore((state) => state.tasks);
  const subtasks = useTaskStore((state) => state.subtasks);
  const error = useTaskStore((state) => state.error);
  const [query, setQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'overdue' | 'today' | 'upcoming'>('all');
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [view, setView] = useState<'flat' | 'grouped'>('flat');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);
  const [collapsedSubjects, setCollapsedSubjects] = useState<string[]>([]);
  const [focusTask, setFocusTask] = useState<Task | null>(null);

  const toggleSubject = (subject: string) => {
    setCollapsedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject],
    );
  };

  useEffect(() => {
    void useTaskStore.getState().loadTasks();
  }, []);

  const pending = useMemo(() => getPendingTasks(tasks), [tasks]);
  const allCompleted = useMemo(() => getCompletedTasks(tasks), [tasks]);
  const completed = showAllCompleted ? allCompleted : allCompleted.slice(0, 8);

  const subjects = useMemo(() => getTaskSubjects(pending), [pending]);

  const filtered = useMemo(
    () =>
      filterTasks(pending, {
        query,
        priority: priorityFilter,
        subject: subjectFilter,
        status: statusFilter,
      }),
    [pending, query, priorityFilter, subjectFilter, statusFilter],
  );

  const grouped = useMemo(() => groupTasksBySubject(filtered), [filtered]);

  const upcoming = useMemo(() => getUpcomingTasks(pending), [pending]);

  const weekly = useMemo(() => getWeeklyCompletion(tasks), [tasks]);

  const archived = useMemo(() => tasks.filter((t) => t.status === 'archived'), [tasks]);

  const handleQuickAdd = async () => {
    const title = quickTitle.trim();
    if (!title || quickSaving) return;
    setQuickSaving(true);
    try {
      await useTaskStore.getState().createTask({ title });
      setQuickTitle('');
    } catch {
    } finally {
      setQuickSaving(false);
    }
  };

  const progressOf = useCallback(
    (taskId: string): TaskProgress => {
      const taskSubtasks = subtasks.filter((item) => item.task_id === taskId);
      const total = taskSubtasks.length;
      const done = taskSubtasks.filter((item) => item.is_completed).length;
      return { total, done };
    },
    [subtasks],
  );

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const id = filtered[dragIndex]?.id;
    if (!id) return;
    void useTaskStore.getState().reorderTask(id, dragIndex, targetIndex).catch(() => undefined);
    setDragIndex(null);
  };

  const dragEnabled = subjectFilter === 'all' && statusFilter === 'all' && priorityFilter === 'all' && !query.trim() && view === 'flat';

  const completedToday = useMemo(
    () => countTasksDoneToday(allCompleted),
    [allCompleted],
  );

  const todayCount = useMemo(
    () => countByStatus(pending, 'today'),
    [pending],
  );
  const overdueCount = useMemo(
    () => countByStatus(pending, 'overdue'),
    [pending],
  );

  const renderCard = (task: Task, listIndex: number, listLength: number, withDrag: boolean) => (
    <GlassCard
      key={task.id}
      compact
      className={dragIndex === listIndex ? 'opacity-60 ring-1 ring-accent/50' : ''}
    >
      <TaskRow
        task={task}
        progress={progressOf(task.id)}
        done={false}
        onOpen={() => router.push(`/tareas/${task.id}`)}
        onFocus={() => setFocusTask(task)}
        onComplete={() => {
          void useTaskStore.getState().completeTask(task.id).catch(() => undefined);
        }}
        onMoveUp={
          withDrag && listIndex > 0
            ? () => {
                void useTaskStore.getState().reorderTask(task.id, listIndex, listIndex - 1).catch(() => undefined);
              }
            : undefined
        }
        onMoveDown={
          withDrag && listIndex < listLength - 1
            ? () => {
                void useTaskStore.getState().reorderTask(task.id, listIndex, listIndex + 1).catch(() => undefined);
              }
            : undefined
        }
        draggable={withDrag}
        onDragStart={() => setDragIndex(listIndex)}
        onDragEnd={() => setDragIndex(null)}
        onDragOver={(e) => {
          if (withDrag) e.preventDefault();
        }}
        onDrop={(e) => {
          if (!withDrag) return;
          e.preventDefault();
          handleDrop(listIndex);
        }}
      />
    </GlassCard>
  );

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex flex-col gap-6">
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold tracking-wide text-textPrimary">Tareas</h1>
      </motion.div>
      <motion.p variants={fadeUp} className="-mt-4 text-[14px] text-textSecondary">
        {pending.length} pendiente{pending.length === 1 ? '' : 's'}
      </motion.p>

      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3">
        <GlassCard compact className="flex flex-col gap-1">
          <span className="text-[11px] text-textSecondary">Pendientes</span>
          <span className="text-[22px] font-bold text-textPrimary">{pending.length}</span>
        </GlassCard>
        <GlassCard compact className="flex flex-col gap-1">
          <span className="text-[11px] text-textSecondary">Hoy</span>
          <span className={`text-[22px] font-bold ${todayCount > 0 ? 'text-info' : 'text-textPrimary'}`}>{todayCount}</span>
        </GlassCard>
        <GlassCard compact className="flex flex-col gap-1">
          <span className="text-[11px] text-textSecondary">Completadas hoy</span>
          <span className="text-[22px] font-bold text-success">{completedToday}</span>
        </GlassCard>
      </motion.div>

      {overdueCount > 0 ? (
        <motion.div variants={fadeUp}>
          <GlassCard compact className="flex items-center gap-2 border-danger/40 bg-danger/10">
            <AlertTriangle size={16} strokeWidth={2} className="shrink-0 text-danger" />
            <span className="text-[13px] font-medium text-danger">
              {overdueCount} tarea{overdueCount === 1 ? '' : 's'} atrasada{overdueCount === 1 ? '' : 's'}
            </span>
          </GlassCard>
        </motion.div>
      ) : null}

      <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
        <Link href="/tareas/nueva">
          <GlassButton title="Nueva tarea" variant="secondary" size="sm" icon={Plus} />
        </Link>
      </motion.div>
      {error ? (
        <p className="text-[13px] text-danger">{error}</p>
      ) : null}

      <motion.div variants={fadeUp}>
        <GlassCard>
          <h2 className="mb-4 text-[16px] font-semibold text-textPrimary">Tu progreso semanal</h2>
          <WeeklyProgressChart days={weekly} />
        </GlassCard>
      </motion.div>

      <motion.div variants={fadeUp} className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.07] px-3 py-2.5">
          <Plus size={16} strokeWidth={2} className="shrink-0 text-accent" />
          <input
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleQuickAdd();
            }}
            placeholder="Agregar tarea rápida…"
            className="w-full bg-transparent text-[14px] text-textPrimary placeholder:text-textTertiary outline-none"
          />
        </div>
        <GlassButton title="Añadir" variant="primary" size="sm" loading={quickSaving} onClick={() => void handleQuickAdd()} />
      </motion.div>

      <motion.div variants={fadeUp} className="flex flex-col gap-3">
        <div className="flex gap-2">
          {(['flat', 'grouped'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 rounded-2xl border px-3 py-2 text-[13px] font-semibold transition-colors ${
                view === v
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-border bg-white/5 text-textSecondary hover:bg-white/10'
              }`}
            >
              {v === 'flat' ? 'Lista' : 'Por materia'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.07] px-3 py-2.5">
          <Search size={16} strokeWidth={2} className="shrink-0 text-textTertiary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar tarea o materia…"
            className="w-full bg-transparent text-[14px] text-textPrimary placeholder:text-textTertiary outline-none"
          />
        </div>
        <div className="flex flex-col gap-2 text-[12px]">
          <div className="flex flex-wrap gap-2">
            <span className="w-full text-[11px] font-semibold uppercase tracking-wide text-textTertiary">
              Estado
            </span>
            {(['all', 'overdue', 'today', 'upcoming'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full border px-3 py-1 font-medium transition-colors ${
                  statusFilter === s
                    ? s === 'overdue'
                      ? 'border-danger bg-danger/15 text-danger'
                      : s === 'today'
                        ? 'border-info bg-info/15 text-info'
                        : 'border-accent bg-accent/15 text-accent'
                    : 'border-border bg-white/5 text-textSecondary hover:bg-white/10'
                }`}
              >
                {s === 'all' ? 'Todas' : s === 'overdue' ? 'Atrasadas' : s === 'today' ? 'Hoy' : 'Próximas'}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-full text-[11px] font-semibold uppercase tracking-wide text-textTertiary">
              Prioridad
            </span>
            <button
              onClick={() => setPriorityFilter('all')}
              className={`rounded-full border px-3 py-1 font-medium transition-colors ${
                priorityFilter === 'all'
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-border bg-white/5 text-textSecondary hover:bg-white/10'
              }`}
            >
              Todas
            </button>
            {(Object.keys(PRIORITY_LABEL) as TaskPriority[]).map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(priorityFilter === p ? 'all' : p)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition-colors ${
                  priorityFilter === p
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-border bg-white/5 text-textSecondary hover:bg-white/10'
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: PRIORITY_COLOR[p] ?? PRIORITY_COLOR.medium }}
                />
                {PRIORITY_LABEL[p]}
              </button>
            ))}
          </div>
          {subjects.length > 0 ? (
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="max-w-[180px] rounded-full border border-border bg-white/5 px-3 py-1 text-[12px] font-medium text-textPrimary outline-none appearance-none"
            >
              <option value="all">Todas las materias</option>
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          ) : null}
        </div>
      </motion.div>

      {upcoming.length > 0 ? (
        <motion.div variants={fadeUp} className="flex flex-col gap-2">
          <h2 className="text-[16px] font-semibold text-textPrimary">Próximas a vencer</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {upcoming.map((t) => (
              <button
                key={t.id}
                onClick={() => router.push(`/tareas/${t.id}`)}
                className="flex min-w-[150px] flex-1 flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-left hover:bg-white/[0.09]"
              >
                <span className="line-clamp-1 text-[13px] font-semibold text-textPrimary">{t.title}</span>
                <span className={`flex items-center gap-1 text-[11px] font-medium ${
                  dueStatus(t.due_date) === 'today' ? 'text-info' : 'text-textSecondary'
                }`}>
                  <CalendarClock size={11} strokeWidth={2} />
                  {formatDueLabel(t.due_date)}
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      ) : null}

      {filtered.length === 0 ? (
        <GlassCard compact>
          <p className="text-[14px] text-textSecondary">
            {pending.length === 0 ? 'No tienes tareas pendientes.' : 'No hay tareas que coincidan con los filtros.'}
          </p>
        </GlassCard>
      ) : view === 'grouped' ? (
        grouped.groups.length > 0 || grouped.withoutSubject.length > 0 ? (
          <div className="flex flex-col gap-3">
            {grouped.groups.map(([subject, list]) => {
              const color = subjectColor(subject);
              const collapsed = collapsedSubjects.includes(subject);
              return (
                <GlassCard key={subject} compact className="flex flex-col gap-2">
                  <button
                    onClick={() => toggleSubject(subject)}
                    className="flex items-center gap-2 text-left"
                  >
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <span className="flex-1 truncate text-[15px] font-semibold" style={{ color }}>
                      {subject}
                    </span>
                    <span className="text-[12px] font-normal text-textTertiary">({list.length})</span>
                    {collapsed ? (
                      <ChevronDown size={15} strokeWidth={2} className="shrink-0 text-textSecondary" />
                    ) : (
                      <ChevronUp size={15} strokeWidth={2} className="shrink-0 text-textSecondary" />
                    )}
                  </button>
                  <AnimatePresence initial={false}>
                    {!collapsed ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-col gap-3 pt-1">
                          {list.map((t, idx) => renderCard(t, idx, list.length, false))}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </GlassCard>
              );
            })}
            {grouped.withoutSubject.length > 0 ? (
              <div className="flex flex-col gap-2">
                <h2 className="text-[15px] font-semibold text-textPrimary">Sin materia</h2>
                <div className="flex flex-col gap-3">
                  {grouped.withoutSubject.map((t, idx) => renderCard(t, idx, grouped.withoutSubject.length, false))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((task, index) => renderCard(task, index, filtered.length, dragEnabled))}
          </div>
        )
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((task, index) =>
            renderCard(task, index, filtered.length, dragEnabled),
          )}
        </div>
      )}

      {completed.length > 0 ? (
        <motion.div variants={fadeUp}>
          <div className="mb-4 mt-1 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[18px] font-semibold text-textPrimary">
              <CheckCircle2 size={18} strokeWidth={2} className="text-success" />
              Completadas
            </h2>
            {allCompleted.length > 8 ? (
              <button
                onClick={() => setShowAllCompleted((v) => !v)}
                className="flex items-center gap-1 rounded-xl border border-border bg-white/5 px-3 py-1 text-[12px] font-medium text-textSecondary hover:bg-white/10"
              >
                {showAllCompleted ? 'Mostrar menos' : `Ver todas (${allCompleted.length})`}
                {showAllCompleted ? <ChevronUp size={13} strokeWidth={2} /> : <ChevronDown size={13} strokeWidth={2} />}
              </button>
            ) : null}
          </div>
          <div className="flex flex-col gap-3">
            {completed.map((task) => (
              <GlassCard key={task.id} compact>
                <TaskRow
                  task={task}
                  progress={progressOf(task.id)}
                  done={true}
                  onOpen={() => router.push(`/tareas/${task.id}`)}
                />
              </GlassCard>
            ))}
          </div>
        </motion.div>
      ) : null}

      {archived.length > 0 ? (
        <motion.div variants={fadeUp}>
          <h2 className="mb-4 mt-1 text-[16px] font-semibold text-textTertiary">
            Archivadas ({archived.length})
          </h2>
          <div className="flex flex-col gap-2">
            {archived.slice(0, 10).map((task) => (
              <GlassCard key={task.id} compact className="opacity-70">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex-1 truncate text-[14px] text-textSecondary">{task.title}</span>
                  <button
                    onClick={() =>
                      void useTaskStore.getState().updateTask(task.id, { status: 'todo' }).catch(() => undefined)
                    }
                    className="shrink-0 rounded-xl border border-border bg-white/5 px-3 py-1 text-[12px] font-medium text-textSecondary hover:bg-white/10"
                  >
                    Restaurar
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        </motion.div>
      ) : null}

      <FocusTimer
        open={focusTask !== null}
        onClose={() => setFocusTask(null)}
        taskTitle={focusTask?.title ?? ''}
        onLogMinutes={(minutes) => {
          if (!focusTask) return;
          const current = focusTask.estimated_minutes ?? 0;
          void useTaskStore
            .getState()
            .updateTask(focusTask.id, { estimated_minutes: current + minutes })
            .catch(() => undefined);
        }}
      />
    </motion.div>
  );
}
