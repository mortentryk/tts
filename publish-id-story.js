// Publish the "id" story in Supabase
// Run with: node publish-id-story.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ooyzdksmeglhocjlaouo.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veXpka3NtZWdsaG9jamxhb3VvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYzMzM4OSwiZXhwIjoyMDc2MjA5Mzg5fQ.97T-OTcCNBk0qrs-kdqoGQbhsFDyWCQ5Z_x4bbPPbTI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function publishStory() {
  try {
    console.log('🔍 Publishing the "id" story...');
    
    // Find the story by slug "id"
    const { data: stories, error: findError } = await supabase
      .from('stories')
      .select('*')
      .eq('slug', 'id');
    
    if (findError) {
      console.error('❌ Error finding story:', findError);
      return;
    }
    
    if (stories.length === 0) {
      console.log('❌ No story found with slug "id"');
      return;
    }
    
    const story = stories[0];
    console.log('📚 Found story:', story.title);
    console.log('📊 Current status:', story.is_published ? 'Published' : 'Draft');
    
    // Update the story with better metadata
    const { data: updateData, error: updateError } = await supabase
      .from('stories')
      .update({
        title: 'Skønhed og Udyret',
        description: 'En dansk fortælling om skønhed, mod og forvandling med stemmestyring.',
        is_published: true
      })
      .eq('id', story.id)
      .select();
    
    if (updateError) {
      console.error('❌ Error updating story:', updateError);
      return;
    }
    
    console.log('✅ Story updated and published successfully!');
    console.log('📊 Updated story:', updateData[0]);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

publishStory();
