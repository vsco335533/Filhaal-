

ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS document_urls TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.posts.document_urls IS 'Multiple PDF document URLs';

ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS youtube_url TEXT;
