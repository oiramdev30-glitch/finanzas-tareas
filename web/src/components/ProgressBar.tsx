'use client';

import { motion } from 'framer-motion';

export default function ProgressBar({
  value,
  color = '#8b7cf7',
  className = '',
}: {
  value: number;
  color?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-surface-strong ${className}`}>
      <motion.div
        className="h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}55` }}
      />
    </div>
  );
}
