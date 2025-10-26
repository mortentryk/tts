-- Create journey_stories table (timeline segments)
CREATE TABLE IF NOT EXISTS journey_stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  node_key TEXT NOT NULL,
  sequence_number INTEGER DEFAULT 1,
  journey_title TEXT NOT NULL,
  journey_text TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  duration_seconds INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(story_id, node_key, sequence_number)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_journey_stories_story_id ON journey_stories(story_id);
CREATE INDEX IF NOT EXISTS idx_journey_stories_node_key ON journey_stories(node_key);
CREATE INDEX IF NOT EXISTS idx_journey_stories_sequence ON journey_stories(story_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_journey_stories_active ON journey_stories(is_active);

-- Add RLS policies
ALTER TABLE journey_stories ENABLE ROW LEVEL SECURITY;

-- Allow public read access for active journey stories
CREATE POLICY "Allow public read access for active journey stories"
  ON journey_stories
  FOR SELECT
  USING (is_active = true);

-- Allow all operations for service role
CREATE POLICY "Allow all for service role"
  ON journey_stories
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE journey_stories IS 'Stores journey timeline segments that play in sequence before quest acceptance. Multiple segments create a cinematic intro.';

