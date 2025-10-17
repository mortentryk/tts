// Test Story Upload to Supabase
// Run with: node upload-test-story.js

const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const ENDPOINT = 'http://localhost:3000/api/ingest/sheet'; // Change to your Vercel URL
const TOKEN = 'supabase-sync-token-2024'; // Must match your INGEST_TOKEN

// Test story data
const testStory = {
  storySlug: 'cave-adventure',
  rows: [
    {
      node_key: '1',
      text_md: 'Du står ved indgangen til den mørke hule. En kold vind blæser ud fra åbningen, og du kan høre fjerne lyde derinde. Din fakkel kaster dansende skygger på væggene. Hvad gør du?',
      image_url: 'https://res.cloudinary.com/your-cloud/image/upload/v123/cave-entrance.jpg',
      choices: JSON.stringify([
        { label: 'Gå forsigtigt ind i hulen', to: '2' },
        { label: 'Undersøg området omkring indgangen', to: '3' }
      ]),
      sort_index: 0
    },
    {
      node_key: '2',
      text_md: 'Du går forsigtigt ind i hulen. Efter et par meter opdager du at gulvet er dækket af løse sten og skarpe klippestykker. Du må være forsigtig for ikke at snuble.',
      dice_check: JSON.stringify({
        stat: 'Evner',
        dc: 8,
        success: '4',
        fail: '5'
      }),
      sort_index: 1
    },
    {
      node_key: '3',
      text_md: 'Du undersøger området omkring indgangen og finder en gammel rusten dolk. Du samler den op og føler dig bedre rustet til udfordringerne der venter.',
      choices: JSON.stringify([
        { label: 'Gå ind i hulen med din nye dolk', to: '2' }
      ]),
      sort_index: 2
    }
  ]
};

async function uploadStory() {
  try {
    console.log('🚀 Uploading test story to Supabase...');
    console.log('Endpoint:', ENDPOINT);
    console.log('Story:', testStory.storySlug);
    console.log('Nodes:', testStory.rows.length);

    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify(testStory)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Story uploaded successfully!');
      console.log('Result:', result);
    } else {
      console.log('❌ Upload failed:', result);
    }

  } catch (error) {
    console.error('❌ Upload error:', error.message);
  }
}

uploadStory();
