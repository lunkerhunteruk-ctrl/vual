-- Add editorial_group_id to group looks from the same multi-story editorial generation
ALTER TABLE collection_looks
  ADD COLUMN IF NOT EXISTS editorial_group_id UUID;

CREATE INDEX IF NOT EXISTS idx_collection_looks_editorial_group
  ON collection_looks(editorial_group_id)
  WHERE editorial_group_id IS NOT NULL;
