-- Add firebase_uid to stores for personal user linking
ALTER TABLE stores ADD COLUMN IF NOT EXISTS firebase_uid TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_firebase_uid
  ON stores (firebase_uid)
  WHERE firebase_uid IS NOT NULL;
