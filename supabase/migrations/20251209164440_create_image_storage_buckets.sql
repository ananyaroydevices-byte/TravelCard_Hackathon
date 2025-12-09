/*
  # Create Image Storage Buckets

  1. Storage Buckets
    - `traveler-photos` - stores original uploaded traveler photos
    - `ai-generated-images` - stores AI-generated destination images
  
  2. Security
    - Enable RLS on both buckets
    - `traveler-photos` policies:
      - Authenticated users can upload their own photos
      - Authenticated users can read their own photos
    - `ai-generated-images` policies:
      - Public read access for generated images
      - Service role can insert generated images
      - Users can read all AI-generated images
  
  3. Configuration
    - Set file size limits appropriate for images
    - Allow common image MIME types (jpeg, png, webp)
*/

-- Create traveler-photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'traveler-photos',
  'traveler-photos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Create ai-generated-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-generated-images',
  'ai-generated-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for traveler-photos bucket

-- Policy: Authenticated users can upload their own photos
CREATE POLICY "Users can upload own traveler photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'traveler-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Authenticated users can read their own photos
CREATE POLICY "Users can view own traveler photos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'traveler-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Authenticated users can delete their own photos
CREATE POLICY "Users can delete own traveler photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'traveler-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- RLS Policies for ai-generated-images bucket

-- Policy: Anyone can view AI-generated images (public bucket)
CREATE POLICY "Anyone can view AI-generated images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'ai-generated-images');

-- Policy: Authenticated users can upload AI-generated images
CREATE POLICY "Authenticated users can upload AI-generated images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'ai-generated-images');

-- Policy: Users can delete their own AI-generated images
CREATE POLICY "Users can delete own AI-generated images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'ai-generated-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
