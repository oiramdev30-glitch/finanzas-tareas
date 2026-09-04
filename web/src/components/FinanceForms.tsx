'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Check, ChevronDown, ChevronLeft, ChevronRight, Plus, Repeat, Tag, Trash2, X } from 'lucide-react';
import { GlassButton } from './GlassButton';
import DatePicker from './DatePicker';
import { useFinanceStore } from '@/stores/useFinanceStore';
import { getDefaultCurrency } from '@/lib/settings';
import { scanReceipt } from '@/lib/openai';
import type { Account, AccountType, AppTransaction, CategoryType, TransactionType } from '@/lib/types';

function Modal({ open, onClose, title, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 60, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 60, opacity: 0, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="glass-strong w-full max-w-md rounded-[24px] p-6 shadow-2xl ring-1 ring-white/10"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[20px] font-bold tracking-wide text-textPrimary">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white/5 text-textSecondary hover:bg-white/10"
            aria-label="Cerrar"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

const inputClass =
  'w-full rounded-2xl border border-white/15 bg-white/[0.07] px-4 py-3 text-[15px] text-textPrimary placeholder:text-textTertiary outline-none focus:border-accent transition-all focus:ring-2 focus:ring-accent/25';

const inputErrorClass =
  'w-full rounded-2xl border border-danger bg-danger/[0.08] px-4 py-3 text-[15px] text-textPrimary placeholder:text-textTertiary outline-none focus:border-danger transition-all focus:ring-2 focus:ring-danger/25';

function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-[12px] text-danger">{message}</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[13px] text-textSecondary">{label}</label>
      {children}
    </div>
  );
}

