import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { EMRProfileModel } from '@/models/EMRProfile';
import { EMRProfile } from '@/types/emr';
import { resolveAuthenticatedUser, enforceTenantAccess } from '@/lib/auth';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId')?.trim();

    // 1. Authenticate and enforce strict tenant isolation
    const auth = await resolveAuthenticatedUser(request);
    const accessCheck = enforceTenantAccess(auth, requestedUserId);
    if (!accessCheck.allowed) {
      return accessCheck.response!;
    }

    const targetUserId = auth.userId!;
    await connectToDatabase();

    const profile = await EMRProfileModel.findOne({ userId: targetUserId })
      .sort({ updatedAt: -1 })
      .lean();

    if (!profile) {
      return NextResponse.json({ success: true, data: null });
    }

    const { _id, __v, ...rest } = profile as any;

    logger.info('Fetched EMR profile', {
      module: 'emr',
      userId: targetUserId,
      durationMs: Date.now() - start,
    });

    return NextResponse.json(
      { success: true, data: rest as EMRProfile },
      {
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    logger.error('Failed to fetch EMR profile from MongoDB', {
      module: 'emr',
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
    const body: EMRProfile = await request.json();

    if (!body || !body.fullName || !body.emergencyContactName || !body.emergencyContactPhone) {
      return NextResponse.json(
        { success: false, error: 'Name, emergency contact name, and phone are required' },
        { status: 400 }
      );
    }

    // 1. Authenticate and enforce strict tenant isolation
    const auth = await resolveAuthenticatedUser(request, body.userId);
    const accessCheck = enforceTenantAccess(auth, body.userId);
    if (!accessCheck.allowed) {
      return accessCheck.response!;
    }

    const targetUserId = auth.userId!;
    await connectToDatabase();

    const updated = await EMRProfileModel.findOneAndUpdate(
      { userId: targetUserId },
      { $set: { ...body, userId: targetUserId } },
      { upsert: true, returnDocument: 'after', runValidators: true }
    ).lean();

    const { _id, __v, ...rest } = (updated as any) || {};

    logger.info('Persisted EMR profile', {
      module: 'emr',
      userId: targetUserId,
      durationMs: Date.now() - start,
    });

    return NextResponse.json({ success: true, data: rest });
  } catch (error: any) {
    logger.error('Failed to save EMR profile to MongoDB', {
      module: 'emr',
      durationMs: Date.now() - start,
      error,
    });
    return NextResponse.json(
      { success: false, error: 'Database upsert failed' },
      { status: 500 }
    );
  }
}
