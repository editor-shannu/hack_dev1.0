import { ScheduledDose, Prescription } from '@/types/prescription';
import { getAuthHeaders } from '@/lib/storage';

/**
 * Robust Client & Background Push Notification Engine for Prescriptime
 * Manages native browser notifications, Service Worker Web Push,
 * and high-accuracy scheduled reminder alarms.
 */

export interface NotificationPreferences {
  doseReminders: boolean;
  missedAlerts: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  doseReminders: true,
  missedAlerts: true,
};

export function getNotificationPreferences(): NotificationPreferences {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_PREFS;
  try {
    const raw = localStorage.getItem('prescriptime_settings_notifications');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        doseReminders: parsed.doseReminders !== false,
        missedAlerts: parsed.missedAlerts !== false,
      };
    }
  } catch {}
  return DEFAULT_NOTIFICATION_PREFS;
}

export function saveNotificationPreferences(prefs: Partial<NotificationPreferences>): NotificationPreferences {
  const current = getNotificationPreferences();
  const next = { ...current, ...prefs };
  if (typeof window !== 'undefined') {
    localStorage.setItem('prescriptime_settings_notifications', JSON.stringify(next));
  }
  return next;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return await Notification.requestPermission();
}

export function canSendNotifications(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  return Notification.permission === 'granted';
}

/**
 * Robust clinical time parser: parses "08:00 AM", "01:00 PM", "13:00", etc. to minutes from midnight
 */
export function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const cleaned = timeStr.trim();
  const isPM = /pm/i.test(cleaned);
  const isAM = /am/i.test(cleaned);
  const match = cleaned.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  if (isNaN(hour) || isNaN(minute)) return null;
  if (isPM && hour < 12) hour += 12;
  if (isAM && hour === 12) hour = 0;
  return hour * 60 + minute;
}

/**
 * Plays an audible clinical chime tone when medication time arrives
 */
export function playReminderTone() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 tone
    osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.15); // D6 chime
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {}
}

/**
 * Dispatches a native browser notification with clinical safety tag
 * Also persists a log entry to localStorage so it shows in the Notifications panel.
 */
export function sendNotification(title: string, options?: NotificationOptions): Notification | null {
  if (typeof window === 'undefined') return null;

  // Play audible chime alert
  playReminderTone();

  // Persist notification to history log so it appears in the Notifications panel
  logNotificationToHistory({
    title,
    body: (options as any)?.body || '',
    tag: (options as any)?.tag || 'notification',
  });

  // Dispatch custom in-app event so the dashboard can display live visual alarm
  try {
    window.dispatchEvent(
      new CustomEvent('prescriptime-dose-alarm', {
        detail: { title, options },
      })
    );
  } catch {}

  if (!canSendNotifications()) return null;

  // Try Service Worker registration first (recommended for PWAs and mobile browsers)
  if ('serviceWorker' in navigator) {
    try {
      navigator.serviceWorker.ready.then((reg) => {
        if (reg && 'showNotification' in reg) {
          (reg as any).showNotification(title, {
            icon: '/icon.svg',
            badge: '/icon.svg',
            vibrate: [250, 100, 250],
            ...options,
          });
        }
      }).catch(() => {});
    } catch {}
  }

  // Also trigger native window Notification API
  try {
    const notif = new Notification(title, {
      icon: '/icon.svg',
      badge: '/icon.svg',
      ...options,
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    return notif;
  } catch (err) {
    console.warn('Could not trigger window notification:', err);
    return null;
  }
}

/**
 * Persistent notification history log
 * Saves fired notifications to localStorage so they appear in the Notifications panel
 * even after the transient system notification has been dismissed.
 */
export interface NotificationHistoryEntry {
  id: string;
  title: string;
  body: string;
  tag: string;
  timestamp: number;
  read: boolean;
}

const NOTIF_HISTORY_KEY = 'prescriptime_notification_history';
const MAX_HISTORY = 50;

export function logNotificationToHistory(notif: { title: string; body: string; tag: string }): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(NOTIF_HISTORY_KEY);
    const history: NotificationHistoryEntry[] = raw ? JSON.parse(raw) : [];
    // Avoid double-logging: skip if same tag was logged in the last 60 seconds
    const now = Date.now();
    const recentDuplicate = history.find(
      (h) => h.tag === notif.tag && now - h.timestamp < 60000
    );
    if (recentDuplicate) return;

    const entry: NotificationHistoryEntry = {
      id: `notif-${now}-${Math.random().toString(36).slice(2, 8)}`,
      title: notif.title,
      body: notif.body,
      tag: notif.tag,
      timestamp: now,
      read: false,
    };
    // Keep only the most recent MAX_HISTORY entries
    const updated = [entry, ...history].slice(0, MAX_HISTORY);
    localStorage.setItem(NOTIF_HISTORY_KEY, JSON.stringify(updated));
    // Signal the UI to re-render notifications panel
    window.dispatchEvent(new CustomEvent('prescriptime-notifications-read'));
  } catch {}
}

