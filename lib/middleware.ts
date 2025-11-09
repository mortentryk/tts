import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from './auth';

/**
 * Middleware to protect admin API routes
 * Use this in admin API route handlers
 */
export async function requireAdminAuth(request: NextRequest) {
  try {
    const session = await getAdminSession();

    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin authentication required' },
        { status: 401 }
      );
    }

    return null; // No error, proceed
  } catch (error: any) {
    console.error('❌ Error in requireAdminAuth:', error);
    return NextResponse.json(
      { error: 'Authentication check failed' },
      { status: 500 }
    );
  }
}

/**
 * Wrapper function for admin API routes
 * Usage: export async function GET(request: NextRequest) { return withAdminAuth(request, async () => { ... }); }
 */
export async function withAdminAuth(
  request: NextRequest,
  handler: () => Promise<NextResponse<any>>
): Promise<NextResponse<any>> {
  try {
    const authError = await requireAdminAuth(request);
    if (authError) {
      return authError;
    }

    return await handler();
  } catch (error: any) {
    console.error('❌ Error in withAdminAuth:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

