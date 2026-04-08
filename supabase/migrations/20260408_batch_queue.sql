-- Batch generation queue for dev store
CREATE TABLE IF NOT EXISTS batch_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', -- queued, processing, completed, failed
  payload JSONB NOT NULL, -- full request payload (model settings, garment URLs, prompt, etc.)
  result_image_url TEXT, -- R2 URL after generation
  result_saved BOOLEAN DEFAULT false, -- whether saved to gemini_results
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_batch_queue_store_status ON batch_queue(store_id, status);
