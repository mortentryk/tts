const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ooyzdksmeglhocjlaouo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veXpka3NtZWdsaG9jamxhb3VvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYzMzM4OSwiZXhwIjoyMDc2MjA5Mzg5fQ.97T-OTcCNBk0qrs-kdqoGQbhsFDyWCQ5Z_x4bbPPbTI'
);

async function addTestStories() {
  console.log('🚀 Adding test stories to Supabase...');

  // Add a test story
  const { data: story, error: storyError } = await supabase
    .from('stories')
    .insert({
      slug: 'cave-adventure',
      title: 'Cave Adventure',
      description: 'Explore a mysterious cave filled with treasures and dangers.',
      is_published: true,
      version: 1
    })
    .select('id')
    .single();

  if (storyError) {
    console.error('Error creating story:', storyError);
    return;
  }

  console.log('✅ Created story:', story.id);

  // Add story nodes
  const nodes = [
    {
      story_id: story.id,
      node_key: '1',
      text_md: 'You stand at the entrance to a dark cave. A cold wind blows from the opening, and you can hear distant sounds inside.',
      sort_index: 0
    },
    {
      story_id: story.id,
      node_key: '2',
      text_md: 'You carefully enter the cave. After a few meters, you discover that the floor is covered with loose stones and sharp rock pieces.',
      sort_index: 1
    }
  ];

  const { error: nodesError } = await supabase
    .from('story_nodes')
    .insert(nodes);

  if (nodesError) {
    console.error('Error creating nodes:', nodesError);
    return;
  }

  console.log('✅ Created story nodes');

  // Add story choices
  const choices = [
    {
      story_id: story.id,
      from_node_key: '1',
      label: 'Enter the cave carefully',
      to_node_key: '2',
      sort_index: 0
    },
    {
      story_id: story.id,
      from_node_key: '1',
      label: 'Examine the area around the entrance',
      to_node_key: '2',
      sort_index: 1
    }
  ];

  const { error: choicesError } = await supabase
    .from('story_choices')
    .insert(choices);

  if (choicesError) {
    console.error('Error creating choices:', choicesError);
    return;
  }

  console.log('✅ Created story choices');
  console.log('🎉 Test story added successfully!');
}

addTestStories().catch(console.error);
