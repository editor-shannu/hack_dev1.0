import { NextRequest, NextResponse } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Periodic cleanup every 5 minutes to prevent memory leaks from inactive IPs
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

export interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds (default: 60,000ms = 1 minute)
  maxRequests?: number; // Max requests allowed within window (default: 30)
  keyPrefix?: string; // Prefix for namespacing (e.g. 'extract', 'ai-analysis')
}

/**
 * Enforces in-memory sliding rate limits on incoming API requests by client IP or user ID.
 */
export function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions = {}
): { allowed: boolean; response?: NextResponse; remaining: number; resetInSeconds: number } {
  const windowMs = options.windowMs || 60 * 1000;
  const maxRequests = options.maxRequests || 30;
  const keyPrefix = options.keyPrefix || 'global';

  // Prioritize trusted edge headers: Cloudflare ('cf-connecting-ip') and Vercel/Nginx ('x-real-ip')
  const cfIp = request.headers.get('cf-connecting-ip')?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  const forwarded = request.headers.get('x-forwarded-for');

  let ip = cfIp || realIp;
  if (!ip && forwarded) {
    const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean);
    ip = parts[parts.length - 1] || '127.0.0.1';
  }
  if (!ip) {
    ip = '127.0.0.1';
  }
  const clientKey = `${keyPrefix}:${ip}`;

  const now = Date.now();
  let record = rateLimitStore.get(clientKey);

  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(clientKey, record);
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetInSeconds: Math.ceil(windowMs / 1000),
    };
  }

  record.count += 1;
  const remaining = Math.max(0, maxRequests - record.count);
  const resetInSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));

  if (record.count > maxRequests) {
    const response = NextResponse.json(
      {
        success: false,
        error: 'Too many requests. Please slow down and try again later.',
        retryAfter: resetInSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(resetInSeconds),
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(record.resetTime / 1000)),
        },
      }
    );
    return { allowed: false, response, remaining: 0, resetInSeconds };
  }

  return { allowed: true, remaining, resetInSeconds };
}
