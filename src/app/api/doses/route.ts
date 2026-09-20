import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ScheduledDoseModel } from '@/models/ScheduledDose';
import { PushSubscriptionModel } from '@/models/PushSubscription';
import { ScheduledDose } from '@/types/prescription';
import { startBackgroundPushScheduler } from '@/lib/pushDispatcher';
import { resolveAuthenticatedUser, enforceTenantAccess } from '@/lib/auth';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  startBackgroundPushScheduler();
  const start = Date.now();
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const requestedUserId = searchParams.get('userId')?.trim();

    // 1. Authenticate and enforce strict tenant isolation
    const auth = await resolveAuthenticatedUser(request);
    const accessCheck = enforceTenantAccess(auth, requestedUserId);
    if (!accessCheck.allowed) {
      return accessCheck.response!;
    }

    const targetUserId = auth.userId!;
    await connectToDatabase();

    const query: Record<string, any> = { userId: targetUserId };
    if (date) {
      query.date = date;
    }

    const doses = await ScheduledDoseModel.find(query).lean();
    const cleaned = doses.map((doc: any) => {
      const { _id, __v, ...rest } = doc;
      return rest as ScheduledDose;
    });

    logger.info('Fetched scheduled doses', {
      module: 'doses',
      userId: targetUserId,
      durationMs: Date.now() - start,
      meta: { count: cleaned.length, date: date || 'all' },
    });

    return NextResponse.json(
      { success: true, data: cleaned },
      {
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    logger.error('Failed to fetch scheduled doses from MongoDB', {
      module: 'doses',
      durationMs: Date.now() - start,
      error,
    });
    return NextResponse.json(
      { success: false, error: 'Database query failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    const body = await request.json();

    // Check if payload is wrapped in { doses, userId, replace } or direct array
    const isWrapped = body && typeof body === 'object' && !Array.isArray(body) && Array.isArray(body.doses);
    const rawDoses: ScheduledDose[] = isWrapped ? body.doses : Array.isArray(body) ? body : [body];
    const shouldReplace = isWrapped && body.replace === true;
    const requestedUserId = isWrapped ? body.userId : rawDoses[0]?.userId;

    // 1. Authenticate and enforce strict tenant isolation
    const auth = await resolveAuthenticatedUser(request, requestedUserId);
    const accessCheck = enforceTenantAccess(auth, requestedUserId);
    if (!accessCheck.allowed) {
      return accessCheck.response!;
    }

    const targetUserId = auth.userId!;
    await connectToDatabase();

    // Enforce verified tenant ID on all doses
    const doses = rawDoses.map((d) => ({
      ...d,
      userId: targetUserId,
    }));

    const targetDate = (isWrapped && body.date) ? body.date : (doses[0]?.date || new Date().toISOString().split('T')[0]);

    if (shouldReplace) {
      if (doses.length === 0) {
        await ScheduledDoseModel.deleteMany({ userId: targetUserId, date: targetDate });
        return NextResponse.json({ success: true, count: 0 }, { status: 200 });
      }
      const keepIds = doses.map((d) => d.id);
      await ScheduledDoseModel.deleteMany({
        userId: targetUserId,
        date: targetDate,
        id: { $nin: keepIds },
      });
    }

    if (doses.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const ops = doses.map((dose) => ({
      updateOne: {
        filter: { id: dose.id, userId: targetUserId },
        update: { $set: dose },
        upsert: true,
      },
    }));

    await ScheduledDoseModel.bulkWrite(ops);

    // Keep active push subscriptions in sync with the updated doses
    const sanitizedPushDoses = doses.map((d) => ({
      doseId: d.id,
      medicationName: d.medicationName,
      dosage: d.dosage || '',
      scheduledTime: d.scheduledTime,
      timingNotes: d.timingNotes || '',
      slot: d.slot || '',
      reminderEnabled: d.reminderEnabled !== false,
    }));

    await PushSubscriptionModel.updateMany(
      { userId: targetUserId },
      { $set: { doses: sanitizedPushDoses, updatedAt: new Date() } }
    ).catch(() => {});

    startBackgroundPushScheduler();

    logger.info('Persisted scheduled doses', {
      module: 'doses',
      userId: targetUserId,
      durationMs: Date.now() - start,
      meta: { count: doses.length },
    });

    return NextResponse.json({ success: true, count: doses.length }, { status: 201 });
  } catch (error: any) {
    logger.error('Failed to save scheduled doses to MongoDB', {
      module: 'doses',
      durationMs: Date.now() - start,
      error,
    });
    return NextResponse.json(
      { success: false, error: 'Failed to persist doses' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const start = Date.now();
  try {
    const body = await request.json();
    const { id, status, takenAt, userId: requestedUserId } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'Dose id and status are required' },
        { status: 400 }
      );
    }

    // 1. Authenticate and enforce strict tenant isolation
    const auth = await resolveAuthenticatedUser(request, requestedUserId);
    const accessCheck = enforceTenantAccess(auth, requestedUserId);
    if (!accessCheck.allowed) {
      return accessCheck.response!;
    }

    const targetUserId = auth.userId!;
    await connectToDatabase();

    const updateFields: Record<string, any> = { status };
    if (takenAt !== undefined) {
      updateFields.takenAt = takenAt;
    }

    const filter: Record<string, any> = { id, userId: targetUserId };

    let updated = await ScheduledDoseModel.findOneAndUpdate(
      filter,
      { $set: updateFields },
      { returnDocument: 'after' }
    ).lean();

    if (!updated) {
      // Fallback: match by base ID
      const baseId = id.replace(/-\d{4}-\d{2}-\d{2}$/, '');
      const secondaryFilter: Record<string, any> = {
        userId: targetUserId,
        $or: [
          { id: baseId },
          { id: new RegExp(`^${baseId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) },
        ],
      };

      updated = await ScheduledDoseModel.findOneAndUpdate(
        secondaryFilter,
        { $set: updateFields },
        { returnDocument: 'after' }
      ).lean();
    }

    if (!updated) {
      updated = await ScheduledDoseModel.findOneAndUpdate(
        filter,
        { $set: { ...updateFields, id, userId: targetUserId } },
        { upsert: true, returnDocument: 'after' }
      ).lean();
    }

    const { _id, __v, ...cleaned } = (updated as any) || {};

    logger.info('Updated scheduled dose status', {
      module: 'doses',
      userId: targetUserId,
      durationMs: Date.now() - start,
      meta: { doseId: id, status },
    });

    return NextResponse.json({ success: true, data: cleaned });
  } catch (error: any) {
    logger.error('Failed to update scheduled dose in MongoDB', {
      module: 'doses',
      durationMs: Date.now() - start,
      error,
    });
    return NextResponse.json(
      { success: false, error: 'Failed to update dose status' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const start = Date.now();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const prescriptionId = searchParams.get('prescriptionId');
    const requestedUserId = searchParams.get('userId')?.trim();
    const all = searchParams.get('all');

    // 1. Authenticate and enforce strict tenant isolation
    const auth = await resolveAuthenticatedUser(request, requestedUserId);
    const accessCheck = enforceTenantAccess(auth, requestedUserId);
    if (!accessCheck.allowed) {
      return accessCheck.response!;
    }

    const targetUserId = auth.userId!;
    await connectToDatabase();

    const filter: Record<string, any> = { userId: targetUserId };
    if (id) {
      filter.id = id;
    } else if (prescriptionId) {
      filter.prescriptionId = prescriptionId;
    } else if (all === 'true') {
      // Deleting all doses for this user
    } else {
      return NextResponse.json(
        { success: false, error: 'Must provide id, prescriptionId, or all=true' },
        { status: 400 }
      );
    }

    const result = await ScheduledDoseModel.deleteMany(filter);

    logger.info('Deleted scheduled doses', {
      module: 'doses',
      userId: targetUserId,
      durationMs: Date.now() - start,
      meta: { deletedCount: result.deletedCount },
    });

    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (error: any) {
    logger.error('Failed to delete scheduled dose(s) from MongoDB', {
      module: 'doses',
      durationMs: Date.now() - start,
      error,
    });
    return NextResponse.json(
      { success: false, error: 'Failed to delete doses' },
      { status: 500 }
    );
  }
}
