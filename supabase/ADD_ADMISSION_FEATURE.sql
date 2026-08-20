-- ADD MEMBER TRACKING COLUMNS
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS is_new_member BOOLEAN DEFAULT true;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS admission_fee_paid BOOLEAN DEFAULT false;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active';

-- ADD ADMISSION FEE TO MEMBERSHIP RECORDS
ALTER TABLE member_memberships ADD COLUMN IF NOT EXISTS admission_fee NUMERIC DEFAULT 0;

-- GYM SETTINGS TABLE (admin can configure admission fee amount)
CREATE TABLE IF NOT EXISTS gym_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- DEFAULT ADMISSION FEE = 1000 NPR
INSERT INTO gym_settings (key, value) VALUES ('admission_fee', '1000')
ON CONFLICT (key) DO NOTHING;

-- PERMISSIONS
GRANT ALL ON gym_settings TO anon, authenticated;

-- SET DEFAULT VALUES FOR EXISTING USERS
UPDATE app_users SET is_new_member = true WHERE is_new_member IS NULL;
UPDATE app_users SET admission_fee_paid = false WHERE admission_fee_paid IS NULL;
UPDATE app_users SET account_status = 'active' WHERE account_status IS NULL;
UPDATE member_memberships SET admission_fee = 0 WHERE admission_fee IS NULL;
