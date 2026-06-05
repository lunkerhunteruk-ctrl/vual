-- Coordinate Creator: stylists pre-assemble outfits (sets of catalog products)
-- that can later be inserted whole into VUAL Studio / look generation.
--
-- An "item" is one slot in the outfit: a product reference plus the category
-- it occupies (tops / outer / bottoms / shoes / accessory…) and its order.
-- Items are stored as JSONB so a coordinate can hold a variable number of
-- slots (up to 5, matching the studio) without a join table.

CREATE TABLE IF NOT EXISTS coordinates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  -- items: [{ productId, category, position }]
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  cover_image_url TEXT,        -- optional: primary image of the key item, for the card
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coordinates_store ON coordinates(store_id, created_at DESC);
