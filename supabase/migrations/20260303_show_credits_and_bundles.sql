-- Add show_credits toggle to collection_looks
ALTER TABLE collection_looks ADD COLUMN IF NOT EXISTS show_credits BOOLEAN DEFAULT true;

-- Create collection_bundles table for grouping looks
CREATE TABLE IF NOT EXISTS collection_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add bundle reference to collection_looks
ALTER TABLE collection_looks ADD COLUMN IF NOT EXISTS bundle_id UUID REFERENCES collection_bundles(id) ON DELETE SET NULL;
ALTER TABLE collection_looks ADD COLUMN IF NOT EXISTS bundle_position INTEGER DEFAULT 0;

-- Index for bundle lookups
CREATE INDEX IF NOT EXISTS idx_collection_looks_bundle ON collection_looks(bundle_id) WHERE bundle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_collection_bundles_store ON collection_bundles(store_id);
