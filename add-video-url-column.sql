-- Add video_url column to story_nodes table for AI-generated videos
ALTER TABLE story_nodes ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN story_nodes.video_url IS 'URL to AI-generated video for this node (hosted on Cloudinary)';

