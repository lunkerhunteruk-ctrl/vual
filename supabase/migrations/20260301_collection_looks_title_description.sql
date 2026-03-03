-- Add title and description to collection_looks
-- Used by AI-generated copywriting for each look

ALTER TABLE collection_looks
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;
