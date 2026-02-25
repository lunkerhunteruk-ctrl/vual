-- Add materials and care columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS materials text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS care text;

-- Add store policy columns to stores table
ALTER TABLE stores ADD COLUMN IF NOT EXISTS shipping_policy text;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS free_shipping_threshold integer;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS cod_policy text;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS return_policy text;
