-- =====================================================
-- POWERZONE FITNESS: Complete Database Setup
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- =====================================================

-- 1. GYM NOTICES TABLE
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

ALTER TABLE gym_notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read notices" ON gym_notices FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin and staff can create notices" ON gym_notices FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin and staff can update notices" ON gym_notices FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admin and staff can delete notices" ON gym_notices FOR DELETE USING (auth.role() = 'authenticated');

-- 2. ENHANCED CLASSES TABLE
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

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read classes" ON classes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin and staff can manage classes" ON classes FOR ALL USING (auth.role() = 'authenticated');

-- 3. CLASS BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS class_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'booked' CHECK (status IN ('booked', 'attended', 'cancelled')),
  booked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(class_id, user_id)
);

ALTER TABLE class_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read bookings" ON class_bookings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Anyone authenticated can create bookings" ON class_bookings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own bookings" ON class_bookings FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete own bookings" ON class_bookings FOR DELETE USING (auth.role() = 'authenticated');

-- 4. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  check_in TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  check_out TIMESTAMP WITH TIME ZONE,
  marked_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read attendance" ON attendance FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Anyone authenticated can insert attendance" ON attendance FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Anyone authenticated can update attendance" ON attendance FOR UPDATE USING (auth.role() = 'authenticated');

-- 5. MEMBERSHIP FREEZE COLUMNS
ALTER TABLE member_memberships ADD COLUMN IF NOT EXISTS freeze_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE member_memberships ADD COLUMN IF NOT EXISTS freeze_start_date DATE;
ALTER TABLE member_memberships ADD COLUMN IF NOT EXISTS freeze_end_date DATE;
ALTER TABLE member_memberships ADD COLUMN IF NOT EXISTS freeze_reason TEXT;
ALTER TABLE member_memberships ADD COLUMN IF NOT EXISTS freeze_approved BOOLEAN DEFAULT FALSE;

-- 6. EXPANDED APP_USERS TABLE (if not already done)
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS height TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS weight TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS medical_conditions TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS fitness_goals TEXT;
