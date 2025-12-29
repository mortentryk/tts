import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/middleware';
import { characterSchema, safeValidateBody, validationErrorResponse } from '@/lib/validation';

// GET - List characters for a story
export async function GET(request: NextRequest) {
  return withAdminAuth(request, async () => {
    try {
    const { searchParams } = new URL(request.url);
    const storySlug = searchParams.get('storySlug');

    if (!storySlug) {
      return NextResponse.json(
        { error: 'Missing storySlug parameter' },
        { status: 400 }
      );
    }

    // Get story ID
    const { data: story, error: storyError } = await supabaseAdmin
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

    // Get characters for this story
    const { data: characters, error: charactersError } = await supabaseAdmin
      .from('characters')
      .select('*')
      .eq('story_id', story.id)
      .order('created_at', { ascending: true });

    if (charactersError) {
      return NextResponse.json(
        { error: 'Failed to load characters' },
        { status: 500 }
      );
    }

    return NextResponse.json({ characters });

    } catch (error) {
      console.error('❌ Characters fetch error:', error);
      return NextResponse.json(
        { error: `Failed to fetch characters: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
  });
}

// POST - Create a new character
export async function POST(request: NextRequest) {
  return withAdminAuth(request, async () => {
    try {
    const body = await request.json();
    
    // Validate request body
    const validation = safeValidateBody(characterSchema, body);
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }
    
    const { 
      storySlug, 
      name, 
      description, 
      referenceImageUrl, 
      appearancePrompt 
    } = validation.data;

    // Get story ID
    const { data: story, error: storyError } = await supabaseAdmin
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

    // Create character
    const { data: character, error: characterError } = await supabaseAdmin
      .from('characters')
      .insert({
        story_id: story.id,
        name,
        description: description || null,
        reference_image_url: referenceImageUrl || null,
        appearance_prompt: appearancePrompt || null,
      })
      .select()
      .single();

    if (characterError) {
      return NextResponse.json(
        { error: `Failed to create character: ${characterError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      character,
    });

    } catch (error) {
      console.error('❌ Character creation error:', error);
      return NextResponse.json(
        { error: `Failed to create character: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
  });
}
