-- ===========================================
-- MODEL IMAGES & PRODUCT LINKING MIGRATION
-- Run this in Supabase SQL Editor
-- ===========================================

-- ===========================================
-- 1. Add product_ids to gemini_results
-- ===========================================
ALTER TABLE gemini_results
  ADD COLUMN IF NOT EXISTS product_ids TEXT[] DEFAULT '{}';

COMMENT ON COLUMN gemini_results.product_ids IS 'Array of product IDs used in the generation';

-- ===========================================
-- 2. PRODUCT MODEL IMAGES TABLE
-- Stores AI-generated model wearing images
-- (separate from product_images which are product detail shots)
-- ===========================================
CREATE TABLE IF NOT EXISTS product_model_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_url TEXT NOT NULL,
  source_result_id UUID REFERENCES gemini_results(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_model_images_created ON product_model_images(created_at);

-- ===========================================
-- 3. LINKING TABLE (many-to-many: model images <-> products)
-- One model image can be linked to multiple products
-- ===========================================
CREATE TABLE IF NOT EXISTS product_model_image_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_image_id UUID NOT NULL REFERENCES product_model_images(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(model_image_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_model_image_links_product ON product_model_image_links(product_id);
CREATE INDEX IF NOT EXISTS idx_model_image_links_image ON product_model_image_links(model_image_id);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================
ALTER TABLE product_model_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_model_image_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for product_model_images" ON product_model_images FOR ALL USING (true);
CREATE POLICY "Allow all for product_model_image_links" ON product_model_image_links FOR ALL USING (true);

-- ===========================================
-- COMMENTS
-- ===========================================
COMMENT ON TABLE product_model_images IS 'AI-generated model wearing images, separate from product detail shots';
COMMENT ON TABLE product_model_image_links IS 'Links model wearing images to products (many-to-many)';
COMMENT ON COLUMN product_model_image_links.position IS 'Display order of model images for a product';
