import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// GET - List all journey stories or filter by story
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storySlug = searchParams.get('storySlug');
    const storyId = searchParams.get('storyId');

    let query = supabase
      .from('journey_stories')
      .select(`
        *,
        stories (
          id,
          slug,
          title
        )
      `)
      .order('sort_order', { ascending: true });

    // Filter by story if provided
    if (storyId) {
      query = query.eq('story_id', storyId);
    } else if (storySlug) {
      // First get the story ID from slug
      const { data: story } = await supabase
        .from('stories')
        .select('id')
        .eq('slug', storySlug)
        .single();

      if (story) {
        query = query.eq('story_id', story.id);
      }
    }

    const { data: journeys, error } = await query;

    if (error) {
      console.error('Error fetching journey stories:', error);
      return NextResponse.json(
        { error: 'Failed to fetch journey stories' },
        { status: 500 }
      );
    }

    return NextResponse.json(journeys || []);
  } catch (error) {
    console.error('Error in GET /api/admin/journey:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new journey story
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      storySlug,
      nodeKey,
      journeyTitle,
      journeyText,
      sortOrder = 0,
    } = body;

    if (!storySlug || !nodeKey || !journeyTitle || !journeyText) {
      return NextResponse.json(
        { error: 'Missing required fields: storySlug, nodeKey, journeyTitle, journeyText' },
        { status: 400 }
      );
    }

    // Get story ID from slug
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

    // Insert journey story
    const { data: journey, error: insertError } = await supabase
      .from('journey_stories')
      .insert({
        story_id: story.id,
        node_key: nodeKey,
        journey_title: journeyTitle,
        journey_text: journeyText,
        sort_order: sortOrder,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating journey story:', insertError);
      return NextResponse.json(
        { error: `Failed to create journey story: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(journey);
  } catch (error) {
    console.error('Error in POST /api/admin/journey:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update an existing journey story
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      journeyId,
      journeyTitle,
      journeyText,
      imageUrl,
      videoUrl,
      sortOrder,
      isActive,
      is_active,
      journey_title,
      journey_text,
      image_url,
      video_url,
      sort_order,
    } = body;

    if (!journeyId) {
      return NextResponse.json(
        { error: 'Missing required field: journeyId' },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (journeyTitle !== undefined || journey_title !== undefined) updates.journey_title = journeyTitle || journey_title;
    if (journeyText !== undefined || journey_text !== undefined) updates.journey_text = journeyText || journey_text;
    if (imageUrl !== undefined || image_url !== undefined) updates.image_url = imageUrl || image_url;
    if (videoUrl !== undefined || video_url !== undefined) updates.video_url = videoUrl || video_url;
    if (sortOrder !== undefined || sort_order !== undefined) updates.sort_order = sortOrder || sort_order;
    if (isActive !== undefined || is_active !== undefined) updates.is_active = isActive !== undefined ? isActive : is_active;

    const { data: journey, error: updateError } = await supabase
      .from('journey_stories')
      .update(updates)
      .eq('id', journeyId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating journey story:', updateError);
      return NextResponse.json(
        { error: `Failed to update journey story: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(journey);
  } catch (error) {
    console.error('Error in PATCH /api/admin/journey:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a journey story
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const journeyId = searchParams.get('journeyId');

    if (!journeyId) {
      return NextResponse.json(
        { error: 'Missing required parameter: journeyId' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('journey_stories')
      .delete()
      .eq('id', journeyId);

    if (deleteError) {
      console.error('Error deleting journey story:', deleteError);
      return NextResponse.json(
        { error: `Failed to delete journey story: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/journey:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

