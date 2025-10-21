import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
// Fixed to return nodes for Simple Image Manager
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ooyzdksmeglhocjlaouo.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veXpka3NtZWdsaG9jamxhb3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MzMzODksImV4cCI6MjA3NjIwOTM4OX0.DbgORlJkyBae_VIg0b6Pk-bSuzZ8vmb2hNHVnhE7wI8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const { storyId } = await params;

    // Get story metadata
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('*')
      .eq('slug', storyId)
      .eq('is_published', true)
      .single();

    if (storyError) {
      console.error('❌ Story fetch error:', storyError);
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Get story nodes
    const { data: nodes, error: nodesError } = await supabase
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
