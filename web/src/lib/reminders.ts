export interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

const REMINDER_STORAGE_KEY = 'finanzas.reminder';
const REMINDER_FIRED_KEY = 'finanzas.reminder.firedFor';

const DEFAULT_REMINDER: ReminderSettings = { enabled: false, hour: 20, minute: 0 };

export function getReminderSettings(): ReminderSettings {
  if (typeof window === 'undefined') return DEFAULT_REMINDER;
  try {
    const raw = window.localStorage.getItem(REMINDER_STORAGE_KEY);
    if (!raw) return DEFAULT_REMINDER;
    const parsed = JSON.parse(raw) as Partial<ReminderSettings>;
    const hour = typeof parsed.hour === 'number' ? parsed.hour : DEFAULT_REMINDER.hour;
    const minute = typeof parsed.minute === 'number' ? parsed.minute : DEFAULT_REMINDER.minute;
    return { enabled: parsed.enabled === true, hour, minute };
  } catch {
    return DEFAULT_REMINDER;
  }
}

export function saveReminderSettings(settings: ReminderSettings): void {
  try {
    window.localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(settings));
  } catch {
  }
}

function todayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function wasFiredToday(): boolean {
  try {
    return window.localStorage.getItem(REMINDER_FIRED_KEY) === todayKey();
  } catch {
    return false;
  }
}

function markFiredToday(): void {
  try {
    window.localStorage.setItem(REMINDER_FIRED_KEY, todayKey());
  } catch {
  }
}

export function isReminderDue(settings: ReminderSettings, now = new Date()): boolean {
  if (!settings.enabled || wasFiredToday()) return false;
  const due = new Date(now);
  due.setHours(settings.hour, settings.minute, 0, 0);
  return now.getTime() >= due.getTime();
}

export async function fireClassroomReminder(): Promise<boolean> {
  markFiredToday();
  try {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') {
      new Notification('Revisa Google Classroom', {
        body: 'Date una vuelta por Classroom para no olvidar entregar tus tareas.',
      });
      return true;
    }
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('Revisa Google Classroom', {
          body: 'Date una vuelta por Classroom para no olvidar entregar tus tareas.',
        });
        return true;
      }
    }
  } catch {
  }
  return false;
}

export function checkAndFireReminder(): boolean {
  const settings = getReminderSettings();
  if (!isReminderDue(settings)) return false;
  void fireClassroomReminder();
  return true;
}
