-- Platform Settings Table for storing global configuration (Paystack mode, Public keys, system toggles)
-- Run in Supabase SQL editor

CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated and anon users to read public platform settings
DROP POLICY IF EXISTS "allow_read_platform_settings" ON platform_settings;
CREATE POLICY "allow_read_platform_settings" ON platform_settings
  FOR SELECT USING (true);

-- Allow authenticated users to update/insert platform settings
DROP POLICY IF EXISTS "allow_write_platform_settings" ON platform_settings;
CREATE POLICY "allow_write_platform_settings" ON platform_settings
  FOR ALL USING (true) WITH CHECK (true);

-- Seed default paystack configuration if not present
INSERT INTO platform_settings (key, value)
VALUES (
  'paystack_config',
  jsonb_build_object(
    'mode', 'test',
    'testPublicKey', 'pk_test_f6c0521e72550ca50049367fa66800c36badacf6',
    'livePublicKey', 'pk_live_460ba5856621112e2cfa532db6999201fbe0be1a'
  )
)
ON CONFLICT (key) DO NOTHING;
