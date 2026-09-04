'use client';

import { motion } from 'framer-motion';
import { fadeUp } from '@/lib/motion';

export default function GlassCard({
  children,
  className = '',
  compact = false,
  glow = false,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
  glow?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      variants={fadeUp}
      custom={delay}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-40px' }}
      className={`rounded-[28px] ${compact ? 'p-4' : 'p-6'} ${
        glow ? 'glass glass-glow' : 'glass'
      } transition-transform duration-300 hover:-translate-y-0.5 ${className}`}
    >
      {children}
    </motion.div>
  );
}
