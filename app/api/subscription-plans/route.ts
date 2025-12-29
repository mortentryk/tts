import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withRateLimit } from '@/lib/rateLimit';

/**
 * GET /api/subscription-plans
 * Get all active subscription plans
 */
export async function GET(request: NextRequest) {
  // Rate limit: 60 requests per minute
  return withRateLimit(request, 60, 60000, async () => {
    try {
    const { data: plans, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) {
      console.error('Error fetching subscription plans:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscription plans' },
        { status: 500 }
      );
    }

    return NextResponse.json(plans || []);
  } catch (error: any) {
    console.error('Error in subscription plans route:', error);
    return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

