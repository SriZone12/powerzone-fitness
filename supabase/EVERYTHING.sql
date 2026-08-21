-- =====================================================
-- POWERZONE FITNESS - COMPLETE DATABASE SETUP
-- Run this ONCE in Supabase SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS)
-- =====================================================

-- 1. MEMBERSHIP PLANS
CREATE TABLE IF NOT EXISTS membership_plan (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  duration_days INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. APP USERS (all roles)
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'trainer', 'member')),
  age INTEGER,
  gender TEXT,
  height TEXT,
  weight TEXT,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  medical_conditions TEXT,
  fitness_goals TEXT,
  is_new_member BOOLEAN DEFAULT true,
  admission_fee_paid BOOLEAN DEFAULT false,
  account_status TEXT DEFAULT 'active',
  existing_member_claim BOOLEAN DEFAULT false,
  claim_status TEXT DEFAULT 'none',
  is_pre_app_member BOOLEAN DEFAULT false,
  specialization TEXT,
  experience TEXT,
  bio TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. MEMBER MEMBERSHIPS
CREATE TABLE IF NOT EXISTS member_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES membership_plan(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT DEFAULT 'cash',
  payment_date TIMESTAMPTZ,
  admission_fee NUMERIC DEFAULT 0,
  freeze_requested BOOLEAN DEFAULT false,
  freeze_start_date DATE,
  freeze_end_date DATE,
  freeze_reason TEXT,
  freeze_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. PT PACKAGES
CREATE TABLE IF NOT EXISTS pt_packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  sessions_count INTEGER NOT NULL,
  duration_days INTEGER,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. PT SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS pt_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  package_id UUID REFERENCES pt_packages(id),
  trainer_id UUID REFERENCES app_users(id),
  sessions_total INTEGER NOT NULL,
  sessions_remaining INTEGER,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT DEFAULT 'cash',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. PT SCHEDULES
CREATE TABLE IF NOT EXISTS pt_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID REFERENCES pt_subscriptions(id) ON DELETE CASCADE,
  member_id UUID REFERENCES app_users(id),
  trainer_id UUID REFERENCES app_users(id),
  day_of_week INTEGER,
  time_slot TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. PT SESSIONS
CREATE TABLE IF NOT EXISTS pt_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID REFERENCES pt_subscriptions(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES app_users(id),
  member_id UUID REFERENCES app_users(id),
  session_date DATE,
  notes TEXT,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. PT PROGRESS
CREATE TABLE IF NOT EXISTS pt_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  weight NUMERIC,
  body_fat NUMERIC,
  notes TEXT,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- 9. PT DIET PLANS
CREATE TABLE IF NOT EXISTS pt_diet_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES app_users(id),
  title TEXT,
  description TEXT,
  meals JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. CLASSES
CREATE TABLE IF NOT EXISTS classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trainer_id UUID REFERENCES app_users(id),
  day_of_week INTEGER,
  time_slot TEXT,
  capacity INTEGER DEFAULT 20,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. CLASS BOOKINGS
CREATE TABLE IF NOT EXISTS class_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  booking_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. ATTENDANCE
CREATE TABLE IF NOT EXISTS attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  check_in TIMESTAMPTZ NOT NULL,
  check_out TIMESTAMPTZ,
  marked_by UUID REFERENCES app_users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. GYM NOTICES
CREATE TABLE IF NOT EXISTS gym_notices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_audience TEXT DEFAULT 'all',
  priority TEXT DEFAULT 'normal',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES app_users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. GYM SETTINGS
CREATE TABLE IF NOT EXISTS gym_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- ADD MISSING COLUMNS (safe to run multiple times)
-- =====================================================
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS is_new_member BOOLEAN DEFAULT true;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS admission_fee_paid BOOLEAN DEFAULT false;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active';
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS existing_member_claim BOOLEAN DEFAULT false;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS claim_status TEXT DEFAULT 'none';
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS is_pre_app_member BOOLEAN DEFAULT false;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS specialization TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS experience TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS bio TEXT;

-- =====================================================
-- DEFAULT SETTINGS
-- =====================================================
INSERT INTO gym_settings (key, value) VALUES ('admission_fee', '1000')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- DISABLE RLS ON ALL TABLES (app handles auth)
-- =====================================================
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plan DISABLE ROW LEVEL SECURITY;
ALTER TABLE member_memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE pt_packages DISABLE ROW LEVEL SECURITY;
ALTER TABLE pt_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE pt_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE pt_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE pt_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE pt_diet_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE class_bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE gym_notices DISABLE ROW LEVEL SECURITY;
ALTER TABLE gym_settings DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON app_users TO anon, authenticated;
GRANT ALL ON membership_plan TO anon, authenticated;
GRANT ALL ON member_memberships TO anon, authenticated;
GRANT ALL ON pt_packages TO anon, authenticated;
GRANT ALL ON pt_subscriptions TO anon, authenticated;
GRANT ALL ON pt_schedules TO anon, authenticated;
GRANT ALL ON pt_sessions TO anon, authenticated;
GRANT ALL ON pt_progress TO anon, authenticated;
GRANT ALL ON pt_diet_plans TO anon, authenticated;
GRANT ALL ON classes TO anon, authenticated;
GRANT ALL ON class_bookings TO anon, authenticated;
GRANT ALL ON attendance TO anon, authenticated;
GRANT ALL ON gym_notices TO anon, authenticated;
GRANT ALL ON gym_settings TO anon, authenticated;

-- =====================================================
-- DONE! All 14 tables, all columns, RLS disabled,
-- permissions granted, admission fee = 1000 NPR.
-- Safe to run multiple times.
-- =====================================================
