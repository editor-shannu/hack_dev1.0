import { NextRequest, NextResponse } from 'next/server';
import { dispatchDueReminders } from '@/lib/pushDispatcher';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Serverless-compatible scheduled cron endpoint for triggering push notifications.
 * Can be called by Vercel Cron, GitHub Actions, or Google Cloud Scheduler.
 */
export async function GET(request: NextRequest) {
  const start = Date.now();
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // If a CRON_SECRET is configured, require it in production
  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron trigger attempt rejected', { module: 'cron' });
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    await dispatchDueReminders();
    logger.info('Dispatched due push reminders via cron tick', {
      module: 'cron',
      durationMs: Date.now() - start,
    });
    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error: any) {
    logger.error('Cron reminder dispatch execution failed', {
      module: 'cron',
      durationMs: Date.now() - start,
      error,
    });
    return NextResponse.json(
      { success: false, error: error.message || 'Dispatch failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
