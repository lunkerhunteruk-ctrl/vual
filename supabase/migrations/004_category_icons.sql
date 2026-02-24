-- Category icon overrides
-- When not set, the first product's first image is used as the default icon
CREATE TABLE IF NOT EXISTS category_icons (
  category_path TEXT PRIMARY KEY,
  icon_url TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
