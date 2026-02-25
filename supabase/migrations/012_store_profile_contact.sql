-- Add contact and social link columns to stores table
ALTER TABLE stores ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS social_instagram TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS social_twitter TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS social_youtube TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS social_line TEXT;
