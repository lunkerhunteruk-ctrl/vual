-- Persist face reference image URL per user
ALTER TABLE consumer_credits ADD COLUMN IF NOT EXISTS face_image_url TEXT;
