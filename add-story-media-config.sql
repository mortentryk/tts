-- Add media configuration to stories table
ALTER TABLE stories ADD COLUMN IF NOT EXISTS default_media_type TEXT DEFAULT 'image' CHECK (default_media_type IN ('image', 'video', 'both', 'none'));
ALTER TABLE stories ADD COLUMN IF NOT EXISTS video_enabled BOOLEAN DEFAULT false;

-- Add comments
COMMENT ON COLUMN stories.default_media_type IS 'Default media type for this story: image, video, both, or none';
COMMENT ON COLUMN stories.video_enabled IS 'Whether video generation is enabled for this story';
