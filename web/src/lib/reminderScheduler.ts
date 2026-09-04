import { useReminderStore, type ScheduledReminder } from '../stores/useReminderStore';

const FIRED_PREFIX = 'finanzas.sched.fired.';
const CHECK_MS = 30_000;

function todayKey(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function currentTime(now: Date): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function wasFired(id: string, time: string, dateKey: string): boolean {
  try {
    return window.localStorage.getItem(`${FIRED_PREFIX}${id}.${dateKey}.${time}`) === '1';
  } catch {
    return false;
  }
}

function markFired(id: string, time: string, dateKey: string): void {
  try {
    window.localStorage.setItem(`${FIRED_PREFIX}${id}.${dateKey}.${time}`, '1');
  } catch {
  }
}

function fire(reminder: ScheduledReminder): void {
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    new Notification(reminder.title, {
      body: 'Recordatorio programado.',
      tag: `reminder-${reminder.id}`,
      silent: reminder.sound === 'silent',
    });
  } catch {
  }
}

export function checkScheduledReminders(now = new Date()): void {
  const { items } = useReminderStore.getState();
  const dateKey = todayKey(now);
  const time = currentTime(now);
  const weekday = now.getDay();
  for (const reminder of items) {
    if (!reminder.enabled) continue;
    if (!reminder.days.includes(weekday)) continue;
    if (!reminder.times.includes(time)) continue;
    if (wasFired(reminder.id, time, dateKey)) continue;
    markFired(reminder.id, time, dateKey);
    fire(reminder);
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

export function startReminderScheduler(): () => void {
  checkScheduledReminders();
  const interval = window.setInterval(checkScheduledReminders, CHECK_MS);
  const onVisible = () => {
    if (document.visibilityState === 'visible') checkScheduledReminders();
  };
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    window.clearInterval(interval);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
