import { create } from 'zustand';
import { computeUrgencyScore } from '@/lib/urgency';
import { isOpenTask } from '@/lib/tasks';
import { toErrorMessage } from '@/lib/errors';
import { getDeviceId, supabase } from '@/lib/supabase';
import type {
  Subtask,
  SubtaskInput,
  Task,
  TaskInput,
  TaskPatch,
} from '@/lib/types';

interface TaskState {
  tasks: Task[];
  subtasks: Subtask[];
  isLoading: boolean;
  error: string | null;
  loadTasks: () => Promise<void>;
  createTask: (input: TaskInput) => Promise<Task>;
  updateTask: (id: string, patch: TaskPatch) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  reorderTask: (id: string, from: number, to: number) => Promise<void>;
  toggleSubtask: (subtask: Subtask) => Promise<void>;
  addAiSubtasks: (taskId: string, inputs: SubtaskInput[]) => Promise<void>;
  getSubtasksForTask: (taskId: string) => Subtask[];
  clearError: () => void;
}

type Row = Record<string, unknown>;

function toNumber(value: unknown): number {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
const STATUSES = ['todo', 'in_progress', 'done', 'archived'] as const;
const RECURRENCES = ['none', 'daily', 'weekly', 'monthly'] as const;

function nextDueDate(dueDate: string | null, recurrence: Task['recurrence']): string | null {
  if (!dueDate) return null;
  const base = new Date(dueDate);
  if (Number.isNaN(base.getTime())) return null;
  const next = new Date(base);
  if (recurrence === 'daily') {
    next.setDate(next.getDate() + 1);
  } else if (recurrence === 'weekly') {
    next.setDate(next.getDate() + 7);
  } else if (recurrence === 'monthly') {
    next.setMonth(next.getMonth() + 1);
  } else {
    return null;
  }
  return next.toISOString();
}

function mapPriority(value: unknown): Task['priority'] {
  return typeof value === 'string' && (PRIORITIES as readonly string[]).includes(value)
    ? (value as Task['priority'])
    : 'medium';
}

function mapStatus(value: unknown): Task['status'] {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value)
    ? (value as Task['status'])
    : 'todo';
}

