'use client';

export default function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.07] ${className}`} aria-hidden />;
}
