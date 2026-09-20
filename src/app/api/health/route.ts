import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

/**
 * Liveness & Readiness Healthcheck Probe for monitoring tools (UptimeRobot, BetterStack, Cloud Run, K8s).
 * Measures MongoDB roundtrip ping latency and Node.js process heap memory.
 */
export async function GET() {
  const start = Date.now();
  try {
    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection instance not available.');
    }

    // Measure live database round-trip latency
    await db.command({ ping: 1 });
    const dbLatencyMs = Date.now() - start;

    const memoryUsage = process.memoryUsage();
    const uptimeSeconds = Math.floor(process.uptime());

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptimeSeconds,
        database: {
          status: 'connected',
          pingLatencyMs: dbLatencyMs,
          dbName: 'prescriptime',
        },
        system: {
          heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
        },
        version: '1.0.0',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: {
          status: 'disconnected',
        },
        error: error.message || 'Database ping failed',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}
