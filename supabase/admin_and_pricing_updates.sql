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
DROP FUNCTION IF EXISTS get_all_users_for_admin();
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
  subscription_start TEXT,
  subscription_expiry TEXT,
  billing_frequency TEXT,
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
    COALESCE(p.subscription_status, 'Trial')::TEXT,
    p.subscription_amount,
    COALESCE(p.free_access, FALSE),
    p.paystack_reference,
    p.last_payment_date,
    p.subscription_start,
    p.subscription_expiry,
    COALESCE(p.billing_frequency, 'monthly')::TEXT,
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
DROP FUNCTION IF EXISTS admin_update_user_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, BOOLEAN);
DROP FUNCTION IF EXISTS admin_update_user_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, BOOLEAN, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS admin_update_user_profile;

CREATE OR REPLACE FUNCTION admin_update_user_profile(
  target_user_id UUID DEFAULT NULL,
  new_name TEXT DEFAULT NULL,
  new_farm_name TEXT DEFAULT NULL,
  new_phone TEXT DEFAULT NULL,
  new_city TEXT DEFAULT NULL,
  new_state TEXT DEFAULT NULL,
  new_country TEXT DEFAULT NULL,
  new_role TEXT DEFAULT NULL,
  new_active_plan TEXT DEFAULT NULL,
  new_status TEXT DEFAULT NULL,
  new_subscription_status TEXT DEFAULT NULL,
  new_subscription_amount NUMERIC DEFAULT NULL,
  new_free_access BOOLEAN DEFAULT FALSE,
  target_email TEXT DEFAULT NULL,
  new_billing_frequency TEXT DEFAULT 'monthly',
  new_subscription_start TEXT DEFAULT NULL,
  new_subscription_expiry TEXT DEFAULT NULL,
  new_paystack_reference TEXT DEFAULT NULL,
  new_last_payment_date TEXT DEFAULT NULL
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
    billing_frequency = COALESCE(new_billing_frequency, billing_frequency, 'monthly'),
    subscription_start = COALESCE(new_subscription_start, subscription_start),
    subscription_expiry = COALESCE(new_subscription_expiry, subscription_expiry),
    paystack_reference = COALESCE(new_paystack_reference, paystack_reference),
    last_payment_date = COALESCE(new_last_payment_date, last_payment_date),
    updated_at = NOW()
  WHERE (target_user_id IS NOT NULL AND id = target_user_id)
     OR (target_email IS NOT NULL AND TRIM(target_email) <> '' AND LOWER(email) = LOWER(TRIM(target_email)));

  -- Also update farm name in farms table if primary
  IF new_farm_name IS NOT NULL AND TRIM(new_farm_name) <> '' THEN
    UPDATE farms
    SET name = new_farm_name, updated_at = NOW()
    WHERE (target_user_id IS NOT NULL AND user_id = target_user_id)
       OR (target_email IS NOT NULL AND TRIM(target_email) <> '' AND user_id IN (
         SELECT id FROM user_profiles WHERE LOWER(email) = LOWER(TRIM(target_email))
       ));
  END IF;
END;
$$;

-- 6. Get user full operational & financial records for Admin (SECURITY DEFINER)
DROP FUNCTION IF EXISTS get_user_full_records_for_admin(UUID, TEXT);
CREATE OR REPLACE FUNCTION get_user_full_records_for_admin(
  target_user_id UUID DEFAULT NULL,
  target_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  resolved_id UUID;
  result JSONB;
BEGIN
  -- Resolve user ID
  IF target_user_id IS NOT NULL THEN
    resolved_id := target_user_id;
  ELSIF target_email IS NOT NULL AND TRIM(target_email) <> '' THEN
    SELECT id INTO resolved_id
    FROM user_profiles
    WHERE LOWER(email) = LOWER(TRIM(target_email))
    LIMIT 1;
  END IF;

  IF resolved_id IS NULL THEN
    RETURN jsonb_build_object(
      'farms', '[]'::jsonb,
      'ponds', '[]'::jsonb,
      'staff', '[]'::jsonb,
      'feedInventory', '[]'::jsonb,
      'feedingRecords', '[]'::jsonb,
      'revenues', '[]'::jsonb,
      'expenses', '[]'::jsonb,
      'invoices', '[]'::jsonb,
      'investors', '[]'::jsonb
    );
  END IF;

  SELECT jsonb_build_object(
    'farms', COALESCE((
      SELECT jsonb_agg(to_jsonb(f))
      FROM (SELECT id, name, city, state, country, created_at FROM farms WHERE user_id = resolved_id ORDER BY created_at ASC) f
    ), '[]'::jsonb),
    'ponds', COALESCE((
      SELECT jsonb_agg(to_jsonb(pd))
      FROM (SELECT id, name, size_m2, farm_id, current_count, initial_stock, species, stocking_date FROM ponds WHERE user_id = resolved_id OR farm_id IN (SELECT id FROM farms WHERE user_id = resolved_id) ORDER BY created_at DESC) pd
    ), '[]'::jsonb),
    'staff', COALESCE((
      SELECT jsonb_agg(to_jsonb(s))
      FROM (SELECT id, name, email, role, status, phone FROM staff_members WHERE user_id = resolved_id ORDER BY created_at DESC) s
    ), '[]'::jsonb),
    'feedInventory', COALESCE((
      SELECT jsonb_agg(to_jsonb(fd))
      FROM (SELECT id, brand, size, bags_in_stock, weight_per_bag, total_kg, cost_per_bag FROM feed_inventory WHERE user_id = resolved_id) fd
    ), '[]'::jsonb),
    'feedingRecords', COALESCE((
      SELECT jsonb_agg(to_jsonb(fr))
      FROM (SELECT id, pond, date, total, size, morning, evening, notes FROM feeding_records WHERE user_id = resolved_id ORDER BY date DESC, created_at DESC LIMIT 100) fr
    ), '[]'::jsonb),
    'revenues', COALESCE((
      SELECT jsonb_agg(to_jsonb(r))
      FROM (SELECT id, category, amount, date, customer, notes, description FROM revenues WHERE user_id = resolved_id ORDER BY date DESC, created_at DESC LIMIT 100) r
    ), '[]'::jsonb),
    'expenses', COALESCE((
      SELECT jsonb_agg(to_jsonb(e))
      FROM (SELECT id, category, amount, date, description, notes, vendor FROM expenses WHERE user_id = resolved_id ORDER BY date DESC, created_at DESC LIMIT 100) e
    ), '[]'::jsonb),
    'invoices', COALESCE((
      SELECT jsonb_agg(to_jsonb(i))
      FROM (SELECT id, invoice_number, customer_name, grand_total, subtotal, status, created_at, due_date FROM invoices WHERE user_id = resolved_id ORDER BY created_at DESC LIMIT 100) i
    ), '[]'::jsonb),
    'investors', COALESCE((
      SELECT jsonb_agg(to_jsonb(inv))
      FROM (SELECT id, name, email, phone, total_invested, notes FROM investors WHERE user_id = resolved_id) inv
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;
