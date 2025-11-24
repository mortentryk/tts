const { createClient } = require('@supabase/supabase-js');

// Require environment variables - no hardcoded fallbacks for security
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET' : 'NOT SET');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'NOT SET');
  console.error('\nPlease set these in your .env file');
  process.exit(1);
}

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

