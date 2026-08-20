-- =============================================
-- FIX: Permission denied for PT tables and all app tables
-- Run this in Supabase SQL Editor
-- =============================================

-- Disable RLS on ALL tables (app handles auth, not Postgres RLS)
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

-- Also grant full permissions to authenticated role
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
