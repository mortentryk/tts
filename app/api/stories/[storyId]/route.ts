import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { canUserAccessStory } from '@/lib/purchaseVerification';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const { storyId } = await params;
    console.log('🔍 Looking for story:', storyId);

    // Try to get story by slug first (without published check to see if it exists)
    let { data: storyBySlug, error: slugError } = await supabaseAdmin
      .from('stories')
      .select('*')
      .eq('slug', storyId)
      .single();

    // If not found by slug, try by id (UUID)
    let story = storyBySlug;
    let storyError = slugError;
    
    if (slugError || !storyBySlug) {
      console.log('📝 Story not found by slug, trying by ID...');
      const result = await supabaseAdmin
        .from('stories')
        .select('*')
        .eq('id', storyId)
        .single();
      
      story = result.data;
      storyError = result.error;
    }

    if (storyError || !story) {
      console.error('❌ Story fetch error:', storyError);
      console.error('❌ StoryId searched:', storyId);
      return NextResponse.json({ 
        error: 'Story not found',
        message: 'The story does not exist. Please check the story ID or slug.'
      }, { status: 404 });
    }

    // Check if story exists but isn't published
    if (!story.is_published) {
      console.log('⚠️ Story exists but is not published:', storyId);
      return NextResponse.json({ 
        error: 'Story not found',
        message: 'This story exists but is not published yet.'
      }, { status: 404 });
    }

    // Check if user has access to this story (only for paid stories)
    if (!story.is_free) {
      const userEmail = request.headers.get('user-email');
      const access = await canUserAccessStory(userEmail, story);
      
      if (!access.hasAccess) {
        return NextResponse.json(
          { 
            error: 'Purchase required',
            requiresPurchase: true,
            storyId: story.id,
            storyTitle: story.title,
            price: story.price
          }, 
          { status: 403 }
        );
      }
    }

    // Get story nodes
    const { data: nodes, error: nodesError } = await supabaseAdmin
      .from('story_nodes')
      .select('*')
      .eq('story_id', story.id)
      .order('sort_index', { ascending: true });

    if (nodesError) {
      console.error('❌ Nodes fetch error:', nodesError);
      return NextResponse.json({ error: 'Failed to fetch nodes' }, { status: 500 });
    }

    console.log('✅ Story loaded:', story.title, 'with', nodes.length, 'nodes');
    
    return NextResponse.json({
      ...story,
      nodes: nodes || []
    });

  } catch (error) {
    console.error('❌ API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
