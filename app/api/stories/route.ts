import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ooyzdksmeglhocjlaouo.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veXpka3NtZWdsaG9jamxhb3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MzMzODksImV4cCI6MjA3NjIwOTM4OX0.DbgORlJkyBae_VIg0b6Pk-bSuzZ8vmb2hNHVnhE7wI8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  try {
    // Get published stories with their first image as fallback
    const { data: stories, error } = await supabase
      .from('stories')
      .select(`
        *,
        story_nodes!inner(
          image_url,
          sort_index
        )
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase error:', error);
      return NextResponse.json({ error: 'Failed to load stories' }, { status: 500 });
    }

    // Process stories to add fallback images
    const processedStories = stories.map(story => {
      // If no cover image, use the first story node image
      if (!story.cover_image_url && story.story_nodes && story.story_nodes.length > 0) {
        const firstNodeWithImage = story.story_nodes
          .sort((a: any, b: any) => a.sort_index - b.sort_index)
          .find((node: any) => node.image_url);
        
        if (firstNodeWithImage) {
          story.cover_image_url = firstNodeWithImage.image_url;
        }
      }
      
      // Remove the story_nodes from the response
      delete story.story_nodes;
      return story;
    });

    console.log('✅ Stories loaded:', processedStories.length);
    return NextResponse.json(processedStories);

  } catch (error) {
    console.error('❌ API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
