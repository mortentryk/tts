import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

// GET - Get image gallery for a story
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storySlug = searchParams.get('storySlug');
    const search = searchParams.get('search');
    const character = searchParams.get('character');
    const status = searchParams.get('status');
    const nodeKey = searchParams.get('nodeKey');

    if (!storySlug) {
      return NextResponse.json(
        { error: 'Missing storySlug parameter' },
        { status: 400 }
      );
    }

    // Get story ID
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('id, title')
      .eq('slug', storySlug)
      .single();

    if (storyError || !story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    // Build query with filters
    let query = supabase
      .from('story_images')
      .select(`
        *,
        image_assignments (
          node_key,
          assigned_at
        )
      `)
      .eq('story_id', story.id)
      .order('generated_at', { ascending: false });

    // Apply filters
    if (search) {
      query = query.or(`prompt.ilike.%${search}%,image_url.ilike.%${search}%`);
    }

    if (character) {
      query = query.contains('characters', [character]);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (nodeKey) {
      query = query.eq('node_key', nodeKey);
    }

    const { data: images, error: imagesError } = await query;

    if (imagesError) {
      return NextResponse.json(
        { error: 'Failed to load images' },
        { status: 500 }
      );
    }

    // Get story nodes for context
    const { data: nodes, error: nodesError } = await supabase
      .from('story_nodes')
      .select('node_key, text_md')
      .eq('story_id', story.id)
      .order('sort_index', { ascending: true });

    if (nodesError) {
      console.warn('⚠️ Could not load story nodes:', nodesError);
    }

    // Get characters for context
    const { data: characters, error: charactersError } = await supabase
      .from('characters')
      .select('name, description')
      .eq('story_id', story.id);

    if (charactersError) {
      console.warn('⚠️ Could not load characters:', charactersError);
    }

    return NextResponse.json({
      images: images || [],
      story: {
        id: story.id,
        title: story.title,
        slug: storySlug,
      },
      nodes: nodes || [],
      characters: characters || [],
    });

  } catch (error) {
    console.error('❌ Image gallery fetch error:', error);
    return NextResponse.json(
      { error: `Failed to fetch image gallery: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// POST - Create new image entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      storySlug,
      nodeKey,
      imageUrl,
      thumbnailUrl,
      publicId,
      characters = [],
      cost = 0,
      model = 'dalle3',
      prompt = '',
      width,
      height,
      fileSize,
    } = body;

    if (!storySlug || !imageUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: storySlug, imageUrl' },
        { status: 400 }
      );
    }

    // Get story ID
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('id')
      .eq('slug', storySlug)
      .single();

    if (storyError || !story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    // Create image entry
    const { data: image, error: imageError } = await supabase
      .from('story_images')
      .insert({
        story_id: story.id,
        node_key: nodeKey || null,
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl || imageUrl,
        public_id: publicId || null,
        characters,
        cost,
        model,
        prompt,
        width: width || null,
        height: height || null,
        file_size: fileSize || null,
        status: 'generated',
      })
      .select()
      .single();

    if (imageError) {
      return NextResponse.json(
        { error: `Failed to create image entry: ${imageError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      image,
    });

  } catch (error) {
    console.error('❌ Image creation error:', error);
    return NextResponse.json(
      { error: `Failed to create image: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
