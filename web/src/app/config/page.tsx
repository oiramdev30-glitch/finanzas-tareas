'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BellRing, Download, Plus, Upload } from 'lucide-react';
import { GlassButton } from '@/components/GlassButton';
import GlassCard from '@/components/GlassCard';
import ReminderModal from '@/components/ReminderModal';
import { getDefaultCurrency, setDefaultCurrency, SUPPORTED_CURRENCIES } from '@/lib/settings';
import { getDeviceId, supabase } from '@/lib/supabase';
import { useFinanceStore } from '@/stores/useFinanceStore';
import {
  DAY_SHORT,
  useReminderStore,
  type ReminderInput,
  type ScheduledReminder,
} from '@/stores/useReminderStore';
import { ensureNotificationPermission } from '@/lib/reminderScheduler';
import { toErrorMessage } from '@/lib/errors';
import { staggerContainer, fadeUp } from '@/lib/motion';

function describeReminder(item: ScheduledReminder): string {
  const daysLabel = item.days.length === 7
    ? 'Todos los días'
    : item.days.length === 5 && item.days.every((d) => d >= 1 && d <= 5)
      ? 'Lun–Vie'
      : item.days.length === 2 && item.days.includes(0) && item.days.includes(6)
        ? 'Fin de semana'
        : item.days.map((d) => DAY_SHORT[d]).join(' ');
  const soundLabel = item.sound === 'silent' ? 'Silencioso' : item.sound === 'discreet' ? 'Discreto' : 'Tono normal';
  return `${item.times.join(' · ')} — ${daysLabel} — ${soundLabel}`;
}

