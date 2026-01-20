-- Add subject and category columns to contacts
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS subject text,
ADD COLUMN IF NOT EXISTS category text DEFAULT 'general';

CREATE INDEX IF NOT EXISTS idx_contacts_category ON contacts(category);
