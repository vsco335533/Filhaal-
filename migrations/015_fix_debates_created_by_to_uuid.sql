-- Migration: Change debates.created_by to uuid and add FK to profiles(id)

BEGIN;

ALTER TABLE debates DROP CONSTRAINT IF EXISTS fk_debates_created_by;

-- If column exists and is not uuid, drop it and recreate as uuid (nullable)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='debates' AND column_name='created_by') THEN
    -- Drop the column to avoid casting errors when types mismatch
    ALTER TABLE debates DROP COLUMN created_by;
  END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not drop created_by column: %', SQLERRM;
END$$;

ALTER TABLE debates ADD COLUMN created_by uuid;
ALTER TABLE debates ADD CONSTRAINT fk_debates_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

COMMIT;
