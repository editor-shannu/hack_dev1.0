'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Moon,
  Sun,
  Laptop,
  Bell,
  AlertTriangle,
  ShieldCheck,
  Check,
  User,
  Sliders,
  LogOut,
  LogIn,
  Send,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  requestNotificationPermission,
  triggerTestNotification,
} from '@/lib/notifications';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  useBodyScrollLock(isOpen);
  const { user, signOutUser, signInWithGoogle } = useAuth();

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [doseReminders, setDoseReminders] = useState(true);
  const [missedAlerts, setMissedAlerts] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<string>('default');
  const [savedNotice, setSavedNotice] = useState(false);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load theme
    const savedTheme = localStorage.getItem('prescriptime_theme') as 'light' | 'dark' | 'system' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    }

    // Load notifications
    const prefs = getNotificationPreferences();
    setDoseReminders(prefs.doseReminders);
    setMissedAlerts(prefs.missedAlerts);

    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, [isOpen]);

  const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else if (newTheme === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('prescriptime_theme', newTheme);
    applyTheme(newTheme);
    triggerSaved();
  };

  const handleToggleDoseReminders = async (checked: boolean) => {
    if (checked) {
      const perm = await requestNotificationPermission();
      setNotificationPermission(perm);
      if (perm !== 'granted') {
        setDoseReminders(false);
        saveNotificationPreferences({ doseReminders: false });
        return;
      }
    }
    setDoseReminders(checked);
    saveNotificationPreferences({ doseReminders: checked });
    triggerSaved();
  };

  const handleToggleMissedAlerts = async (checked: boolean) => {
    if (checked) {
      const perm = await requestNotificationPermission();
      setNotificationPermission(perm);
      if (perm !== 'granted') {
        setMissedAlerts(false);
        saveNotificationPreferences({ missedAlerts: false });
        return;
      }
    }
    setMissedAlerts(checked);
    saveNotificationPreferences({ missedAlerts: checked });
    triggerSaved();
  };

  const handleSendTestAlert = async () => {
    const ok = await triggerTestNotification('missed');
    if (ok) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    }
  };

  const triggerSaved = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden overscroll-contain"
      data-lenis-prevent="true"
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 transition-colors"
        data-lenis-prevent="true"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#0F58B6] dark:text-blue-400 shadow-sm">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Settings</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Theme mode, notifications, and account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
          {/* User Account Tile */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#0F58B6] text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm">
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                  {user?.displayName || 'Active Patient'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">
                  {user?.email || 'Cloud Account'}
                </p>
              </div>
            </div>

            {user ? (
              <button
                type="button"
                onClick={async () => {
                  await signOutUser();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold transition-all active:scale-95 flex-shrink-0 shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  await signInWithGoogle();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-[#0F58B6] dark:text-blue-300 text-xs font-bold transition-all active:scale-95 flex-shrink-0 shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>

          {/* Section 1: Appearance & Theme */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Appearance &amp; Theme
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Display mode</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                id="theme-light-btn"
                onClick={() => handleThemeChange('light')}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
                  theme === 'light'
                    ? 'border-[#0F58B6] bg-blue-50/70 text-[#0F58B6] shadow-sm font-bold ring-2 ring-blue-400/30'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Sun className="w-5 h-5 text-amber-500" />
                <span className="text-xs">Light</span>
              </button>

              <button
                type="button"
                id="theme-dark-btn"
                onClick={() => handleThemeChange('dark')}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
                  theme === 'dark'
                    ? 'border-blue-500 bg-slate-900 text-blue-400 shadow-md font-bold ring-2 ring-blue-500/40'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Moon className="w-5 h-5 text-indigo-400" />
                <span className="text-xs">Dark</span>
              </button>

              <button
                type="button"
                id="theme-system-btn"
                onClick={() => handleThemeChange('system')}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
                  theme === 'system'
                    ? 'border-[#0F58B6] dark:border-blue-500 bg-blue-50/70 dark:bg-slate-800 text-[#0F58B6] dark:text-blue-400 shadow-sm font-bold ring-2 ring-blue-400/30'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Laptop className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                <span className="text-xs">System</span>
              </button>
            </div>
          </div>

          {/* Section 2: Notifications & Reminders */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Notifications &amp; Clinical Alerts
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                {notificationPermission === 'granted' ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">● Active</span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 font-bold">● Permission required</span>
                )}
              </span>
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700/60 overflow-hidden">
              {/* Missed Medication Alerts */}
              <label className="flex items-center justify-between p-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-700/40 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Missed Medication Alerts</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      High-priority alert when a scheduled dose is past due
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={missedAlerts}
                  onChange={(e) => handleToggleMissedAlerts(e.target.checked)}
                  className="w-4 h-4 text-[#0F58B6] rounded border-slate-300 dark:border-slate-600 focus:ring-[#0F58B6] cursor-pointer"
                />
              </label>

              {/* Scheduled Dose Reminders */}
              <label className="flex items-center justify-between p-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-700/40 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#0F58B6] dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Upcoming Dose Reminders</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Alerts for upcoming morning, afternoon, and night doses
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={doseReminders}
                  onChange={(e) => handleToggleDoseReminders(e.target.checked)}
                  className="w-4 h-4 text-[#0F58B6] rounded border-slate-300 dark:border-slate-600 focus:ring-[#0F58B6] cursor-pointer"
                />
              </label>
            </div>

            {/* Test Notification Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleSendTestAlert}
                className="w-full py-2.5 px-3 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-100/80 dark:hover:bg-blue-900/50 text-[#0F58B6] dark:text-blue-300 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{testSent ? '✓ Missed Dose Alert Sent to Browser!' : 'Test Missed Medication Notification'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-850">
          <div className="flex items-center gap-2">
            {savedNotice && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold animate-in fade-in">
                <Check className="w-3.5 h-3.5" />
                <span>Saved</span>
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#0F58B6] hover:bg-[#0c4897] text-white text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
