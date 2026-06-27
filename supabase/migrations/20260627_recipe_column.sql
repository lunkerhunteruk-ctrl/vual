-- Step 5: レシピ内包
-- collection_looks と user_generations に recipe JSONB を追加

ALTER TABLE collection_looks
  ADD COLUMN IF NOT EXISTS recipe JSONB;

ALTER TABLE user_generations
  ADD COLUMN IF NOT EXISTS recipe JSONB;

-- try-on 用インデックス（recipe が存在するルックを高速取得）
CREATE INDEX IF NOT EXISTS idx_collection_looks_recipe
  ON collection_looks (id)
  WHERE recipe IS NOT NULL AND is_public = true;
