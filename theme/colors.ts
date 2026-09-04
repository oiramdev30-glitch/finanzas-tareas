export const palette = {
  backgroundTop: '#0a0a0c',
  backgroundBottom: '#121218',
  textPrimary: '#f2f3f7',
  textSecondary: 'rgba(242, 243, 247, 0.64)',
  textTertiary: 'rgba(242, 243, 247, 0.38)',
  accent: '#8b7cf7',
  onAccent: '#ffffff',
  success: '#4ade80',
  warning: '#fbbf24',
  danger: '#f87171',
  info: '#60a5fa',
} as const;

export function withAlpha(hexColor: string, alpha: number): string {
  const cleanHash = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;
  const expanded =
    cleanHash.length === 3
      ? cleanHash
          .split('')
          .map((digit) => digit + digit)
          .join('')
      : cleanHash;
  if (expanded.length !== 6) {
    return hexColor;
  }
  const parsed = Number.parseInt(expanded, 16);
  if (Number.isNaN(parsed)) {
    return hexColor;
  }
  const r = (parsed >> 16) & 0xff;
  const g = (parsed >> 8) & 0xff;
  const b = parsed & 0xff;
  const clamped = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}