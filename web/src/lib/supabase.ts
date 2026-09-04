import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from './config';

export const supabase: SupabaseClient = createClient(
  config.supabaseUrl,
  config.supabaseAnonKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);

const DEVICE_ID_STORAGE_KEY = 'finanzas.deviceId';

function newDeviceId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  const hex = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

let cachedDeviceId: string | null = null;

export function getDeviceId(): string {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }
  try {
    const stored = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (stored && isUuid(stored)) {
      cachedDeviceId = stored;
      return stored;
    }
  } catch {
  }
  const id = newDeviceId();
  try {
    window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, id);
  } catch {
  }
  cachedDeviceId = id;
  return id;
}

export type { SupabaseClient };
