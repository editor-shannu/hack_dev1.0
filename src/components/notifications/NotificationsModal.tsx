'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  Check,
  Clock,
  Pill,
  X,
  Settings as SettingsIcon,
  CheckCheck,
} from 'lucide-react';
import { ScheduledDose, Prescription } from '@/types/prescription';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import { triggerTestNotification, parseTimeToMinutes, getNotificationHistory, markNotificationHistoryRead, clearNotificationHistory, type NotificationHistoryEntry } from '@/lib/notifications';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  doses: ScheduledDose[];
  prescriptions: Prescription[];
  onMarkDoseTaken?: (doseId: string) => void;
  onOpenSettings?: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  doses,
  onMarkDoseTaken,
  onOpenSettings,
}) => {
  useBodyScrollLock(isOpen);
  const [filter, setFilter] = useState<'all' | 'missed' | 'upcoming' | 'history'>('all');
  const [testSent, setTestSent] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistoryEntry[]>([]);

  // Load read notification IDs from local storage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('prescriptime_read_notifications');
      if (stored) {
        setReadIds(JSON.parse(stored));
      }
    } catch {}
    // Load persistent notification history log
    setNotificationHistory(getNotificationHistory());
  }, [isOpen]);

  if (!isOpen) return null;

  // Use local calendar date — toISOString() returns UTC which causes date-drift in IST (UTC+5:30)
  const nowD = new Date();
  const todayStr = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}-${String(nowD.getDate()).padStart(2, '0')}`;
  const now = nowD;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // 1. Missed Doses: past due doses today that are not taken or skipped
  const missedDoses = doses.filter((d) => {
    if (d.date !== todayStr) return false;
    if (d.status === 'taken' || d.status === 'skipped') return false;
    const doseMinutes = parseTimeToMinutes(d.scheduledTime);
    if (doseMinutes !== null) {
      return doseMinutes <= currentMinutes;
    }
    return false;
  });

  // 2. Upcoming Doses for today
  const upcomingDoses = doses.filter((d) => {
    if (d.date !== todayStr) return false;
    if (d.status === 'taken' || d.status === 'skipped') return false;
    const doseMinutes = parseTimeToMinutes(d.scheduledTime);
    if (doseMinutes !== null) {
      return doseMinutes > currentMinutes;
    }
    return false;
  });

  const allAlertIds = [...missedDoses, ...upcomingDoses].map((d) => d.id);
  const unreadAlertsCount = allAlertIds.filter((id) => !readIds.includes(id)).length;

  const handleMarkAsRead = (id: string) => {
    const updated = Array.from(new Set([...readIds, id]));
    setReadIds(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('prescriptime_read_notifications', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('prescriptime-notifications-read'));
    }
  };

  const handleMarkAllAsRead = () => {
    const updated = Array.from(new Set([...readIds, ...allAlertIds]));
    setReadIds(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('prescriptime_read_notifications', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('prescriptime-notifications-read'));
    }
  };

  const handleClearAllNotifications = () => {
    // Mark ALL notification IDs as read and persist — clears badge and hides all alerts
    const updated = Array.from(new Set([...readIds, ...allAlertIds]));
    setReadIds(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('prescriptime_read_notifications', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('prescriptime-notifications-read'));
    }
    // Also clear the persistent notification history log
    clearNotificationHistory();
    setNotificationHistory([]);
    onClose();
  };

  const handleTestAlert = async () => {
    const ok = await triggerTestNotification('missed');
    if (ok) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden overscroll-contain"
      id="notifications-modal-backdrop"
      data-lenis-prevent="true"
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 transition-colors"
        id="notifications-modal"
        data-lenis-prevent="true"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#0F58B6] dark:text-blue-400 shadow-sm">
              <Bell className="w-5 h-5" />
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="notifications-modal-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Notifications &amp; Alerts
                </h3>
                {unreadAlertsCount > 0 ? (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    {unreadAlertsCount} New
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Caught Up
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Live alerts for missed medication doses &amp; scheduled routines
              </p>
            </div>
          </div>

          <button
            id="notifications-modal-close-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent dark:border-slate-750 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills & Mark as Read Header Bar */}
        <div className="flex items-center justify-between gap-1.5 px-5 sm:px-6 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <button
              id="notif-tab-all"
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                filter === 'all'
                  ? 'bg-[#0F58B6] text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All ({missedDoses.length + upcomingDoses.length})
            </button>

            <button
              id="notif-tab-missed"
              type="button"
              onClick={() => setFilter('missed')}
              className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                filter === 'missed'
                  ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>Missed</span>
              {missedDoses.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  {missedDoses.length}
                </span>
              )}
            </button>

            <button
              id="notif-tab-upcoming"
              type="button"
              onClick={() => setFilter('upcoming')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                filter === 'upcoming'
                  ? 'bg-[#0F58B6] text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Upcoming ({upcomingDoses.length})
            </button>

            <button
              id="notif-tab-history"
              type="button"
              onClick={() => setFilter('history')}
              className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                filter === 'history'
                  ? 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>Sent</span>
              {notificationHistory.filter(h => !h.read).length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                  {notificationHistory.filter(h => !h.read).length}
                </span>
              )}
            </button>
          </div>

          {allAlertIds.length > 0 && (
            <div className="flex items-center gap-1">
              {unreadAlertsCount > 0 && (
                <button
                  id="mark-all-notifications-read-btn"
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg text-[#0F58B6] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                id="clear-all-notifications-btn"
                type="button"
                onClick={handleClearAllNotifications}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors whitespace-nowrap"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Notification List */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-3 flex-1 min-h-0 text-xs sm:text-sm">
          {/* Missed Doses Section */}
          {(filter === 'all' || filter === 'missed') && missedDoses.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Missed Doses Past Due ({missedDoses.length})</span>
                </span>
              </div>

              <div className="space-y-2">
                {missedDoses.map((dose) => {
                  const isRead = readIds.includes(dose.id);
                  return (
                    <div
                      key={dose.id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 shadow-sm transition-all ${
                        isRead
                          ? 'bg-slate-50/70 dark:bg-slate-850/40 border-slate-200/80 dark:border-slate-800 opacity-70'
                          : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                          <Pill className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {dose.medicationName}
                            </p>
                            {isRead && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                Read
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            {dose.dosage} • Scheduled: {dose.scheduledTime || 'Today'} ({dose.timingNotes || dose.slot})
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {!isRead && (
                          <button
                            id={`mark-read-${dose.id}`}
                            type="button"
                            onClick={() => handleMarkAsRead(dose.id)}
                            className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all"
                            title="Mark as read"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Read</span>
                          </button>
                        )}

                        {onMarkDoseTaken && (
                          <button
                            type="button"
                            onClick={() => {
                              onMarkDoseTaken(dose.id);
                              handleMarkAsRead(dose.id);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Take Now</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upcoming Doses Section */}
          {(filter === 'all' || filter === 'upcoming') && upcomingDoses.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#0F58B6] dark:text-blue-400 flex items-center gap-1.5 pt-2">
                <Clock className="w-3.5 h-3.5" />
                <span>Upcoming Doses Today ({upcomingDoses.length})</span>
              </span>

              <div className="space-y-2">
                {upcomingDoses.map((dose) => {
                  const isRead = readIds.includes(dose.id);
                  return (
                    <div
                      key={dose.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                        isRead
                          ? 'bg-slate-50/50 dark:bg-slate-850/30 border-slate-200/60 dark:border-slate-800 opacity-70'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#0F58B6] dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {dose.medicationName}
                            </p>
                            {isRead && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                Read
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            {dose.dosage} • {dose.scheduledTime} ({dose.slot})
                          </p>
                        </div>
                      </div>

                      {!isRead && (
                        <button
                          id={`mark-read-upcoming-${dose.id}`}
                          type="button"
                          onClick={() => handleMarkAsRead(dose.id)}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 text-[11px] font-semibold flex items-center gap-1 active:scale-95 transition-all"
                        >
                          <Check className="w-3 h-3" />
                          <span>Mark read</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sent Notification History Section */}
          {filter === 'history' && (
            <div className="space-y-2">
              {notificationHistory.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <Bell className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">No notification history yet. Alerts fired by the app will appear here.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5" />
                      <span>Sent Notifications ({notificationHistory.length})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => { clearNotificationHistory(); setNotificationHistory([]); }}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-700 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                  {notificationHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className={`p-3 rounded-2xl border flex items-start gap-3 transition-all ${
                        entry.read
                          ? 'bg-slate-50/50 dark:bg-slate-850/30 border-slate-200/60 dark:border-slate-800 opacity-60'
                          : 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-200/80 dark:border-blue-900/40'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-[#0F58B6] dark:text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{entry.title}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{entry.body}</p>
                        <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1">
                          {new Date(entry.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {!entry.read && (
                        <button
                          type="button"
                          onClick={() => {
                            markNotificationHistoryRead(entry.id);
                            setNotificationHistory(getNotificationHistory());
                          }}
                          className="flex-shrink-0 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold flex items-center gap-1 active:scale-95 transition-all"
                        >
                          <Check className="w-3 h-3" />
                          <span>Read</span>
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Empty State */}
          {(filter === 'all' || filter === 'missed' || filter === 'upcoming') && missedDoses.length === 0 && upcomingDoses.length === 0 && (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <Check className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">All caught up!</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-0.5">
                  No missed medications or alerts. You are completely on schedule.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/80 flex-shrink-0">
          {onOpenSettings ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#0F58B6] dark:hover:text-blue-400 transition-colors"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              <span>Configure Alerts</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestAlert}
              className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/40 text-[#0F58B6] dark:text-blue-300 text-xs font-bold transition-all active:scale-95"
            >
              {testSent ? '✓ Sent' : 'Test Alert'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-[#0F58B6] hover:bg-[#0c4897] text-white text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
