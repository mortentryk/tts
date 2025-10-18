// Test cave adventure sync
// Run with: node test-cave-adventure.js

const fetch = require('node-fetch');

const ENDPOINT = 'https://thebook-lac.vercel.app/api/ingest/sheet';
const TOKEN = 'supabase-sync-token-2024';

// Test data matching your cave adventure format
const testData = {
  storySlug: 'cave-adventure',
  rows: [
    {
      node_key: '1',
      text_md: 'You stand at the entrance to a dark cave. A cold wind blows from the opening, and you can hear distant sounds inside.',
      image_url: '', // Empty string
      valg1_label: 'Enter the cave carefully',
      valg1_goto: '2',
      valg2_label: 'Examine the area around the entrance',
      valg2_goto: '3',
      check_stat: 'Evner',
      check_dc: '8',
      check_success: '4',
      check_fail: '5'
    },
    {
      node_key: '2',
      text_md: 'You carefully enter the cave. After a few meters, you discover that the floor is covered with loose stones and sharp rock pieces.',
      image_url: null, // Null value
      valg1_label: 'Continue carefully',
      valg1_goto: '3'
    }
  ],
  metadata: {
    title: 'Cave Adventure',
    description: 'Explore a mysterious cave filled with treasures and dangers.',
    length: '15-20 minutes',
    age: '8+',
    author: 'Test Author',
    front_screen_image: '' // Empty string
  }
};

async function testCaveAdventure() {
  try {
    console.log('🚀 Testing cave adventure sync...');
    console.log('📊 Test data:', JSON.stringify(testData, null, 2));
    
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Cave adventure sync successful!');
      console.log('📊 Result:', result);
    } else {
      console.log('❌ Cave adventure sync failed:');
      console.log('📊 Status:', response.status);
      console.log('📊 Error:', result);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testCaveAdventure();
