import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

// GET - Fetch journey story for a specific story node (public endpoint)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const { storyId } = await params;

    if (!storyId) {
      return NextResponse.json(
        { error: 'Story ID is required' },
        { status: 400 }
      );
    }

    // Get the story - try by slug first, then by UUID
    let story;
    let storyError;

    // First try as slug
    const slugResult = await supabase
      .from('stories')
      .select('id, slug')
      .eq('slug', storyId)
      .single();

    if (slugResult.data) {
      story = slugResult.data;
    } else {
      // Try as UUID
      const uuidResult = await supabase
        .from('stories')
        .select('id, slug')
        .eq('id', storyId)
        .single();
      
      story = uuidResult.data;
      storyError = uuidResult.error;
    }

    if (storyError || !story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    // Get journey stories for this story (only active ones)
    const { data: journeyStories, error: journeyError } = await supabase
      .from('journey_stories')
      .select('*')
      .eq('story_id', story.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (journeyError) {
      console.error('Error fetching journey stories:', journeyError);
      return NextResponse.json(
        { error: 'Failed to fetch journey stories' },
        { status: 500 }
      );
    }

    // Return the journey stories (could be empty array if none exist)
    return NextResponse.json(journeyStories || []);

  } catch (error) {
    console.error('Error in GET /api/stories/[storyId]/journey:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

