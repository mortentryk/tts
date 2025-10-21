const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ooyzdksmeglhocjlaouo.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veXpka3NtZWdsaG9jamxhb3VvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYzMzM4OSwiZXhwIjoyMDc2MjA5Mzg5fQ.97T-OTcCNBk0qrs-kdqoGQbhsFDyWCQ5Z_x4bbPPbTI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixAdminIssues() {
  try {
    console.log('🔧 Checking and fixing admin issues...');
    
    // Test if is_published column exists
    const { data: testData, error: testError } = await supabase
      .from('stories')
      .select('is_published')
      .limit(1);
    
    if (testError && testError.code === 'PGRST204') {
      console.log('❌ is_published column does not exist!');
      console.log('');
      console.log('📋 Manual Fix Required:');
      console.log('1. Go to: https://supabase.com/dashboard/project/ooyzdksmeglhocjlaouo');
      console.log('2. Click "SQL Editor"');
      console.log('3. Run this SQL:');
      console.log('');
      console.log('ALTER TABLE stories ADD COLUMN is_published BOOLEAN DEFAULT false;');
      console.log('');
      console.log('4. Then run this to publish all existing stories:');
      console.log('');
      console.log('UPDATE stories SET is_published = true;');
      console.log('');
      console.log('After running these SQL commands, the admin dashboard will work!');
    } else if (testError) {
      console.log('❌ Other error:', testError);
    } else {
      console.log('✅ is_published column exists!');
      
      // Check if any stories are published
      const { data: publishedStories, error: pubError } = await supabase
        .from('stories')
        .select('slug, is_published')
        .eq('is_published', true);
      
      if (!pubError) {
        console.log(`📊 Found ${publishedStories.length} published stories`);
        if (publishedStories.length === 0) {
          console.log('⚠️  No stories are published! Run this SQL to publish all:');
          console.log('UPDATE stories SET is_published = true;');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixAdminIssues();
