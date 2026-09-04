import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { config } from './config';

export const supabase: SupabaseClient = createClient(
  config.supabaseUrl,
  config.supabaseAnonKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: AsyncStorage,
    },
  },
);

const DEVICE_ID_STORAGE_KEY = 'finanzas.deviceId';

function randomHex(length: number): string {
  const chars = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function newDeviceId(): string {
  return `${randomHex(8)}-${randomHex(4)}-${randomHex(4)}-${randomHex(4)}-${randomHex(12)}`;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

let cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (stored && isUuid(stored)) {
      cachedDeviceId = stored;
      return stored;
    }
  } catch {
  }
  const id = newDeviceId();
  try {
    await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, id);
  } catch {
  }
  cachedDeviceId = id;
  return id;
}

export type { SupabaseClient };
