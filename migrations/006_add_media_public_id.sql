ALTER TABLE public.media
ADD COLUMN IF NOT EXISTS public_id TEXT;

COMMENT ON COLUMN public.media.public_id IS 'Cloudinary public id for reliable deletes';
