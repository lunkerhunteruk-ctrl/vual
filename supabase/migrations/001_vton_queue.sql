-- ===========================================
-- VTON Queue System Migration
-- Run this in Supabase SQL Editor
-- ===========================================

-- ===========================================
-- VTON QUEUE TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS vton_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  request_data JSONB NOT NULL,
  result_data JSONB,
  error_message TEXT,
  position INTEGER NOT NULL,
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for efficient queue operations
CREATE INDEX IF NOT EXISTS idx_vton_queue_status ON vton_queue(status);
CREATE INDEX IF NOT EXISTS idx_vton_queue_position ON vton_queue(position);
CREATE INDEX IF NOT EXISTS idx_vton_queue_user ON vton_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_vton_queue_created ON vton_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_vton_queue_pending ON vton_queue(status, position) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_vton_queue_retry ON vton_queue(status, next_retry_at) WHERE status = 'pending' AND next_retry_at IS NOT NULL;

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================
ALTER TABLE vton_queue ENABLE ROW LEVEL SECURITY;

-- Allow all for now (update with proper auth policies later)
CREATE POLICY "Allow all for vton_queue" ON vton_queue FOR ALL USING (true);

-- ===========================================
-- TRIGGERS
-- ===========================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_vton_queue_updated_at BEFORE UPDATE ON vton_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- FUNCTIONS
-- ===========================================

-- Function to get next queue position
CREATE OR REPLACE FUNCTION get_next_vton_queue_position()
RETURNS INTEGER AS $$
DECLARE
  max_position INTEGER;
BEGIN
  SELECT COALESCE(MAX(position), 0) INTO max_position
  FROM vton_queue
  WHERE status IN ('pending', 'processing');

  RETURN max_position + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get the next pending item for processing
CREATE OR REPLACE FUNCTION get_next_vton_queue_item()
RETURNS TABLE (
  id UUID,
  user_id TEXT,
  status TEXT,
  request_data JSONB,
  position INTEGER,
  retry_count INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vq.id,
    vq.user_id,
    vq.status,
    vq.request_data,
    vq.position,
    vq.retry_count,
    vq.created_at
  FROM vton_queue vq
  WHERE vq.status = 'pending'
    AND (vq.next_retry_at IS NULL OR vq.next_retry_at <= NOW())
  ORDER BY vq.position ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
END;
$$ LANGUAGE plpgsql;

-- Function to recalculate queue positions after completion
CREATE OR REPLACE FUNCTION recalculate_vton_queue_positions()
RETURNS VOID AS $$
BEGIN
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY position) as new_position
    FROM vton_queue
    WHERE status = 'pending'
  )
  UPDATE vton_queue
  SET position = ranked.new_position
  FROM ranked
  WHERE vton_queue.id = ranked.id;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- COMMENTS
-- ===========================================
COMMENT ON TABLE vton_queue IS 'Queue for Virtual Try-On (VTON) processing requests';
COMMENT ON COLUMN vton_queue.request_data IS 'JSON containing: personImage, garmentImages array, categories array, mode';
COMMENT ON COLUMN vton_queue.result_data IS 'JSON containing: results array with resultImage, category, processingTime per garment';
COMMENT ON COLUMN vton_queue.position IS 'Position in the queue (lower = processed first)';
COMMENT ON COLUMN vton_queue.retry_count IS 'Number of retry attempts (max 5)';
COMMENT ON COLUMN vton_queue.next_retry_at IS 'When the next retry should be attempted (for exponential backoff)';
