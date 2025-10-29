import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { canUserAccessStory } from '@/lib/purchaseVerification';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const { storyId } = await params;

    // Try to get story by slug first
    let { data: story, error: storyError } = await supabaseAdmin
      .from('stories')
      .select('*')
      .eq('slug', storyId)
      .eq('is_published', true)
      .single();

    // If not found by slug, try by id (UUID)
    if (storyError || !story) {
      const result = await supabaseAdmin
        .from('stories')
        .select('*')
        .eq('id', storyId)
        .eq('is_published', true)
        .single();
      
      story = result.data;
      storyError = result.error;
    }

    if (storyError || !story) {
      console.error('❌ Story fetch error:', storyError);
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
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
