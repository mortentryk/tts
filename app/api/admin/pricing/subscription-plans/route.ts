import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/middleware';

/**
 * GET /api/admin/pricing/subscription-plans
 * Get all subscription plans
 */
export async function GET(request: NextRequest) {
  return withAdminAuth(request, async () => {
    try {
      const { data: plans, error } = await supabaseAdmin
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true });

      if (error) {
        console.error('❌ Error fetching subscription plans:', error);
        return NextResponse.json(
          { error: 'Failed to fetch subscription plans', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json(plans || []);
    } catch (error: any) {
      console.error('❌ API error:', error);
      return NextResponse.json(
        { error: 'Internal server error', message: error?.message },
        { status: 500 }
      );
    }
  });
}

/**
 * PUT /api/admin/pricing/subscription-plans
 * Update subscription plan pricing
 */
export async function PUT(request: NextRequest) {
  return withAdminAuth(request, async () => {
    try {
      const body = await request.json();
      const { planId, price, stripePriceId, name, description } = body;

      if (!planId) {
        return NextResponse.json(
          { error: 'planId is required' },
          { status: 400 }
        );
      }

      // If updating stripe_price_id, first clear it from any other plan that might have it
      if (stripePriceId) {
        // Remove the price ID from any other plan that has it
        await supabaseAdmin
          .from('subscription_plans')
          .update({ stripe_price_id: null })
          .eq('stripe_price_id', stripePriceId)
          .neq('id', planId);
      }

      // Build update object
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (price !== undefined) updateData.price = price;
      if (stripePriceId !== undefined) updateData.stripe_price_id = stripePriceId || null;
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;

      // Update the plan
      const { data, error } = await supabaseAdmin
        .from('subscription_plans')
        .update(updateData)
        .eq('id', planId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating subscription plan:', error);
        return NextResponse.json(
          { error: 'Failed to update subscription plan', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, plan: data });
    } catch (error: any) {
      console.error('❌ API error:', error);
      return NextResponse.json(
        { error: 'Internal server error', message: error?.message },
        { status: 500 }
      );
    }
  });
}

