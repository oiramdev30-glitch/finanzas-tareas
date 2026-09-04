import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { applyScheduledReminders } from '../lib/reminders';

export type ReminderSound = 'default' | 'discreet' | 'silent';

export interface ScheduledReminder {
  id: string;
  title: string;
  enabled: boolean;
  times: string[];
  days: number[];
  sound: ReminderSound;
}

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAYS = [1, 2, 3, 4, 5];
export const WEEKENDS = [0, 6];

export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DAY_SHORT = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

const STORAGE_KEY = 'finanzas.scheduledReminders';

function randomHex(length: number): string {
  const chars = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function newId(): string {
  return `${randomHex(8)}-${randomHex(4)}-${randomHex(4)}-${randomHex(4)}-${randomHex(12)}`;
}

export function normalizeTime(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return null;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function normalizeDays(days: number[]): number[] {
  return Array.from(new Set(days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))).sort();
}

function normalizeReminder(raw: unknown): ScheduledReminder | null {
  const record = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  if (typeof record.title !== 'string' || record.title.trim().length === 0) return null;
  const times = Array.isArray(record.times)
    ? record.times.flatMap((t) => {
        const n = typeof t === 'string' ? normalizeTime(t) : null;
        return n ? [n] : [];
      })
    : [];
  if (times.length === 0) return null;
  const days = Array.isArray(record.days) ? normalizeDays(record.days as number[]) : [];
  if (days.length === 0) return null;
  const sound: ReminderSound =
    record.sound === 'silent' || record.sound === 'discreet' ? record.sound : 'default';
  return {
    id: typeof record.id === 'string' && record.id.length > 0 ? record.id : newId(),
    title: record.title.trim().slice(0, 120),
    enabled: record.enabled !== false,
    times: Array.from(new Set(times)).sort(),
    days,
    sound,
  };
}

function seedDefault(): ScheduledReminder[] {
  return [
    {
      id: newId(),
      title: 'Revisar Google Classroom',
      enabled: false,
      times: ['20:00'],
      days: [...ALL_DAYS],
      sound: 'default',
    },
  ];
}

async function readStored(): Promise<ScheduledReminder[] | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      const n = normalizeReminder(item);
      return n ? [n] : [];
    });
  } catch {
    return [];
  }
}

async function persist(items: ScheduledReminder[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
  }
}

export interface ReminderInput {
  title: string;
  times: string[];
  days: number[];
  sound: ReminderSound;
}

interface ReminderState {
  items: ScheduledReminder[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (input: ReminderInput) => Promise<ScheduledReminder | null>;
  update: (id: string, input: ReminderInput) => Promise<boolean>;
  toggle: (id: string, enabled: boolean) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useReminderStore = create<ReminderState>()((set, get) => ({
  items: [],
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    const stored = await readStored();
    const items = stored === null ? seedDefault() : stored;
    if (stored === null) {
      await persist(items);
    }
    set({ items, loaded: true });
    await applyScheduledReminders(items);
  },

  add: async (input) => {
    const normalized = normalizeReminder({ ...input, id: newId(), enabled: true });
    if (!normalized) return null;
    const items = [...get().items, normalized];
    await persist(items);
    set({ items });
    await applyScheduledReminders(items);
    return normalized;
  },

  update: async (id, input) => {
    const current = get().items.find((item) => item.id === id);
    if (!current) return false;
    const normalized = normalizeReminder({ ...input, id, enabled: current.enabled });
    if (!normalized) return false;
    const items = get().items.map((item) => (item.id === id ? normalized : item));
    await persist(items);
    set({ items });
    await applyScheduledReminders(items);
    return true;
  },

  toggle: async (id, enabled) => {
    const items = get().items.map((item) => (item.id === id ? { ...item, enabled } : item));
    await persist(items);
    set({ items });
    await applyScheduledReminders(items);
  },

  remove: async (id) => {
    const items = get().items.filter((item) => item.id !== id);
    await persist(items);
    set({ items });
    await applyScheduledReminders(items);
  },
}));
