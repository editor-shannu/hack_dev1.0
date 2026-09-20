import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PrescriptionModel } from '@/models/Prescription';
import { Prescription } from '@/types/prescription';
import { deduplicatePrescriptions, deduplicateMedications } from '@/lib/deduplication';
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

    // 2. Pagination & Field Projection
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;
    const includeRaw = searchParams.get('includeRaw') === 'true';
    const includeFiles = searchParams.get('includeFiles') === 'true';
    const recordId = searchParams.get('id')?.trim();

    const filter: Record<string, any> = { userId: targetUserId };
    if (recordId) {
      filter.id = recordId;
    }

    let query = PrescriptionModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    if (!includeRaw) {
      query = query.select('-rawText');
    }
    // High-performance payload reduction: exclude multi-megabyte base64 fileUrl on list syncs unless requested or single record
    if (!includeFiles && !recordId) {
      query = query.select('-fileUrl');
    }

    const prescriptions = await query.lean();

    // Map _id out and return clean prescription records
    const cleaned = prescriptions.map((doc: any) => {
      const { _id, __v, ...rest } = doc;
      return rest as Prescription;
    });

    const unique = deduplicatePrescriptions(cleaned);

    logger.info('Fetched prescriptions', {
      module: 'prescriptions',
      userId: targetUserId,
      durationMs: Date.now() - start,
      meta: { count: unique.length, page, limit },
    });

    return NextResponse.json(
      { success: true, data: unique, page, limit },
      {
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    logger.error('Failed to fetch prescriptions from MongoDB', {
      module: 'prescriptions',
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
    const body: Prescription = await request.json();

    if (!body || !body.id || !body.title) {
      return NextResponse.json(
        { success: false, error: 'Invalid prescription payload: id and title are required' },
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

    // 2. Clean payload and enforce verified tenant ID
    const safeFileType = (body.fileType || '').toLowerCase().includes('pdf') ? 'pdf' : 'image';
    const payload = {
      ...body,
      userId: targetUserId, // Strictly override with authenticated identity
      medications: deduplicateMedications(body.medications || []),
      fileType: safeFileType,
      uploadedAt: body.uploadedAt || new Date().toISOString(),
      createdAt: body.createdAt || new Date().toISOString(),
    };

    const updated = await PrescriptionModel.findOneAndUpdate(
      { id: body.id, userId: targetUserId },
      { $set: payload },
      { upsert: true, returnDocument: 'after' }
    ).lean();

    const { _id, __v, ...cleaned } = (updated as any) || {};

    logger.info('Persisted prescription', {
      module: 'prescriptions',
      userId: targetUserId,
      durationMs: Date.now() - start,
      meta: { prescriptionId: body.id },
    });

    return NextResponse.json({ success: true, data: cleaned }, { status: 201 });
  } catch (error: any) {
    logger.error('Failed to save prescription to MongoDB', {
      module: 'prescriptions',
      durationMs: Date.now() - start,
      error,
    });
    return NextResponse.json(
      { success: false, error: 'Failed to persist prescription' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const start = Date.now();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const requestedUserId = searchParams.get('userId')?.trim();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Prescription ID parameter is required' },
        { status: 400 }
      );
    }

    // 1. Authenticate and enforce strict tenant isolation
    const auth = await resolveAuthenticatedUser(request);
    const accessCheck = enforceTenantAccess(auth, requestedUserId);
    if (!accessCheck.allowed) {
      return accessCheck.response!;
    }

    const targetUserId = auth.userId!;
    await connectToDatabase();

    // Strictly scope delete filter by authenticated user ID to prevent unauthorized cross-tenant deletes
    const deleteFilter: Record<string, any> = { id, userId: targetUserId };
    const result = await PrescriptionModel.deleteOne(deleteFilter);

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Prescription not found or unauthorized' },
        { status: 404 }
      );
    }

    logger.info('Deleted prescription', {
      module: 'prescriptions',
      userId: targetUserId,
      durationMs: Date.now() - start,
      meta: { prescriptionId: id },
    });

    return NextResponse.json({ success: true, message: 'Prescription deleted successfully' });
  } catch (error: any) {
    logger.error('Failed to delete prescription from MongoDB', {
      module: 'prescriptions',
      durationMs: Date.now() - start,
      error,
    });
    return NextResponse.json(
      { success: false, error: 'Failed to delete prescription' },
      { status: 500 }
    );
  }
}
