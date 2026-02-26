-- ===========================================
-- ADD store_id TO gemini_results
-- Multi-tenant isolation: each store sees only its own generated images
-- Run this in Supabase SQL Editor
-- ===========================================

-- Add store_id column
ALTER TABLE gemini_results
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);

-- Index for efficient store-scoped queries
CREATE INDEX IF NOT EXISTS idx_gemini_results_store_id
  ON gemini_results (store_id);

-- Composite index for common query pattern (store + recency)
CREATE INDEX IF NOT EXISTS idx_gemini_results_store_created
  ON gemini_results (store_id, created_at DESC);

COMMENT ON COLUMN gemini_results.store_id IS 'Store that generated this image (multi-tenant isolation)';
