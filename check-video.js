// Script to check if video exists in database for a specific node
const { createClient } = require('@supabase/supabase-js');

// Try to load env vars - they should be set in the environment or .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ooyzdksmeglhocjlaouo.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veXpka3NtZWdsaG9jamxhb3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MzMzODksImV4cCI6MjA3NjIwOTM4OX0.DbgORlJkyBae_VIg0b6Pk-bSuzZ8vmb2hNHVnhE7wI8';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVideo() {
  try {
    // Search for node with text containing "Jesper går en tur"
    const { data: nodes, error } = await supabase
      .from('story_nodes')
      .select('*, stories(slug, title)')
      .ilike('text_md', '%Jesper går en tur%')
      .limit(10);

    if (error) {
      console.error('❌ Error querying nodes:', error);
      return;
    }

    console.log(`\n📊 Found ${nodes?.length || 0} nodes matching the text\n`);

    if (!nodes || nodes.length === 0) {
      console.log('No nodes found. Trying to find node with key "6"...');
      
      // Try to find node with key "6" in any story
      const { data: node6, error: node6Error } = await supabase
        .from('story_nodes')
        .select('*, stories(slug, title)')
        .eq('node_key', '6')
        .limit(10);

      if (node6Error) {
        console.error('❌ Error querying node 6:', node6Error);
        return;
      }

      if (node6 && node6.length > 0) {
        console.log(`\n📊 Found ${node6.length} nodes with key "6"\n`);
        node6.forEach((node, idx) => {
          console.log(`\n--- Node ${idx + 1} ---`);
          console.log(`Story: ${node.stories?.title || 'Unknown'} (${node.stories?.slug || 'unknown'})`);
          console.log(`Node Key: ${node.node_key}`);
          console.log(`Text: ${node.text_md?.substring(0, 100)}...`);
          console.log(`Image URL: ${node.image_url ? '✅ Yes' : '❌ No'}`);
          console.log(`Video URL: ${node.video_url ? '✅ Yes' : '❌ No'}`);
          if (node.video_url) {
            console.log(`Video URL: ${node.video_url}`);
          }
          console.log(`Updated At: ${node.updated_at}`);
        });
      } else {
        console.log('No nodes with key "6" found.');
      }
      return;
    }

    nodes.forEach((node, idx) => {
      console.log(`\n--- Node ${idx + 1} ---`);
      console.log(`Story: ${node.stories?.title || 'Unknown'} (${node.stories?.slug || 'unknown'})`);
      console.log(`Node Key: ${node.node_key}`);
      console.log(`Text: ${node.text_md?.substring(0, 100)}...`);
      console.log(`Image URL: ${node.image_url ? '✅ Yes' : '❌ No'}`);
      console.log(`Video URL: ${node.video_url ? '✅ Yes' : '❌ No'}`);
      if (node.video_url) {
        console.log(`Video URL: ${node.video_url}`);
      }
      console.log(`Updated At: ${node.updated_at}`);
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkVideo();