function SelectField({ value, onChange, options, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDocClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDocClick);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        className={`w-full rounded-2xl border bg-white/[0.07] px-4 py-3 text-left text-[15px] outline-none transition-all ${
          focus ? 'border-accent ring-2 ring-accent/25' : 'border-white/15'
        } ${selected ? 'text-textPrimary' : 'text-textTertiary'}`}
      >
        <span className="pointer-events-none flex items-center justify-between">
          <span className="truncate">
            {selected ? selected.label : (placeholder ?? 'Selecciona...')}
          </span>
          <ChevronDown
            size={18}
            strokeWidth={2}
            className={`ml-2 shrink-0 text-textSecondary transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="absolute left-0 right-0 z-50 mt-2 max-h-56 overflow-y-auto rounded-2xl border border-white/15 bg-[#17171f]/95 p-1 shadow-2xl"
          >
            {placeholder ? (
              <li>
                <button
                  type="button"
                  className="w-full rounded-xl px-3 py-2.5 text-left text-[14px] text-textSecondary hover:bg-white/10"
                  onClick={() => {
                    onChange('');
                    setOpen(false);
                  }}
                >
                  {placeholder}
                </button>
              </li>
            ) : null}
            {options.map((o) => {
              const isSelected = o.value === value;
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[14px] transition-colors hover:bg-white/10"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                  >
                    <span className={isSelected ? 'font-semibold text-white' : 'text-textPrimary'}>
                      {o.label}
                    </span>
                    {isSelected ? (
                      <Check size={16} strokeWidth={2.5} className="text-accent" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'debit', label: 'Débito' },
  { value: 'credit', label: 'Crédito' },
  { value: 'savings', label: 'Ahorro' },
  { value: 'investment', label: 'Inversión' },
];

const TRANSACTION_TYPES: { value: TransactionType; label: string }[] = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Ingreso' },
];

const CURRENCIES = ['MXN', 'USD'] as const;

export function NewAccountModal({
  open,
  onClose,
  account,
}: {
  open: boolean;
  onClose: () => void;
  account?: Account | null;
}) {
  const editing = !!account;
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('cash');
  const [currency, setCurrency] = useState<string>(() => getDefaultCurrency());
  const [includeInBalance, setIncludeInBalance] = useState(true);
  const [openingBalance, setOpeningBalance] = useState('');
  const [color, setColor] = useState('#8b7cf7');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [openingError, setOpeningError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(account?.name ?? '');
      setType(account?.type ?? 'cash');
      setCurrency(account?.currency ?? getDefaultCurrency());
      setIncludeInBalance(account?.include_in_balance ?? true);
      setColor(account?.color ?? '#8b7cf7');
      setOpeningBalance('');
      setError(null);
      setNameError(null);
      setOpeningError(null);
    }
  }, [open, account]);

  const handleSubmit = async () => {
    let hasError = false;
    if (!name.trim()) {
      setNameError('Escribe un nombre para la cuenta.');
      hasError = true;
    } else {
      setNameError(null);
    }
    if (openingBalance.trim()) {
      const opening = Number(openingBalance);
      if (!Number.isFinite(opening) || opening < 0) {
        setOpeningError('El balance inicial no puede ser negativo.');
        hasError = true;
      } else {
        setOpeningError(null);
      }
    } else {
      setOpeningError(null);
    }
    if (hasError) {
      setError(null);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editing && account) {
        await useFinanceStore.getState().updateAccount(account.id, {
          name: name.trim(),
          type,
          currency,
          include_in_balance: includeInBalance,
          color,
        });
      } else {
        const opening = Number(openingBalance);
        await useFinanceStore.getState().createAccount({
          name: name.trim(),
          type,
          currency,
          include_in_balance: includeInBalance,
          opening_balance: Number.isFinite(opening) ? opening : 0,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la cuenta.');
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar cuenta' : 'Nueva cuenta'}>
      <div className="flex flex-col gap-4">
        <Field label="Nombre *">
          <input
            className={nameError ? inputErrorClass : inputClass}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(null);
            }}
            placeholder="Ej. Efectivo"
          />
          <FieldError message={nameError} />
        </Field>
        <Field label="Tipo">
          <div className="flex flex-wrap gap-2">
            {ACCOUNT_TYPES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setType(value)}
                className={`rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  type === value
                    ? 'border-accent bg-accent/20 text-accent'
                    : 'border-border bg-white/5 text-textSecondary hover:bg-white/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Moneda">
          <SelectField value={currency} onChange={setCurrency} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
        </Field>
        {!editing ? (
          <Field label="Balance inicial (opcional)">
            <input
              type="number"
              min={0}
              step="0.01"
              className={openingError ? inputErrorClass : inputClass}
              value={openingBalance}
              onChange={(e) => {
                setOpeningBalance(e.target.value);
                if (openingError) setOpeningError(null);
              }}
              placeholder="Ej. 5000.00"
            />
            <FieldError message={openingError} />
          </Field>
        ) : null}
        <Field label="Color">
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                className="flex h-8 w-8 items-center justify-center rounded-full transition-transform"
                style={{ backgroundColor: c }}
              >
                {color === c ? (
                  <Check size={15} strokeWidth={3} className="text-white drop-shadow" />
                ) : null}
              </button>
            ))}
          </div>
        </Field>
        <label className="flex items-center gap-3 text-[14px] text-textPrimary">
          <input
            type="checkbox"
            checked={includeInBalance}
            onChange={(e) => setIncludeInBalance(e.target.checked)}
            className="h-4 w-4 accent-[#8b7cf7]"
          />
          Incluir en el balance total
        </label>
        {error ? <p className="text-[13px] text-danger">{error}</p> : null}
        <GlassButton title={editing ? 'Guardar cambios' : 'Guardar cuenta'} icon={Check} loading={saving} onClick={() => void handleSubmit()} />
      </div>
    </Modal>
  );
}

