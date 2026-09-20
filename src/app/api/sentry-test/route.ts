import { NextResponse } from 'next/server';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Diagnostic endpoint to trigger a controlled Sentry alert test.
 */
export async function GET() {
  const testError = new Error('🧪 Prescriptime Sentry Verification Test: Diagnostic Alert Confirmed');

  logger.error('Diagnostic error triggered to verify Sentry live alerting pipeline', {
    module: 'sentry-test',
    userId: 'admin-diagnostic',
    error: testError,
    meta: {
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      sentryDsnConfigured: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
    },
  });

  return NextResponse.json({
    success: true,
    message: 'Sentry test event dispatched. Check your Sentry Issues dashboard for incoming alert.',
    sentryConfigured: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
    timestamp: new Date().toISOString(),
  });
}
