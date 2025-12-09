/*
  # Initial Travel Itinerary App Schema

  1. New Tables
    - `trips` - Stores user's travel trip information
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `destinations` (text[], array of destination cities)
      - `travel_start_date` (date)
      - `travel_end_date` (date)
      - `purpose` (text - Business/Vacation/Staycation)
      - `traveler_type` (text - Solo/Friends and Family/Business Travelers/Content Creators)
      - `number_of_travelers` (integer)
      - `origin_city` (text)
      - `mandatory_activities` (jsonb - activities per destination)
      - `traveler_images` (text[] - URLs to uploaded images)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `itineraries` - Stores generated itineraries for trips
      - `id` (uuid, primary key)
      - `trip_id` (uuid, foreign key to trips)
      - `itinerary_data` (jsonb - full itinerary structure)
      - `total_cost` (numeric)
      - `cost_breakdown` (jsonb - detailed cost breakdown)
      - `is_selected` (boolean - whether this is the chosen itinerary)
      - `version_number` (integer - 1 or 2 for comparison)
      - `created_at` (timestamptz)
    
    - `notes` - Stores user notes for trips
      - `id` (uuid, primary key)
      - `itinerary_id` (uuid, foreign key to itineraries)
      - `day_number` (integer - which day the note is for)
      - `note_content` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies preventing unauthorized access to other users' trips

  3. Important Notes
    - Uses Supabase built-in auth.users table
    - JSONB columns for flexible storage of complex structures
    - Foreign key constraints maintain referential integrity
*/

CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destinations text[] NOT NULL DEFAULT '{}',
  travel_start_date date NOT NULL,
  travel_end_date date NOT NULL,
  purpose text NOT NULL DEFAULT 'Vacation',
  traveler_type text NOT NULL DEFAULT 'Solo',
  number_of_travelers integer NOT NULL DEFAULT 1,
  origin_city text NOT NULL,
  mandatory_activities jsonb DEFAULT '{}',
  traveler_images text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS itineraries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  itinerary_data jsonb NOT NULL,
  total_cost numeric DEFAULT 0,
  cost_breakdown jsonb DEFAULT '{}',
  is_selected boolean DEFAULT false,
  version_number integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id uuid NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  note_content text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trips"
  ON trips FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trips"
  ON trips FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips"
  ON trips FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips"
  ON trips FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view itineraries of their trips"
  ON itineraries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = itineraries.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert itineraries for their trips"
  ON itineraries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update itineraries of their trips"
  ON itineraries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = itineraries.trip_id
      AND trips.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete itineraries of their trips"
  ON itineraries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = itineraries.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view notes for their itineraries"
  ON notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      INNER JOIN trips ON trips.id = itineraries.trip_id
      WHERE itineraries.id = notes.itinerary_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert notes for their itineraries"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itineraries
      INNER JOIN trips ON trips.id = itineraries.trip_id
      WHERE itineraries.id = itinerary_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update notes for their itineraries"
  ON notes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      INNER JOIN trips ON trips.id = itineraries.trip_id
      WHERE itineraries.id = notes.itinerary_id
      AND trips.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itineraries
      INNER JOIN trips ON trips.id = itineraries.trip_id
      WHERE itineraries.id = itinerary_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete notes for their itineraries"
  ON notes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      INNER JOIN trips ON trips.id = itineraries.trip_id
      WHERE itineraries.id = notes.itinerary_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_trip_id ON itineraries(trip_id);
CREATE INDEX IF NOT EXISTS idx_notes_itinerary_id ON notes(itinerary_id);
