-- Migration: Add timeline support to existing journey_stories table
-- Run this in your Supabase SQL Editor

-- Add new columns
ALTER TABLE journey_stories
ADD COLUMN IF NOT EXISTS sequence_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 5;

-- Drop the old unique constraint
ALTER TABLE journey_stories
DROP CONSTRAINT IF EXISTS journey_stories_story_id_node_key_key;

-- Add new unique constraint that allows multiple segments per story/node
ALTER TABLE journey_stories
ADD CONSTRAINT journey_stories_story_id_node_key_sequence_key 
UNIQUE(story_id, node_key, sequence_number);

-- Add index for sequence ordering
CREATE INDEX IF NOT EXISTS idx_journey_stories_sequence ON journey_stories(story_id, sequence_number);

-- Update existing records to have sequence_number = 1
UPDATE journey_stories
SET sequence_number = 1
WHERE sequence_number IS NULL;

-- Drop the old sort_order column if it exists
ALTER TABLE journey_stories
DROP COLUMN IF EXISTS sort_order;

-- Update table comment
COMMENT ON TABLE journey_stories IS 'Stores journey timeline segments that play in sequence before quest acceptance. Multiple segments create a cinematic intro.';

SELECT 'Migration completed successfully!' as status;

