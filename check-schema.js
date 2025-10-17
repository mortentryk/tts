// Check Supabase Schema
// Run with: node check-schema.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('🔍 Checking Supabase database schema...\n');

  try {
    // Check if stories table exists
    console.log('📚 Checking stories table...');
    const { data: stories, error: storiesError } = await supabase
      .from('stories')
      .select('*')
      .limit(1);
    
    if (storiesError) {
      console.log('❌ Stories table not found or not accessible');
      console.log('Error:', storiesError.message);
      console.log('\n📋 You need to run the database schema:');
      console.log('1. Go to https://ooyzdksmeglhocjlaouo.supabase.co');
      console.log('2. Go to SQL Editor');
      console.log('3. Copy and run the contents of supabase-schema.sql');
      return;
    }
    console.log('✅ Stories table: OK');

    // Check if story_nodes table exists
    console.log('📄 Checking story_nodes table...');
    const { data: nodes, error: nodesError } = await supabase
      .from('story_nodes')
      .select('*')
      .limit(1);
    
    if (nodesError) {
      console.log('❌ Story_nodes table not found');
      console.log('Error:', nodesError.message);
      return;
    }
    console.log('✅ Story_nodes table: OK');

    // Check if story_choices table exists
    console.log('🔗 Checking story_choices table...');
    const { data: choices, error: choicesError } = await supabase
      .from('story_choices')
      .select('*')
      .limit(1);
    
    if (choicesError) {
      console.log('❌ Story_choices table not found');
      console.log('Error:', choicesError.message);
      return;
    }
    console.log('✅ Story_choices table: OK');

    console.log('\n🎉 Database schema is properly set up!');
    console.log('\n📊 Current data:');
    console.log(`- Stories: ${stories?.length || 0}`);
    console.log(`- Nodes: ${nodes?.length || 0}`);
    console.log(`- Choices: ${choices?.length || 0}`);

    if (stories?.length === 0) {
      console.log('\n📝 Next steps:');
      console.log('1. Set up Google Sheets sync');
      console.log('2. Add some test story data');
      console.log('3. Test the app with Supabase loading');
    }

  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
  }
}

checkSchema();
