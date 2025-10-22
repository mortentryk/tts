-- Add visual_style column to stories table for consistent image generation
ALTER TABLE stories ADD COLUMN IF NOT EXISTS visual_style TEXT DEFAULT 'fantasy adventure book illustration, detailed, cinematic lighting, consistent art style';

-- Add comment explaining the column
COMMENT ON COLUMN stories.visual_style IS 'Visual style description applied to all AI-generated images for this story to maintain consistent look and feel';

