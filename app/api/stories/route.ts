import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ooyzdksmeglhocjlaouo.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veXpka3NtZWdsaG9jamxhb3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MzMzODksImV4cCI6MjA3NjIwOTM4OX0.DbgORlJkyBae_VIg0b6Pk-bSuzZ8vmb2hNHVnhE7wI8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  try {
    // First, get stories without the expensive join - much faster
    const { data: stories, error } = await supabase
      .from('stories')
      .select(`
        *,
        journey_order,
        landmark_type,
        in_journey
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase error:', error);
      return NextResponse.json({ error: 'Failed to load stories' }, { status: 500 });
    }

    // Only fetch first image for stories that don't have cover_image_url
    const storiesNeedingImage = stories.filter(s => !s.cover_image_url);
    
    if (storiesNeedingImage.length > 0) {
      // Fetch only the first image for each story that needs it
      const storyIds = storiesNeedingImage.map(s => s.id);
      
      // Use a more efficient query to get just the first image per story
      const { data: firstImages } = await supabase
        .from('story_nodes')
        .select('story_id, image_url, sort_index')
        .in('story_id', storyIds)
        .not('image_url', 'is', null)
        .order('sort_index', { ascending: true });

      // Group by story_id and take first image for each
      const imageMap = new Map<string, string>();
      if (firstImages) {
        firstImages.forEach(node => {
          if (!imageMap.has(node.story_id) && node.image_url) {
            imageMap.set(node.story_id, node.image_url);
          }
        });
      }

      // Add cover images to stories that need them
      stories.forEach(story => {
        if (!story.cover_image_url && imageMap.has(story.id)) {
          story.cover_image_url = imageMap.get(story.id);
        }
      });
    }

    console.log('✅ Stories loaded:', stories.length);
    return NextResponse.json(stories);

  } catch (error) {
    console.error('❌ API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
