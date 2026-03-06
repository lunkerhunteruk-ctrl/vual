-- Video generation jobs table
CREATE TABLE IF NOT EXISTS video_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  bundle_id UUID,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  video_model TEXT NOT NULL DEFAULT 'veo',
  total_duration_sec INTEGER NOT NULL DEFAULT 26,
  steps JSONB NOT NULL DEFAULT '[]',
  current_step TEXT,
  current_step_label TEXT,
  look_ids UUID[] DEFAULT '{}',
  request_data JSONB,
  clip_urls TEXT[] DEFAULT '{}',
  final_video_url TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  video_credits_charged INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_video_jobs_store_id ON video_jobs(store_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON video_jobs(status);
CREATE INDEX IF NOT EXISTS idx_video_jobs_bundle_id ON video_jobs(bundle_id);

-- Add video clip URL to collection_looks (for individual clip storage)
ALTER TABLE collection_looks ADD COLUMN IF NOT EXISTS video_clip_url TEXT;

-- Add video credits columns to store_subscriptions
ALTER TABLE store_subscriptions
  ADD COLUMN IF NOT EXISTS video_credits INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_credits_used INTEGER DEFAULT 0;

-- Video credit transaction log
CREATE TABLE IF NOT EXISTS video_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  video_job_id UUID REFERENCES video_jobs(id),
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_credit_transactions_store_id ON video_credit_transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_video_credit_transactions_job_id ON video_credit_transactions(video_job_id);
