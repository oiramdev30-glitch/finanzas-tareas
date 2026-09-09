'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { BellRing, Home, Wallet } from 'lucide-react';

const TABS = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/finanzas', label: 'Finanzas', icon: Wallet },
  { href: '/config', label: 'Recordatorios', icon: BellRing },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed left-1/2 z-[60] w-[min(92%,26rem)] max-w-full -translate-x-1/2 overflow-x-hidden bottom-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.1 }}
        className="glass-strong grid grid-cols-3 items-center overflow-x-hidden rounded-[28px] px-2 py-2"
      >
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-1.5"
            >
              {active ? (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-2xl bg-gradient-to-r from-accent/25 to-[#22d3ee]/20"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              ) : null}
              <motion.span
                whileTap={{ scale: 0.85 }}
                className="relative z-10"
              >
                <Icon
                  size={21}
                  strokeWidth={active ? 2.4 : 2}
                  className={`relative z-10 transition-colors ${
                    active ? 'text-accent' : 'text-textSecondary'
                  }`}
                />
              </motion.span>
              <span
                className={`relative z-10 text-[10px] font-semibold transition-colors ${
                  active ? 'text-accent' : 'text-textSecondary'
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </motion.div>
    </nav>
  );
}
