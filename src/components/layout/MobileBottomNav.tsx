'use client';

import React from 'react';
import { Home, Plus, Folder, ShieldAlert, BarChart2 } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'schedule' | 'cabinet' | 'adherence';
  setActiveTab: (tab: 'schedule' | 'cabinet' | 'adherence') => void;
  onOpenUpload: () => void;
  onOpenEMR?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenUpload,
  onOpenEMR,
}) => {
  return (
    <nav 
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-3 left-3 right-3 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xl shadow-blue-950/15 px-2 py-2 flex items-center justify-between transition-colors"
      id="mobile-bottom-nav"
    >
      {/* 1. Left: Routine / Schedule */}
      <button
        type="button"
        onClick={() => setActiveTab('schedule')}
        className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl transition-all active:scale-95 ${
          activeTab === 'schedule'
            ? 'text-white bg-[#0F58B6] shadow-md shadow-blue-600/25 font-bold'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80'
        }`}
        aria-label="Routine"
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Routine</span>
      </button>

      {/* 2. Left-Center: Cabinet / Records */}
      <button
        type="button"
        onClick={() => setActiveTab('cabinet')}
        className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl transition-all active:scale-95 ${
          activeTab === 'cabinet'
            ? 'text-white bg-[#0F58B6] shadow-md shadow-blue-600/25 font-bold'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80'
        }`}
        aria-label="Prescription Cabinet"
      >
        <Folder className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Cabinet</span>
      </button>

      {/* 3. EXACT CENTER: Elevated Upload Button */}
      <div className="flex-1 flex justify-center -mt-6">
        <button
          type="button"
          onClick={onOpenUpload}
          className="flex flex-col items-center justify-center group focus:outline-none"
          aria-label="Upload Prescription or Hospital Record"
          title="Upload Document"
          id="mobile-center-upload-btn"
        >
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#0F58B6] via-[#1B89E5] to-[#00A8FF] text-white flex items-center justify-center shadow-lg shadow-blue-600/35 group-hover:scale-105 active:scale-95 transition-all border-2 border-white dark:border-slate-900 ring-2 ring-blue-100 dark:ring-blue-950">
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-extrabold text-[#0F58B6] dark:text-blue-400 mt-0.5 tracking-tight">Upload</span>
        </button>
      </div>

      {/* 4. Right-Center: EMR Profile & AI Analysis */}
      <button
        type="button"
        onClick={onOpenEMR ? onOpenEMR : () => setActiveTab('cabinet')}
        className="flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all active:scale-95"
        aria-label="EMR Health Profile"
      >
        <ShieldAlert className="w-5 h-5 text-rose-500" />
        <span className="text-[10px] font-semibold mt-0.5">EMR</span>
      </button>

      {/* 5. Right: Adherence Analytics */}
      <button
        type="button"
        onClick={() => setActiveTab('adherence')}
        className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl transition-all active:scale-95 ${
          activeTab === 'adherence'
            ? 'text-white bg-[#0F58B6] shadow-md shadow-blue-600/25 font-bold'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80'
        }`}
        aria-label="Adherence Report"
      >
        <BarChart2 className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Adherence</span>
      </button>
    </nav>
  );
};
