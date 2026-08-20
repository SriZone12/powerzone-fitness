-- Add trainer profile columns to app_users
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS specialization TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS experience TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS bio TEXT;
