const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkStory() {
  try {
    // Find the Fyrtøjet story
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('*')
      .ilike('slug', '%fyrt%')
      .limit(5);

    if (storyError) {
      console.error('❌ Error fetching story:', storyError);
      return;
    }

    if (!story || story.length === 0) {
      console.log('⚠️  No story found with "fyrt" in slug');
      return;
    }

    console.log(`\n📚 Found ${story.length} story/stories:\n`);
    
    for (const s of story) {
      console.log(`Story: ${s.title}`);
      console.log(`  Slug: ${s.slug}`);
      console.log(`  ID: ${s.id}`);
      console.log(`  Published: ${s.is_published}`);
      console.log(`  Created: ${s.created_at}`);
      console.log(`  Updated: ${s.updated_at}`);

      // Get nodes
      const { data: nodes, error: nodesError } = await supabase
        .from('story_nodes')
        .select('node_key, text_md, sort_index, updated_at')
        .eq('story_id', s.id)
        .order('sort_index', { ascending: true });

      if (nodesError) {
        console.error(`  ❌ Error fetching nodes:`, nodesError);
      } else {
        console.log(`  📝 Nodes: ${nodes?.length || 0}`);
        if (nodes && nodes.length > 0) {
          console.log(`  First 5 node keys:`, nodes.slice(0, 5).map(n => n.node_key).join(', '));
          console.log(`  Last 5 node keys:`, nodes.slice(-5).map(n => n.node_key).join(', '));
          console.log(`  Latest update: ${nodes.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0]?.updated_at}`);
        }
      }

      // Get choices
      const { data: choices, error: choicesError } = await supabase
        .from('story_choices')
        .select('id')
        .eq('story_id', s.id);

      if (choicesError) {
        console.error(`  ❌ Error fetching choices:`, choicesError);
      } else {
        console.log(`  🔀 Choices: ${choices?.length || 0}`);
      }

      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkStory();