export function NewBudgetModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const categories = useFinanceStore((state) => state.categories);
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  useEffect(() => {
    if (open) {
      setCategoryId(expenseCategories[0]?.id ?? '');
      setAmount('');
      setError(null);
      setAmountError(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    let hasError = false;
    if (!categoryId) {
      setError('Selecciona una categoría.');
      hasError = true;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setAmountError('Escribe un monto mayor a 0.');
      hasError = true;
    } else {
      setAmountError(null);
    }
    if (hasError) return;
    setSaving(true);
    setError(null);
    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      await useFinanceStore.getState().createBudget({ category_id: categoryId, month, amount: value });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el presupuesto.');
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo presupuesto">
      <div className="flex flex-col gap-4">
        <Field label="Categoría">
          <SelectField value={categoryId} onChange={setCategoryId} options={expenseCategories.map((c) => ({ value: c.id, label: c.name }))} />
        </Field>
        <Field label="Monto del mes">
          <input
            type="number"
            min={0}
            className={amountError ? inputErrorClass : inputClass}
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (amountError) setAmountError(null);
            }}
            placeholder="Ej. 3000"
          />
          <FieldError message={amountError} />
        </Field>
        {error ? <p className="text-[13px] text-danger">{error}</p> : null}
        <GlassButton title="Guardar presupuesto" icon={Check} loading={saving} onClick={() => void handleSubmit()} />
      </div>
    </Modal>
  );
}

export interface TransactionInitial {
  amount?: number;
  description?: string;
}

