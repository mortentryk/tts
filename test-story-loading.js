// Test story loading from Supabase
// Run with: node test-story-loading.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ooyzdksmeglhocjlaouo.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veXpka3NtZWdsaG9jamxhb3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MzMzODksImV4cCI6MjA3NjIwOTM4OX0.DbgORlJkyBae_VIg0b6Pk-bSuzZ8vmb2hNHVnhE7wI8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStoryLoading() {
  try {
    console.log('🔍 Testing story loading...');
    
    // Test loading story list
    const { data: stories, error: storiesError } = await supabase
      .from('stories')
      .select('*')
      .eq('is_published', true);
    
    if (storiesError) {
      console.error('❌ Error loading stories:', storiesError);
      return;
    }
    
    console.log('📚 Published stories:', stories.length);
    stories.forEach(story => {
      console.log(`- ${story.slug}: "${story.title}" (${story.is_published ? 'Published' : 'Draft'})`);
    });
    
    if (stories.length === 0) {
      console.log('❌ No published stories found');
      return;
    }
    
    // Test loading a specific story
    const storySlug = stories[0].slug;
    console.log(`\n🔍 Testing story loading for: ${storySlug}`);
    
    const { data: storyData, error: storyError } = await supabase
      .from('stories')
      .select('*')
      .eq('slug', storySlug)
      .eq('is_published', true)
      .single();
    
    if (storyError) {
      console.error('❌ Error loading story:', storyError);
      return;
    }
    
    console.log('✅ Story loaded successfully!');
    console.log('📊 Story details:', {
      title: storyData.title,
      description: storyData.description,
      is_published: storyData.is_published
    });
    
    // Test loading story nodes
    const { data: nodes, error: nodesError } = await supabase
      .from('story_nodes')
      .select('*')
      .eq('story_id', storyData.id)
      .order('sort_index');
    
    if (nodesError) {
      console.error('❌ Error loading nodes:', nodesError);
      return;
    }
    
    console.log(`📄 Story nodes: ${nodes.length}`);
    console.log('✅ Story is ready to be displayed on the website!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testStoryLoading();
