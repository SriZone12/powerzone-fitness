-- =============================================
-- POWERZONE FITNESS: CREATE ALL TABLES + FIX PERMISSIONS
-- Run this ONE SQL file in Supabase SQL Editor
-- =============================================

-- 1. CREATE gym_notices TABLE
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

-- 2. CREATE classes TABLE
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

-- 3. CREATE class_bookings TABLE
CREATE TABLE IF NOT EXISTS class_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'booked' CHECK (status IN ('booked', 'attended', 'cancelled')),
  booked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(class_id, user_id)
);

-- 4. CREATE attendance TABLE
CREATE TABLE IF NOT EXISTS attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  check_in TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  check_out TIMESTAMP WITH TIME ZONE,
  marked_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. ADD freeze columns to member_memberships (safe even if they exist)
ALTER TABLE member_memberships ADD COLUMN IF NOT EXISTS freeze_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE member_memberships ADD COLUMN IF NOT EXISTS freeze_start_date DATE;
ALTER TABLE member_memberships ADD COLUMN IF NOT EXISTS freeze_end_date DATE;
ALTER TABLE member_memberships ADD COLUMN IF NOT EXISTS freeze_reason TEXT;
ALTER TABLE member_memberships ADD COLUMN IF NOT EXISTS freeze_approved BOOLEAN DEFAULT FALSE;

-- 6. ADD profile columns to app_users (safe even if they exist)
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS height TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS weight TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS medical_conditions TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS fitness_goals TEXT;

-- 7. DISABLE RLS on ALL tables (our app handles security, not Postgres)
ALTER TABLE pt_packages DISABLE ROW LEVEL SECURITY;
ALTER TABLE pt_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE pt_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE pt_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE pt_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE pt_diet_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE gym_notices DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE class_bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE member_memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plan DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;

-- 8. GRANT full permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
