import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/stories/[storyId]/purchase
 * Get story details for purchase page (doesn't require published status)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const { storyId: rawStoryId } = await params;
    // Decode URL-encoded storyId
    let storyId: string;
    try {
      storyId = decodeURIComponent(rawStoryId);
    } catch (e) {
      storyId = rawStoryId;
    }

    console.log('🔍 Purchase: Looking for story:', storyId);

    // Try to find story by ID (UUID) first
    let { data: storyById, error: idError } = await supabaseAdmin
      .from('stories')
      .select('id, title, slug, description, price, is_free, stripe_price_id, cover_image_url')
      .eq('id', storyId)
      .limit(1)
      .single();

    // If not found by ID, try by slug
    if (idError || !storyById) {
      console.log('📝 Purchase: Story not found by ID, trying by slug...');
      const { data: storyBySlug, error: slugError } = await supabaseAdmin
        .from('stories')
        .select('id, title, slug, description, price, is_free, stripe_price_id, cover_image_url')
        .eq('slug', storyId)
        .limit(1)
        .single();

      if (slugError || !storyBySlug) {
        console.error('❌ Purchase: Story not found by ID or slug:', storyId);
        return NextResponse.json(
          {
            error: 'Story not found',
            message: 'The story does not exist.',
            searchedId: storyId,
          },
          { status: 404 }
        );
      }

      storyById = storyBySlug;
    }

    // Check if story has pricing configured
    if (!storyById.is_free && (!storyById.price || storyById.price <= 0)) {
      console.warn('⚠️ Purchase: Story is not free but has no price set:', storyId);
      return NextResponse.json(
        {
          error: 'Story not available for purchase',
          message: 'This story is not configured for purchase. Please contact support.',
        },
        { status: 400 }
      );
    }

    console.log('✅ Purchase: Story found:', storyById.title);

    return NextResponse.json(storyById);
  } catch (error: any) {
    console.error('❌ Purchase API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error?.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

