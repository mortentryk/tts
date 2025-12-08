-- Add choices_audio_url and choices_text_hash columns to story_nodes table
-- This allows pre-generating TTS audio for button/choice narration

-- Add choices_audio_url column to store Cloudinary URL for generated choices audio
ALTER TABLE story_nodes ADD COLUMN IF NOT EXISTS choices_audio_url TEXT;

-- Add choices_text_hash column to track choice text changes and avoid regenerating audio
ALTER TABLE story_nodes ADD COLUMN IF NOT EXISTS choices_text_hash TEXT;

-- Create index for faster lookups by choices_text_hash
CREATE INDEX IF NOT EXISTS idx_story_nodes_choices_text_hash ON story_nodes(choices_text_hash);

-- Add comments to document the columns
COMMENT ON COLUMN story_nodes.choices_audio_url IS 'Cloudinary URL to pre-generated TTS audio file for choice buttons (ElevenLabs)';
COMMENT ON COLUMN story_nodes.choices_text_hash IS 'MD5 hash of formatted choices text - used to detect changes and avoid regenerating audio';

