-- =============================================
-- Research Platform - Initial Database Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('super_admin', 'researcher');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE post_type AS ENUM ('research', 'field_study', 'opinion');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE post_status AS ENUM ('draft', 'submitted', 'under_review', 'published', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE media_type AS ENUM ('video', 'image', 'document');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE moderation_action AS ENUM ('submitted', 'approved', 'rejected', 'revision_requested');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- USERS TABLE (for authentication)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  encrypted_password text NOT NULL,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'researcher',
  bio text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- CATEGORIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- TAGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- POSTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text NOT NULL,
  excerpt text,
  type post_type NOT NULL,
  status post_status NOT NULL DEFAULT 'draft',
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  featured_image_url text,
  document_urls text[],
  view_count integer DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- =============================================
-- POST_TAGS TABLE (Many-to-Many)
-- =============================================
CREATE TABLE IF NOT EXISTS post_tags (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (post_id, tag_id)
);

-- =============================================
-- MEDIA TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type media_type NOT NULL,
  url text NOT NULL,
  thumbnail_url text,
  file_size bigint,
  duration integer,
  uploaded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid REFERENCES posts(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE media
ADD COLUMN status TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN approved_by uuid REFERENCES profiles(id);


-- =============================================
-- MODERATION_LOG TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS moderation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  moderator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action moderation_action NOT NULL,
  feedback text,
  created_at timestamptz DEFAULT now()
);


-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_media_post ON media(post_id);
CREATE INDEX IF NOT EXISTS idx_media_uploaded_by ON media(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_moderation_post ON moderation_log(post_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for posts
DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Anonymous User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'researcher')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_user_created ON users;
CREATE TRIGGER on_user_created
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Insert default categories
INSERT INTO categories (name, slug, description) VALUES
  ('Climate Research', 'climate-research', 'Research articles on climate change and environmental science'),
  ('Field Studies', 'field-studies', 'On-ground research and field observations'),
  ('Policy Analysis', 'policy-analysis', 'Analysis of policies and their impacts'),
  ('Technology & Innovation', 'technology-innovation', 'Research on technological advancements'),
  ('Social Science', 'social-science', 'Social and behavioral research')
ON CONFLICT (slug) DO NOTHING;

-- Insert default tags
INSERT INTO tags (name, slug) VALUES
  ('Environment', 'environment'),
  ('Data Science', 'data-science'),
  ('Public Health', 'public-health'),
  ('Agriculture', 'agriculture'),
  ('Education', 'education'),
  ('Economics', 'economics'),
  ('Wildlife', 'wildlife'),
  ('Sustainability', 'sustainability')
ON CONFLICT (slug) DO NOTHING;

-- Insert demo admin user
DO $$
DECLARE
  admin_id uuid := '00000000-0000-0000-0000-000000000001';
  researcher_id uuid := '00000000-0000-0000-0000-000000000002';
BEGIN
  -- Admin user
  INSERT INTO users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
  VALUES (
    admin_id,
    'admin@example.com',
    crypt('password', gen_salt('bf')),
    now(),
    '{"full_name": "Admin User", "role": "super_admin"}'::jsonb
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, full_name, role, bio)
  VALUES (
    admin_id,
    'Admin User',
    'super_admin',
    'Platform administrator'
  ) ON CONFLICT (id) DO NOTHING;

  -- Researcher user
  INSERT INTO users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
  VALUES (
    researcher_id,
    'researcher@example.com',
    crypt('password', gen_salt('bf')),
    now(),
    '{"full_name": "Dr. Jane Smith", "role": "researcher"}'::jsonb
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, full_name, role, bio)
  VALUES (
    researcher_id,
    'Dr. Jane Smith',
    'researcher',
    'Environmental scientist specializing in climate research'
  ) ON CONFLICT (id) DO NOTHING;
END $$;
