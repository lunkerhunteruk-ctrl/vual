ALTER TABLE collection_bundles
  ADD COLUMN IF NOT EXISTS target_audience TEXT NOT NULL DEFAULT 'self'
    CHECK (target_audience IN ('self', 'same', 'opposite'));
