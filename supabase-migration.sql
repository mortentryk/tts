-- Add click_count column to stories table
ALTER TABLE stories ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;

-- Create index for better performance on click_count queries
CREATE INDEX IF NOT EXISTS idx_stories_click_count ON stories(click_count DESC);
