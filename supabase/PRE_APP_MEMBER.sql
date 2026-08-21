-- Add pre-app member flag
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS is_pre_app_member BOOLEAN DEFAULT false;
