-- Add video generation prompt columns for Veo 3.1 and Kling 3.0
ALTER TABLE collection_looks ADD COLUMN IF NOT EXISTS video_prompt_veo TEXT;
ALTER TABLE collection_looks ADD COLUMN IF NOT EXISTS video_prompt_kling TEXT;
