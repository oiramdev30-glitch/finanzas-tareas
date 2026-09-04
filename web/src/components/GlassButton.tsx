'use client';

import { motion } from 'framer-motion';

type Variant = 'primary' | 'secondary' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-gradient-to-r from-accent to-[#22d3ee] text-onAccent shadow-[0_8px_30px_-12px_rgba(139,124,247,0.9)]',
  secondary: 'glass-strong text-textPrimary hover:bg-white/10',
  danger: 'border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'w-full px-5 py-3.5 text-base',
};

interface GlassButtonProps {
  title: string;
  variant?: Variant;
  size?: Size;
  icon?: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

export function GlassButton({
  title,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  onClick,
  className = '',
}: GlassButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={loading}
      whileTap={{ scale: loading ? 1 : 0.96 }}
      whileHover={loading ? undefined : { scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-colors disabled:opacity-60 ${
        VARIANT_CLASSES[variant]
      } ${SIZE_CLASSES[size]} ${className}`}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : Icon ? (
        <Icon size={16} strokeWidth={2} />
      ) : null}
      {title}
    </motion.button>
  );
}
