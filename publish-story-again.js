// Publish "Skønheden og udyret" story in Supabase
// Run with: node publish-story-again.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ooyzdksmeglhocjlaouo.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veXpka3NtZWdsaG9jamxhb3VvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYzMzM4OSwiZXhwIjoyMDc2MjA5Mzg5fQ.97T-OTcCNBk0qrs-kdqoGQbhsFDyWCQ5Z_x4bbPPbTI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function publishStory() {
  try {
    console.log('🔍 Looking for "Skønheden og udyret" story...');
    
    // Find the story by slug
    const { data: stories, error: findError } = await supabase
      .from('stories')
      .select('*')
      .eq('slug', 'skonhedenogudyret'); // This should be the slug from your sheet
    
    if (findError) {
      console.error('❌ Error finding story:', findError);
      return;
    }
    
    if (stories.length === 0) {
      console.log('❌ No story found with slug "skonhedenogudyret"');
      console.log('🔍 Let me check all stories...');
      
      // List all stories to see what's available
      const { data: allStories, error: allError } = await supabase
        .from('stories')
        .select('slug, title, is_published');
      
      if (allError) {
        console.error('❌ Error listing stories:', allError);
        return;
      }
      
      console.log('📚 Available stories:');
      allStories.forEach(story => {
        console.log(`- ${story.slug}: "${story.title}" (${story.is_published ? 'Published' : 'Draft'})`);
      });
      return;
    }
    
    const story = stories[0];
    console.log('📚 Found story:', story.title);
    console.log('📊 Current status:', story.is_published ? 'Published' : 'Draft');
    
    // Publish the story
    const { data, error } = await supabase
      .from('stories')
      .update({ is_published: true })
      .eq('id', story.id)
      .select();
    
    if (error) {
      console.error('❌ Error publishing story:', error);
      return;
    }
    
    console.log('✅ Story published successfully!');
    console.log('📊 Updated story:', data[0]);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

publishStory();
