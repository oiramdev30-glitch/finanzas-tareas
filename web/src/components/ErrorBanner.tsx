'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { useTaskStore } from '@/stores/useTaskStore';
import { useFinanceStore } from '@/stores/useFinanceStore';

const AUTO_DISMISS_MS = 6000;

export default function ErrorBanner() {
  const taskError = useTaskStore((state) => state.error);
  const financeError = useFinanceStore((state) => state.error);
  const clearTaskError = useTaskStore((state) => state.clearError);
  const clearFinanceError = useFinanceStore((state) => state.clearError);

  const [visible, setVisible] = useState(false);

  const error = taskError ?? financeError ?? null;

  useEffect(() => {
    if (!error) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [error]);

  const handleDismiss = () => {
    setVisible(false);
    if (taskError) clearTaskError();
    if (financeError) clearFinanceError();
  };

  if (!error) {
    return null;
  }

  return (
    <AnimatePresence>
      {visible && error ? (
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          role="alert"
          className="fixed left-1/2 top-4 z-[200] w-[calc(100%-2rem)] max-w-md -translate-x-1/2"
        >
          <div className="glass-strong flex items-start gap-3 rounded-2xl border border-danger/40 p-4 shadow-2xl">
            <AlertTriangle size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-danger" />
            <p className="flex-1 text-[14px] leading-snug text-textPrimary">{error}</p>
            <button
              onClick={handleDismiss}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-white/5 text-textSecondary transition-colors hover:bg-white/10"
              aria-label="Cerrar aviso"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
