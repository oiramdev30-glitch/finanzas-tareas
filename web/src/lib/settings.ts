const DEFAULT_CURRENCY_KEY = 'finanzas.defaultCurrency';

export const SUPPORTED_CURRENCIES = ['MXN', 'USD'] as const;

export function getDefaultCurrency(): string {
  if (typeof window === 'undefined') return 'MXN';
  try {
    const stored = window.localStorage.getItem(DEFAULT_CURRENCY_KEY);
    if (stored && (SUPPORTED_CURRENCIES as readonly string[]).includes(stored)) {
      return stored;
    }
  } catch {
  }
  return 'MXN';
}

export function setDefaultCurrency(currency: string): void {
  try {
    window.localStorage.setItem(DEFAULT_CURRENCY_KEY, currency);
  } catch {
  }
}
