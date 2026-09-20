'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface LaserScannerProps {
  active: boolean;
  scanProgress?: number; // 0 to 100
}

export const LaserScanner: React.FC<LaserScannerProps> = ({ active, scanProgress = 0 }) => {
  const lineRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !lineRef.current || !glowRef.current) return;

    // Create GSAP continuous laser scanning timeline
    const tl = gsap.timeline({ repeat: -1, yoyo: true });
    tl.to([lineRef.current, glowRef.current], {
      top: '95%',
      duration: 1.8,
      ease: 'power2.inOut',
    });

    return () => {
      tl.kill();
    };
  }, [active]);

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl z-20">
      {/* Cyan/Emerald Laser Line */}
      <div
        ref={lineRef}
        className="absolute left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-cyber-cyan to-transparent shadow-[0_0_15px_#00f2fe]"
        style={{ top: '5%' }}
      />
      {/* Laser Diffuse Glow */}
      <div
        ref={glowRef}
        className="absolute left-0 right-0 h-16 -translate-y-1/2 bg-gradient-to-b from-cyber-cyan/15 via-cyber-emerald/10 to-transparent blur-md"
        style={{ top: '5%' }}
      />

      {/* Floating HUD scan coordinates */}
      <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/70 backdrop-blur-md border border-cyber-cyan/30 text-[10px] font-mono text-cyber-cyan flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-cyber-emerald animate-ping" />
        <span>OCR SCANNING: {scanProgress}%</span>
      </div>
    </div>
  );
};
