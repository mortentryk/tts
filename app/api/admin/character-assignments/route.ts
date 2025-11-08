import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Get character assignments for a story node
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storySlug = searchParams.get('storySlug');
    const nodeKey = searchParams.get('nodeKey');

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

    // Build query
    let query = supabaseAdmin
      .from('character_assignments')
      .select(`
        *,
        characters (
          id,
          name,
          description,
          reference_image_url,
          appearance_prompt
        )
      `)
      .eq('story_id', story.id);

    if (nodeKey) {
      query = query.eq('node_key', nodeKey);
    }

    const { data: assignments, error: assignmentsError } = await query;

    if (assignmentsError) {
      return NextResponse.json(
        { error: 'Failed to load character assignments' },
        { status: 500 }
      );
    }

    return NextResponse.json(assignments || []);

  } catch (error) {
    console.error('❌ Character assignments fetch error:', error);
    return NextResponse.json(
      { error: `Failed to fetch character assignments: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// POST - Create character assignments
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      storySlug, 
      nodeKey, 
      assignments 
    } = body;

    if (!storySlug || !nodeKey || !assignments) {
      return NextResponse.json(
        { error: 'Missing required fields: storySlug, nodeKey, assignments' },
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

    // Delete existing assignments for this node
    await supabaseAdmin
      .from('character_assignments')
      .delete()
      .eq('story_id', story.id)
      .eq('node_key', nodeKey);

    // Create new assignments
    const assignmentData = assignments.map((assignment: any) => ({
      story_id: story.id,
      node_key: nodeKey,
      character_id: assignment.characterId,
      role: assignment.role || null,
      emotion: assignment.emotion || null,
      action: assignment.action || null,
    }));

    const { data: newAssignments, error: assignmentsError } = await supabaseAdmin
      .from('character_assignments')
      .insert(assignmentData)
      .select(`
        *,
        characters (
          id,
          name,
          description,
          reference_image_url,
          appearance_prompt
        )
      `);

    if (assignmentsError) {
      return NextResponse.json(
        { error: `Failed to create character assignments: ${assignmentsError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      assignments: newAssignments,
    });

  } catch (error) {
    console.error('❌ Character assignment creation error:', error);
    return NextResponse.json(
      { error: `Failed to create character assignments: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
