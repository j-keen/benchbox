-- Step 0: DB Migration for categories, rating, download_check
-- Run this in Supabase SQL Editor

ALTER TABLE videos ADD COLUMN IF NOT EXISTS categories text[] DEFAULT '{}';
ALTER TABLE videos ADD COLUMN IF NOT EXISTS rating integer DEFAULT 3;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS download_check boolean DEFAULT false;

UPDATE videos SET rating = 3 WHERE rating IS NULL;
UPDATE videos SET download_check = false WHERE download_check IS NULL;
UPDATE videos SET categories = '{}' WHERE categories IS NULL;

-- Add constraint (drop first if exists to be safe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rating_range'
  ) THEN
    ALTER TABLE videos ADD CONSTRAINT rating_range CHECK (rating >= 1 AND rating <= 5);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_videos_rating ON videos(rating);
CREATE INDEX IF NOT EXISTS idx_videos_download_check ON videos(download_check);
CREATE INDEX IF NOT EXISTS idx_videos_categories ON videos USING GIN(categories);
