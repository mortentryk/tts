-- Migration: Add audio support to journey_stories table
-- Run this in your Supabase SQL Editor
-- This migration is idempotent (safe to run multiple times)

-- Add audio_url column
ALTER TABLE journey_stories
ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Add text_hash column for caching (similar to story_nodes)
ALTER TABLE journey_stories
ADD COLUMN IF NOT EXISTS text_hash TEXT;

-- Add comment
COMMENT ON COLUMN journey_stories.audio_url IS 'URL to the narration audio file for this journey segment';
COMMENT ON COLUMN journey_stories.text_hash IS 'Hash of journey_text for audio caching';

SELECT 'Journey audio columns added successfully!' as status;

