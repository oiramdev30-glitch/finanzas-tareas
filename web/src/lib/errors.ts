export function friendlyDbError(error: unknown, duplicateMessage: string): string {
  const record = (typeof error === 'object' && error !== null ? error : {}) as Record<string, unknown>;
  if (record.code === '23505') {
    return duplicateMessage;
  }
  if (record.code === '23503') {
    return 'La base de datos aún exige un usuario con cuenta. Ejecuta el SQL de claves foráneas en Supabase y reintenta.';
  }
  return toErrorMessage(error);
}

export function toErrorMessage(error: unknown, fallback = 'Ocurrió un error inesperado.'): string {
  if (typeof error === 'string' && error.length > 0) {
    const lower = error.toLowerCase();
    if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('fetch failed')) {
      return 'Sin conexión. Verifica tu internet e intenta de nuevo.';
    }
    return error;
  }
  if (error instanceof Error && error.message) {
    const lower = error.message.toLowerCase();
    if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('fetch failed')) {
      return 'Sin conexión. Verifica tu internet e intenta de nuevo.';
    }
    return error.message;
  }
  if (typeof error === 'object' && error !== null) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
    try {
      const json = JSON.stringify(error);
      if (json && json !== '{}') {
        return json;
      }
    } catch {
    }
  }
  return fallback;
}
