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
    let { data: storyBySlugData, error: slugError } = await supabaseAdmin
      .from('stories')
      .select('*')
      .eq('slug', storyId)
      .limit(1);
    
    // Handle single result (or no result) - extract first item from array
    let storyBySlug: any = null;
    if (slugError) {
      storyBySlug = null;
    } else if (storyBySlugData && Array.isArray(storyBySlugData) && storyBySlugData.length > 0) {
      storyBySlug = storyBySlugData[0];
    } else {
      storyBySlug = null;
      slugError = { code: 'PGRST116', message: 'No rows returned' } as any;
    }
    
    // If not found, try normalized slug
    if ((slugError && slugError.code !== 'PGRST116') || !storyBySlug) {
      if (normalizedSlug !== storyId.toLowerCase()) {
        console.log('📝 Trying normalized slug...');
        const normalizedResult = await supabaseAdmin
          .from('stories')
          .select('*')
          .eq('slug', normalizedSlug)
          .limit(1);
        
        if (normalizedResult.data && Array.isArray(normalizedResult.data) && normalizedResult.data.length > 0) {
          storyBySlug = normalizedResult.data[0];
          slugError = null;
        } else if (normalizedResult.error && normalizedResult.error.code !== 'PGRST116') {
          console.log('⚠️ Normalized slug query error:', normalizedResult.error.message);
        }
      }
    }
    
    // Log slug error details for debugging (PGRST116 means "no rows", which is expected)
    if (slugError && slugError.code !== 'PGRST116') {
      console.error('❌ Slug query error:', slugError);
      console.error('   Code:', slugError.code);
      console.error('   Message:', slugError.message);
      console.error('   Details:', slugError.details);
    }

    // If not found by slug, try by id (UUID)
    let story = storyBySlug;
    let storyError = slugError;
    
    if ((slugError && slugError.code !== 'PGRST116') || !storyBySlug) {
      console.log('📝 Story not found by slug, trying by ID...');
      const result = await supabaseAdmin
        .from('stories')
        .select('*')
        .eq('id', storyId)
        .limit(1);
      
      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        story = result.data[0];
        storyError = null;
      } else {
        story = null;
        storyError = result.error || { code: 'PGRST116', message: 'No rows returned' } as any;
      }
    }

    // Check if story was found (PGRST116 means "no rows", which is expected for not found)
    if (!story || (storyError && storyError.code !== 'PGRST116')) {
      // Only log if it's a real error (not just "not found")
      if (storyError && storyError.code !== 'PGRST116') {
        console.error('❌ Story fetch error:', storyError);
        console.error('   Error code:', storyError.code);
        console.error('   Error message:', storyError.message);
        console.error('   Error details:', storyError.details);
      }
      console.error('❌ StoryId searched:', storyId);
      console.error('❌ Normalized slug:', normalizedSlug);
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
      console.log('⚠️ Story title:', story.title);
      console.log('⚠️ Story slug:', story.slug);
      return NextResponse.json({ 
        error: 'Story not found',
        message: 'This story exists but is not published yet. Please publish it in the admin panel to make it accessible.',
        storyId: story.id,
        storyTitle: story.title,
        storySlug: story.slug
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

    // Check if nodes should be included (default: true for backward compatibility)
    const includeNodes = request.nextUrl.searchParams.get('includeNodes') !== 'false';
    
    let nodes: any[] = [];
    if (includeNodes) {
      // Get story nodes
      const { data: nodesData, error: nodesError } = await supabaseAdmin
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
      
      nodes = nodesData || [];
      console.log('✅ Story loaded:', story.title, 'with', nodes.length, 'nodes');
    } else {
      console.log('✅ Story metadata loaded:', story.title, '(nodes excluded)');
    }
    
    // Add cache-control headers to prevent stale data
    const responseData: any = { ...story };
    if (includeNodes) {
      responseData.nodes = nodes;
    }
    
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
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
