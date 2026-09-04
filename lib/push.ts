import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

const REMINDER_STORAGE_KEY = 'finanzas.reminder';
const REMINDER_NOTIFICATION_ID_KEY = 'finanzas.reminder.notificationId';

const DEFAULT_REMINDER: ReminderSettings = { enabled: false, hour: 20, minute: 0 };

export async function requestNotificationPermissions(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.status === 'granted') {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

export async function getReminderSettings(): Promise<ReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(REMINDER_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_REMINDER;
    }
    const parsed = JSON.parse(raw) as Partial<ReminderSettings>;
    const hour = typeof parsed.hour === 'number' ? parsed.hour : DEFAULT_REMINDER.hour;
    const minute = typeof parsed.minute === 'number' ? parsed.minute : DEFAULT_REMINDER.minute;
    return { enabled: parsed.enabled === true, hour, minute };
  } catch {
    return DEFAULT_REMINDER;
  }
}

async function cancelScheduledReminder(): Promise<void> {
  try {
    const id = await AsyncStorage.getItem(REMINDER_NOTIFICATION_ID_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  } catch {
  } finally {
    try {
      await AsyncStorage.removeItem(REMINDER_NOTIFICATION_ID_KEY);
    } catch {
    }
  }
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<boolean> {
  try {
    await AsyncStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    return false;
  }
  await cancelScheduledReminder();
  if (!settings.enabled) {
    return true;
  }
  if (Platform.OS === 'web') {
    return true;
  }
  const granted = await requestNotificationPermissions();
  if (!granted) {
    return false;
  }
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Revisa Google Classroom',
        body: 'Date una vuelta por Classroom para no olvidar entregar tus tareas.',
        data: { url: '/tareas' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: settings.hour,
        minute: settings.minute,
      },
    });
    await AsyncStorage.setItem(REMINDER_NOTIFICATION_ID_KEY, id);
    return true;
  } catch {
    return false;
  }
}

export async function sendTestReminder(): Promise<boolean> {
  const granted = await requestNotificationPermissions();
  if (!granted) {
    return false;
  }
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Revisa Google Classroom',
        body: 'Este es un recordatorio de prueba para revisar tus tareas.',
        data: { url: '/tareas' },
      },
      trigger: null,
    });
    return true;
  } catch {
    return false;
  }
}
