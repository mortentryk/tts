const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ooyzdksmeglhocjlaouo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veXpka3NtZWdsaG9jamxhb3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MzMzODksImV4cCI6MjA3NjIwOTM4OX0.DbgORlJkyBae_VIg0b6Pk-bSuzZ8vmb2hNHVnhE7wI8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function exploreSupabase() {
  try {
    console.log('🔍 Exploring Supabase Database...\n');
    
    // 1. Check stories table
    console.log('📚 STORIES TABLE:');
    const { data: stories, error: storiesError } = await supabase
      .from('stories')
      .select('*');
    
    if (storiesError) {
      console.error('❌ Stories error:', storiesError);
    } else {
      console.log(`Found ${stories.length} stories:`);
      stories.forEach(story => {
        console.log(`  - ID: ${story.id}`);
        console.log(`    Slug: ${story.slug}`);
        console.log(`    Title: ${story.title}`);
        console.log(`    Published: ${story.is_published}`);
        console.log(`    Created: ${new Date(story.created_at).toLocaleString()}`);
        console.log(`    Updated: ${new Date(story.updated_at).toLocaleString()}`);
        console.log('');
      });
    }

    // 2. Check story_nodes table
    console.log('📄 STORY_NODES TABLE:');
    const { data: nodes, error: nodesError } = await supabase
      .from('story_nodes')
      .select('*');
    
    if (nodesError) {
      console.error('❌ Nodes error:', nodesError);
    } else {
      console.log(`Found ${nodes.length} story nodes:`);
      nodes.forEach(node => {
        console.log(`  - Node Key: ${node.node_key}`);
        console.log(`    Story ID: ${node.story_id}`);
        console.log(`    Text: ${node.text_md.substring(0, 100)}...`);
        console.log(`    Image: ${node.image_url ? 'Yes' : 'No'}`);
        console.log(`    TTS: ${node.tts_ssml ? 'Yes' : 'No'}`);
        console.log(`    Dice Check: ${node.dice_check ? JSON.stringify(node.dice_check) : 'None'}`);
        console.log('');
      });
    }

    // 3. Check story_choices table
    console.log('🔗 STORY_CHOICES TABLE:');
    const { data: choices, error: choicesError } = await supabase
      .from('story_choices')
      .select('*');
    
    if (choicesError) {
      console.error('❌ Choices error:', choicesError);
    } else {
      console.log(`Found ${choices.length} story choices:`);
      choices.forEach(choice => {
        console.log(`  - From: ${choice.from_node_key} → To: ${choice.to_node_key}`);
        console.log(`    Label: ${choice.label}`);
        console.log(`    Story ID: ${choice.story_id}`);
        console.log(`    Sort Index: ${choice.sort_index}`);
        console.log('');
      });
    }

    // 4. Check for any other tables (if they exist)
    console.log('🔍 CHECKING FOR OTHER TABLES...');
    
    // Try to access some common table names
    const tableNames = ['users', 'profiles', 'settings', 'uploads', 'images', 'media'];
    
    for (const tableName of tableNames) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!error && data !== null) {
          console.log(`✅ Table '${tableName}' exists with ${data.length} sample records`);
        }
      } catch (err) {
        // Table doesn't exist or no access
      }
    }

    // 5. Summary
    console.log('\n📊 SUMMARY:');
    console.log(`- Stories: ${stories?.length || 0}`);
    console.log(`- Story Nodes: ${nodes?.length || 0}`);
    console.log(`- Story Choices: ${choices?.length || 0}`);

  } catch (err) {
    console.error('❌ Error exploring database:', err);
  }
}

exploreSupabase();
