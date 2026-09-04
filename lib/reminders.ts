import * as Notifications from 'expo-notifications';
import type { ScheduledReminder } from '../stores/useReminderStore';

function splitTime(time: string): { hour: number; minute: number } | null {
  const match = time.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  return { hour, minute };
}

export async function applyScheduledReminders(items: ScheduledReminder[]): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    return;
  }
  let permissionRequested = false;
  for (const reminder of items) {
    if (!reminder.enabled) continue;
    if (!permissionRequested) {
      permissionRequested = true;
      try {
        const settings = await Notifications.getPermissionsAsync();
        if (settings.status !== 'granted') {
          const requested = await Notifications.requestPermissionsAsync();
          if (requested.status !== 'granted') return;
        }
      } catch {
        return;
      }
    }
    for (const time of reminder.times) {
      const parts = splitTime(time);
      if (!parts) continue;
      for (const day of reminder.days) {
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: reminder.title,
              body: 'Recordatorio programado.',
              sound: reminder.sound === 'silent' ? false : true,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday: day + 1,
              hour: parts.hour,
              minute: parts.minute,
            },
          });
        } catch {
        }
      }
    }
  }
}
