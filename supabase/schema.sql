-- ===========================================
-- VUAL Fashion E-commerce Database Schema
-- Run this in Supabase SQL Editor
-- ===========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- STORES (Multi-tenant support)
-- ===========================================
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  owner_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- PRODUCTS
-- ===========================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  description_en TEXT,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  base_price INTEGER NOT NULL, -- Store in smallest unit (yen)
  discounted_price INTEGER,
  currency TEXT DEFAULT 'jpy',
  tax_included BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_highlighted BOOLEAN DEFAULT false,
  size_specs JSONB, -- Flexible size specifications
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_category ON products(category);

-- ===========================================
-- PRODUCT IMAGES
-- ===========================================
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  color TEXT, -- Link image to color variant
  position INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_images_product ON product_images(product_id);

-- ===========================================
-- PRODUCT VARIANTS (Size x Color)
-- ===========================================
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color TEXT,
  size TEXT,
  sku TEXT NOT NULL,
  price_override INTEGER, -- Override base price if different
  stock INTEGER DEFAULT 0,
  image_id UUID REFERENCES product_images(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, color, size)
);

CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(sku);

-- ===========================================
-- CUSTOMERS
-- ===========================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  line_user_id TEXT, -- LINE integration
  total_orders INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, email)
);

CREATE INDEX idx_customers_store ON customers(store_id);
CREATE INDEX idx_customers_line ON customers(line_user_id);

-- ===========================================
-- ORDERS
-- ===========================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  subtotal INTEGER NOT NULL,
  tax INTEGER DEFAULT 0,
  shipping INTEGER DEFAULT 0,
  discount INTEGER DEFAULT 0,
  total INTEGER NOT NULL,
  currency TEXT DEFAULT 'jpy',
  shipping_address JSONB NOT NULL,
  billing_address JSONB,
  stripe_payment_intent_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- ===========================================
-- ORDER ITEMS
-- ===========================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL, -- Snapshot at order time
  variant_name TEXT,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ===========================================
-- COUPONS
-- ===========================================
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value INTEGER NOT NULL, -- Percentage (0-100) or fixed amount
  min_purchase INTEGER, -- Minimum order amount
  max_uses INTEGER, -- NULL = unlimited
  used_count INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, code)
);

CREATE INDEX idx_coupons_store ON coupons(store_id);
CREATE INDEX idx_coupons_code ON coupons(code);

-- ===========================================
-- AI GENERATED IMAGES
-- ===========================================
CREATE TABLE ai_generated_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('vton', 'gemini')),
  prompt TEXT,
  settings JSONB NOT NULL,
  image_url TEXT NOT NULL,
  cost_yen INTEGER NOT NULL, -- Track AI generation costs
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_images_store ON ai_generated_images(store_id);
CREATE INDEX idx_ai_images_product ON ai_generated_images(product_id);

-- ===========================================
-- ROW LEVEL SECURITY (Multi-tenant isolation)
-- ===========================================
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generated_images ENABLE ROW LEVEL SECURITY;

-- For now, allow all access (we'll add proper policies later with auth)
CREATE POLICY "Allow all for now" ON stores FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON products FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON product_images FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON product_variants FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON customers FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON orders FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON order_items FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON coupons FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON ai_generated_images FOR ALL USING (true);

-- ===========================================
-- FUNCTIONS
-- ===========================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_variants_updated_at BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- INITIAL DATA: Default Store
-- ===========================================
INSERT INTO stores (id, name, slug, description, owner_id) VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'VUAL',
  'vual',
  'AI-powered fashion platform',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'
);

-- Sample product for testing
INSERT INTO products (store_id, name, name_en, description, category, base_price, status) VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'サンプル商品',
  'Sample Product',
  'これはテスト用のサンプル商品です',
  'apparel',
  5000,
  'draft'
);
