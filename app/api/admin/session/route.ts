import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware';

/**
 * GET /api/admin/session
 * Checks if the current user has a valid admin session
 * Returns { isAdmin: true } if authenticated, 401 if not
 */
export async function GET(request: NextRequest) {
  try {
    return await withAdminAuth(request, async () => {
      return NextResponse.json({ isAdmin: true });
    });
  } catch (error: any) {
    console.error('❌ Session endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

