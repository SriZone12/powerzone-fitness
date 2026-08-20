-- Powerzone Fitness: Membership Freeze
-- Run this in Supabase SQL Editor

-- Add freeze columns to member_memberships
ALTER TABLE member_memberships ADD COLUMN IF NOT EXISTS freeze_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE member_memberships ADD COLUMN IF NOT EXISTS freeze_start_date DATE;
ALTER TABLE member_memberships ADD COLUMN IF NOT EXISTS freeze_end_date DATE;
ALTER TABLE member_memberships ADD COLUMN IF NOT EXISTS freeze_reason TEXT;
ALTER TABLE member_memberships ADD COLUMN IF NOT EXISTS freeze_approved BOOLEAN DEFAULT FALSE;
