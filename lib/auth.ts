import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { JWT_SECRET } from './env';
import bcrypt from 'bcryptjs';

const secretKey = new TextEncoder().encode(JWT_SECRET || 'fallback-secret-change-in-production');

export interface AdminSession {
  isAdmin: boolean;
  loggedInAt: number;
}

/**
 * Type guard to check if a JWT payload is a valid AdminSession
 */
function isAdminSessionPayload(payload: JWTPayload | unknown): payload is AdminSession {
  if (!payload || typeof payload !== 'object') return false;
  const record = payload as Record<string, unknown>;
  return typeof record.isAdmin === 'boolean' && typeof record.loggedInAt === 'number';
}

/**
 * Create a JWT token for admin session
 */
export async function createAdminSession(): Promise<string> {
  const token = await new SignJWT({ isAdmin: true, loggedInAt: Date.now() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h') // 24 hour session
    .sign(secretKey);

  return token;
}

/**
 * Verify admin JWT token
 */
export async function verifyAdminSession(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    
    if (isAdminSessionPayload(payload)) {
      return {
        isAdmin: payload.isAdmin,
        loggedInAt: payload.loggedInAt,
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get admin session from cookies
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_session')?.value;

    if (!token) {
      return null;
    }

    const session = await verifyAdminSession(token);
    return session;
  } catch (error: any) {
    // Cookies might not be available in all contexts
    // Return null instead of throwing to allow proper 401 handling
    console.error('Error getting admin session:', error?.message || error);
    return null;
  }
}

/**
 * Set admin session cookie
 */
export async function setAdminSession(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
}

/**
 * Clear admin session
 */
export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Check if user is authenticated as admin
 */
export async function requireAdminAuth(): Promise<AdminSession> {
  const session = await getAdminSession();

  if (!session || !session.isAdmin) {
    throw new Error('Unauthorized: Admin authentication required');
  }

  return session;
}

