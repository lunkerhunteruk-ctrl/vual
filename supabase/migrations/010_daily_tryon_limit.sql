-- =============================================================
-- Migration 010: B2B Daily Try-On Limit
-- =============================================================
-- Add per-store configurable daily try-on limit to prevent
-- excessive credit consumption by individual users.
-- Default: 3 try-ons per user per day.
-- =============================================================

-- Add daily_tryon_limit column to store_credits
ALTER TABLE store_credits ADD COLUMN IF NOT EXISTS daily_tryon_limit INTEGER NOT NULL DEFAULT 3;

-- Composite index for efficient daily usage count queries
CREATE INDEX IF NOT EXISTS idx_vton_queue_daily_usage
  ON vton_queue (store_id, user_id, credit_source, created_at)
  WHERE credit_source = 'store_b2b';
