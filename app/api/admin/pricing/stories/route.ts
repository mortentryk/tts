import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/middleware';

/**
 * PUT /api/admin/pricing/stories
 * Update story pricing (bulk or single)
 */
export async function PUT(request: NextRequest) {
  return withAdminAuth(request, async () => {
    try {
      const body = await request.json();
      const { storyId, price, stripePriceId, isFree } = body;

      // If updating a single story
      if (storyId) {
        // If updating stripe_price_id, first clear it from any other story that might have it
        if (stripePriceId) {
          await supabaseAdmin
            .from('stories')
            .update({ stripe_price_id: null })
            .eq('stripe_price_id', stripePriceId)
            .neq('id', storyId);
        }

        const updateData: any = {
          updated_at: new Date().toISOString(),
        };

        if (price !== undefined) updateData.price = price;
        if (stripePriceId !== undefined) updateData.stripe_price_id = stripePriceId || null;
        if (isFree !== undefined) updateData.is_free = isFree;

        const { data, error } = await supabaseAdmin
          .from('stories')
          .update(updateData)
          .eq('id', storyId)
          .select()
          .single();

        if (error) {
          console.error('❌ Error updating story:', error);
          return NextResponse.json(
            { error: 'Failed to update story', details: error.message },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true, story: data });
      }

      // Bulk update: set all paid stories to a specific price
      const { bulkPrice, bulkStripePriceId, onlyPublished } = body;

      if (bulkPrice === undefined) {
        return NextResponse.json(
          { error: 'bulkPrice is required for bulk updates' },
          { status: 400 }
        );
      }

      // If updating stripe_price_id, first clear it from all stories
      if (bulkStripePriceId) {
        await supabaseAdmin
          .from('stories')
          .update({ stripe_price_id: null })
          .eq('stripe_price_id', bulkStripePriceId);
      }

      // Build update data
      const updateData: any = {
        price: bulkPrice,
        is_free: false,
        updated_at: new Date().toISOString(),
      };

      if (bulkStripePriceId) {
        updateData.stripe_price_id = bulkStripePriceId;
      }

      // Build query
      let query = supabaseAdmin
        .from('stories')
        .update(updateData);

      if (onlyPublished) {
        query = query.eq('is_published', true);
      }

      // Only update non-free stories
      query = query.eq('is_free', false);

      const { data, error } = await query.select();

      if (error) {
        console.error('❌ Error bulk updating stories:', error);
        return NextResponse.json(
          { error: 'Failed to bulk update stories', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        updated: data?.length || 0,
        stories: data,
      });
    } catch (error: any) {
      console.error('❌ API error:', error);
      return NextResponse.json(
        { error: 'Internal server error', message: error?.message },
        { status: 500 }
      );
    }
  });
}

