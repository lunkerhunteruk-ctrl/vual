-- ===========================================
-- GEMINI RESULTS TABLE MIGRATION
-- Run this in Supabase SQL Editor
-- ===========================================

-- ===========================================
-- GEMINI RESULTS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS gemini_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  garment_count INTEGER DEFAULT 1,
  model_id TEXT,
  settings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_gemini_results_user ON gemini_results(user_id);
CREATE INDEX IF NOT EXISTS idx_gemini_results_created ON gemini_results(created_at);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================
ALTER TABLE gemini_results ENABLE ROW LEVEL SECURITY;

-- Allow all for now (update with proper auth policies later)
CREATE POLICY "Allow all for gemini_results" ON gemini_results FOR ALL USING (true);

-- ===========================================
-- STORAGE BUCKET
-- ===========================================
-- Note: Run this in Supabase Dashboard > Storage or via API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('gemini-results', 'gemini-results', true);

-- ===========================================
-- COMMENTS
-- ===========================================
COMMENT ON TABLE gemini_results IS 'Saved results from Gemini freestyle image generation';
COMMENT ON COLUMN gemini_results.garment_count IS 'Number of garments included in the generated image (1-3)';
COMMENT ON COLUMN gemini_results.model_id IS 'ID of the model used for generation (if from database)';
COMMENT ON COLUMN gemini_results.settings IS 'JSON containing generation settings (gender, height, ethnicity, pose, background, etc.)';
