import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware';

/**
 * GET /api/admin/session
 * Checks if the current user has a valid admin session
 * Returns { isAdmin: true } if authenticated, 401 if not
 */
export async function GET(request: NextRequest) {
  return withAdminAuth(request, async () => {
    return NextResponse.json({ isAdmin: true });
  });
}

