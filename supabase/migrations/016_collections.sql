-- ===========================================
-- COLLECTION LOOKS & PRODUCTS
-- Curated AI-generated look images for store collection
-- Run this in Supabase SQL Editor
-- ===========================================

-- Collection looks (each row = one look in a store's collection)
CREATE TABLE IF NOT EXISTS collection_looks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  source_model_image_id UUID REFERENCES product_model_images(id) ON DELETE SET NULL,
  source_gemini_result_id UUID REFERENCES gemini_results(id) ON DELETE SET NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collection_looks_store ON collection_looks(store_id);
CREATE INDEX IF NOT EXISTS idx_collection_looks_store_position ON collection_looks(store_id, position ASC);

-- Collection look products (many-to-many, max 4 per look enforced at API level)
CREATE TABLE IF NOT EXISTS collection_look_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  look_id UUID NOT NULL REFERENCES collection_looks(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(look_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_look_products_look ON collection_look_products(look_id);
CREATE INDEX IF NOT EXISTS idx_collection_look_products_product ON collection_look_products(product_id);

-- RLS
ALTER TABLE collection_looks ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_look_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for collection_looks" ON collection_looks FOR ALL USING (true);
CREATE POLICY "Allow all for collection_look_products" ON collection_look_products FOR ALL USING (true);

COMMENT ON TABLE collection_looks IS 'AI-generated look images curated into a store collection';
COMMENT ON TABLE collection_look_products IS 'Products featured in each collection look (max 4)';
