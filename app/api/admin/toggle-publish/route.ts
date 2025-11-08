import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  return withAdminAuth(request, async () => {
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
  });
}
