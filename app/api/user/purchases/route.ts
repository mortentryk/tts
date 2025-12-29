import { NextRequest, NextResponse } from 'next/server';
import { getUserPurchases } from '@/lib/purchaseVerification';
import { withRateLimit } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  // Rate limit: 60 requests per minute
  return withRateLimit(request, 60, 60000, async () => {
    try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const purchases = await getUserPurchases(email);

    return NextResponse.json(purchases);
  } catch (error: any) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json(
        { error: error.message || 'Failed to fetch purchases' },
        { status: 500 }
      );
    }
  });
}

