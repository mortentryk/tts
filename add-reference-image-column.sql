-- Add reference_image_node_key column to story_nodes table
-- This allows manually selecting which previous node's image to use as style reference
ALTER TABLE story_nodes ADD COLUMN IF NOT EXISTS reference_image_node_key TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN story_nodes.reference_image_node_key IS 'Node key of the image to use as style reference for this node. If null, uses first image automatically.';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_story_nodes_reference_image ON story_nodes(reference_image_node_key);

