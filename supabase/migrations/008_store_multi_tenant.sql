-- Multi-tenant support: add fields for subdomain routing and per-store customization

-- Custom domain for premium feature (e.g., shop.estnation.co.jp)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;

-- Primary accent color override (hex, e.g., '#6366f1')
ALTER TABLE stores ADD COLUMN IF NOT EXISTS primary_color TEXT;

-- Active flag to disable a store without deleting it
ALTER TABLE stores ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Index for fast custom domain lookup
CREATE INDEX IF NOT EXISTS idx_stores_custom_domain ON stores(custom_domain) WHERE custom_domain IS NOT NULL;

-- Index for fast slug + active lookup (used by middleware on every request)
CREATE INDEX IF NOT EXISTS idx_stores_slug_active ON stores(slug) WHERE is_active = true;
