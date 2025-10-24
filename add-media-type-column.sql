-- Add media_type column to story_nodes table for controlling image vs video
ALTER TABLE story_nodes ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video', 'both', 'none'));

-- Add comment explaining the column
COMMENT ON COLUMN story_nodes.media_type IS 'Controls media type for this node: image, video, both, or none';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_story_nodes_media_type ON story_nodes(media_type);
