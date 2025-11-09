import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { canUserAccessStory } from '@/lib/purchaseVerification';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const { storyId: rawStoryId } = await params;
    // Decode URL-encoded storyId (handles %20 for spaces, etc.)
    let storyId: string;
    try {
      storyId = decodeURIComponent(rawStoryId);
    } catch (e) {
      // If decoding fails, use the raw storyId
      storyId = rawStoryId;
    }
    console.log('🔍 Looking for story (raw):', rawStoryId);
    console.log('🔍 Looking for story (decoded):', storyId);

    // Normalize the storyId to create a potential slug (lowercase, replace spaces/special chars with hyphens)
    const normalizedSlug = storyId.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    console.log('🔍 Normalized slug:', normalizedSlug);

    // Try to get story by slug first (without published check to see if it exists)
    // Try multiple variations: original, normalized, and exact match
    let { data: storyBySlug, error: slugError } = await supabaseAdmin
      .from('stories')
      .select('*')
      .eq('slug', storyId)
      .single();
    
    // If not found, try normalized slug
    if (slugError || !storyBySlug) {
      if (normalizedSlug !== storyId.toLowerCase()) {
        console.log('📝 Trying normalized slug...');
        const normalizedResult = await supabaseAdmin
          .from('stories')
          .select('*')
          .eq('slug', normalizedSlug)
          .single();
        
        if (normalizedResult.data) {
          storyBySlug = normalizedResult.data;
          slugError = null;
        } else if (normalizedResult.error) {
          console.log('⚠️ Normalized slug query error:', normalizedResult.error.message);
        }
      }
    }
    
    // Log slug error details for debugging
    if (slugError && slugError.code !== 'PGRST116') {
      console.error('❌ Slug query error:', slugError);
      console.error('   Code:', slugError.code);
      console.error('   Message:', slugError.message);
      console.error('   Details:', slugError.details);
    }

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
      console.error('❌ Normalized slug:', normalizedSlug);
      if (storyError) {
        console.error('   Error code:', storyError.code);
        console.error('   Error message:', storyError.message);
        console.error('   Error details:', storyError.details);
      }
      return NextResponse.json({ 
        error: 'Story not found',
        message: 'The story does not exist. Please check the story ID or slug.',
        searchedId: storyId,
        searchedSlug: normalizedSlug
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
      try {
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
      } catch (accessError) {
        console.error('❌ Access check error:', accessError);
        // If access check fails, we'll still try to load the story
        // but log the error for debugging
        console.warn('⚠️ Access check failed, continuing anyway:', accessError);
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
      return NextResponse.json({ 
        error: 'Failed to fetch nodes',
        message: nodesError.message || 'Database error while fetching story nodes'
      }, { status: 500 });
    }

    console.log('✅ Story loaded:', story.title, 'with', nodes?.length || 0, 'nodes');
    
    return NextResponse.json({
      ...story,
      nodes: nodes || []
    });

  } catch (error: any) {
    console.error('❌ API error:', error);
    console.error('❌ Error stack:', error?.stack);
    console.error('❌ Error message:', error?.message);
    console.error('❌ Error name:', error?.name);
    
    // Check if it's a Supabase initialization error
    if (error?.message?.includes('Missing Supabase') || error?.message?.includes('environment variables')) {
      return NextResponse.json({ 
        error: 'Configuration error',
        message: 'Database configuration is missing. Please check server environment variables.'
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error?.message || 'An unexpected error occurred while loading the story'
    }, { status: 500 });
  }
}
