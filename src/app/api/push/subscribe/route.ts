import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PushSubscriptionModel } from '@/models/PushSubscription';
import { startBackgroundPushScheduler } from '@/lib/pushDispatcher';
import { resolveAuthenticatedUser, enforceTenantAccess } from '@/lib/auth';

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  return NextResponse.json({
    success: true,
    publicKey,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, subscription, doses = [], timezoneOffset = 0 } = body;

    if (!userId || !subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { success: false, error: 'Missing required subscription fields' },
        { status: 400 }
      );
    }

    const auth = await resolveAuthenticatedUser(request, userId);
    const accessCheck = enforceTenantAccess(auth, userId);
    if (!accessCheck.allowed) {
      return accessCheck.response!;
    }

    const verifiedUid = auth.userId!;
    await connectToDatabase();

    const { endpoint, keys } = subscription;

    // Filter to valid active routine doses
    const sanitizedDoses = doses.map((d: any) => ({
      doseId: d.id || d.doseId,
      medicationName: d.medicationName,
      dosage: d.dosage || '',
      scheduledTime: d.scheduledTime,
      timingNotes: d.timingNotes || '',
      slot: d.slot || '',
      reminderEnabled: d.reminderEnabled !== false,
    }));

    // Update or insert subscription for this endpoint strictly scoped to verified UID
    const updated = await PushSubscriptionModel.findOneAndUpdate(
      { endpoint },
      {
        userId: verifiedUid,
        endpoint,
        keys: {
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        doses: sanitizedDoses,
        timezoneOffset: Number(timezoneOffset) || 0,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    startBackgroundPushScheduler();

    return NextResponse.json({
      success: true,
      message: 'Push subscription registered successfully',
      id: updated._id,
    });
  } catch (error: any) {
    console.error('Failed to register push subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to register push subscription' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');
    const endpoint = searchParams.get('endpoint');

    const auth = await resolveAuthenticatedUser(request, requestedUserId);
    const accessCheck = enforceTenantAccess(auth, requestedUserId);
    if (!accessCheck.allowed) {
      return accessCheck.response!;
    }

    const verifiedUid = auth.userId!;
    await connectToDatabase();

    const query: Record<string, any> = { userId: verifiedUid };
    if (endpoint) query.endpoint = endpoint;

    await PushSubscriptionModel.deleteMany(query);

    return NextResponse.json({
      success: true,
      message: 'Push subscription removed successfully',
    });
  } catch (error: any) {
    console.error('Failed to delete push subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete push subscription' },
      { status: 500 }
    );
  }
}
