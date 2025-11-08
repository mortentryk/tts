import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from './auth';

/**
 * Middleware to protect admin API routes
 * Use this in admin API route handlers
 */
export async function requireAdminAuth(request: NextRequest) {
  const session = await getAdminSession();

  if (!session || !session.isAdmin) {
    return NextResponse.json(
      { error: 'Unauthorized: Admin authentication required' },
      { status: 401 }
    );
  }

  return null; // No error, proceed
}

/**
 * Wrapper function for admin API routes
 * Usage: export async function GET(request: NextRequest) { return withAdminAuth(request, async () => { ... }); }
 */
export async function withAdminAuth<T>(
  request: NextRequest,
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T>> {
  const authError = await requireAdminAuth(request);
  if (authError) {
    return authError;
  }

  return handler();
}

