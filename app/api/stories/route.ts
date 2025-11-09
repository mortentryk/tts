import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('🔍 Fetching published stories...');
    
    // Get published stories first (without requiring nodes)
    const { data: stories, error } = await supabase
      .from('stories')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase error:', error);
      console.error('   Code:', error.code);
      console.error('   Message:', error.message);
      console.error('   Details:', error.details);
      console.error('   Hint:', error.hint);
      return NextResponse.json({ 
        error: 'Failed to load stories',
        details: error.message 
      }, { status: 500 });
    }

    if (!stories || stories.length === 0) {
      console.log('⚠️ No published stories found');
      return NextResponse.json([]);
    }

    console.log(`✅ Found ${stories.length} published stories`);

    // For each story, try to get the first node image if no cover image exists
    const processedStories = await Promise.all(
      stories.map(async (story) => {
        // If story already has a cover image, return it as is
        if (story.cover_image_url) {
          return story;
        }

        // Otherwise, try to get the first node image
        // Don't use .single() - it throws if no results found
        try {
          const { data: nodes, error: nodeError } = await supabase
            .from('story_nodes')
            .select('image_url, sort_index')
            .eq('story_id', story.id)
            .not('image_url', 'is', null)
            .order('sort_index', { ascending: true })
            .limit(1);

          // Check if we got any results (don't assume .single() worked)
          if (!nodeError && nodes && nodes.length > 0 && nodes[0]?.image_url) {
            story.cover_image_url = nodes[0].image_url;
          }
        } catch (nodeError) {
          // If no node found or error, just continue without cover image
          console.log(`⚠️ No cover image found for story ${story.slug}`);
        }

        return story;
      })
    );

    console.log('✅ Stories processed:', processedStories.length);
    return NextResponse.json(processedStories);

  } catch (error: any) {
    console.error('❌ API error:', error);
    console.error('   Stack:', error?.stack);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error?.message || 'An unexpected error occurred'
    }, { status: 500 });
  }
}