function mapTask(row: Row): Task {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    title: String(row.title),
    description: asNullableString(row.description),
    subject: asNullableString(row.subject),
    source: row.source === 'classroom' ? 'classroom' : 'manual',
    classroom_course_id: asNullableString(row.classroom_course_id),
    classroom_course_work_id: asNullableString(row.classroom_course_work_id),
    due_date: asNullableString(row.due_date),
    priority: mapPriority(row.priority),
    estimated_minutes: typeof row.estimated_minutes === 'number' ? row.estimated_minutes : null,
    estimated_cost: typeof row.estimated_cost === 'number' ? row.estimated_cost : null,
    status: mapStatus(row.status),
    completed_at: asNullableString(row.completed_at),
    urgency_score: toNumber(row.urgency_score),
    recurrence:
      typeof row.recurrence === 'string' &&
      (RECURRENCES as readonly string[]).includes(row.recurrence)
        ? (row.recurrence as Task['recurrence'])
        : 'none',
    reminder_enabled: row.reminder_enabled === true,
    reminder_at: asNullableString(row.reminder_at),
    sort_order: typeof row.sort_order === 'number' ? row.sort_order : 0,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapSubtask(row: Row): Subtask {
  return {
    id: String(row.id),
    task_id: String(row.task_id),
    user_id: String(row.user_id),
    title: String(row.title),
    is_ai_generated: row.is_ai_generated === true,
    order_index: toNumber(row.order_index),
    is_completed: row.is_completed === true,
    completed_at: asNullableString(row.completed_at),
    created_at: String(row.created_at),
  };
}

let costColumnSupported: boolean | null = null;

async function hasCostColumn(): Promise<boolean> {
  if (costColumnSupported !== null) return costColumnSupported;
  try {
    const { error } = await supabase.from('tasks').select('estimated_cost').limit(1);
    costColumnSupported = !error || !String(error.message ?? '').includes('estimated_cost');
  } catch {
    costColumnSupported = false;
  }
  return costColumnSupported;
}

function stripCostIfUnsupported<T extends Record<string, unknown>>(payload: T, supported: boolean): T {
  if (!supported) {
    const copy = { ...payload };
    delete copy.estimated_cost;
    return copy;
  }
  return payload;
}

export const useTaskStore = create<TaskState>()((set, get) => {
  async function fetchTasks(): Promise<{ tasks: Task[]; subtasks: Subtask[] }> {
    const deviceId = getDeviceId();
    const tasksRes = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', deviceId)
      .order('urgency_score', { ascending: false })
      .order('created_at', { ascending: false });
    if (tasksRes.error) throw tasksRes.error;
    const tasks = ((tasksRes.data as Row[] | null) ?? []).map(mapTask);
    const taskIds = tasks.map((task) => task.id);
    const subtasksRes =
      taskIds.length > 0
        ? await supabase.from('subtasks').select('*').in('task_id', taskIds).order('order_index')
        : { data: [], error: null };
    if (subtasksRes.error) throw subtasksRes.error;
    return { tasks, subtasks: (subtasksRes.data ?? []).map(mapSubtask) };
  }

  async function reloadTasks(): Promise<void> {
    const { tasks, subtasks } = await fetchTasks();
    set({ tasks, subtasks, error: null });
  }

  return {
    tasks: [],
    subtasks: [],
    isLoading: false,
    error: null,

    loadTasks: async () => {
      set({ isLoading: true, error: null });
      try {
        await reloadTasks();
        set({ isLoading: false });
      } catch (error) {
        set({ isLoading: false, error: toErrorMessage(error) });
      }
    },

    createTask: async (input) => {
      const deviceId = getDeviceId();
      set({ error: null });
      const costSupported = await hasCostColumn();
      const { data, error } = await supabase
        .from('tasks')
        .insert(
          stripCostIfUnsupported(
            {
              user_id: deviceId,
              title: input.title,
              description: input.description ?? null,
              subject: input.subject ?? null,
              due_date: input.due_date ?? null,
              priority: input.priority ?? 'medium',
              estimated_minutes: input.estimated_minutes ?? null,
              estimated_cost: input.estimated_cost ?? null,
              source: input.source ?? 'manual',
              recurrence: input.recurrence ?? 'none',
              reminder_enabled: input.reminder_enabled ?? false,
              reminder_at: input.reminder_at ?? null,
            },
            costSupported,
          ),
        )
        .select()
        .single();
      if (error || !data) {
        set({ error: error?.message ?? 'No se pudo crear la tarea.' });
        throw error ?? new Error('No se pudo crear la tarea.');
      }
      const task = mapTask(data);
      set((state) => ({ tasks: [task, ...state.tasks] }));
      return task;
    },

    updateTask: async (id, patch) => {
      set({ error: null });
      const payload: Record<string, unknown> = {};
      if (patch.title !== undefined) payload.title = patch.title;
      if (patch.description !== undefined) payload.description = patch.description;
      if (patch.subject !== undefined) payload.subject = patch.subject;
      if (patch.due_date !== undefined) payload.due_date = patch.due_date;
      if (patch.priority !== undefined) payload.priority = patch.priority;
      if (patch.estimated_minutes !== undefined) payload.estimated_minutes = patch.estimated_minutes;
      if (patch.estimated_cost !== undefined) payload.estimated_cost = patch.estimated_cost;
      if (patch.status !== undefined) payload.status = patch.status;
      if (patch.recurrence !== undefined) payload.recurrence = patch.recurrence;
      if (patch.reminder_enabled !== undefined) payload.reminder_enabled = patch.reminder_enabled;
      if (patch.reminder_at !== undefined) payload.reminder_at = patch.reminder_at;
      if (patch.sort_order !== undefined) payload.sort_order = patch.sort_order;
      const costSupported = await hasCostColumn();
      const safePayload = stripCostIfUnsupported(payload, costSupported);
      if (Object.keys(safePayload).length === 0) {
        await reloadTasks();
        return;
      }
      const { error } = await supabase.from('tasks').update(safePayload).eq('id', id);
      if (error) {
        set({ error: error.message });
        throw error;
      }
      await reloadTasks();
    },

    deleteTask: async (id) => {
      set({ error: null });
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) {
        set({ error: error.message });
        throw error;
      }
      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== id),
        subtasks: state.subtasks.filter((subtask) => subtask.task_id !== id),
      }));
    },

    completeTask: async (id) => {
      set({ error: null });
      const task = get().tasks.find((item) => item.id === id);
      const { error } = await supabase.from('tasks').update({ status: 'done' }).eq('id', id);
      if (error) {
        set({ error: error.message });
        throw error;
      }
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id
            ? {
                ...task,
                status: 'done',
                urgency_score: 0,
                completed_at: task.completed_at ?? new Date().toISOString(),
              }
            : task,
        ),
      }));

      if (task && task.recurrence !== 'none') {
        const deviceId = getDeviceId();
        const costSupported = await hasCostColumn();
        const nextDue = nextDueDate(task.due_date, task.recurrence);
        const { data, error: cloneError } = await supabase
          .from('tasks')
          .insert(
            stripCostIfUnsupported(
              {
                user_id: deviceId,
                title: task.title,
                description: task.description,
                subject: task.subject,
                source: task.source,
                classroom_course_id: task.classroom_course_id,
                classroom_course_work_id: task.classroom_course_work_id,
                due_date: nextDue,
                priority: task.priority,
                estimated_minutes: task.estimated_minutes,
                estimated_cost: task.estimated_cost,
                status: 'todo',
                recurrence: task.recurrence,
                reminder_enabled: task.reminder_enabled,
                reminder_at: nextDue,
              },
              costSupported,
            ),
          )
          .select()
          .single();
        if (cloneError) {
          set({ error: cloneError.message });
          throw cloneError;
        }
        if (data) {
          const clone = mapTask(data);
          set((state) => ({ tasks: [...state.tasks, clone] }));
        }
      }
    },

    reorderTask: async (id, from, to) => {
      set({ error: null });
      const tasks = get().tasks;
      const sorted = [...tasks].sort((a, b) => a.sort_order - b.sort_order || b.urgency_score - a.urgency_score);
      const active = sorted.filter(isOpenTask);
      if (from < 0 || from >= active.length || to < 0 || to >= active.length) return;
      const [moved] = active.splice(from, 1);
      active.splice(to, 0, moved);
      const updates = active.map((t, index) => ({ t, order: index }));
      try {
        await Promise.all(
          updates.map(({ t, order }) =>
            supabase.from('tasks').update({ sort_order: order }).eq('id', t.id),
          ),
        );
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'No se pudo reordenar las tareas.' });
      }
      await reloadTasks();
    },

    toggleSubtask: async (subtask) => {
      const nextCompleted = !subtask.is_completed;
      set({ error: null });
      const { error } = await supabase
        .from('subtasks')
        .update({
          is_completed: nextCompleted,
          completed_at: nextCompleted ? new Date().toISOString() : null,
        })
        .eq('id', subtask.id);
      if (error) {
        set({ error: error.message });
        throw error;
      }
      set((state) => {
        const updatedSubtasks = state.subtasks.map((item) =>
          item.id === subtask.id
            ? { ...item, is_completed: nextCompleted, completed_at: nextCompleted ? new Date().toISOString() : null }
            : item,
        );
        const taskSubtasks = updatedSubtasks.filter((item) => item.task_id === subtask.task_id);
        const updatedTasks = state.tasks.map((task) =>
          task.id === subtask.task_id
            ? { ...task, urgency_score: computeUrgencyScore(task, taskSubtasks) }
            : task,
        );
        return { subtasks: updatedSubtasks, tasks: updatedTasks };
      });
    },

    addAiSubtasks: async (taskId, inputs) => {
      const deviceId = getDeviceId();
      set({ error: null });
      const existing = get().subtasks.filter((item) => item.task_id === taskId);
      const baseIndex = existing.reduce((max, item) => Math.max(max, item.order_index), -1) + 1;
      const rows = inputs.map((input, index) => ({
        task_id: taskId,
        user_id: deviceId,
        title: input.title,
        is_ai_generated: input.is_ai_generated ?? true,
        order_index: baseIndex + index,
      }));
      const { data, error } = await supabase.from('subtasks').insert(rows).select();
      if (error) {
        set({ error: error.message });
        throw error;
      }
      const created = (data ?? []).map(mapSubtask);
      set((state) => ({ subtasks: [...state.subtasks, ...created] }));
      const task = get().tasks.find((item) => item.id === taskId);
      if (task) {
        const taskSubtasks = get().subtasks.filter((item) => item.task_id === taskId);
        set((state) => ({
          tasks: state.tasks.map((item) =>
            item.id === taskId
              ? { ...item, urgency_score: computeUrgencyScore(item, taskSubtasks) }
              : item,
          ),
        }));
      }
    },

    getSubtasksForTask: (taskId) => get().subtasks.filter((item) => item.task_id === taskId),

    clearError: () => set({ error: null }),
  };
});
