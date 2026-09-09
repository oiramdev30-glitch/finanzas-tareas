function env(name: string, fallback = ''): string {
  const v = process.env[name];
  return v && v.length > 0 ? v : fallback;
}

export const config = {
  supabaseUrl: env('NEXT_PUBLIC_SUPABASE_URL', 'https://placeholder.supabase.co'),
  supabaseAnonKey: env('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'placeholder-anon-key'),
} as const;

export const isSupabaseConfigured =
  config.supabaseUrl !== 'https://placeholder.supabase.co' &&
  config.supabaseAnonKey !== 'placeholder-anon-key';