export default function ConfigPage() {
  const items = useReminderStore((state) => state.items);
  const [currency, setCurrency] = useState('MXN');
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduledReminder | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    useReminderStore.getState().load();
    setCurrency(getDefaultCurrency());
  }, []);

  const handleRestoreFile = async (file: File) => {
    setRestoring(true);
    setBackupMessage(null);
    try {
      const parsed = JSON.parse(await file.text()) as Record<string, unknown>;
      const deviceId = getDeviceId();
      const pick = (key: string): Record<string, unknown>[] => {
        const value = parsed[key];
        return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
      };

      const accountIdMap = new Map<string, string>();
      for (const row of pick('accounts')) {
        const { data, error } = await supabase
          .from('accounts')
          .insert({
            user_id: deviceId,
            name: typeof row.name === 'string' ? row.name : 'Cuenta',
            type: typeof row.type === 'string' ? row.type : 'cash',
            currency: typeof row.currency === 'string' ? row.currency : currency,
            color: typeof row.color === 'string' ? row.color : null,
            icon: typeof row.icon === 'string' ? row.icon : null,
            include_in_balance: row.include_in_balance !== false,
          })
          .select('id')
          .single();
        if (error) throw error;
        if (typeof row.id === 'string' && data?.id) accountIdMap.set(row.id, String(data.id));
      }

      const categoryIdMap = new Map<string, string>();
      for (const row of pick('categories')) {
        const { data, error } = await supabase
          .from('categories')
          .insert({
            user_id: deviceId,
            name: typeof row.name === 'string' ? row.name : 'Categoría',
            type: typeof row.type === 'string' ? row.type : 'expense',
            icon: typeof row.icon === 'string' ? row.icon : null,
            color: typeof row.color === 'string' ? row.color : null,
          })
          .select('id')
          .single();
        if (error) throw error;
        if (typeof row.id === 'string' && data?.id) categoryIdMap.set(row.id, String(data.id));
      }

      for (const row of pick('transactions')) {
        const accountId = typeof row.account_id === 'string' ? accountIdMap.get(row.account_id) : undefined;
        if (!accountId) continue;
        const categoryId = typeof row.category_id === 'string' ? (categoryIdMap.get(row.category_id) ?? null) : null;
        const transferId = typeof row.transfer_account_id === 'string' ? (accountIdMap.get(row.transfer_account_id) ?? null) : null;
        const { error } = await supabase.from('transactions').insert({
          user_id: deviceId,
          account_id: accountId,
          category_id: categoryId,
          type: typeof row.type === 'string' ? row.type : 'expense',
          amount: typeof row.amount === 'number' ? row.amount : 0,
          currency: typeof row.currency === 'string' ? row.currency : currency,
          description: typeof row.description === 'string' ? row.description : null,
          merchant: typeof row.merchant === 'string' ? row.merchant : null,
          date: typeof row.date === 'string' ? row.date : new Date().toISOString(),
          status: typeof row.status === 'string' ? row.status : 'completed',
          source: 'manual',
          receipt_text: typeof row.receipt_text === 'string' ? row.receipt_text : null,
          transfer_account_id: transferId,
          is_opening_balance: row.is_opening_balance === true,
        });
        if (error) throw error;
      }

      for (const row of pick('budgets')) {
        const categoryId = typeof row.category_id === 'string' ? categoryIdMap.get(row.category_id) : undefined;
        if (!categoryId) continue;
        const { error } = await supabase.from('budgets').insert({
          user_id: deviceId,
          category_id: categoryId,
          month: typeof row.month === 'string' ? row.month : '',
          amount: typeof row.amount === 'number' ? row.amount : 0,
        });
        if (error) throw error;
      }

      await useFinanceStore.getState().loadAll();
      setBackupMessage('Respaldo restaurado correctamente.');
    } catch (err) {
      setBackupMessage(toErrorMessage(err, 'No se pudo restaurar el respaldo.'));
    } finally {
      setRestoring(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex flex-col gap-6">
      <motion.h1 variants={fadeUp} className="text-[28px] font-bold tracking-wide text-textPrimary">Ajustes</motion.h1>

      <motion.div variants={fadeUp}>
        <GlassCard className="flex flex-col gap-4">
          <h2 className="text-[16px] font-semibold text-textPrimary">Datos y respaldo</h2>
          <div className="flex items-center justify-between gap-3">
            <label className="text-[13px] text-textSecondary">Moneda por defecto</label>
            <select
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                setDefaultCurrency(e.target.value);
              }}
              className="rounded-xl border border-white/15 bg-white/[0.07] px-3 py-2 text-[13px] text-textPrimary outline-none focus:border-accent"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c} value={c} className="bg-bg-bottom text-textPrimary">{c}</option>
              ))}
            </select>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleRestoreFile(file);
            }}
          />
          {backupMessage ? <p className="text-[13px] text-success">{backupMessage}</p> : null}
          <div className="flex gap-2">
            <GlassButton
              title="Exportar respaldo"
              variant="secondary"
              icon={Download}
              onClick={() => {
                const state = useFinanceStore.getState();
                const data = {
                  exportedAt: new Date().toISOString(),
                  accounts: state.accounts,
                  categories: state.categories,
                  transactions: state.transactions,
                  budgets: state.budgets,
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `finanzas-backup-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            />
            <GlassButton
              title={restoring ? 'Restaurando...' : 'Restaurar'}
              variant="secondary"
              icon={Upload}
              loading={restoring}
              onClick={() => fileRef.current?.click()}
            />
          </div>
        </GlassCard>
      </motion.div>

      <motion.div variants={fadeUp}>
        <GlassCard className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-textPrimary">Recordatorios programados</h2>
            <GlassButton
              title="Nuevo"
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={() => {
                setEditing(null);
                setModalError(null);
                setModalOpen(true);
              }}
            />
          </div>
          <p className="text-[13px] leading-5 text-textSecondary">
            Crea avisos con horarios y días a tu medida. Mientras la app esté abierta te notificaremos a la hora indicada.
          </p>
          {items.length === 0 ? (
            <p className="text-[13px] text-textTertiary">
              No tienes recordatorios. Crea el primero con el botón Nuevo.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setEditing(item);
                    setModalError(null);
                    setModalOpen(true);
                  }}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left hover:bg-white/[0.07]"
                >
                  <BellRing
                    size={16}
                    strokeWidth={2}
                    className={`shrink-0 ${item.enabled ? 'text-accent' : 'text-textTertiary'}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[14px] font-semibold ${item.enabled ? 'text-textPrimary' : 'text-textTertiary'}`}>
                      {item.title}
                    </span>
                    <span className="block truncate text-[12px] tabular-nums text-textSecondary">
                      {describeReminder(item)}
                    </span>
                  </span>
                  <span
                    role="switch"
                    aria-checked={item.enabled}
                    aria-label={`${item.enabled ? 'Desactivar' : 'Activar'} ${item.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      useReminderStore.getState().toggle(item.id, !item.enabled);
                      if (!item.enabled) void ensureNotificationPermission();
                    }}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                      item.enabled ? 'bg-accent' : 'bg-white/10'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${
                        item.enabled ? 'left-[22px]' : 'left-0.5'
                      }`}
                    />
                  </span>
                </button>
              ))}
            </div>
          )}
          {modalError ? <p className="text-[13px] text-danger">{modalError}</p> : null}
        </GlassCard>
      </motion.div>

      <ReminderModal
        open={modalOpen}
        initial={editing}
        onClose={() => setModalOpen(false)}
        onSave={(input: ReminderInput) => {
          const store = useReminderStore.getState();
          if (editing) {
            const ok = store.update(editing.id, input);
            if (!ok) return 'Revisa los datos del recordatorio.';
          } else {
            const created = store.add(input);
            if (!created) return 'Revisa los datos del recordatorio.';
          }
          void ensureNotificationPermission();
          setModalOpen(false);
          return null;
        }}
        onDelete={(id) => {
          useReminderStore.getState().remove(id);
          setModalOpen(false);
        }}
      />
    </motion.div>
  );
}
