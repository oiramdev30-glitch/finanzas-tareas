'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import NavBar from './NavBar';
import ErrorBanner from './ErrorBanner';
import { startReminderScheduler } from '@/lib/reminderScheduler';
import { useReminderStore } from '@/stores/useReminderStore';
import { isSupabaseConfigured } from '@/lib/config';
import { fadeIn } from '@/lib/motion';

export default function AppShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    useReminderStore.getState().load();
    return startReminderScheduler();
  }, []);

  return (
    <div className="relative mx-auto flex min-h-screen max-w-2xl flex-col overflow-x-clip">
      <AuroraBackground />
      <ErrorBanner />
      {!isSupabaseConfigured ? (
        <div className="relative z-20 mx-5 mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] leading-5 text-amber-200">
          Faltan las variables de entorno en Vercel. Configura <span className="font-mono">NEXT_PUBLIC_SUPABASE_URL</span> y{' '}
          <span className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> y redeploya.
        </div>
      ) : null}
      <motion.main
        key="main"
        initial="hidden"
        animate="show"
        variants={fadeIn}
        className="relative z-10 flex-1 px-5 pt-7 pb-[calc(env(safe-area-inset-bottom)+7.5rem)]"
      >
        {children}
      </motion.main>
      <NavBar />
    </div>
  );
}

export function AuroraBackground() {
  return (
    <div className="aurora-bg" aria-hidden>
      <div className="aurora-blob aurora-blob--one" />
      <div className="aurora-blob aurora-blob--two" />
      <div className="aurora-blob aurora-blob--three" />
    </div>
  );
}
