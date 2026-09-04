import { create } from 'zustand';
import { getDeviceId, supabase } from '@/lib/supabase';
import { computeBudgetSpent, computeMonthSummary, computeTotalBalance } from '@/lib/finance';
import { friendlyDbError, toErrorMessage } from '@/lib/errors';
import type {
  Account,
  AccountInput,
  AccountPatch,
  AccountType,
  AppTransaction,
  Budget,
  BudgetInput,
  Category,
  CategoryInput,
  CategoryType,
  TransactionInput,
  TransactionPatch,
  TransactionSource,
  TransactionStatus,
  TransactionType,
} from '@/lib/types';

export interface MonthSummary {
  income: number;
  expense: number;
  net: number;
}

interface FinanceState {
  accounts: Account[];
  categories: Category[];
  transactions: AppTransaction[];
  budgets: Budget[];
  isLoading: boolean;
  error: string | null;
  loadAll: () => Promise<void>;
  createAccount: (input: AccountInput) => Promise<void>;
  updateAccount: (id: string, patch: AccountPatch) => Promise<void>;
  archiveAccount: (id: string) => Promise<void>;
  createTransaction: (input: TransactionInput) => Promise<void>;
  updateTransaction: (id: string, patch: TransactionPatch) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  createCategory: (input: CategoryInput) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  createBudget: (input: BudgetInput) => Promise<void>;
  totalBalance: () => number;
  getMonthSummary: (monthKey: string) => MonthSummary;
  clearError: () => void;
}

type Row = Record<string, unknown>;

