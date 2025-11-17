import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/authServer';
import { getUserPurchases } from '@/lib/purchaseVerification';

/**
 * Get current authenticated user's information and purchases
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getServerUser();

    if (!authUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const purchases = await getUserPurchases(authUser.email, authUser.id);

    return NextResponse.json({
      user: {
        id: authUser.id,
        email: authUser.email,
      },
      ...purchases,
    });
  } catch (error: any) {
    console.error('Error fetching user info:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user info' },
      { status: 500 }
    );
  }
}

