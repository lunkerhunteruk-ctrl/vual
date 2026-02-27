-- Add source column to gemini_results to distinguish studio vs customer generations
ALTER TABLE gemini_results ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'studio';

-- Backfill: mark existing rows that have lineUserId-style patterns as customer
-- (existing rows without source are assumed to be studio)

-- Index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_gemini_results_source ON gemini_results(source);

COMMENT ON COLUMN gemini_results.source IS 'Origin of generation: studio (admin AI studio) or customer (customer try-on)';