function toNumber(value: unknown): number {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function mapAccount(row: Row): Account {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: String(row.name),
    type: row.type as AccountType,
    currency: String(row.currency),
    balance: toNumber(row.balance),
    color: asNullableString(row.color),
    icon: asNullableString(row.icon),
    include_in_balance: row.include_in_balance === true,
    archived_at: asNullableString(row.archived_at),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapCategory(row: Row): Category {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: String(row.name),
    type: row.type as CategoryType,
    icon: asNullableString(row.icon),
    color: asNullableString(row.color),
    is_default: row.is_default === true,
    created_at: String(row.created_at),
  };
}

function mapTransaction(row: Row): AppTransaction {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    account_id: String(row.account_id),
    category_id: asNullableString(row.category_id),
    type: row.type as TransactionType,
    amount: toNumber(row.amount),
    currency: String(row.currency),
    description: asNullableString(row.description),
    merchant: asNullableString(row.merchant),
    date: String(row.date),
    status: row.status as TransactionStatus,
    source: row.source as TransactionSource,
    receipt_text: asNullableString(row.receipt_text),
    transfer_account_id: asNullableString(row.transfer_account_id),
    is_opening_balance: row.is_opening_balance === true,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapBudget(row: Row): Budget {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    category_id: String(row.category_id),
    month: String(row.month),
    amount: toNumber(row.amount),
    spent: toNumber(row.spent),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export const useFinanceStore = create<FinanceState>()((set, get) => {
  async function fetchAccountsList(): Promise<Account[]> {
    const deviceId = getDeviceId();
    const { data, error } = await supabase.from('accounts').select('*').eq('user_id', deviceId).order('created_at');
    if (error) throw error;
    return (data ?? []).map(mapAccount);
  }

  async function fetchCategoriesList(): Promise<Category[]> {
    const deviceId = getDeviceId();
    const { data, error } = await supabase.from('categories').select('*').eq('user_id', deviceId).order('created_at');
    if (error) throw error;
    return (data ?? []).map(mapCategory);
  }

  async function fetchTransactionsList(): Promise<AppTransaction[]> {
    const deviceId = getDeviceId();
    const { data, error } = await supabase.from('transactions').select('*').eq('user_id', deviceId).order('date', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapTransaction);
  }

  async function fetchBudgetsList(): Promise<Budget[]> {
    const deviceId = getDeviceId();
    const { data, error } = await supabase.from('budgets').select('*').eq('user_id', deviceId).order('month', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapBudget);
  }

  async function syncBudgetSpent(): Promise<void> {
    const { transactions, budgets } = get();
    const computed = computeBudgetSpent(transactions, budgets);
    const diffs = computed.filter((item) => {
      const current = budgets.find((budget) => budget.id === item.id);
      return current !== undefined && current.spent !== item.spent;
    });
    if (diffs.length === 0) return;
    set((state) => ({
      budgets: state.budgets.map((budget) => {
        const diff = diffs.find((item) => item.id === budget.id);
        return diff ? { ...budget, spent: diff.spent } : budget;
      }),
    }));
    await Promise.all(
      diffs.map(async (item) => {
        try {
          await supabase.from('budgets').update({ spent: item.spent }).eq('id', item.id);
        } catch {
        }
      }),
    );
  }

  async function refreshAfterTransactionMutation(): Promise<void> {
    const [accounts, transactions, budgets] = await Promise.all([
      fetchAccountsList(),
      fetchTransactionsList(),
      fetchBudgetsList(),
    ]);
    set({ accounts, transactions, budgets });
    await syncBudgetSpent();
  }

  return {
    accounts: [],
    categories: [],
    transactions: [],
    budgets: [],
    isLoading: false,
    error: null,

    loadAll: async () => {
      set({ isLoading: true, error: null });
      try {
        const [accounts, categories, transactions, budgets] = await Promise.all([
          fetchAccountsList(),
          fetchCategoriesList(),
          fetchTransactionsList(),
          fetchBudgetsList(),
        ]);
        set({ accounts, categories, transactions, budgets, isLoading: false });
        await syncBudgetSpent();
      } catch (error) {
        set({ isLoading: false, error: toErrorMessage(error) });
        throw error;
      }
    },

    createAccount: async (input) => {
      const userId = getDeviceId();
      const { data, error } = await supabase.from('accounts').insert({
        user_id: userId,
        name: input.name,
        type: input.type,
        currency: input.currency ?? 'MXN',
        color: input.color ?? null,
        icon: input.icon ?? null,
        include_in_balance: input.include_in_balance ?? true,
      }).select('id').single();
      if (error) {
        const message = friendlyDbError(error, 'Ya tienes una cuenta con ese nombre y tipo.');
        set({ error: message });
        throw new Error(message);
      }
      const opening = toNumber(input.opening_balance);
      if (opening > 0) {
        const { error: openingError } = await supabase.from('transactions').insert({
          user_id: userId,
          account_id: data?.id,
          type: 'income',
          amount: opening,
          currency: input.currency ?? 'MXN',
          description: 'Balance inicial',
          source: 'manual',
          is_opening_balance: true,
        });
        if (openingError) {
          const message = friendlyDbError(openingError, 'No se pudo registrar el balance inicial.');
          const accounts = await fetchAccountsList();
          set({ accounts, error: message });
          throw new Error(message);
        }
      }
      const accounts = await fetchAccountsList();
      set({ accounts });
    },

    updateAccount: async (id, patch) => {
      const payload: Record<string, unknown> = {};
      if (patch.name !== undefined) payload.name = patch.name;
      if (patch.type !== undefined) payload.type = patch.type;
      if (patch.currency !== undefined) payload.currency = patch.currency;
      if (patch.color !== undefined) payload.color = patch.color;
      if (patch.icon !== undefined) payload.icon = patch.icon;
      if (patch.include_in_balance !== undefined) payload.include_in_balance = patch.include_in_balance;
      const { error } = await supabase.from('accounts').update(payload).eq('id', id);
      if (error) {
        set({ error: error.message });
        throw error;
      }
      const accounts = await fetchAccountsList();
      set({ accounts });
    },

    archiveAccount: async (id) => {
      const { error } = await supabase
        .from('accounts')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id);
      if (error) {
        set({ error: error.message });
        throw error;
      }
      const accounts = await fetchAccountsList();
      set({ accounts });
    },

    createTransaction: async (input) => {
      const userId = getDeviceId();
      const { error } = await supabase.from('transactions').insert({
        user_id: userId,
        account_id: input.account_id,
        category_id: input.category_id ?? null,
        type: input.type,
        amount: input.amount,
        currency: input.currency ?? 'MXN',
        description: input.description ?? null,
        merchant: input.merchant ?? null,
        date: input.date ?? new Date().toISOString(),
        status: input.status ?? 'completed',
        source: input.source ?? 'manual',
        receipt_text: input.receipt_text ?? null,
        transfer_account_id: input.transfer_account_id ?? null,
        is_opening_balance: input.is_opening_balance ?? false,
      });
      if (error) {
        set({ error: error.message });
        throw error;
      }
      await refreshAfterTransactionMutation();
    },

    updateTransaction: async (id, patch) => {
      const payload: Record<string, unknown> = {};
      if (patch.account_id !== undefined) payload.account_id = patch.account_id;
      if (patch.category_id !== undefined) payload.category_id = patch.category_id;
      if (patch.type !== undefined) payload.type = patch.type;
      if (patch.amount !== undefined) payload.amount = patch.amount;
      if (patch.currency !== undefined) payload.currency = patch.currency;
      if (patch.description !== undefined) payload.description = patch.description;
      if (patch.merchant !== undefined) payload.merchant = patch.merchant;
      if (patch.date !== undefined) payload.date = patch.date;
      if (patch.status !== undefined) payload.status = patch.status;
      if (patch.source !== undefined) payload.source = patch.source;
      if (patch.receipt_text !== undefined) payload.receipt_text = patch.receipt_text;
      if (patch.transfer_account_id !== undefined) payload.transfer_account_id = patch.transfer_account_id;
      if (patch.is_opening_balance !== undefined) payload.is_opening_balance = patch.is_opening_balance;
      const { error } = await supabase.from('transactions').update(payload).eq('id', id);
      if (error) {
        set({ error: error.message });
        throw error;
      }
      await refreshAfterTransactionMutation();
    },

    deleteTransaction: async (id) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) {
        set({ error: error.message });
        throw error;
      }
      await refreshAfterTransactionMutation();
    },

    createCategory: async (input) => {
      const userId = getDeviceId();
      const { error } = await supabase.from('categories').insert({
        user_id: userId,
        name: input.name,
        type: input.type,
        icon: input.icon ?? null,
        color: input.color ?? null,
      });
      if (error) {
        const message = friendlyDbError(error, 'Ya tienes una categoría con ese nombre y tipo.');
        set({ error: message });
        throw new Error(message);
      }
      const categories = await fetchCategoriesList();
      set({ categories });
    },

    deleteCategory: async (id) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) {
        set({ error: error.message });
        throw error;
      }
      const categories = await fetchCategoriesList();
      set({ categories });
    },

    createBudget: async (input) => {
      const userId = getDeviceId();
      const { error } = await supabase.from('budgets').insert({
        user_id: userId,
        category_id: input.category_id,
        month: input.month,
        amount: input.amount,
      });
      if (error) {
        const message = friendlyDbError(error, 'Ya existe un presupuesto para esa categoría y mes.');
        set({ error: message });
        throw new Error(message);
      }
      const budgets = await fetchBudgetsList();
      set({ budgets });
    },

    totalBalance: () => computeTotalBalance(get().accounts),

    getMonthSummary: (mk) =>
      computeMonthSummary(get().transactions, mk, { includeOpeningBalance: true }),

    clearError: () => set({ error: null }),
  };
});
