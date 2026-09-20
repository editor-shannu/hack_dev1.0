'use client';

import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || navigator.webdriver) return;

    // Register service worker in production
    if (process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('PWA service worker registration failed:', err);
      });
    }

    // Only trigger reload on update if an existing controlling worker was already running
    const hadController = Boolean(navigator.serviceWorker.controller);

    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_UPDATED' && hadController) {
        // Small delay so SW finishes claiming all clients before reload
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSWMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSWMessage);
    };
  }, []);

  return null;
}
