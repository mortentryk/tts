const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ooyzdksmeglhocjlaouo.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veXpka3NtZWdsaG9jamxhb3VvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYzMzM4OSwiZXhwIjoyMDc2MjA5Mzg5fQ.97T-OTcCNBk0qrs-kdqoGQbhsFDyWCQ5Z_x4bbPPbTI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🔧 Manual migration instructions:');
  console.log('');
  console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
  console.log('2. Navigate to your project: ooyzdksmeglhocjlaouo');
  console.log('3. Go to SQL Editor');
  console.log('4. Run this SQL:');
  console.log('');
  console.log('ALTER TABLE stories ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;');
  console.log('');
  console.log('5. Then run this to create an index:');
  console.log('');
  console.log('CREATE INDEX IF NOT EXISTS idx_stories_click_count ON stories(click_count DESC);');
  console.log('');
  console.log('After running the SQL, the admin dashboard will work with click tracking!');
}

runMigration();
