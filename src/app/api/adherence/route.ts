import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { AdherenceRecordModel } from '@/models/AdherenceRecord';
import { resolveAuthenticatedUser, enforceTenantAccess } from '@/lib/auth';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId')?.trim();
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    // Authenticate and enforce strict tenant isolation
    const auth = await resolveAuthenticatedUser(request);
    const accessCheck = enforceTenantAccess(auth, requestedUserId);
    if (!accessCheck.allowed) {
      return accessCheck.response!;
    }

    const targetUserId = auth.userId!;
    await connectToDatabase();

    const query: Record<string, any> = { userId: targetUserId };
    if (fromDate && toDate) {
      query.date = { $gte: fromDate, $lte: toDate };
    } else if (fromDate) {
      query.date = { $gte: fromDate };
    } else if (toDate) {
      query.date = { $lte: toDate };
    }

    const records = await AdherenceRecordModel.find(query).sort({ date: 1 }).lean();
    const cleaned = records.map((doc: any) => {
      const { _id, __v, ...rest } = doc;
      return rest;
    });

    logger.info('Fetched adherence records', {
      module: 'adherence',
      userId: targetUserId,
      durationMs: Date.now() - start,
      meta: { count: cleaned.length },
    });

    return NextResponse.json({ success: true, data: cleaned });
  } catch (error: any) {
    logger.error('Failed to fetch adherence records from MongoDB', {
      module: 'adherence',
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
    const records = Array.isArray(body) ? body : [body];
    if (records.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Payload must contain at least one adherence record' },
        { status: 400 }
      );
    }

    const requestedUserId = records[0]?.userId;
    const auth = await resolveAuthenticatedUser(request, requestedUserId);
    const accessCheck = enforceTenantAccess(auth, requestedUserId);
    if (!accessCheck.allowed) {
      return accessCheck.response!;
    }

    const targetUserId = auth.userId!;
    await connectToDatabase();

    const ops = records.map((record) => ({
      updateOne: {
        filter: { userId: targetUserId, date: record.date },
        update: { $set: { ...record, userId: targetUserId } },
        upsert: true,
      },
    }));

    await AdherenceRecordModel.bulkWrite(ops);

    logger.info('Persisted adherence records', {
      module: 'adherence',
      userId: targetUserId,
      durationMs: Date.now() - start,
      meta: { count: records.length },
    });

    return NextResponse.json({ success: true, count: records.length }, { status: 200 });
  } catch (error: any) {
    logger.error('Failed to save adherence records to MongoDB', {
      module: 'adherence',
      durationMs: Date.now() - start,
      error,
    });
    return NextResponse.json(
      { success: false, error: 'Failed to persist adherence records' },
      { status: 500 }
    );
  }
}
