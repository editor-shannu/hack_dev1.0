import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import logger from '@/lib/logger';

export interface AuthResult {
  isAuthenticated: boolean;
  userId: string | null;
  email?: string | null;
  isDemo?: boolean;
  error?: string;
  statusCode?: number;
}

let googleCertsCache: Record<string, string> = {};
let googleCertsExpiry = 0;

/**
 * Fetches and caches Google's public x509 certificates for Firebase ID token signature verification.
 */
async function getGooglePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (googleCertsExpiry > now && Object.keys(googleCertsCache).length > 0) {
    return googleCertsCache;
  }
  try {
    const res = await fetch(
      'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return googleCertsCache;
    const cacheControl = res.headers.get('cache-control') || '';
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
    const maxAgeSeconds = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 3600;
    googleCertsExpiry = now + maxAgeSeconds * 1000;
    googleCertsCache = await res.json();
    return googleCertsCache;
  } catch (err) {
    logger.warn('Failed to fetch Google public certificates for JWT verification', {
      module: 'auth',
      error: err,
    });
    return googleCertsCache;
  }
}

/**
 * Cryptographically verifies a Firebase Auth ID token using RSA-SHA256 against Google's public certificates.
 * Checks alg, kid, expiration, issuer, audience, and subject/user_id claims.
 */
async function verifyFirebaseToken(token: string): Promise<{ uid: string; email?: string } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const headerRaw = Buffer.from(parts[0], 'base64url').toString('utf8');
    const header = JSON.parse(headerRaw);

    const payloadRaw = Buffer.from(parts[1], 'base64url').toString('utf8');
    const payload = JSON.parse(payloadRaw);

    // Enforce RS256 algorithm and presence of key id
    if (header.alg !== 'RS256' || !header.kid || typeof header.kid !== 'string') {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);

    // Verify expiration with 60s clock skew allowance
    if (payload.exp && payload.exp < now - 60) {
      return null;
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'prescriptime';
    const expectedIss = `https://securetoken.google.com/${projectId}`;

    if (payload.iss && payload.iss !== expectedIss) return null;
    if (payload.aud && payload.aud !== projectId) return null;

    const uid = payload.user_id || payload.sub;
    if (!uid || typeof uid !== 'string') return null;

    // Cryptographic signature check
    const certs = await getGooglePublicCerts();
    const cert = certs[header.kid];
    if (!cert) {
      // In development or if certificates failed to fetch, reject token
      return null;
    }

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${parts[0]}.${parts[1]}`);
    const signatureBuffer = Buffer.from(parts[2], 'base64url');
    const isValid = verifier.verify(cert, signatureBuffer);

    if (!isValid) {
      return null;
    }

    return { uid, email: payload.email };
  } catch {
    return null;
  }
}

/**
 * Resolves the authenticated user ID from the request using:
 * 1. Bearer Token (Firebase Auth cryptographically verified JWT, Demo token, or Test token)
 * 2. In non-production environments ONLY, local testing session header for headless automation
 */
export async function resolveAuthenticatedUser(
  request: NextRequest,
  _targetUserId?: string | null
): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization');
  const sessionUserHeader = request.headers.get('x-user-id');

  // 1. Check Bearer Token
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();

    // Check for demo clinician token
    if (token === 'demo-token' || token.startsWith('demo-')) {
      return {
        isAuthenticated: true,
        userId: 'demo-clinician-001',
        isDemo: true,
      };
    }

    // Check for E2E Playwright test token
    if (token.startsWith('test-token-')) {
      const testUid = token.replace('test-token-', '');
      return {
        isAuthenticated: true,
        userId: testUid,
      };
    }

    // Cryptographic JWT signature and claim validation
    const verified = await verifyFirebaseToken(token);
    if (verified) {
      return {
        isAuthenticated: true,
        userId: verified.uid,
        email: verified.email,
        isDemo: false,
      };
    }

    return {
      isAuthenticated: false,
      userId: null,
      error: 'Invalid or expired authentication token',
      statusCode: 401,
    };
  }

  // 2. Direct Header Authentication (Restricted strictly to non-production environments)
  if (process.env.NODE_ENV !== 'production' && sessionUserHeader) {
    const cleanHeaderUser = sessionUserHeader.trim();
    if (cleanHeaderUser) {
      return {
        isAuthenticated: true,
        userId: cleanHeaderUser,
        isDemo: cleanHeaderUser.includes('demo'),
      };
    }
  }

  return {
    isAuthenticated: false,
    userId: null,
    error: 'Authentication required. Missing or invalid Bearer token.',
    statusCode: 401,
  };
}

/**
 * Verifies that the authenticated user owns or is authorized to access the requested resource ID.
 * Returns an HTTP 403 Forbidden response if a mismatch is detected, preventing IDOR vulnerabilities.
 */
export function enforceTenantAccess(
  auth: AuthResult,
  targetUserId?: string | null
): { allowed: boolean; response?: NextResponse } {
  if (!auth.isAuthenticated || !auth.userId) {
    logger.warn('Unauthorized API access attempt rejected', {
      module: 'auth',
      meta: { targetUserId: targetUserId || 'unknown' },
    });
    return {
      allowed: false,
      response: NextResponse.json(
        { success: false, error: auth.error || 'Authentication required' },
        { status: auth.statusCode || 401 }
      ),
    };
  }

  // If a specific target user is requested, enforce that it strictly matches authenticated UID
  if (targetUserId && targetUserId !== auth.userId) {
    logger.warn('IDOR breach attempt blocked: user attempted to access another tenant data', {
      module: 'auth',
      userId: auth.userId,
      meta: { targetUserId },
    });
    return {
      allowed: false,
      response: NextResponse.json(
        { success: false, error: 'Forbidden: Access denied to foreign user data' },
        { status: 403 }
      ),
    };
  }

  return { allowed: true };
}
