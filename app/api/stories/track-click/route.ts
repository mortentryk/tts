import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/env';
import { withRateLimit } from '@/lib/rateLimit';

// Initialize Supabase admin client using validated env config
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request: NextRequest) {
  // Rate limit: 100 requests per minute (fire and forget endpoint)
  return withRateLimit(request, 100, 60000, async () => {
    try {
    const { storySlug } = await request.json();

    if (!storySlug) {
      return NextResponse.json({ error: 'Story slug required' }, { status: 400 });
    }

    // Get current click count and increment
    const { data: story, error: fetchError } = await supabaseAdmin
      .from('stories')
      .select('click_count')
      .eq('slug', storySlug)
      .single();

    if (!fetchError && story) {
      const { error: updateError } = await supabaseAdmin
        .from('stories')
        .update({ click_count: (story.click_count || 0) + 1 })
        .eq('slug', storySlug);

      if (updateError) {
        console.error('❌ Click tracking error:', updateError);
      } else {
        console.log(`📊 Click tracked for story: ${storySlug}`);
      }
    } else {
      console.error('❌ Could not fetch story for click tracking:', fetchError);
    }

    // Always return success (fire and forget)
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Click tracking error:', error);
      // Don't return error to user - this is fire and forget
      return NextResponse.json({ success: true });
    }
  });
}
