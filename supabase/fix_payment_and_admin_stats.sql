-- ==============================================================================
-- PONDTORA SYSTEM UPDATE: Payment Synchronization & Admin Financial Stats Fix
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query -> Run)
-- ==============================================================================

-- 1. Ensure all subscription, payment, and billing columns exist in user_profiles
ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS subscription_amount NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'Trial',
  ADD COLUMN IF NOT EXISTS subscription_start TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_expiry TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS billing_frequency TEXT DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS paystack_reference TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_payment_date TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS free_access BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS raw_data JSONB DEFAULT '{}'::jsonb;

-- 2. Ensure platform_settings table exists with open RLS for persistent admin overrides
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on platform_settings" ON public.platform_settings;
CREATE POLICY "Allow public read on platform_settings"
  ON public.platform_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow upsert on platform_settings" ON public.platform_settings;
CREATE POLICY "Allow upsert on platform_settings"
  ON public.platform_settings FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. Update get_all_users_for_admin RPC function to return all billing & subscription fields
DROP FUNCTION IF EXISTS public.get_all_users_for_admin();
CREATE OR REPLACE FUNCTION public.get_all_users_for_admin()
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
  FROM public.user_profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- 4. Update admin_update_user_profile RPC function
DROP FUNCTION IF EXISTS public.admin_update_user_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, BOOLEAN);
DROP FUNCTION IF EXISTS public.admin_update_user_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, BOOLEAN, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.admin_update_user_profile;

CREATE OR REPLACE FUNCTION public.admin_update_user_profile(
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
  new_subscription_expiry TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_profiles
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
    updated_at = NOW()
  WHERE (target_user_id IS NOT NULL AND id = target_user_id)
     OR (target_email IS NOT NULL AND TRIM(target_email) <> '' AND LOWER(email) = LOWER(TRIM(target_email)));

  IF new_farm_name IS NOT NULL AND TRIM(new_farm_name) <> '' THEN
    UPDATE public.farms
    SET name = new_farm_name, updated_at = NOW()
    WHERE (target_user_id IS NOT NULL AND user_id = target_user_id)
       OR (target_email IS NOT NULL AND TRIM(target_email) <> '' AND user_id IN (
         SELECT id FROM public.user_profiles WHERE LOWER(email) = LOWER(TRIM(target_email))
       ));
  END IF;
END;
$$;

-- 5. Auto-repair any user accounts that have payment records or paid references
UPDATE public.user_profiles
SET
  subscription_status = 'Active',
  trial_start_date = NULL,
  subscription_amount = COALESCE(subscription_amount, CASE
    WHEN LOWER(TRIM(active_plan)) = 'starter' THEN 5000
    WHEN LOWER(TRIM(active_plan)) = 'growth' THEN 15000
    WHEN LOWER(TRIM(active_plan)) = 'commercial' THEN 50000
    WHEN LOWER(TRIM(active_plan)) = '3-farm plan' THEN 24000
    WHEN LOWER(TRIM(active_plan)) = '5-farm plan' THEN 40000
    WHEN LOWER(TRIM(active_plan)) = 'unlimited farms' THEN 70000
    ELSE 5000
  END),
  subscription_start = COALESCE(subscription_start, last_payment_date, TO_CHAR(NOW(), 'YYYY-MM-DD')),
  subscription_expiry = COALESCE(subscription_expiry, TO_CHAR(NOW() + INTERVAL '30 days', 'YYYY-MM-DD')),
  updated_at = NOW()
WHERE paystack_reference IS NOT NULL
   OR last_payment_date IS NOT NULL
   OR subscription_status IN ('Active', 'Paid');
