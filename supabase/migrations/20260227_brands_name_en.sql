-- Add English name column to brands table
-- Used for slug generation and SKU prefix (Japanese names cannot produce usable slugs)
ALTER TABLE brands ADD COLUMN name_en TEXT;
