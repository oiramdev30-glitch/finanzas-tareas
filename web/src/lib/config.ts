function env(name: string, fallback = ''): string {
  const v = process.env[name];
  return v && v.length > 0 ? v : fallback;
}

export const config = {
  supabaseUrl: env('NEXT_PUBLIC_SUPABASE_URL', 'https://qnqtfybknmiaqcuyyuqc.supabase.co').replace(
    /\/rest\/v1\/?$/,
    '',
  ),
  supabaseAnonKey: env('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'sb_publishable_WOeWQYgzQ1Ws8LZyrHQzQA_iokxyYQ9'),
} as const;

export const isSupabaseConfigured =
  config.supabaseUrl !== 'https://placeholder.supabase.co' &&
  config.supabaseAnonKey !== 'placeholder-anon-key';
