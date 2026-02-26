-- Store Subscriptions: monthly plan + AI Studio credits
CREATE TABLE IF NOT EXISTS store_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) UNIQUE,
  plan TEXT NOT NULL DEFAULT 'trial',
  status TEXT NOT NULL DEFAULT 'trialing',
  trial_ends_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_period_end TIMESTAMPTZ,
  studio_subscription_credits INTEGER NOT NULL DEFAULT 0,
  studio_topup_credits INTEGER NOT NULL DEFAULT 0,
  studio_credits_total_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Studio credit transaction log
CREATE TABLE IF NOT EXISTS studio_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  stripe_session_id TEXT,
  gemini_result_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_studio_credit_transactions_store_id ON studio_credit_transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_studio_credit_transactions_stripe_session ON studio_credit_transactions(stripe_session_id);

-- AI Studio topup credit packs
INSERT INTO credit_packs (target, slug, name, name_en, credits, price_jpy, is_subscription, is_active, sort_order) VALUES
  ('store', 'studio-light', 'ライト', 'Light', 50, 12000, false, true, 10),
  ('store', 'studio-standard', 'スタンダード', 'Standard', 150, 33000, false, true, 11),
  ('store', 'studio-pro', 'プロ', 'Pro', 500, 90000, false, true, 12)
ON CONFLICT (slug) DO NOTHING;
