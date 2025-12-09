/*
  # Add AI Image Tracking

  1. Changes
    - Add `is_ai_generated_image` boolean column to trips table
    - Add `ai_image_metadata` jsonb column for storing generation details
    - Set default values for existing rows
  
  2. Notes
    - `is_ai_generated_image` defaults to false for backwards compatibility
    - `ai_image_metadata` can store information like generation timestamp, model used, etc.
*/

-- Add column to track if destination image is AI-generated
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'is_ai_generated_image'
  ) THEN
    ALTER TABLE trips ADD COLUMN is_ai_generated_image boolean DEFAULT false;
  END IF;
END $$;

-- Add column to store AI image generation metadata
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'ai_image_metadata'
  ) THEN
    ALTER TABLE trips ADD COLUMN ai_image_metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;
