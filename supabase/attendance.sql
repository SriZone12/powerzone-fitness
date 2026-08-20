-- Powerzone Fitness: Attendance Table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  check_in TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  check_out TIMESTAMP WITH TIME ZONE,
  marked_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Anyone authenticated can read attendance" ON attendance
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert
CREATE POLICY "Anyone authenticated can insert attendance" ON attendance
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update
CREATE POLICY "Anyone authenticated can update attendance" ON attendance
  FOR UPDATE USING (auth.role() = 'authenticated');
