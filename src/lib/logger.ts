import * as Sentry from '@sentry/nextjs';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  module?: string;
  requestId?: string;
  userId?: string;
  durationMs?: number;
  error?: Error | unknown;
  meta?: Record<string, any>;
}

/**
 * Sanitizes metadata to ensure zero sensitive credentials, auth tokens,
 * passwords, or raw secrets are printed to output logs.
 */
function sanitizeMeta(obj?: Record<string, any>): Record<string, any> | undefined {
  if (!obj) return undefined;
  const sensitiveKeys = ['password', 'token', 'authorization', 'secret', 'apikey', 'api_key', 'cookie'];
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lower = key.toLowerCase();
    if (sensitiveKeys.some((s) => lower.includes(s))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeMeta(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export const logger = {
  log(level: LogLevel, message: string, ctx: LogContext = {}) {
    const timestamp = new Date().toISOString();
    const isProd = process.env.NODE_ENV === 'production';

    const errorDetails =
      ctx.error instanceof Error
        ? { message: ctx.error.message, stack: isProd ? undefined : ctx.error.stack }
        : ctx.error
        ? { message: String(ctx.error) }
        : undefined;

    const payload = {
      timestamp,
      level,
      module: ctx.module || 'app',
      message,
      ...(ctx.userId ? { userId: ctx.userId } : {}),
      ...(ctx.requestId ? { requestId: ctx.requestId } : {}),
      ...(typeof ctx.durationMs === 'number' ? { durationMs: Math.round(ctx.durationMs) } : {}),
      ...(errorDetails ? { error: errorDetails } : {}),
      ...(ctx.meta ? { meta: sanitizeMeta(ctx.meta) } : {}),
    };

    // Forward errors to Sentry for automated alerts if configured
    if (level === 'error') {
      try {
        if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
          Sentry.withScope((scope) => {
            if (ctx.userId) scope.setUser({ id: ctx.userId });
            if (ctx.module) scope.setTag('module', ctx.module);
            if (ctx.requestId) scope.setTag('requestId', ctx.requestId);
            if (ctx.meta) scope.setExtras(sanitizeMeta(ctx.meta) || {});

            if (ctx.error instanceof Error) {
              Sentry.captureException(ctx.error);
            } else {
              Sentry.captureMessage(message, 'error');
            }
          });
        }
      } catch {}
    }

    if (isProd) {
      // Structured JSON format for CloudWatch / Vercel / Datadog log ingestion
      const output = JSON.stringify(payload);
      if (level === 'error') console.error(output);
      else if (level === 'warn') console.warn(output);
      else console.log(output);
    } else {
      // Human-readable format in local development
      const prefix = `[${payload.timestamp}] [${level.toUpperCase()}] [${payload.module}]`;
      const extra = [
        payload.userId ? `(user: ${payload.userId})` : '',
        payload.durationMs !== undefined ? `(${payload.durationMs}ms)` : '',
      ]
        .filter(Boolean)
        .join(' ');

      const formatted = `${prefix} ${message} ${extra}`.trim();
      if (level === 'error') console.error(formatted, errorDetails || '');
      else if (level === 'warn') console.warn(formatted);
      else console.log(formatted);
    }
  },

  info(message: string, ctx?: LogContext) {
    this.log('info', message, ctx);
  },

  warn(message: string, ctx?: LogContext) {
    this.log('warn', message, ctx);
  },

  error(message: string, ctx?: LogContext) {
    this.log('error', message, ctx);
  },

  debug(message: string, ctx?: LogContext) {
    this.log('debug', message, ctx);
  },
};

export default logger;
