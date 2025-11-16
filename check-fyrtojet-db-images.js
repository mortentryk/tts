const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local manually if dotenv is not available
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // Fallback: read .env.local manually
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
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkFyrtojetImages() {
  try {
    // Find the fyrtojet story (without ø)
    const { data: stories, error: storyError } = await supabase
      .from('stories')
      .select('*')
      .eq('slug', 'fyrtojet')
      .limit(1);
    
    if (storyError) {
      console.error('❌ Error fetching story:', storyError);
      return;
    }
    
    if (!stories || stories.length === 0) {
      console.log('⚠️  No story found with slug "fyrtojet"');
      return;
    }
    
    const story = stories[0];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📚 Story: ${story.title}`);
    console.log(`   Slug: ${story.slug}`);
    console.log(`   ID: ${story.id}`);
    console.log(`   Cover Image URL: ${story.cover_image_url || '(none)'}`);
    console.log(`   Published: ${story.is_published}`);
    
    // Check story_nodes for images
    console.log(`\n📝 Checking story_nodes for images...`);
    const { data: nodes, error: nodesError } = await supabase
      .from('story_nodes')
      .select('node_key, image_url, sort_index, text_md')
      .eq('story_id', story.id)
      .order('sort_index', { ascending: true });
    
    if (nodesError) {
      console.error(`  ❌ Error fetching nodes:`, nodesError);
      return;
    }
    
    console.log(`   Total nodes: ${nodes?.length || 0}`);
    
    // Count nodes with/without images
    const nodesWithImages = nodes?.filter(n => n.image_url && n.image_url.trim() !== '' && n.image_url.startsWith('http')) || [];
    const nodesWithoutImages = nodes?.filter(n => !n.image_url || !n.image_url.trim() || !n.image_url.startsWith('http')) || [];
    
    console.log(`   Nodes WITH valid images: ${nodesWithImages.length}`);
    console.log(`   Nodes WITHOUT images: ${nodesWithoutImages.length}`);
    
    // Check node 1 specifically
    const node1 = nodes?.find(n => n.node_key === '1');
    if (node1) {
      console.log(`\n   🎯 Node 1:`);
      console.log(`      Key: ${node1.node_key}`);
      console.log(`      Sort Index: ${node1.sort_index}`);
      console.log(`      Image URL: ${node1.image_url || '(none)'}`);
      console.log(`      Text preview: ${(node1.text_md || '').substring(0, 80)}...`);
    }
    
    // Show first 10 nodes with their image status
    console.log(`\n   📋 First 10 nodes:`);
    nodes?.slice(0, 10).forEach(node => {
      const hasImage = node.image_url && node.image_url.trim() !== '' && node.image_url.startsWith('http');
      const imageStatus = hasImage ? '✅' : '❌';
      const imagePreview = hasImage ? node.image_url.substring(0, 60) + '...' : 'no image';
      console.log(`      ${imageStatus} Node ${node.node_key} (sort: ${node.sort_index}): ${imagePreview}`);
    });
    
    // Show all nodes with images
    if (nodesWithImages.length > 0) {
      console.log(`\n   🖼️  All nodes WITH images (${nodesWithImages.length}):`);
      nodesWithImages.forEach(node => {
        console.log(`      ✅ Node ${node.node_key}: ${node.image_url}`);
      });
    }
    
    // Check story_images table (gallery)
    console.log(`\n🖼️  Checking story_images table (gallery)...`);
    const { data: galleryImages, error: galleryError } = await supabase
      .from('story_images')
      .select('*')
      .eq('story_id', story.id)
      .order('generated_at', { ascending: false });
    
    if (galleryError) {
      console.error(`  ❌ Error fetching gallery images:`, galleryError);
    } else {
      console.log(`   Total gallery images: ${galleryImages?.length || 0}`);
      if (galleryImages && galleryImages.length > 0) {
        console.log(`\n   📸 Gallery images (first 5):`);
        galleryImages.slice(0, 5).forEach(img => {
          console.log(`      - ${img.node_key || '(no node)'}: ${img.image_url}`);
          console.log(`        Status: ${img.status}, Model: ${img.model || 'N/A'}`);
        });
      }
    }
    
    // Check image_assignments
    console.log(`\n🔗 Checking image_assignments...`);
    const { data: assignments, error: assignmentsError } = await supabase
      .from('image_assignments')
      .select('node_key, image_id')
      .eq('story_id', story.id);
    
    if (assignmentsError) {
      console.error(`  ❌ Error fetching assignments:`, assignmentsError);
    } else {
      console.log(`   Total assignments: ${assignments?.length || 0}`);
      if (assignments && assignments.length > 0) {
        console.log(`\n   📎 Assignments (first 5):`);
        assignments.slice(0, 5).forEach(assign => {
          console.log(`      - Node ${assign.node_key} -> Image ${assign.image_id}`);
        });
      }
    }
    
    console.log(`\n${'='.repeat(60)}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkFyrtojetImages();

