import { dueStatus } from './format';
import type { Task, TaskPriority } from './types';

export type TaskStatusFilter = 'all' | 'overdue' | 'today' | 'upcoming';

export interface TaskFilterOptions {
  query: string;
  priority: TaskPriority | 'all';
  subject: string;
  status: TaskStatusFilter;
}

export function isOpenTask(task: Task): boolean {
  return task.status !== 'done' && task.status !== 'archived';
}

export function getPendingTasks(tasks: Task[]): Task[] {
  return tasks
    .filter(isOpenTask)
    .sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || b.urgency_score - a.urgency_score,
    );
}

export function getCompletedTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => task.status === 'done');
}

export function getTaskSubjects(tasks: Task[]): string[] {
  const set = new Set<string>();
  for (const task of tasks) {
    const subject = task.subject?.trim();
    if (subject) set.add(subject);
  }
  return Array.from(set).sort();
}

export function filterTasks(tasks: Task[], options: TaskFilterOptions): Task[] {
  const query = options.query.trim().toLowerCase();
  return tasks
    .filter((task) => options.priority === 'all' || task.priority === options.priority)
    .filter(
      (task) =>
        options.subject === 'all' || (task.subject?.trim() ?? '') === options.subject,
    )
    .filter((task) => {
      if (options.status === 'all') return true;
      const status = dueStatus(task.due_date);
      if (options.status === 'overdue') return status === 'overdue';
      if (options.status === 'today') return status === 'today';
      if (options.status === 'upcoming') return status === 'soon' || status === 'normal';
      return true;
    })
    .filter(
      (task) =>
        !query ||
        task.title.toLowerCase().includes(query) ||
        (task.subject?.toLowerCase().includes(query) ?? false),
    );
}

export interface TaskGroups {
  withoutSubject: Task[];
  groups: [string, Task[]][];
}

export function groupTasksBySubject(tasks: Task[]): TaskGroups {
  const withoutSubject = tasks.filter((task) => !task.subject?.trim());
  const map = new Map<string, Task[]>();
  for (const task of tasks) {
    const subject = task.subject?.trim() || '';
    if (!subject) continue;
    const group = map.get(subject) ?? [];
    group.push(task);
    map.set(subject, group);
  }
  return { withoutSubject, groups: Array.from(map.entries()) };
}

export function getUpcomingTasks(tasks: Task[], limit = 4): Task[] {
  const withDue = tasks
    .filter((task) => task.due_date)
    .slice()
    .sort((a, b) => {
      const da = new Date(a.due_date!).getTime();
      const db = new Date(b.due_date!).getTime();
      return da - db;
    });
  return withDue
    .filter((task) => {
      const status = dueStatus(task.due_date);
      return status === 'today' || status === 'soon';
    })
    .slice(0, limit);
}

export function countTasksDoneToday(tasks: Task[]): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return tasks.filter((task) => {
    const completedAt = task.completed_at ? new Date(task.completed_at).getTime() : 0;
    return completedAt >= start;
  }).length;
}

export function countByStatus(tasks: Task[], status: 'today' | 'overdue'): number {
  return tasks.filter((task) => dueStatus(task.due_date) === status).length;
}

export interface DailyCompletion {
  key: string;
  label: string;
  completed: number;
}

export function getWeeklyCompletion(tasks: Task[], now = new Date()): DailyCompletion[] {
  const days: DailyCompletion[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const start = d.getTime();
    const end = start + 86_400_000;
    const completed = tasks.filter((t) => {
      if (t.status !== 'done' || !t.completed_at) return false;
      const c = new Date(t.completed_at).getTime();
      return c >= start && c < end;
    }).length;
    days.push({
      key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
      label: d.toLocaleDateString('es-MX', { weekday: 'narrow' }),
      completed,
    });
  }
  return days;
}
