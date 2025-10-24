-- Journey Adventure Map Schema
-- Add journey-related columns to stories table

ALTER TABLE stories ADD COLUMN IF NOT EXISTS journey_order INTEGER;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS landmark_type VARCHAR(50);
ALTER TABLE stories ADD COLUMN IF NOT EXISTS in_journey BOOLEAN DEFAULT false;

-- Create index for journey ordering
CREATE INDEX IF NOT EXISTS idx_stories_journey_order ON stories(journey_order ASC);

-- Update existing stories to have some in journey
-- You can customize which stories appear in the journey
UPDATE stories SET 
  in_journey = true,
  journey_order = 1,
  landmark_type = 'tree'
WHERE title ILIKE '%fyrtøjet%' OR title ILIKE '%tinderbox%';

UPDATE stories SET 
  in_journey = true,
  journey_order = 2,
  landmark_type = 'sea'
WHERE title ILIKE '%mermaid%' OR title ILIKE '%havfrue%';

UPDATE stories SET 
  in_journey = true,
  journey_order = 3,
  landmark_type = 'cave'
WHERE title ILIKE '%cave%' OR title ILIKE '%hule%';

UPDATE stories SET 
  in_journey = true,
  journey_order = 4,
  landmark_type = 'castle'
WHERE title ILIKE '%castle%' OR title ILIKE '%slot%';

UPDATE stories SET 
  in_journey = true,
  journey_order = 5,
  landmark_type = 'forest'
WHERE title ILIKE '%forest%' OR title ILIKE '%skov%';
