import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ooyzdksmeglhocjlaouo.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veXpka3NtZWdsaG9jamxhb3VvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYzMzM4OSwiZXhwIjoyMDc2MjA5Mzg5fQ.97T-OTcCNBk0qrs-kdqoGQbhsFDyWCQ5Z_x4bbPPbTI';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { storySlug } = await request.json();

    if (!storySlug) {
      return NextResponse.json({ error: 'Story slug required' }, { status: 400 });
    }

    // Get current story status
    const { data: story, error: fetchError } = await supabaseAdmin
      .from('stories')
      .select('is_published')
      .eq('slug', storySlug)
      .single();

    if (fetchError) {
      console.error('❌ Story fetch error:', fetchError);
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Toggle publish status
    const { data: updatedStory, error: updateError } = await supabaseAdmin
      .from('stories')
      .update({ is_published: !story.is_published })
      .eq('slug', storySlug)
      .select('is_published')
      .single();

    if (updateError) {
      console.error('❌ Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update story' }, { status: 500 });
    }

    console.log(`✅ Story ${storySlug} ${updatedStory.is_published ? 'published' : 'unpublished'}`);

    return NextResponse.json({
      success: true,
      is_published: updatedStory.is_published,
      message: `Story ${updatedStory.is_published ? 'published' : 'unpublished'} successfully`
    });

  } catch (error) {
    console.error('❌ Toggle publish error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
