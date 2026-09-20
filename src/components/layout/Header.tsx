'use client';

import React, { useState, useEffect } from 'react';
import { Pill, Calendar, Clock, Bell, BarChart2 } from 'lucide-react';
import { getAdherenceStreak } from '@/lib/storage';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';

interface HeaderProps {
  onOpenUpload: () => void;
  onOpenEMR?: () => void;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  activeTab: 'schedule' | 'cabinet' | 'adherence';
  setActiveTab: (tab: 'schedule' | 'cabinet' | 'adherence') => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onOpenUpload, 
  onOpenEMR,
  onOpenSettings,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  activeTab, 
  setActiveTab 
}) => {
  const [streak, setStreak] = useState<{ currentStreakDays: number; bestStreakDays: number }>({
    currentStreakDays: 5,
    bestStreakDays: 14,
  });
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    setStreak(getAdherenceStreak());

    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }) +
          ' · ' +
          now.toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
          })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);

    const handleUpdate = () => {
      setStreak(getAdherenceStreak());
    };
    window.addEventListener('prescriptime-data-updated', handleUpdate);

    return () => {
      clearInterval(timer);
      window.removeEventListener('prescriptime-data-updated', handleUpdate);
    };
  }, []);

  return (
    <header className="sticky top-2 sm:top-4 z-40 w-full max-w-7xl mx-auto px-3 sm:px-4 mb-3 sm:mb-6">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl px-3.5 py-2.5 sm:px-6 sm:py-4 flex items-center justify-between gap-3 sm:gap-4 border border-slate-200/90 dark:border-slate-800/90 shadow-sm transition-colors">
        {/* Logo & Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-[#0B58B6] via-[#1B89E5] to-[#00A8FF] shadow-md shadow-blue-500/20 flex-shrink-0">
            <Pill className="w-5 h-5 sm:w-6 sm:h-6 text-white transform -rotate-45" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Prescrip<span className="text-[#0F58B6] dark:text-blue-400">time</span>
              </span>
              <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#0F58B6] dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-mono font-bold">
                Clinical
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block">Intelligent Prescription Organizer &amp; Medicine Routine</p>
          </div>
        </div>

        {/* Tab Navigation (Desktop Only - Routine accessible via quick actions and mobile nav) */}
        <div className="hidden md:flex items-center justify-center gap-1 bg-slate-100 dark:bg-slate-800/90 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            id="header-tab-cabinet"
            onClick={() => setActiveTab('cabinet')}
            className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'cabinet'
                ? 'bg-white dark:bg-slate-900 text-[#0F58B6] dark:text-blue-400 shadow-sm border border-slate-200/80 dark:border-slate-700 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Rx &amp; Health Records</span>
          </button>

          <button
            id="header-tab-adherence"
            onClick={() => setActiveTab('adherence')}
            className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'adherence'
                ? 'bg-white dark:bg-slate-900 text-[#0F58B6] dark:text-blue-400 shadow-sm border border-slate-200/80 dark:border-slate-700 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Adherence</span>
          </button>
        </div>

        {/* Right Side Controls: Notifications Icon in place of EMR + Profile/Settings */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications Button */}
          {onOpenNotifications && (
            <button
              id="header-notifications-btn"
              onClick={onOpenNotifications}
              className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-all active:scale-95 shadow-sm"
              title="View Notifications & Reminders"
              aria-label="View Notifications"
            >
              <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-700 dark:text-slate-200" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold font-mono rounded-full border-2 border-white dark:border-slate-900 animate-pulse">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>
          )}

          {/* Google Authentication & Settings */}
          <GoogleAuthButton onOpenEMR={onOpenEMR} onOpenSettings={onOpenSettings} />
        </div>
      </div>
    </header>
  );
};
