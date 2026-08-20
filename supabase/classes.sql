-- Powerzone Fitness: Enhanced Classes Table
-- Run this in Supabase SQL Editor

-- First, check if the classes table exists and create/update it
CREATE TABLE IF NOT EXISTS classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trainer_id UUID REFERENCES auth.users(id),
  max_capacity INTEGER DEFAULT 20,
  current_bookings INTEGER DEFAULT 0,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Anyone authenticated can read classes" ON classes
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow admin/staff to manage
CREATE POLICY "Admin and staff can manage classes" ON classes
  FOR ALL USING (auth.role() = 'authenticated');

-- Class bookings table
CREATE TABLE IF NOT EXISTS class_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'booked' CHECK (status IN ('booked', 'attended', 'cancelled')),
  booked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(class_id, user_id)
);

-- Enable RLS
ALTER TABLE class_bookings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read bookings
CREATE POLICY "Anyone authenticated can read bookings" ON class_bookings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to create bookings
CREATE POLICY "Anyone authenticated can create bookings" ON class_bookings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update their own bookings
CREATE POLICY "Users can update own bookings" ON class_bookings
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow users to delete their own bookings
CREATE POLICY "Users can delete own bookings" ON class_bookings
  FOR DELETE USING (auth.role() = 'authenticated');
