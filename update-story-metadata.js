// Update story metadata in Supabase
// Run with: node update-story-metadata.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ooyzdksmeglhocjlaouo.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veXpka3NtZWdsaG9jamxhb3VvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYzMzM4OSwiZXhwIjoyMDc2MjA5Mzg5fQ.97T-OTcCNBk0qrs-kdqoGQbhsFDyWCQ5Z_x4bbPPbTI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateStoryMetadata() {
  try {
    console.log('🔍 Updating story metadata...');
    
    // Update the story with slug "id"
    const { data, error } = await supabase
      .from('stories')
      .update({
        title: 'Skønhed og Udyret', // Change this to your desired title
        description: 'En dansk fortælling om skønhed, mod og forvandling med stemmestyring.', // Add description
        estimated_time: '25-30 minutes', // Change estimated time
        difficulty: 'medium', // Add difficulty
        author: 'Christian Hjorth' // Add author
      })
      .eq('slug', 'id')
      .select();
    
    if (error) {
      console.error('❌ Error updating story:', error);
      return;
    }
    
    console.log('✅ Story metadata updated successfully!');
    console.log('📊 Updated story:', data[0]);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

updateStoryMetadata();
