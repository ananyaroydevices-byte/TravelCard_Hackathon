/*
  # Fix RLS Performance and Security Issues

  1. Policy Optimizations
    - Drop all existing RLS policies
    - Recreate policies using `(select auth.uid())` pattern for better performance
    - This prevents function re-evaluation for each row at scale

  2. Index Retention
    - Keep existing indexes as they support foreign key lookups
    - These will be used as data volume grows

  3. Security Notes
    - All policies maintain the same security boundaries
    - Performance is improved without compromising security
    - Indexes will improve query performance as data grows
*/

-- Drop existing policies for trips table
DROP POLICY IF EXISTS "Users can view own trips" ON trips;
DROP POLICY IF EXISTS "Users can insert own trips" ON trips;
DROP POLICY IF EXISTS "Users can update own trips" ON trips;
DROP POLICY IF EXISTS "Users can delete own trips" ON trips;

-- Recreate trips policies with optimized auth.uid() calls
CREATE POLICY "Users can view own trips"
  ON trips FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own trips"
  ON trips FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own trips"
  ON trips FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own trips"
  ON trips FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Drop existing policies for itineraries table
DROP POLICY IF EXISTS "Users can view itineraries of their trips" ON itineraries;
DROP POLICY IF EXISTS "Users can insert itineraries for their trips" ON itineraries;
DROP POLICY IF EXISTS "Users can update itineraries of their trips" ON itineraries;
DROP POLICY IF EXISTS "Users can delete itineraries of their trips" ON itineraries;

-- Recreate itineraries policies with optimized auth.uid() calls
CREATE POLICY "Users can view itineraries of their trips"
  ON itineraries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = itineraries.trip_id
      AND trips.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert itineraries for their trips"
  ON itineraries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_id
      AND trips.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update itineraries of their trips"
  ON itineraries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = itineraries.trip_id
      AND trips.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_id
      AND trips.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete itineraries of their trips"
  ON itineraries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = itineraries.trip_id
      AND trips.user_id = (select auth.uid())
    )
  );

-- Drop existing policies for notes table
DROP POLICY IF EXISTS "Users can view notes for their itineraries" ON notes;
DROP POLICY IF EXISTS "Users can insert notes for their itineraries" ON notes;
DROP POLICY IF EXISTS "Users can update notes for their itineraries" ON notes;
DROP POLICY IF EXISTS "Users can delete notes for their itineraries" ON notes;

-- Recreate notes policies with optimized auth.uid() calls
CREATE POLICY "Users can view notes for their itineraries"
  ON notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      INNER JOIN trips ON trips.id = itineraries.trip_id
      WHERE itineraries.id = notes.itinerary_id
      AND trips.user_id = (select auth.uid())
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
      AND trips.user_id = (select auth.uid())
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
      AND trips.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itineraries
      INNER JOIN trips ON trips.id = itineraries.trip_id
      WHERE itineraries.id = itinerary_id
      AND trips.user_id = (select auth.uid())
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
      AND trips.user_id = (select auth.uid())
    )
  );
