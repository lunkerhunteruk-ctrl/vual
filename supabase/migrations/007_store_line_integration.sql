-- Add LINE Messaging API integration columns to stores table
-- Each store can connect their own LINE Official Account

ALTER TABLE stores ADD COLUMN IF NOT EXISTS line_channel_access_token TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS line_channel_id TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS line_bot_basic_id TEXT;  -- @xxx format, for friend add URL
ALTER TABLE stores ADD COLUMN IF NOT EXISTS line_connected_at TIMESTAMPTZ;