export function getNotificationHistory(): NotificationHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTIF_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markNotificationHistoryRead(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(NOTIF_HISTORY_KEY);
    const history: NotificationHistoryEntry[] = raw ? JSON.parse(raw) : [];
    const updated = history.map((h) => h.id === id ? { ...h, read: true } : h);
    localStorage.setItem(NOTIF_HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}

export function clearNotificationHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(NOTIF_HISTORY_KEY);
  } catch {}
}

/**
 * Helper to convert URL-safe base64 string to Uint8Array for VAPID push subscription
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribes the device to Web Push API for background notifications
 * even when the browser or PWA is completely closed!
 */
export async function subscribeToPushNotifications(userId: string, doses: ScheduledDose[]): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return false;

    const reg = await navigator.serviceWorker.ready;
    if (!reg) return false;

    let pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!pubKey) {
      const res = await fetch('/api/push/subscribe').then((r) => r.json()).catch(() => null);
      if (res && res.publicKey) pubKey = res.publicKey;
    }

    if (!pubKey) {
      console.warn('Push subscription: VAPID public key not found');
      return false;
    }

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const convertedKey = urlBase64ToUint8Array(pubKey);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });
    }

    if (!sub) return false;

    // Dispatch offline alarm schedules to service worker for offline/app-closed triggers
    if (reg.active) {
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      const alarms = doses
        .filter((d) => d.reminderEnabled !== false)
        .map((d) => {
          const doseMins = parseTimeToMinutes(d.scheduledTime);
          let targetMs = Date.now();
          if (doseMins !== null) {
            targetMs = todayDate.getTime() + doseMins * 60 * 1000;
            if (targetMs < Date.now()) {
              targetMs += 24 * 60 * 60 * 1000;
            }
          }
          return {
            doseId: d.id,
            medicationName: d.medicationName,
            dosage: d.dosage,
            scheduledTime: d.scheduledTime,
            timestamp: targetMs,
            title: `💊 Medicine Time: ${d.medicationName}`,
            body: `It's ${d.scheduledTime} — time to take ${d.medicationName}${d.dosage ? ` (${d.dosage})` : ''}. Tap to mark as taken.`,
          };
        });

      reg.active.postMessage({
        type: 'SCHEDULE_OFFLINE_ALARMS',
        alarms,
      });
    }

    // Send subscription + current routine doses to server
    const authHeaders = await getAuthHeaders(userId);
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        subscription: sub.toJSON(),
        doses,
        timezoneOffset: new Date().getTimezoneOffset(),
      }),
    }).catch((err) => {
      console.warn('Push subscription server sync offline (will sync on reconnect):', err);
    });

    return true;
  } catch (err) {
    console.warn('Push subscription registration error:', err);
    return false;
  }
}

/**
 * Checks for missed doses for today and fires an alert
 */
export function checkAndNotifyMissedMedications(doses: ScheduledDose[]): number {
  const prefs = getNotificationPreferences();
  if (!prefs.missedAlerts || !canSendNotifications()) return 0;

  // Use local calendar date — toISOString() returns UTC which causes date-drift in IST
  const nowD = new Date();
  const today = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}-${String(nowD.getDate()).padStart(2, '0')}`;
  const currentMinutes = nowD.getHours() * 60 + nowD.getMinutes();

  const missed = doses.filter((d) => {
    if (d.date !== today) return false;
    if (d.status === 'taken' || d.status === 'skipped') return false;
    if (d.reminderEnabled === false) return false;

    const doseMinutes = parseTimeToMinutes(d.scheduledTime);
    if (doseMinutes !== null) {
      // If more than 15 minutes past scheduled time
      return currentMinutes > doseMinutes + 15;
    }
    return false;
  });

  if (missed.length > 0) {
    const medNames = Array.from(new Set(missed.map((m) => m.medicationName))).slice(0, 3).join(', ');
    sendNotification('⚠️ Prescriptime: Missed Medication Alert', {
      body: `You have ${missed.length} pending dose(s) past schedule: ${medNames}. Tap to mark as taken or reschedule.`,
      tag: 'missed-medications',
      requireInteraction: true,
    });
  }

  return missed.length;
}

/**
 * Checks for scheduled doses that are DUE RIGHT NOW at the exact configured time
 */
export function checkAndNotifyExactScheduledDoses(doses: ScheduledDose[]): number {
  const prefs = getNotificationPreferences();
  if (!prefs.doseReminders || !canSendNotifications()) return 0;

  // Use local calendar date — toISOString() returns UTC which causes date-drift in IST
  const nowD = new Date();
  const today = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}-${String(nowD.getDate()).padStart(2, '0')}`;
  const currentMinutes = nowD.getHours() * 60 + nowD.getMinutes();

  // Load set of already notified dose keys for today to avoid duplicate alerts in the same minute
  const sessionKey = `prescriptime_notified_exact_${today}`;
  let notifiedSet: Set<string> = new Set();
  try {
    const stored = sessionStorage.getItem(sessionKey);
    if (stored) {
      notifiedSet = new Set(JSON.parse(stored));
    }
  } catch {}

  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayDayName = dayNames[nowD.getDay()];

  const dueNow = doses.filter((d) => {
    // Only check today's doses
    if (d.date !== today) return false;
    if (d.status === 'taken' || d.status === 'skipped') return false;
    if (d.reminderEnabled === false) return false;
    if (Array.isArray(d.repeatDays) && d.repeatDays.length > 0 && !d.repeatDays.includes(todayDayName)) {
      return false;
    }

    const doseMinutes = parseTimeToMinutes(d.scheduledTime);
    if (doseMinutes === null) return false;

    // Trigger notification when current minute matches scheduled minute (within 0 to 1 min window)
    const diff = currentMinutes - doseMinutes;
    const isDueTime = diff >= 0 && diff <= 1;

    const itemKey = `${d.id}_${currentMinutes}`;
    return isDueTime && !notifiedSet.has(itemKey);
  });

  if (dueNow.length > 0) {
    dueNow.forEach((d) => {
      const itemKey = `${d.id}_${currentMinutes}`;
      notifiedSet.add(itemKey);

      const timingText = d.timingNotes ? ` (${d.timingNotes})` : '';
      const doseDesc = d.dosage ? ` ${d.dosage}` : '';

      sendNotification(`💊 Medicine Time: ${d.medicationName}`, {
        body: `It's ${d.scheduledTime} — time to take ${d.medicationName}${doseDesc}${timingText}. Tap to mark as taken.`,
        tag: `dose-time-${d.id}-${currentMinutes}`,
        requireInteraction: true,
      });
    });

    try {
      sessionStorage.setItem(sessionKey, JSON.stringify(Array.from(notifiedSet)));
    } catch {}
  }

  return dueNow.length;
}

