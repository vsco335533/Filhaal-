-- Add an optional author_name override on posts
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS author_name text;

COMMENT ON COLUMN public.posts.author_name IS 'Optional author display name; if set, overrides profile full_name in post views';
