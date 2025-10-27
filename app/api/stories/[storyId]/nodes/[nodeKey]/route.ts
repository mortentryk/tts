import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ooyzdksmeglhocjlaouo.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veXpka3NtZWdsaG9jamxhb3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MzMzODksImV4cCI6MjA3NjIwOTM4OX0.DbgORlJkyBae_VIg0b6Pk-bSuzZ8vmb2hNHVnhE7wI8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string; nodeKey: string }> }
) {
  try {
    const { storyId, nodeKey } = await params;

    // Try to get story by slug first
    let { data: story, error: storyError } = await supabase
      .from('stories')
      .select('id')
      .eq('slug', storyId)
      .eq('is_published', true)
      .single();

    // If not found by slug, try by id (UUID)
    if (storyError || !story) {
      const result = await supabase
        .from('stories')
        .select('id')
        .eq('id', storyId)
        .eq('is_published', true)
        .single();
      
      story = result.data;
      storyError = result.error;
    }

    if (storyError || !story) {
      console.error('❌ Story not found or not published:', storyError);
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Get the story node
    const { data: node, error: nodeError } = await supabase
      .from('story_nodes')
      .select('*')
      .eq('story_id', story.id)
      .eq('node_key', nodeKey)
      .single();

    if (nodeError) {
      console.error('❌ Node not found:', nodeError);
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    // Get choices for this node
    const { data: choices, error: choicesError } = await supabase
      .from('story_choices')
      .select('*')
      .eq('story_id', story.id)
      .eq('from_node_key', nodeKey)
      .order('sort_index');

    if (choicesError) {
      console.error('❌ Choices fetch error:', choicesError);
    }

    const result = {
      ...node,
      choices: choices || []
    };

    console.log('✅ Node loaded:', nodeKey, 'with', choices?.length || 0, 'choices');
    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string; nodeKey: string }> }
) {
  try {
    const { storyId, nodeKey } = await params;
    const body = await request.json();

    // Try to get story by slug first
    let { data: story, error: storyError } = await supabase
      .from('stories')
      .select('id')
      .eq('slug', storyId)
      .single();

    // If not found by slug, try by id (UUID)
    if (storyError || !story) {
      const result = await supabase
        .from('stories')
        .select('id')
        .eq('id', storyId)
        .single();
      
      story = result.data;
      storyError = result.error;
    }

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
