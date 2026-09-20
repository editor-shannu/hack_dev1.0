'use client';

import { useEffect } from 'react';

let lockCount = 0;
let originalBodyOverflow = '';
let originalHtmlOverflow = '';
let originalTouchAction = '';

/**
 * Custom hook to lock document body & html scrolling while a modal/dialog is open.
 * Integrates with Lenis smooth scrolling (stopping virtual scroll while open).
 * Prevents wheel, trackpad, and touch gestures from scrolling background page content.
 * Uses reference counting so nested or sequential modals don't prematurely unlock the body.
 */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked || typeof document === 'undefined') return;

    if (lockCount === 0) {
      originalBodyOverflow = document.body.style.overflow;
      originalHtmlOverflow = document.documentElement.style.overflow;
      originalTouchAction = document.body.style.touchAction;

      // Lock document & body overflow
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      // Pause Lenis smooth scrolling if active
      if (typeof window !== 'undefined' && (window as any).__lenis) {
        try {
          (window as any).__lenis.stop();
        } catch {}
      }
    }
    lockCount++;

    return () => {
      lockCount--;
      if (lockCount <= 0) {
        lockCount = 0;
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.touchAction = originalTouchAction;

        // Resume Lenis smooth scrolling
        if (typeof window !== 'undefined' && (window as any).__lenis) {
          try {
            (window as any).__lenis.start();
          } catch {}
        }
      }
    };
  }, [isLocked]);
}


