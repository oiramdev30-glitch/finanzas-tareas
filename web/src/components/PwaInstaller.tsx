'use client';

import { useEffect } from 'react';

export default function PwaInstaller() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return;
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration failed', err);
    });
  }, []);
  return null;
}
