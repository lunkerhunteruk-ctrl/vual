-- ============================================================
-- Migration 009: Billing & Credits System
-- B2B store credits + B2C consumer freemium/subscription
-- ============================================================

-- 1. Store Credits (B2B balance per store)
CREATE TABLE IF NOT EXISTS store_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  total_purchased INTEGER NOT NULL DEFAULT 0,
  total_consumed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id)
);

CREATE INDEX IF NOT EXISTS idx_store_credits_store ON store_credits(store_id);

-- 2. Store Credit Transactions (B2B audit log)
CREATE TABLE IF NOT EXISTS store_credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'consumption', 'refund', 'adjustment')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  stripe_session_id TEXT,
  vton_queue_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_credit_tx_store ON store_credit_transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_store_credit_tx_created ON store_credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_credit_tx_stripe ON store_credit_transactions(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

-- 3. Consumer Credits (B2C balance per user)
CREATE TABLE IF NOT EXISTS consumer_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  line_user_id TEXT,
  free_tickets_remaining INTEGER NOT NULL DEFAULT 3,
  free_tickets_reset_at TIMESTAMPTZ NOT NULL DEFAULT (DATE_TRUNC('month', NOW()) + INTERVAL '1 month'),
  paid_credits INTEGER NOT NULL DEFAULT 0,
  subscription_credits INTEGER NOT NULL DEFAULT 0,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT CHECK (subscription_status IN ('active', 'canceled', 'past_due', NULL)),
  subscription_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT consumer_credits_identity CHECK (customer_id IS NOT NULL OR line_user_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_consumer_credits_customer ON consumer_credits(customer_id)
  WHERE customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_consumer_credits_line ON consumer_credits(line_user_id)
  WHERE line_user_id IS NOT NULL;

-- 4. Consumer Credit Transactions (B2C audit log)
CREATE TABLE IF NOT EXISTS consumer_credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consumer_credit_id UUID NOT NULL REFERENCES consumer_credits(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'free_ticket_use', 'free_ticket_reset',
    'paid_credit_purchase', 'paid_credit_use',
    'subscription_credit_grant', 'subscription_credit_use',
    'refund'
  )),
  amount INTEGER NOT NULL,
  description TEXT,
  stripe_session_id TEXT,
  vton_queue_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consumer_credit_tx_consumer ON consumer_credit_transactions(consumer_credit_id);
CREATE INDEX IF NOT EXISTS idx_consumer_credit_tx_created ON consumer_credit_transactions(created_at DESC);

-- 5. Credit Packs (product catalog for credit sales)
CREATE TABLE IF NOT EXISTS credit_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target TEXT NOT NULL CHECK (target IN ('store', 'consumer')),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_en TEXT,
  credits INTEGER NOT NULL,
  price_jpy INTEGER NOT NULL,
  stripe_price_id TEXT,
  is_subscription BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed credit packs
INSERT INTO credit_packs (target, slug, name, name_en, credits, price_jpy, sort_order) VALUES
  ('store', 'store-starter', 'スターター', 'Starter', 250, 10000, 1),
  ('store', 'store-standard', 'スタンダード', 'Standard', 1000, 35000, 2),
  ('store', 'store-pro', 'プロ', 'Pro', 3000, 90000, 3),
  ('consumer', 'consumer-10', '10クレジット', '10 Credits', 10, 500, 1),
  ('consumer', 'consumer-30', '30クレジット', '30 Credits', 30, 1200, 2),
  ('consumer', 'consumer-pass', 'VUAL Pass', 'VUAL Pass', 30, 980, 3)
ON CONFLICT (slug) DO NOTHING;

UPDATE credit_packs SET is_subscription = true WHERE slug = 'consumer-pass';

-- 6. Extend vton_queue with billing columns
ALTER TABLE vton_queue ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL;
ALTER TABLE vton_queue ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE vton_queue ADD COLUMN IF NOT EXISTS credit_source TEXT
  CHECK (credit_source IN ('store_b2b', 'consumer_free', 'consumer_paid', 'consumer_subscription', NULL));
ALTER TABLE vton_queue ADD COLUMN IF NOT EXISTS credit_transaction_id UUID;

CREATE INDEX IF NOT EXISTS idx_vton_queue_store ON vton_queue(store_id) WHERE store_id IS NOT NULL;

-- 7. PL/pgSQL: Atomic store credit deduction
CREATE OR REPLACE FUNCTION deduct_store_credit(
  p_store_id UUID,
  p_amount INTEGER,
  p_description TEXT,
  p_vton_queue_id UUID DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, new_balance INTEGER, transaction_id UUID) AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_tx_id UUID;
BEGIN
  -- Lock row for update to prevent race conditions
  SELECT balance INTO v_current_balance
  FROM store_credits
  WHERE store_id = p_store_id
  FOR UPDATE;

  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RETURN QUERY SELECT false, COALESCE(v_current_balance, 0), NULL::UUID;
    RETURN;
  END IF;

  v_new_balance := v_current_balance - p_amount;

  UPDATE store_credits
  SET balance = v_new_balance,
      total_consumed = total_consumed + p_amount,
      updated_at = NOW()
  WHERE store_id = p_store_id;

  INSERT INTO store_credit_transactions (store_id, type, amount, balance_after, description, vton_queue_id)
  VALUES (p_store_id, 'consumption', -p_amount, v_new_balance, p_description, p_vton_queue_id)
  RETURNING id INTO v_tx_id;

  RETURN QUERY SELECT true, v_new_balance, v_tx_id;
END;
$$ LANGUAGE plpgsql;

-- 8. PL/pgSQL: Atomic consumer credit deduction
-- Priority: free tickets > subscription credits > paid credits
CREATE OR REPLACE FUNCTION deduct_consumer_credit(
  p_consumer_credit_id UUID,
  p_vton_queue_id UUID DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, source TEXT, tx_id UUID) AS $$
DECLARE
  v_rec consumer_credits%ROWTYPE;
  v_tx_id UUID;
BEGIN
  SELECT * INTO v_rec
  FROM consumer_credits
  WHERE id = p_consumer_credit_id
  FOR UPDATE;

  IF v_rec IS NULL THEN
    RETURN QUERY SELECT false, 'none'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Auto-reset free tickets if due
  IF v_rec.free_tickets_reset_at <= NOW() THEN
    v_rec.free_tickets_remaining := 3;
    v_rec.free_tickets_reset_at := DATE_TRUNC('month', NOW()) + INTERVAL '1 month';

    UPDATE consumer_credits SET
      free_tickets_remaining = v_rec.free_tickets_remaining,
      free_tickets_reset_at = v_rec.free_tickets_reset_at
    WHERE id = p_consumer_credit_id;
  END IF;

  -- Try free tickets first
  IF v_rec.free_tickets_remaining > 0 THEN
    UPDATE consumer_credits SET
      free_tickets_remaining = v_rec.free_tickets_remaining - 1,
      updated_at = NOW()
    WHERE id = p_consumer_credit_id;

    INSERT INTO consumer_credit_transactions (consumer_credit_id, type, amount, description, vton_queue_id)
    VALUES (p_consumer_credit_id, 'free_ticket_use', -1, '無料チケット使用', p_vton_queue_id)
    RETURNING id INTO v_tx_id;

    RETURN QUERY SELECT true, 'consumer_free'::TEXT, v_tx_id;
    RETURN;
  END IF;

  -- Try subscription credits
  IF v_rec.subscription_credits > 0 THEN
    UPDATE consumer_credits SET
      subscription_credits = v_rec.subscription_credits - 1,
      updated_at = NOW()
    WHERE id = p_consumer_credit_id;

    INSERT INTO consumer_credit_transactions (consumer_credit_id, type, amount, description, vton_queue_id)
    VALUES (p_consumer_credit_id, 'subscription_credit_use', -1, 'VUAL Pass クレジット使用', p_vton_queue_id)
    RETURNING id INTO v_tx_id;

    RETURN QUERY SELECT true, 'consumer_subscription'::TEXT, v_tx_id;
    RETURN;
  END IF;

  -- Try paid credits
  IF v_rec.paid_credits > 0 THEN
    UPDATE consumer_credits SET
      paid_credits = v_rec.paid_credits - 1,
      updated_at = NOW()
    WHERE id = p_consumer_credit_id;

    INSERT INTO consumer_credit_transactions (consumer_credit_id, type, amount, description, vton_queue_id)
    VALUES (p_consumer_credit_id, 'paid_credit_use', -1, '有料クレジット使用', p_vton_queue_id)
    RETURNING id INTO v_tx_id;

    RETURN QUERY SELECT true, 'consumer_paid'::TEXT, v_tx_id;
    RETURN;
  END IF;

  -- No credits available
  RETURN QUERY SELECT false, 'none'::TEXT, NULL::UUID;
END;
$$ LANGUAGE plpgsql;

-- 9. RLS policies
ALTER TABLE store_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumer_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumer_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for now" ON store_credits FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON store_credit_transactions FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON consumer_credits FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON consumer_credit_transactions FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON credit_packs FOR ALL USING (true);

-- 10. Auto-update triggers
CREATE TRIGGER update_store_credits_updated_at BEFORE UPDATE ON store_credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_consumer_credits_updated_at BEFORE UPDATE ON consumer_credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