/**
 * Checks for upcoming doses scheduled within the next 15 minutes
 */
export function checkAndNotifyScheduledDoses(doses: ScheduledDose[]): number {
  const prefs = getNotificationPreferences();
  if (!prefs.doseReminders || !canSendNotifications()) return 0;

  // Use local calendar date — toISOString() returns UTC which causes date-drift in IST
  const nowD = new Date();
  const today = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}-${String(nowD.getDate()).padStart(2, '0')}`;
  const currentMinutes = nowD.getHours() * 60 + nowD.getMinutes();

  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayDayName = dayNames[nowD.getDay()];

  const dueSoon = doses.filter((d) => {
    if (d.date !== today) return false;
    if (d.status === 'taken' || d.status === 'skipped') return false;
    if (d.reminderEnabled === false) return false;
    if (Array.isArray(d.repeatDays) && d.repeatDays.length > 0 && !d.repeatDays.includes(todayDayName)) {
      return false;
    }

    const doseMinutes = parseTimeToMinutes(d.scheduledTime);
    if (doseMinutes !== null) {
      const diff = doseMinutes - currentMinutes;
      return diff >= 0 && diff <= 15;
    }
    return false;
  });

  if (dueSoon.length > 0) {
    const medNames = Array.from(new Set(dueSoon.map((m) => m.medicationName))).slice(0, 2).join(', ');
    sendNotification('💊 Prescriptime: Medication Reminder', {
      body: `Upcoming dose reminder for: ${medNames}. Tap to view directions and mark taken.`,
      tag: 'scheduled-reminder',
    });
  }

  return dueSoon.length;
}

/**
 * Triggers a real test notification so the user can verify in Settings
 */
export async function triggerTestNotification(type: 'missed' | 'scheduled'): Promise<boolean> {
  if (typeof window === 'undefined') return true;

  let perm: NotificationPermission = 'default';
  if ('Notification' in window) {
    perm = Notification.permission;
    if (perm === 'default') {
      try {
        perm = await Notification.requestPermission();
      } catch {}
    }
  }

  const title =
    type === 'missed'
      ? '⚠️ Prescriptime: Missed Medication Alert'
      : '💊 Prescriptime: Scheduled Dose Reminder';

  const body =
    type === 'missed'
      ? 'Alert: 2 scheduled doses for today were not marked taken: Amoxicillin 500mg, Paracetamol. Tap to review your routine.'
      : 'Upcoming Dose: Metformin 500mg scheduled at 08:00 PM (After dinner).';

  // Attempt PWA / ServiceWorker notification first (preferred in modern browsers & mobile)
  // Attempt PWA / ServiceWorker notification first (preferred in modern browsers & mobile)
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((res) => setTimeout(() => res(null), 300)),
      ]);
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body,
          icon: '/icon.svg',
          badge: '/icon.svg',
          tag: `test-${type}`,
        });
        playReminderTone();
        return true;
      }
    } catch {}
  }

  // Fallback to Window Notification API
  if (perm === 'granted' && 'Notification' in window) {
    try {
      new Notification(title, {
        body,
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: `test-${type}`,
      });
      playReminderTone();
      return true;
    } catch {}
  }

  return true;
}
