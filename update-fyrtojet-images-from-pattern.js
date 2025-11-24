const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  try {
    const envPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
      const envFile = fs.readFileSync(envPath, 'utf8');
      envFile.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
        }
      });
    }
  } catch (err) {
    console.error('Could not load .env.local');
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Base URL pattern from the user's example
const BASE_URL = 'https://res.cloudinary.com/dvdkhdvhg/image/upload/v1763209816/tts-books/fyrtojet/tts-books/fyrtojet/';

async function checkImageExists(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function updateFyrtojetImages() {
  try {
    console.log('📚 Getting fyrtojet story...\n');

    // Get the fyrtojet story
    const { data: stories, error: storyError } = await supabase
      .from('stories')
      .select('*')
      .eq('slug', 'fyrtojet')
      .limit(1);
    
    if (storyError || !stories || stories.length === 0) {
      console.error('❌ Story not found');
      return;
    }

    const story = stories[0];
    console.log(`✅ Found story: ${story.title} (${story.slug})`);
    console.log(`   ID: ${story.id}\n`);

    // Get all nodes
    const { data: nodes, error: nodesError } = await supabase
      .from('story_nodes')
      .select('node_key, image_url, sort_index')
      .eq('story_id', story.id)
      .order('sort_index', { ascending: true });
    
    if (nodesError) {
      console.error('❌ Error fetching nodes:', nodesError);
      return;
    }

    console.log(`📝 Found ${nodes.length} nodes\n`);

    // Try different URL patterns for each node
    console.log('🔍 Checking which image URLs exist...\n');
    
    let found = 0;
    let updated = 0;
    let errors = 0;

    for (const node of nodes) {
      // Try different patterns
      const patterns = [
        `image-${node.node_key}.jpg`,
        `image-${node.node_key.toLowerCase()}.jpg`,
        `scene-${node.node_key}.jpg`,
        `scene-${node.node_key.toLowerCase()}.jpg`,
      ];

      let foundUrl = null;

      for (const pattern of patterns) {
        const testUrl = BASE_URL + pattern;
        const exists = await checkImageExists(testUrl);
        
        if (exists) {
          foundUrl = testUrl;
          console.log(`✅ Found image for node ${node.node_key}: ${pattern}`);
          found++;
          break;
        }
      }

      if (foundUrl && node.image_url !== foundUrl) {
        const { error: updateError } = await supabase
          .from('story_nodes')
          .update({ 
            image_url: foundUrl,
            updated_at: new Date().toISOString()
          })
          .eq('story_id', story.id)
          .eq('node_key', node.node_key);
        
        if (updateError) {
          console.error(`   ❌ Update error: ${updateError.message}`);
          errors++;
        } else {
          console.log(`   ✅ Updated node ${node.node_key}`);
          updated++;
        }
      } else if (foundUrl) {
        console.log(`   ⏭️  Node ${node.node_key} already has correct URL`);
      } else {
        // Try checking if the node name itself might be the image name
        // For example: room3 -> image-room3.jpg
        const nodeNamePattern = `image-${node.node_key}.jpg`;
        const nodeNameUrl = BASE_URL + nodeNamePattern;
        const nodeNameExists = await checkImageExists(nodeNameUrl);
        
        if (nodeNameExists) {
          console.log(`✅ Found image for node ${node.node_key}: ${nodeNamePattern}`);
          found++;
          
          if (node.image_url !== nodeNameUrl) {
            const { error: updateError } = await supabase
              .from('story_nodes')
              .update({ 
                image_url: nodeNameUrl,
                updated_at: new Date().toISOString()
              })
              .eq('story_id', story.id)
              .eq('node_key', node.node_key);
            
            if (updateError) {
              console.error(`   ❌ Update error: ${updateError.message}`);
              errors++;
            } else {
              console.log(`   ✅ Updated node ${node.node_key}`);
              updated++;
            }
          }
        } else {
          // Only show missing for first 10 to avoid spam
          if (found < 10) {
            console.log(`⚠️  No image found for node ${node.node_key}`);
          }
        }
      }
    }

    // Update cover image from node 1
    const node1 = nodes.find(n => n.node_key === '1');
    if (node1 && node1.image_url) {
      console.log(`\n🖼️  Updating cover image from node 1...`);
      console.log(`   Node 1 image URL: ${node1.image_url}`);
      console.log(`   Current cover URL: ${story.cover_image_url || '(none)'}`);
      
      if (story.cover_image_url !== node1.image_url) {
        const { error: coverError } = await supabase
          .from('stories')
          .update({ 
            cover_image_url: node1.image_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', story.id);
        
        if (coverError) {
          console.error(`   ❌ Error updating cover image: ${coverError.message}`);
        } else {
          console.log(`   ✅ Updated cover image from node 1`);
        }
      } else {
        console.log(`   ✅ Cover image already set correctly`);
      }
    } else {
      console.log(`\n⚠️  Node 1 not found or has no image URL`);
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Images found: ${found}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Errors: ${errors}`);

  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  }
}

updateFyrtojetImages();

