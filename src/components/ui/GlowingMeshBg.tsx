'use client';

import React from 'react';

export const GlowingMeshBg: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Soft Clinical Blue & Sky Cyan Ambient Radial Glow */}
      <div className="absolute -top-40 -left-40 w-[650px] h-[650px] rounded-full bg-[#2098F2]/10 blur-[140px] animate-pulse-slow" />
      <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[150px] animate-pulse-slow" />
      <div className="absolute -bottom-40 left-1/3 w-[550px] h-[550px] rounded-full bg-teal-400/10 blur-[140px] animate-pulse-slow" />

      {/* Subtle Micro-Grid Texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(to right, #0F172A 1px, transparent 1px), linear-gradient(to bottom, #0F172A 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />
    </div>
  );
};
