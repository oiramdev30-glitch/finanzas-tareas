import { supabase } from './supabase';
import { config } from './config';

export interface ReceiptLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export type ReceiptConfidence = 'high' | 'medium' | 'low';

export interface ReceiptScanResult {
  merchant: string;
  total: number;
  currency: string;
  purchasedAt: string | null;
  categoryName: string | null;
  confidence: ReceiptConfidence;
  items: ReceiptLineItem[];
}

function positiveNumber(value: unknown, fallback: number): number {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : fallback;
}

function normalizeReceiptResult(raw: unknown): ReceiptScanResult {
  const object = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const rawItems = Array.isArray(object.items) ? object.items : [];
  const items: ReceiptLineItem[] = rawItems.slice(0, 50).map((item) => {
    const record = (typeof item === 'object' && item !== null ? item : {}) as Record<string, unknown>;
    return {
      description: typeof record.description === 'string' ? record.description.slice(0, 120) : 'Artículo',
      quantity: positiveNumber(record.quantity, 1),
      unitPrice: positiveNumber(record.unitPrice, 0),
      total: positiveNumber(record.total, 0),
    };
  });
  const total = positiveNumber(object.total, items.reduce((sum, item) => sum + item.total, 0));
  const confidence: ReceiptConfidence =
    object.confidence === 'high' || object.confidence === 'medium' ? object.confidence : 'low';
  return {
    merchant: typeof object.merchant === 'string' ? object.merchant.slice(0, 120) : '',
    total,
    currency:
      typeof object.currency === 'string' && object.currency.length === 3
        ? object.currency.toUpperCase()
        : 'MXN',
    purchasedAt: typeof object.purchasedAt === 'string' ? object.purchasedAt : null,
    categoryName: typeof object.categoryName === 'string' ? object.categoryName.slice(0, 60) : null,
    confidence,
    items,
  };
}

function serverErrorOf(data: unknown): string | null {
  if (typeof data === 'object' && data !== null) {
    const record = data as { error?: unknown; message?: unknown };
    if (typeof record.error === 'string') return record.error;
    if (typeof record.message === 'string') return record.message;
  }
  return null;
}

async function callProxy(action: string, payload: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke('openai-proxy', {
    body: { action, payload },
    headers: {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${config.supabaseAnonKey}`,
    },
  });
  if (error) {
    const status = (error as { status?: unknown })?.status;
    if (status === 401) {
      throw new Error(
        'La función de IA aún pide inicio de sesión. Despliega la versión actual con: supabase functions deploy openai-proxy, y configura el secret OPENAI_PROXY_ALLOW_ANON=true.',
      );
    }
    throw new Error(serverErrorOf(data) ?? error.message);
  }
  const serverError = serverErrorOf(data);
  if (serverError) {
    throw new Error(serverError);
  }
  return (data as { result?: unknown } | null)?.result;
}

export async function scanReceipt(base64Image: string): Promise<ReceiptScanResult> {
  if (!base64Image || base64Image.length < 100) {
    throw new Error('La imagen del recibo no es válida.');
  }
  const result = await callProxy('scanReceipt', { base64Image });
  return normalizeReceiptResult(result);
}

export interface SubtaskSuggestion {
  title: string;
  estimatedMinutes: number;
}

export const BREAKDOWN_MAX_ITEMS = 12;

function clampEstimateMinutes(value: number): number {
  return Math.max(1, Math.min(1440, Math.round(value)));
}

function normalizeBreakdown(raw: unknown): SubtaskSuggestion[] {
  const object = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const rawSubtasks = Array.isArray(object.subtasks) ? object.subtasks : [];
  return rawSubtasks.slice(0, BREAKDOWN_MAX_ITEMS).flatMap((item): SubtaskSuggestion[] => {
    const record = (typeof item === 'object' && item !== null ? item : {}) as Record<string, unknown>;
    if (typeof record.title !== 'string' || record.title.length === 0) {
      return [];
    }
    return [
      {
        title: record.title.slice(0, 300),
        estimatedMinutes: clampEstimateMinutes(positiveNumber(record.estimatedMinutes, 5)),
      },
    ];
  });
}

export async function breakdownTask(title: string, description?: string): Promise<SubtaskSuggestion[]> {
  const result = await callProxy('breakdownTask', { title, description: description || undefined });
  return normalizeBreakdown(result);
}

export interface SuggestedBudget {
  category: string;
  amount: number;
}

export interface FinanceAdvice {
  healthScore: number;
  verdict: string;
  insights: string[];
  actions: string[];
  suggestedBudgets: SuggestedBudget[];
}

function toStringList(value: unknown, max = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .slice(0, max)
    .map((item) => item.slice(0, 400));
}

function clampScore(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeAdvice(raw: unknown): FinanceAdvice {
  const object = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const rawBudgets = Array.isArray(object.suggestedBudgets) ? object.suggestedBudgets : [];
  const suggestedBudgets: SuggestedBudget[] = rawBudgets.slice(0, 10).flatMap((item) => {
    const record = (typeof item === 'object' && item !== null ? item : {}) as Record<string, unknown>;
    if (typeof record.category !== 'string' || record.category.length === 0) return [];
    const amount = typeof record.amount === 'number' ? record.amount : Number(record.amount);
    return [{ category: record.category.slice(0, 60), amount: Number.isFinite(amount) && amount > 0 ? amount : 0 }];
  });
  return {
    healthScore: clampScore(object.healthScore),
    verdict: typeof object.verdict === 'string' && object.verdict.length > 0
      ? object.verdict.slice(0, 600)
      : 'Sin diagnóstico disponible.',
    insights: toStringList(object.insights, 6),
    actions: toStringList(object.actions, 6),
    suggestedBudgets,
  };
}

export async function analyzeFinances(summaryText: string): Promise<FinanceAdvice> {
  const result = await callProxy('analyzeFinances', { summaryText });
  return normalizeAdvice(result);
}
