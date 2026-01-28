import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import admin from 'firebase-admin';

// ============================================
// Types
// ============================================
export interface AuthenticatedUser {
  uid: string;
  email?: string;
  academyId?: string;
  role?: string;
  studentId?: string;
}

export interface AuthResult {
  authenticated: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

// ============================================
// Rate Limiting (In-Memory - For production use Redis)
// ============================================
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute

export function checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

// Stricter rate limit for payment endpoints
const PAYMENT_RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const PAYMENT_RATE_LIMIT_MAX = 5; // 5 payment attempts per minute

export function checkPaymentRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  const key = `payment:${identifier}`;
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + PAYMENT_RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (entry.count >= PAYMENT_RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

// ============================================
// Verify Firebase ID Token
// ============================================
export async function verifyIdToken(idToken: string): Promise<AuthResult> {
  try {
    // Get the admin auth instance
    const adminApp = admin.apps.length > 0 ? admin.app() : null;
    if (!adminApp) {
      return { authenticated: false, error: 'Firebase Admin not initialized' };
    }

    const auth = admin.auth(adminApp);
    const decodedToken = await auth.verifyIdToken(idToken);

    // Get user's academy mapping
    const userMappingDoc = await adminDb
      .collection('userAcademyMapping')
      .doc(decodedToken.uid)
      .get();

    const userDoc = await adminDb
      .collection('users')
      .doc(decodedToken.uid)
      .get();

    const userData = userDoc.data();
    const mappingData = userMappingDoc.data();

    // Get academyId from mapping (primaryAcademyId or first in academyIds array)
    const academyId = mappingData?.primaryAcademyId || mappingData?.academyIds?.[0];

    return {
      authenticated: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        academyId,
        role: userData?.role,
        studentId: userData?.studentId,
      },
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return { authenticated: false, error: 'Invalid or expired token' };
  }
}

// ============================================
// Extract Bearer Token from Request
// ============================================
export function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

// ============================================
// Authenticate Request Middleware
// ============================================
export async function authenticateRequest(
  request: NextRequest
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  const token = extractBearerToken(request);

  if (!token) {
    return NextResponse.json(
      { error: 'Missing authentication token' },
      { status: 401 }
    );
  }

  const result = await verifyIdToken(token);

  if (!result.authenticated || !result.user) {
    return NextResponse.json(
      { error: result.error || 'Authentication failed' },
      { status: 401 }
    );
  }

  return { user: result.user };
}

// ============================================
// Validate Request Body
// ============================================
export function validateAmount(amount: unknown): { valid: boolean; error?: string } {
  if (typeof amount !== 'number') {
    return { valid: false, error: 'Amount must be a number' };
  }
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be positive' };
  }
  if (amount > 100000000) { // Max 1 million reais in centavos
    return { valid: false, error: 'Amount exceeds maximum allowed' };
  }
  if (!Number.isInteger(amount)) {
    return { valid: false, error: 'Amount must be an integer (in centavos)' };
  }
  return { valid: true };
}

export function sanitizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  // Remove potential XSS/injection characters
  return value
    .replace(/[<>\"\']/g, '')
    .trim()
    .substring(0, 500); // Max 500 chars
}

export function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return false;

  // Check for known invalid patterns
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  // Validate check digits
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned[10])) return false;

  return true;
}

export function validateCardNumber(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/\D/g, '');
  if (cleaned.length < 13 || cleaned.length > 19) return false;

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]);

    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

// ============================================
// Create Error Response
// ============================================
export function createErrorResponse(
  error: string,
  status: number = 400
): NextResponse {
  return NextResponse.json({ error }, { status });
}

// ============================================
// Create Success Response
// ============================================
export function createSuccessResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

// ============================================
// CORS Headers (Restrictive)
// ============================================
export function getCORSHeaders(allowedOrigins: string[]): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowedOrigins.join(','),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

// Default to same-origin only in production
export function getDefaultCORSHeaders(): Record<string, string> {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

  if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:3000');
  }

  return getCORSHeaders(allowedOrigins.length > 0 ? allowedOrigins : ['']);
}
