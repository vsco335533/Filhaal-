-- -- Migration: Create debates table for admin-uploaded debates

-- CREATE TABLE IF NOT EXISTS debates (
--   id SERIAL PRIMARY KEY,
--   name VARCHAR(255),
--   description TEXT,
--   pdf_url TEXT NOT NULL,
--   cloudinary_id VARCHAR(255),
--   created_by INTEGER,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
CREATE TABLE IF NOT EXISTS debates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  description TEXT,
  pdf_url TEXT NOT NULL,
  cloudinary_id VARCHAR(255),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
