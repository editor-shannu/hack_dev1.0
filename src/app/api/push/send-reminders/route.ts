import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { connectToDatabase } from '@/lib/mongodb';
import { PushSubscriptionModel } from '@/models/PushSubscription';

import { resolveAuthenticatedUser, enforceTenantAccess } from '@/lib/auth';

// Initialize VAPID
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@prescriptime.app';

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  } catch (err) {
    console.warn('VAPID setup warning:', err);
  }
}

/**
 * Parses time string like "08:00 AM", "01:00 PM", "20:30" to minutes from midnight
 */
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
 * Dispatches push notifications for all users whose routine doses match current time
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        { success: false, error: 'VAPID keys not configured on server' },
        { status: 500 }
      );
    }

    await connectToDatabase();
    const subscriptions = await PushSubscriptionModel.find({}).lean();

    const nowUtc = Date.now();
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    let sentCount = 0;
    const errors: any[] = [];
    const expiredEndpoints: string[] = [];

    for (const sub of subscriptions) {
      // Calculate subscriber's local time based on their reported timezone offset in minutes (defaults to IST -330)
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

        // Match exact minute (within 0 to 1 minute window)
        const diff = currentMinutes - doseMinutes;
        const isDue = diff >= 0 && diff <= 1;

        if (isDue) {
          const dedupeKey = `${localDateStr}_${currentMinutes}_${dose.doseId}`;
          if (sub.lastNotifiedTime === dedupeKey) {
            continue; // Already sent for this minute
          }

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
            sentCount++;

            // Update deduplication marker
            await PushSubscriptionModel.updateOne(
              { _id: sub._id },
              { $set: { lastNotifiedTime: dedupeKey } }
            );
          } catch (err: any) {
            if (err.statusCode === 404 || err.statusCode === 410) {
              // Subscription expired or revoked by browser
              expiredEndpoints.push(sub.endpoint);
            } else {
              errors.push({ endpoint: sub.endpoint, error: err.message });
            }
          }
        }
      }
    }

    // Clean up expired subscriptions
    if (expiredEndpoints.length > 0) {
      await PushSubscriptionModel.deleteMany({ endpoint: { $in: expiredEndpoints } });
    }

    return NextResponse.json({
      success: true,
      sentCount,
      totalChecked: subscriptions.length,
      expiredRemoved: expiredEndpoints.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Push notification reminder dispatch error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Dispatch failed' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for test notifications or immediate push triggers
 */
export async function POST(request: NextRequest) {
  try {
    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        { success: false, error: 'VAPID keys not configured on server' },
        { status: 500 }
      );
    }

    await connectToDatabase();
    const body = await request.json().catch(() => ({}));
    const { userId, title, message } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId required' },
        { status: 400 }
      );
    }

    const auth = await resolveAuthenticatedUser(request, userId);
    const accessCheck = enforceTenantAccess(auth, userId);
    if (!accessCheck.allowed) {
      return accessCheck.response!;
    }

    const subscriptions = await PushSubscriptionModel.find({ userId }).lean();
    if (subscriptions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No active push subscriptions found for user' },
        { status: 404 }
      );
    }

    const payload = JSON.stringify({
      title: title || '💊 Prescriptime: Dose Reminder Test',
      body: message || 'Your background reminder test was sent successfully! Background push notifications are fully active.',
      url: '/',
      tag: 'test-push-notification',
    });

    let sent = 0;
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          payload
        );
        sent++;
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await PushSubscriptionModel.deleteOne({ _id: sub._id });
        }
      }
    }

    return NextResponse.json({
      success: true,
      sentCount: sent,
      message: `Push delivered to ${sent} registered device(s)`,
    });
  } catch (error: any) {
    console.error('Test push error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Test push failed' },
      { status: 500 }
    );
  }
}
