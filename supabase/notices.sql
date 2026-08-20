-- Powerzone Fitness: Gym Notices Table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS gym_notices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'members', 'staff', 'trainers')),
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE gym_notices ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Anyone authenticated can read notices" ON gym_notices
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow admin/staff to insert
CREATE POLICY "Admin and staff can create notices" ON gym_notices
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow admin/staff to update
CREATE POLICY "Admin and staff can update notices" ON gym_notices
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow admin/staff to delete
CREATE POLICY "Admin and staff can delete notices" ON gym_notices
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add notice_id to classes table for linking
ALTER TABLE classes ADD COLUMN IF NOT EXISTS notice_id UUID REFERENCES gym_notices(id);
