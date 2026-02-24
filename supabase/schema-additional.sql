-- ===========================================
-- VUAL Additional Schema - Run after main schema
-- ===========================================

-- ===========================================
-- REVIEWS
-- ===========================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_store ON reviews(store_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);

-- ===========================================
-- TEAM MEMBERS
-- ===========================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id TEXT,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role_id UUID,
  role_name TEXT,
  status TEXT DEFAULT 'invited' CHECK (status IN ('active', 'invited', 'inactive')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_members_store ON team_members(store_id);

-- ===========================================
-- ROLES
-- ===========================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  permissions TEXT[] DEFAULT '{}',
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roles_store ON roles(store_id);

-- ===========================================
-- MEDIA
-- ===========================================
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'image' CHECK (type IN ('image', 'video')),
  mime_type TEXT,
  size INTEGER,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_store ON media(store_id);
CREATE INDEX IF NOT EXISTS idx_media_product ON media(product_id);

-- ===========================================
-- BLOG POSTS
-- ===========================================
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT,
  excerpt TEXT,
  featured_image TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  author_name TEXT,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_store ON blog_posts(store_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(is_published);

-- ===========================================
-- TRANSACTIONS (for payment tracking)
-- ===========================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('payment', 'refund', 'payout')),
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'jpy',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  stripe_payment_intent_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_store ON transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order ON transactions(order_id);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for now" ON reviews FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON team_members FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON roles FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON media FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON blog_posts FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON transactions FOR ALL USING (true);

-- ===========================================
-- TRIGGERS for updated_at
-- ===========================================
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_media_updated_at BEFORE UPDATE ON media
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- INSERT DEFAULT ROLES
-- ===========================================
INSERT INTO roles (store_id, name, description, permissions, is_system) VALUES
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Admin', 'Full access to all features', ARRAY['products.view', 'products.create', 'products.edit', 'products.delete', 'orders.view', 'orders.edit', 'orders.cancel', 'customers.view', 'customers.edit', 'coupons.view', 'coupons.create', 'coupons.edit', 'coupons.delete', 'reviews.view', 'reviews.moderate', 'analytics.view', 'settings.view', 'settings.edit', 'team.view', 'team.manage', 'roles.view', 'roles.manage', 'media.view', 'media.upload', 'media.delete', 'livestream.view', 'livestream.manage', 'ai.view', 'ai.use'], true),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Editor', 'Can manage content but not settings', ARRAY['products.view', 'products.create', 'products.edit', 'orders.view', 'customers.view', 'reviews.view', 'media.view', 'media.upload'], true),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Viewer', 'Read-only access', ARRAY['products.view', 'orders.view', 'customers.view', 'reviews.view', 'analytics.view'], true)
ON CONFLICT DO NOTHING;
