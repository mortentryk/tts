// Test Supabase Connection
// Run with: node test-supabase.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? '✅ Present' : '❌ Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('\n📡 Testing database connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('stories')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('⚠️  Database not set up yet (this is expected)');
      console.log('Error:', error.message);
      console.log('\n📋 Next steps:');
      console.log('1. Go to https://ooyzdksmeglhocjlaouo.supabase.co');
      console.log('2. Go to SQL Editor');
      console.log('3. Copy and run the contents of supabase-schema.sql');
      console.log('4. Run this test again');
    } else {
      console.log('✅ Database connection successful!');
      console.log('Stories count:', data);
    }
    
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  }
}

testConnection();
