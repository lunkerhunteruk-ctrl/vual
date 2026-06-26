-- ============================================================
-- Migration: Vault Platform Step 0
-- Firestore完全移行 + プラットフォーム基盤設計
-- ============================================================

-- ── 1. collection_looks に公開・カテゴリ・注入制限カラム追加 ──
ALTER TABLE collection_looks
  ADD COLUMN IF NOT EXISTS is_public        BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS category         TEXT        CHECK (category IN (
    'high_fashion', 'street', 'casual', 'minimal', 'feminine', 'classic', 'vintage', 'resort'
  )),
  -- injection_counts（Firestore）の移行先
  ADD COLUMN IF NOT EXISTS injection_initial   INTEGER,
  ADD COLUMN IF NOT EXISTS injection_remaining INTEGER;

-- 公開ルック取得用インデックス
CREATE INDEX IF NOT EXISTS idx_collection_looks_public
  ON collection_looks (published_at DESC)
  WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_collection_looks_category
  ON collection_looks (category, published_at DESC)
  WHERE is_public = true AND category IS NOT NULL;

-- ── 2. stores に type カラム追加（brand / personal） ──
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'brand'
  CHECK (type IN ('brand', 'personal'));

CREATE INDEX IF NOT EXISTS idx_stores_type ON stores(type);

-- ── 3. consumer_credits に firebase_uid と points 追加 ──
ALTER TABLE consumer_credits
  ADD COLUMN IF NOT EXISTS firebase_uid TEXT,
  ADD COLUMN IF NOT EXISTS points       INTEGER NOT NULL DEFAULT 0;

-- firebase_uid でも一意識別できるようにする
CREATE UNIQUE INDEX IF NOT EXISTS idx_consumer_credits_firebase
  ON consumer_credits (firebase_uid)
  WHERE firebase_uid IS NOT NULL;

-- 制約更新: customer_id / line_user_id / firebase_uid のいずれかが必須
ALTER TABLE consumer_credits DROP CONSTRAINT IF EXISTS consumer_credits_identity;
ALTER TABLE consumer_credits ADD CONSTRAINT consumer_credits_identity
  CHECK (
    customer_id IS NOT NULL OR
    line_user_id IS NOT NULL OR
    firebase_uid IS NOT NULL
  );

-- ── 4. user_generations テーブル（vault_user_generations移行先） ──
CREATE TABLE IF NOT EXISTS user_generations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT        NOT NULL,
  image_url    TEXT        NOT NULL,
  look_file    TEXT,                          -- 旧 lookFile（レシピ参照用）
  look_id      UUID        REFERENCES collection_looks(id) ON DELETE SET NULL,
  store_id     UUID        REFERENCES stores(id) ON DELETE SET NULL,
  city         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_generations_uid
  ON user_generations (firebase_uid, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_generations_look
  ON user_generations (look_id)
  WHERE look_id IS NOT NULL;

-- ── 5. decrement_injection() ストアドプロシージャ ──
-- injection_counts（Firestore）の runTransaction を置き換える
CREATE OR REPLACE FUNCTION decrement_injection(p_look_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_remaining INTEGER;
  v_initial   INTEGER;
BEGIN
  SELECT injection_remaining, injection_initial
  INTO v_remaining, v_initial
  FROM collection_looks
  WHERE id = p_look_id
  FOR UPDATE;

  IF v_remaining IS NULL THEN
    RETURN -1;
  END IF;

  IF v_remaining <= 0 THEN
    RETURN -1;
  END IF;

  UPDATE collection_looks
  SET injection_remaining = v_remaining - 1
  WHERE id = p_look_id;

  RETURN v_remaining - 1;
END;
$$ LANGUAGE plpgsql;

-- ── 6. RLS ──
ALTER TABLE user_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for now" ON user_generations FOR ALL USING (true);

-- ── 7. consumer_credit_transactions に generation タイプ追加 ──
-- ルック生成（Quick/Standard/Full）のクレジット消費を記録できるよう拡張
ALTER TABLE consumer_credit_transactions
  DROP CONSTRAINT IF EXISTS consumer_credit_transactions_type_check;

ALTER TABLE consumer_credit_transactions
  ADD CONSTRAINT consumer_credit_transactions_type_check
  CHECK (type IN (
    'free_ticket_use', 'free_ticket_reset',
    'paid_credit_purchase', 'paid_credit_use',
    'subscription_credit_grant', 'subscription_credit_use',
    'generation_quick', 'generation_standard', 'generation_full',
    'refund'
  ));