export function NewTransactionModal({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: TransactionInitial }) {
  const accounts = useFinanceStore((state) => state.accounts).filter((a) => a.archived_at === null);
  const categories = useFinanceStore((state) => state.categories);
  const [type, setType] = useState<TransactionType>('expense');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState('');
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const accountCurrency = accounts.find((a) => a.id === accountId)?.currency ?? 'MXN';
  const filteredCategories = categories.filter((c) => (type === 'expense' ? c.type === 'expense' : c.type === 'income'));

  useEffect(() => {
    if (open) {
      setStep(1);
      setType('expense');
      setAccountId(accounts[0]?.id ?? '');
      setCategoryId('');
      setAmount(initial?.amount && initial.amount > 0 ? String(initial.amount) : '');
      setDescription(initial?.description ?? '');
      setMerchant('');
      setDate(isoDate(new Date()));
      setError(null);
      setAccountError(null);
      setAmountError(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTypeChange = (next: TransactionType) => {
    setType(next);
    setCategoryId('');
  };

  const handleScan = async (file: File) => {
    setScanning(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      const result = await scanReceipt(base64);
      setMerchant(result.merchant);
      setAmount(result.total > 0 ? String(result.total) : '');
      if (result.categoryName && filteredCategories.some((c) => c.name.toLowerCase() === result.categoryName?.toLowerCase())) {
        const match = filteredCategories.find((c) => c.name.toLowerCase() === result.categoryName!.toLowerCase());
        if (match) setCategoryId(match.id);
      }
      if (result.purchasedAt) {
        const d = new Date(result.purchasedAt);
        if (!Number.isNaN(d.getTime())) setDate(isoDate(d));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el recibo.');
    } finally {
      setScanning(false);
    }
  };

  const handleNext = () => {
    let hasError = false;
    if (!accountId) {
      setAccountError('Selecciona una cuenta.');
      hasError = true;
    } else {
      setAccountError(null);
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setAmountError('Escribe un monto mayor a 0.');
      hasError = true;
    } else {
      setAmountError(null);
    }
    if (hasError) {
      setError(null);
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleSubmit = async () => {
    const value = Number(amount);
    setSaving(true);
    setError(null);
    try {
      await useFinanceStore.getState().createTransaction({
        account_id: accountId,
        category_id: categoryId || null,
        type,
        amount: value,
        currency: accountCurrency,
        description: description.trim() || null,
        merchant: merchant.trim() || null,
        date: date ? new Date(date).toISOString() : undefined,
        source: 'manual',
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el movimiento.');
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo movimiento">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleScan(file);
          e.target.value = '';
        }}
      />
      <div className="flex flex-col gap-4">
        <div className="mb-1 flex items-center justify-center gap-2">
          <span className={`h-2 w-2 rounded-full ${step === 1 ? 'bg-accent' : 'bg-white/20'}`} />
          <span className={`h-2 w-2 rounded-full ${step === 2 ? 'bg-accent' : 'bg-white/20'}`} />
        </div>

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {TRANSACTION_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleTypeChange(value)}
                  className={`rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                    type === value
                      ? 'border-accent bg-accent/20 text-accent'
                      : 'border-border bg-white/5 text-textSecondary hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => fileRef.current?.click()}
              className="rounded-2xl border border-dashed border-accent/40 bg-accent/10 p-4 text-left transition-colors hover:bg-accent/15"
            >
              <div className="flex items-center gap-3">
                {scanning ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                ) : (
                  <Camera size={18} strokeWidth={2} className="text-accent" />
                )}
                <div className="flex flex-col">
                  <span className="text-[14px] font-semibold text-textPrimary">
                    {scanning ? 'Leyendo recibo...' : 'Escanear recibo con IA'}
                  </span>
                  <span className="text-[12px] text-textSecondary">
                    Toma una foto y la IA llena los datos por ti
                  </span>
                </div>
              </div>
            </motion.button>

            <Field label="Cuenta">
              <SelectField value={accountId} onChange={setAccountId} options={accounts.map((a) => ({ value: a.id, label: a.name }))} />
              <FieldError message={accountError} />
            </Field>
            <Field label="Categoría">
              <SelectField
                value={categoryId}
                onChange={setCategoryId}
                placeholder="Sin categoría"
                options={filteredCategories.map((c) => ({ value: c.id, label: c.name }))}
              />
            </Field>
            <Field label="Monto *">
              <input
                type="number"
                min={0}
                step="0.01"
                className={amountError ? inputErrorClass : inputClass}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (amountError) setAmountError(null);
                }}
                placeholder={`Ej. 250.00 (${accountCurrency})`}
              />
              <FieldError message={amountError} />
            </Field>
            {error ? <p className="text-[13px] text-danger">{error}</p> : null}
            <GlassButton title="Siguiente" icon={ChevronRight} onClick={handleNext} />
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <Field label="Descripción">
              <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej. Supermercado" />
            </Field>
            <Field label="Comercio">
              <input className={inputClass} value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="Ej. Walmart" />
            </Field>
            <Field label="Fecha">
              <DatePicker value={date} onChange={setDate} />
            </Field>
            {error ? <p className="text-[13px] text-danger">{error}</p> : null}
            <div className="flex gap-3">
              <GlassButton title="Atrás" icon={ChevronLeft} variant="secondary" onClick={() => setStep(1)} />
              <GlassButton title="Guardar movimiento" icon={Plus} loading={saving} onClick={() => void handleSubmit()} />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const CATEGORY_COLORS = [
  '#8b7cf7',
  '#22d3ee',
  '#4ade80',
  '#fbbf24',
  '#f87171',
  '#60a5fa',
  '#f472b6',
  '#fb923c',
];

export function NewCategoryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('expense');
  const [color, setColor] = useState<string>('#8b7cf7');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setType('expense');
      setColor('#8b7cf7');
      setError(null);
      setNameError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setNameError('Escribe un nombre para la categoría.');
      return;
    }
    setNameError(null);
    setSaving(true);
    setError(null);
    try {
      await useFinanceStore.getState().createCategory({
        name: name.trim(),
        type,
        color,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la categoría.');
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nueva categoría">
      <div className="flex flex-col gap-4">
        <Field label="Nombre *">
          <input
            className={nameError ? inputErrorClass : inputClass}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(null);
            }}
            placeholder="Ej. Comida, Transporte"
          />
          <FieldError message={nameError} />
        </Field>
        <Field label="Tipo">
          <div className="flex flex-wrap gap-2">
            {(['expense', 'income'] as const).map((value) => (
              <button
                key={value}
                onClick={() => setType(value)}
                className={`rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  type === value
                    ? 'border-accent bg-accent/20 text-accent'
                    : 'border-border bg-white/5 text-textSecondary hover:bg-white/10'
                }`}
              >
                {value === 'expense' ? 'Gasto' : 'Ingreso'}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Color">
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                className="flex h-8 w-8 items-center justify-center rounded-full transition-transform"
                style={{ backgroundColor: c }}
              >
                {color === c ? (
                  <Check size={15} strokeWidth={3} className="text-white drop-shadow" />
                ) : null}
              </button>
            ))}
          </div>
        </Field>
        {error ? <p className="text-[13px] text-danger">{error}</p> : null}
        <GlassButton title="Guardar categoría" icon={Tag} loading={saving} onClick={() => void handleSubmit()} />
      </div>
    </Modal>
  );
}

export function TransferModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const accounts = useFinanceStore((state) => state.accounts).filter((a) => a.archived_at === null);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [accountPairError, setAccountPairError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFromId(accounts[0]?.id ?? '');
      setToId(accounts[1]?.id ?? '');
      setAmount('');
      setDate(isoDate(new Date()));
      setDescription('');
      setError(null);
      setAmountError(null);
      setAccountPairError(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    let hasError = false;
    if (!fromId || !toId) {
      setAccountPairError('Selecciona ambas cuentas.');
      hasError = true;
    } else if (fromId === toId) {
      setAccountPairError('La cuenta de origen y destino deben ser diferentes.');
      hasError = true;
    } else {
      setAccountPairError(null);
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setAmountError('Escribe un monto mayor a 0.');
      hasError = true;
    } else {
      setAmountError(null);
    }
    if (hasError) {
      setError(null);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await useFinanceStore.getState().createTransaction({
        account_id: fromId,
        transfer_account_id: toId,
        type: 'transfer',
        amount: value,
        description: description.trim() || null,
        date: date ? new Date(date).toISOString() : undefined,
        source: 'manual',
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la transferencia.');
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Transferencia">
      <div className="flex flex-col gap-4">
        <Field label="Desde">
          <SelectField value={fromId} onChange={setFromId} options={accounts.map((a) => ({ value: a.id, label: a.name }))} />
        </Field>
        <Field label="Hacia">
          <SelectField value={toId} onChange={setToId} options={accounts.map((a) => ({ value: a.id, label: a.name }))} />
        </Field>
        <Field label="Monto *">
          <input
            type="number"
            min={0}
            step="0.01"
            className={amountError ? inputErrorClass : inputClass}
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (amountError) setAmountError(null);
            }}
            placeholder="Ej. 1000.00"
          />
          <FieldError message={amountError} />
          <FieldError message={accountPairError} />
        </Field>
        <Field label="Fecha">
          <DatePicker value={date} onChange={setDate} />
        </Field>
        <Field label="Descripción">
          <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej. Pago de renta" />
        </Field>
        {error ? <p className="text-[13px] text-danger">{error}</p> : null}
        <GlassButton title="Transferir" icon={Repeat} loading={saving} onClick={() => void handleSubmit()} />
      </div>
    </Modal>
  );
}

export function EditTransactionModal({
  open,
  onClose,
  transaction,
}: {
  open: boolean;
  onClose: () => void;
  transaction: AppTransaction | null;
}) {
  const categories = useFinanceStore((state) => state.categories);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);

  useEffect(() => {
    if (open && transaction) {
      setAmount(String(transaction.amount));
      setDescription(transaction.description ?? '');
      setMerchant(transaction.merchant ?? '');
      setDate(transaction.date ? transaction.date.slice(0, 10) : '');
      setCategoryId(transaction.category_id ?? '');
      setError(null);
      setAmountError(null);
    }
  }, [open, transaction]);

  const filteredCategories = categories.filter((c) =>
    transaction?.type === 'expense' ? c.type === 'expense' : c.type === 'income',
  );

  const handleSubmit = async () => {
    if (!transaction) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setAmountError('Escribe un monto mayor a 0.');
      return;
    }
    setAmountError(null);
    setSaving(true);
    setError(null);
    try {
      await useFinanceStore.getState().updateTransaction(transaction.id, {
        amount: value,
        description: description.trim() || null,
        merchant: merchant.trim() || null,
        date: date ? new Date(date).toISOString() : transaction.date,
        category_id: categoryId || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el movimiento.');
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Editar movimiento">
      <div className="flex flex-col gap-4">
        {transaction?.is_opening_balance ? (
          <p className="rounded-xl border border-info/30 bg-info/10 px-3 py-2 text-[13px] text-info">
            Este es el balance inicial de una cuenta. Puedes editar el monto para corregirlo.
          </p>
        ) : null}
        <Field label="Monto *">
          <input
            type="number"
            min={0}
            step="0.01"
            className={amountError ? inputErrorClass : inputClass}
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (amountError) setAmountError(null);
            }}
            placeholder="Ej. 250.00"
          />
          <FieldError message={amountError} />
        </Field>
        <Field label="Categoría">
          <SelectField
            value={categoryId}
            onChange={setCategoryId}
            placeholder="Sin categoría"
            options={filteredCategories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Field>
        <Field label="Descripción">
          <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej. Supermercado" />
        </Field>
        <Field label="Comercio">
          <input className={inputClass} value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="Ej. Walmart" />
        </Field>
        <Field label="Fecha">
          <DatePicker value={date} onChange={setDate} />
        </Field>
        {error ? <p className="text-[13px] text-danger">{error}</p> : null}
        <GlassButton title="Guardar cambios" icon={Check} loading={saving} onClick={() => void handleSubmit()} />
      </div>
    </Modal>
  );
}

export function ManageCategoriesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const categories = useFinanceStore((state) => state.categories);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (id: string, isDefault: boolean) => {
    if (isDefault) {
      setError('Las categorías por defecto no se pueden eliminar.');
      return;
    }
    setDeleting(id);
    setError(null);
    try {
      await useFinanceStore.getState().deleteCategory(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la categoría.');
      setDeleting(null);
    }
  };

  const expense = categories.filter((c) => c.type === 'expense');
  const income = categories.filter((c) => c.type === 'income');

  return (
    <Modal open={open} onClose={onClose} title="Categorías">
      <div className="flex flex-col gap-5">
        {error ? <p className="text-[13px] text-danger">{error}</p> : null}
        <div className="flex flex-col gap-2">
          <h3 className="text-[14px] font-semibold text-textSecondary">Gastos</h3>
          {expense.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.05] px-3 py-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color ?? '#8b7cf7' }} />
              <span className="flex-1 text-[14px] text-textPrimary">{c.name}</span>
              {c.is_default ? (
                <span className="text-[11px] text-textTertiary">Por defecto</span>
              ) : (
                <button
                  onClick={() => void handleDelete(c.id, false)}
                  disabled={deleting === c.id}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-white/5 text-textSecondary hover:bg-white/10"
                  aria-label={`Eliminar ${c.name}`}
                >
                  {deleting === c.id ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Trash2 size={14} strokeWidth={2} />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-[14px] font-semibold text-textSecondary">Ingresos</h3>
          {income.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.05] px-3 py-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color ?? '#8b7cf7' }} />
              <span className="flex-1 text-[14px] text-textPrimary">{c.name}</span>
              {c.is_default ? (
                <span className="text-[11px] text-textTertiary">Por defecto</span>
              ) : (
                <button
                  onClick={() => void handleDelete(c.id, false)}
                  disabled={deleting === c.id}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-white/5 text-textSecondary hover:bg-white/10"
                  aria-label={`Eliminar ${c.name}`}
                >
                  {deleting === c.id ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Trash2 size={14} strokeWidth={2} />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
