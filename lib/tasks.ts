import type { Task } from './types';

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
