-- ==============================================================================
-- PONDTORA SYSTEM UPDATE: Pricing Overrides, Platform Settings & Farm Deduplication
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query -> Run)
-- ==============================================================================

-- 1. Ensure user_profiles has custom pricing and billing columns
ALTER TABLE IF EXISTS user_profiles
  ADD COLUMN IF NOT EXISTS subscription_amount NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS free_access BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS paystack_reference TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_payment_date TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_expiry TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_start TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS billing_frequency TEXT DEFAULT 'monthly';

-- 2. Create platform_settings table for persistent Paystack & Pricing configurations
CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for platform_settings
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated and anonymous clients
DROP POLICY IF EXISTS "Allow public read on platform_settings" ON platform_settings;
CREATE POLICY "Allow public read on platform_settings"
  ON platform_settings FOR SELECT
  USING (true);

-- Allow upsert/write on platform_settings
DROP POLICY IF EXISTS "Allow upsert on platform_settings" ON platform_settings;
CREATE POLICY "Allow upsert on platform_settings"
  ON platform_settings FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. Clean up and deduplicate duplicate farm records per user
DO $$
DECLARE
  dup_record RECORD;
  keeper_farm_id UUID;
BEGIN
  -- Find duplicate farms grouped by user_id and lower(name)
  FOR dup_record IN
    SELECT user_id, LOWER(TRIM(name)) AS farm_name, COUNT(*) AS cnt
    FROM farms
    GROUP BY user_id, LOWER(TRIM(name))
    HAVING COUNT(*) > 1
  LOOP
    -- Identify the primary farm to keep (earliest created or the one with existing ponds)
    SELECT id INTO keeper_farm_id
    FROM farms
    WHERE user_id = dup_record.user_id AND LOWER(TRIM(name)) = dup_record.farm_name
    ORDER BY created_at ASC
    LIMIT 1;

    IF keeper_farm_id IS NOT NULL THEN
      -- Re-point any ponds linked to the duplicate farms to keeper farm
      UPDATE ponds
      SET farm_id = keeper_farm_id
      WHERE farm_id IN (
        SELECT id FROM farms
        WHERE user_id = dup_record.user_id
          AND LOWER(TRIM(name)) = dup_record.farm_name
          AND id <> keeper_farm_id
      );

      -- Re-point any staff farm assignments
      UPDATE staff_farm_assignments
      SET farm_id = keeper_farm_id
      WHERE farm_id IN (
        SELECT id FROM farms
        WHERE user_id = dup_record.user_id
          AND LOWER(TRIM(name)) = dup_record.farm_name
          AND id <> keeper_farm_id
      );

      -- Delete the redundant duplicate farm records
      DELETE FROM farms
      WHERE user_id = dup_record.user_id
        AND LOWER(TRIM(name)) = dup_record.farm_name
        AND id <> keeper_farm_id;
    END IF;
  END LOOP;
END $$;

-- 4. Update get_all_users_for_admin RPC function
CREATE OR REPLACE FUNCTION get_all_users_for_admin()
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  farm_name TEXT,
  phone TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  role TEXT,
  status TEXT,
  active_plan TEXT,
  trial_start_date TIMESTAMPTZ,
  subscription_status TEXT,
  subscription_amount NUMERIC,
  free_access BOOLEAN,
  paystack_reference TEXT,
  last_payment_date TEXT,
  created_at TIMESTAMPTZ,
  referral_code TEXT,
  referred_by TEXT,
  farm_count BIGINT,
  pond_count BIGINT,
  staff_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.email,
    p.farm_name,
    p.phone,
    p.city,
    p.state,
    p.country,
    COALESCE(p.role, 'owner')::TEXT,
    COALESCE(p.status, 'Active')::TEXT,
    p.active_plan,
    p.trial_start_date,
    p.subscription_status,
    p.subscription_amount,
    COALESCE(p.free_access, FALSE),
    p.paystack_reference,
    p.last_payment_date,
    p.created_at,
    p.referral_code,
    p.referred_by,
    (SELECT COUNT(DISTINCT f.id) FROM farms f WHERE f.user_id = p.id) AS farm_count,
    (SELECT COUNT(DISTINCT pd.id) FROM ponds pd WHERE pd.user_id = p.id) AS pond_count,
    (SELECT COUNT(DISTINCT s.id) FROM staff_members s WHERE s.user_id = p.id) AS staff_count
  FROM user_profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- 5. Update admin_update_user_profile RPC function
CREATE OR REPLACE FUNCTION admin_update_user_profile(
  target_user_id UUID,
  new_name TEXT,
  new_farm_name TEXT,
  new_phone TEXT,
  new_city TEXT,
  new_state TEXT,
  new_country TEXT,
  new_role TEXT,
  new_active_plan TEXT,
  new_status TEXT,
  new_subscription_status TEXT,
  new_subscription_amount NUMERIC DEFAULT NULL,
  new_free_access BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_profiles
  SET
    name = COALESCE(new_name, name),
    farm_name = COALESCE(new_farm_name, farm_name),
    phone = COALESCE(new_phone, phone),
    city = COALESCE(new_city, city),
    state = COALESCE(new_state, state),
    country = COALESCE(new_country, country),
    role = COALESCE(new_role, role),
    active_plan = new_active_plan,
    status = COALESCE(new_status, status),
    subscription_status = COALESCE(new_subscription_status, subscription_status),
    subscription_amount = new_subscription_amount,
    free_access = new_free_access,
    updated_at = NOW()
  WHERE id = target_user_id;

  -- Also update farm name in farms table if primary
  IF new_farm_name IS NOT NULL AND TRIM(new_farm_name) <> '' THEN
    UPDATE farms
    SET name = new_farm_name, updated_at = NOW()
    WHERE user_id = target_user_id;
  END IF;
END;
$$;
