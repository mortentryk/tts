const { createClient } = require('@supabase/supabase-js');

// Try to get from env, fallback to legacy defaults
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ooyzdksmeglhocjlaouo.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veXpka3NtZWdsaG9jamxhb3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MzMzODksImV4cCI6MjA3NjIwOTM4OX0.DbgORlJkyBae_VIg0b6Pk-bSuzZ8vmb2hNHVnhE7wI8';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veXpka3NtZWdsaG9jamxhb3VvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYzMzM4OSwiZXhwIjoyMDc2MjA5Mzg5fQ.97T-OTcCNBk0qrs-kdqoGQbhsFDyWCQ5Z_x4bbPPbTI';

console.log('🔍 Testing Supabase Connection...\n');
console.log('URL:', supabaseUrl);
console.log('Anon Key:', supabaseAnonKey ? 'SET' : 'NOT SET');
console.log('Service Key:', supabaseServiceKey ? 'SET' : 'NOT SET');
console.log('');

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  try {
    console.log('1️⃣ Testing basic connection with anon key...');
    const { data: testData, error: testError } = await supabase
      .from('stories')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Connection failed with anon key:', testError.message);
      console.error('   Code:', testError.code);
      console.error('   Details:', testError.details);
      console.error('   Hint:', testError.hint);
    } else {
      console.log('✅ Basic connection successful with anon key');
    }

    console.log('\n2️⃣ Testing connection with service role key...');
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('stories')
      .select('count')
      .limit(1);
    
    if (adminError) {
      console.error('❌ Connection failed with service role key:', adminError.message);
      console.error('   Code:', adminError.code);
      console.error('   Details:', adminError.details);
      console.error('   Hint:', adminError.hint);
    } else {
      console.log('✅ Connection successful with service role key');
    }

    console.log('\n3️⃣ Testing stories table access...');
    const { data: stories, error: storiesError } = await supabaseAdmin
      .from('stories')
      .select('id, slug, title, is_published')
      .limit(5);
    
    if (storiesError) {
      console.error('❌ Failed to fetch stories:', storiesError.message);
      console.error('   Code:', storiesError.code);
      console.error('   Details:', storiesError.details);
    } else {
      console.log(`✅ Found ${stories.length} stories (showing first 5):`);
      stories.forEach(story => {
        console.log(`   - ${story.title} (${story.slug}) - Published: ${story.is_published}`);
      });
    }

    console.log('\n4️⃣ Testing story_nodes table access...');
    const { data: nodes, error: nodesError } = await supabaseAdmin
      .from('story_nodes')
      .select('id, story_id, node_key')
      .limit(5);
    
    if (nodesError) {
      console.error('❌ Failed to fetch story nodes:', nodesError.message);
      console.error('   Code:', nodesError.code);
      console.error('   Details:', nodesError.details);
    } else {
      console.log(`✅ Found ${nodes.length} story nodes (showing first 5)`);
    }

    console.log('\n5️⃣ Testing published stories query (like API route)...');
    const { data: publishedStories, error: publishedError } = await supabaseAdmin
      .from('stories')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    
    if (publishedError) {
      console.error('❌ Failed to fetch published stories:', publishedError.message);
      console.error('   Code:', publishedError.code);
      console.error('   Details:', publishedError.details);
    } else {
      console.log(`✅ Found ${publishedStories.length} published stories`);
    }

    console.log('\n📊 Summary:');
    if (!testError && !adminError && !storiesError && !nodesError && !publishedError) {
      console.log('✅ All tests passed! Supabase is working correctly.');
    } else {
      console.log('❌ Some tests failed. Check the errors above.');
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    console.error('Stack:', err.stack);
  }
}

testConnection();

