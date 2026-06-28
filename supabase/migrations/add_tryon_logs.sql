CREATE TABLE IF NOT EXISTS tryon_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES collection_bundles(id) ON DELETE CASCADE,
  owner_firebase_uid TEXT NOT NULL,
  viewer_firebase_uid TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tryon_logs_owner
  ON tryon_logs(owner_firebase_uid, created_at DESC);
