const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ooyzdksmeglhocjlaouo.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veXpka3NtZWdsaG9jamxhb3VvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYzMzM4OSwiZXhwIjoyMDc2MjA5Mzg5fQ.97T-OTcCNBk0qrs-kdqoGQbhsFDyWCQ5Z_x4bbPPbTI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addClickCountColumn() {
  try {
    console.log('🔧 Adding click_count column to stories table...');
    
    // First, let's check if the column already exists by trying to select it
    const { data: testData, error: testError } = await supabase
      .from('stories')
      .select('click_count')
      .limit(1);
    
    if (!testError) {
      console.log('✅ click_count column already exists!');
      return;
    }
    
    console.log('❌ Column does not exist, need to add it manually.');
    console.log('');
    console.log('📋 Manual Steps:');
    console.log('1. Go to: https://supabase.com/dashboard/project/ooyzdksmeglhocjlaouo');
    console.log('2. Click "SQL Editor" in the left sidebar');
    console.log('3. Click "New query"');
    console.log('4. Paste this SQL and click "Run":');
    console.log('');
    console.log('ALTER TABLE stories ADD COLUMN click_count INTEGER DEFAULT 0;');
    console.log('');
    console.log('5. Then run this to create an index:');
    console.log('');
    console.log('CREATE INDEX idx_stories_click_count ON stories(click_count DESC);');
    console.log('');
    console.log('After running these SQL commands, the analytics will work!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addClickCountColumn();
