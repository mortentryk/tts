-- Add audio_url and text_hash columns to story_nodes table for ElevenLabs TTS caching

-- Add audio_url column to store Cloudinary URL for generated audio
ALTER TABLE story_nodes ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Add text_hash column to track text changes and avoid regenerating audio
ALTER TABLE story_nodes ADD COLUMN IF NOT EXISTS text_hash TEXT;

-- Create index for faster lookups by text_hash
CREATE INDEX IF NOT EXISTS idx_story_nodes_text_hash ON story_nodes(text_hash);

-- Add comments to document the columns
COMMENT ON COLUMN story_nodes.audio_url IS 'Cloudinary URL to pre-generated TTS audio file (ElevenLabs)';
COMMENT ON COLUMN story_nodes.text_hash IS 'MD5 hash of text_md - used to detect changes and avoid regenerating audio';

