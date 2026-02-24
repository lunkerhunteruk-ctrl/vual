-- ===========================================
-- GEMINI RESULTS: 5-DAY TTL & CLEANUP
-- Run this in Supabase SQL Editor
-- ===========================================

-- Add expires_at column (default 5 days from creation)
ALTER TABLE gemini_results
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '5 days');

-- Add storage_path column to track the Storage object for cleanup
ALTER TABLE gemini_results
  ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Index for efficient expired-row lookups
CREATE INDEX IF NOT EXISTS idx_gemini_results_expires
  ON gemini_results (expires_at)
  WHERE expires_at IS NOT NULL;

-- Backfill: set expires_at for existing rows (5 days from their created_at)
UPDATE gemini_results
  SET expires_at = created_at + INTERVAL '5 days'
  WHERE expires_at IS NULL;

-- ===========================================
-- CLEANUP FUNCTION
-- Deletes expired gemini_results rows.
-- Storage objects must be deleted separately via
-- the /api/cron/cleanup-gemini endpoint (Storage API).
-- ===========================================
CREATE OR REPLACE FUNCTION cleanup_expired_gemini_results()
RETURNS TABLE(deleted_count INTEGER, deleted_paths TEXT[]) AS $$
DECLARE
  paths TEXT[];
  cnt INTEGER;
BEGIN
  -- Collect storage paths before deleting
  SELECT ARRAY_AGG(storage_path)
    INTO paths
    FROM gemini_results
    WHERE expires_at < NOW()
      AND storage_path IS NOT NULL;

  -- Delete expired rows
  DELETE FROM gemini_results WHERE expires_at < NOW();
  GET DIAGNOSTICS cnt = ROW_COUNT;

  RETURN QUERY SELECT cnt, COALESCE(paths, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- OPTIONAL: pg_cron schedule (if extension is enabled)
-- Uncomment below after enabling pg_cron in
-- Supabase Dashboard > Database > Extensions
-- ===========================================
-- SELECT cron.schedule(
--   'cleanup-gemini-results',
--   '0 4 * * *',  -- daily at 4:00 AM UTC
--   $$SELECT cleanup_expired_gemini_results()$$
-- );
