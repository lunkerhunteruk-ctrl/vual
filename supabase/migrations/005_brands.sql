-- Brands table
CREATE TABLE brands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  logo_url TEXT,
  website TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, slug)
);

-- Add brand reference to products
ALTER TABLE products ADD COLUMN brand_id UUID REFERENCES brands(id);
