import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/middleware';
import { invalidateStoryCache } from '@/lib/cache';

export async function DELETE(request: NextRequest) {
  return withAdminAuth(request, async () => {
    try {
    const { storySlug } = await request.json();

    if (!storySlug) {
      return NextResponse.json({ error: 'Story slug required' }, { status: 400 });
    }

    const { data: story, error: fetchError } = await supabaseAdmin
      .from('stories')
      .select('id')
      .eq('slug', storySlug)
      .single();

    if (fetchError || !story) {
      console.error('❌ Story fetch error:', fetchError);
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Delete story (cascades to nodes and choices automatically)
    const { error: deleteError } = await supabaseAdmin
      .from('stories')
      .delete()
      .eq('slug', storySlug);

    if (deleteError) {
      console.error('❌ Delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete story' }, { status: 500 });
    }

    await invalidateStoryCache(story.id);
    console.log(`✅ Story ${storySlug} deleted successfully`);

      return NextResponse.json({
        success: true,
        message: `Story "${storySlug}" deleted successfully`
      });
    } catch (error) {
      console.error('❌ Delete story error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  });
}
