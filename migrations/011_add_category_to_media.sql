-- Add category_id to media so images can be associated with categories
ALTER TABLE media
ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_media_category ON media(category_id);
