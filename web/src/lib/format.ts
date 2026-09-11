import type { AccountType } from './types';

const DAY_MS = 86_400_000;

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: 'Efectivo',
  debit: 'Débito',
  credit: 'Crédito',
};

export function monthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthLabel(mk: string): string {
  const [year, month] = mk.split('-').map(Number);
  if (!year || !month) return mk;
  return new Date(year, month - 1, 1).toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  });
}

export function shiftMonthKey(mk: string, delta: number): string {
  const [year, month] = mk.split('-').map(Number);
  const d = new Date(year, (month ?? 1) - 1 + delta, 1);
  return monthKey(d);
}

export function formatCurrency(value: number, currency = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(value);
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

export function formatDueLabel(iso: string | null, now = new Date()): string | null {
  if (!iso) {
    return null;
  }
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) {
    return null;
  }
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const dayDiff = Math.round((startOfDue - startOfToday) / DAY_MS);
  if (dayDiff < 0) {
    return 'Vencida';
  }
  if (dayDiff === 0) {
    return 'Hoy';
  }
  if (dayDiff === 1) {
    return 'Mañana';
  }
  return `En ${dayDiff} días`;
}

export function formatMinutes(minutes: number | null | undefined): string | null {  if (!minutes || minutes <= 0) {
    return null;
  }
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function accountTypeLabel(type: AccountType): string {
  return ACCOUNT_TYPE_LABELS[type];
}

export type DueStatus = 'overdue' | 'today' | 'soon' | 'normal';

export function dueStatus(iso: string | null, now = new Date()): DueStatus {
  if (!iso) return 'normal';
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return 'normal';
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const dayDiff = Math.round((startOfDue - startOfToday) / DAY_MS);
  if (dayDiff < 0) return 'overdue';
  if (dayDiff === 0) return 'today';
  if (dayDiff <= 2) return 'soon';
  return 'normal';
}
