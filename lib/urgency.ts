import type { Subtask, Task, TaskPriority } from './types';

const HOUR_MS = 3_600_000;
export const URGENCY_MAX = 100;

function timeComponent(dueDate: string | null, now: number): number {
  if (!dueDate) {
    return 0;
  }
  const remaining = new Date(dueDate).getTime() - now;
  if (remaining <= 0) {
    return 60;
  }
  const hours = remaining / HOUR_MS;
  if (hours <= 12) {
    return 55;
  }
  if (hours <= 24) {
    return 50;
  }
  if (hours <= 48) {
    return 40;
  }
  if (hours <= 72) {
    return 32;
  }
  if (hours <= 120) {
    return 22;
  }
  if (hours <= 168) {
    return 12;
  }
  return 0;
}

function priorityComponent(priority: TaskPriority): number {
  switch (priority) {
    case 'urgent':
      return 22;
    case 'high':
      return 16;
    case 'medium':
      return 8;
    case 'low':
      return 3;
    default:
      return 8;
  }
}

function progressComponent(totalSubtasks: number, completedSubtasks: number): number {
  if (totalSubtasks === 0) {
    return 5;
  }
  const completionRatio = completedSubtasks / totalSubtasks;
  return Math.round(12 * (1 - completionRatio));
}

export function computeUrgencyScore(
  task: Pick<Task, 'status' | 'due_date' | 'priority'>,
  subtasks: Array<Pick<Subtask, 'is_completed'>>,
  now = Date.now(),
): number {
  if (task.status === 'done' || task.status === 'archived') {
    return 0;
  }
  const total = subtasks.length;
  const completed = subtasks.filter((subtask) => subtask.is_completed).length;
  const rawScore =
    timeComponent(task.due_date, now) +
    priorityComponent(task.priority) +
    progressComponent(total, completed);
  return Math.min(URGENCY_MAX, Math.round(rawScore));
}