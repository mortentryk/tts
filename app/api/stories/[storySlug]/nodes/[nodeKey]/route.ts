import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ storySlug: string; nodeKey: string }> }
) {
  try {
    const { storySlug, nodeKey } = await params;
    const body = await request.json();

    // Get story ID
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('id')
      .eq('slug', storySlug)
      .single();

    if (storyError || !story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Update the story node
    const { data, error } = await supabase
      .from('story_nodes')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('story_id', story.id)
      .eq('node_key', nodeKey)
      .select();

    if (error) {
      console.error('Failed to update story node:', error);
      return NextResponse.json(
        { error: `Failed to update story node: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Update story node error:', error);
    return NextResponse.json(
      { error: `Update failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
