-- earned_credits: 公開バックで付与、非公開で取り消されるクレジット
ALTER TABLE consumer_credits
  ADD COLUMN IF NOT EXISTS earned_credits NUMERIC(10,1) NOT NULL DEFAULT 0;

-- collection_bundles: バック額記録 + 公開/非公開フラグ
ALTER TABLE collection_bundles
  ADD COLUMN IF NOT EXISTS credits_back NUMERIC(10,1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;
