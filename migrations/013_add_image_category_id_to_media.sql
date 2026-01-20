-- Add image_category_id to media to reference image_categories
ALTER TABLE media
ADD COLUMN IF NOT EXISTS image_category_id uuid REFERENCES image_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_media_image_category ON media(image_category_id);
