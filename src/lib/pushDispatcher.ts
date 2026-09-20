import webpush from 'web-push';
import { connectToDatabase } from '@/lib/mongodb';
import { PushSubscriptionModel } from '@/models/PushSubscription';

let isSchedulerRunning = false;

function parseTimeToMinutes(timeStr?: string): number | null {
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
 * Dispatches due push notifications for all subscribers whose scheduled dose time matches current minute
 */
export async function dispatchDueReminders() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@prescriptime.app';

  if (!vapidPublicKey || !vapidPrivateKey) return;

  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    await connectToDatabase();

    const subscriptions = await PushSubscriptionModel.find({}).lean();
    if (!subscriptions || subscriptions.length === 0) return;

    const nowUtc = Date.now();
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    for (const sub of subscriptions) {
      // Default to IST (-330 minutes) if offset not specified or 0
      const offsetMinutes = typeof sub.timezoneOffset === 'number' && sub.timezoneOffset !== 0 ? sub.timezoneOffset : -330;
      const localTime = new Date(nowUtc - offsetMinutes * 60 * 1000);
      const currentMinutes = localTime.getUTCHours() * 60 + localTime.getUTCMinutes();
      const localDateStr = localTime.toISOString().split('T')[0];
      const localDayName = dayNames[localTime.getUTCDay()];

      if (!Array.isArray(sub.doses) || sub.doses.length === 0) continue;

      for (const dose of sub.doses) {
        if (dose.reminderEnabled === false) continue;
        if (Array.isArray((dose as any).repeatDays) && (dose as any).repeatDays.length > 0) {
          if (!(dose as any).repeatDays.includes(localDayName)) continue;
        }
        const doseMinutes = parseTimeToMinutes(dose.scheduledTime);
        if (doseMinutes === null) continue;

        const diff = currentMinutes - doseMinutes;
        // Check if dose is due within this 0-2 minute window
        if (diff >= 0 && diff <= 2) {
          const dedupeKey = `${localDateStr}_${dose.doseId}_${doseMinutes}`;
          const alreadyNotified = Array.isArray(sub.notifiedKeys) && sub.notifiedKeys.includes(dedupeKey);
          if (alreadyNotified || sub.lastNotifiedTime === dedupeKey) continue;

          const payload = JSON.stringify({
            title: `💊 Medicine Time: ${dose.medicationName}`,
            body: `It's ${dose.scheduledTime} — time to take ${dose.medicationName}${
              dose.dosage ? ` (${dose.dosage})` : ''
            }. Tap to mark as taken.`,
            url: '/',
            tag: `dose-alarm-${dose.doseId}`,
            data: {
              doseId: dose.doseId,
              scheduledTime: dose.scheduledTime,
              medicationName: dose.medicationName,
            },
          });

          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: sub.keys,
              },
              payload
            );

            await PushSubscriptionModel.updateOne(
              { _id: sub._id },
              {
                $addToSet: { notifiedKeys: dedupeKey },
                $set: { lastNotifiedTime: dedupeKey }
              }
            );
          } catch (err: any) {
            if (err.statusCode === 404 || err.statusCode === 410) {
              await PushSubscriptionModel.deleteOne({ _id: sub._id });
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('Background push dispatcher tick warning:', err);
  }
}

/**
 * Initializes continuous server-side push scheduler
 */
export function startBackgroundPushScheduler() {
  if (isSchedulerRunning) return;
  isSchedulerRunning = true;

  // Initial check
  dispatchDueReminders().catch(() => {});

  // Ticker every 30 seconds
  setInterval(() => {
    dispatchDueReminders().catch(() => {});
  }, 30000);
}
