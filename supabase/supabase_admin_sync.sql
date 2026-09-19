-- ==============================================================================
-- PONDTORA: ADMIN USER SYNCHRONIZATION & LIVE FARM OWNER ACCOUNT MIGRATION
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/fegtvgfkxueorybefthj/sql/new
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. Schema Preparation & Missing Column Safeguards
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.user_profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE IF EXISTS public.user_profiles ADD COLUMN IF NOT EXISTS paystack_reference TEXT;
ALTER TABLE IF EXISTS public.user_profiles ADD COLUMN IF NOT EXISTS last_payment_date TEXT;
ALTER TABLE IF EXISTS public.user_profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT;
ALTER TABLE IF EXISTS public.user_profiles ADD COLUMN IF NOT EXISTS raw_data JSONB DEFAULT '{}'::jsonb;

-- Ensure platform_settings table exists before setting policies
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 1. Helper Function: is_admin()
-- Evaluates whether current user is Master Product Owner or has Admin role.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, auth AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND (
      LOWER(TRIM(COALESCE(role, ''))) IN ('admin', 'superadmin')
      OR LOWER(TRIM(COALESCE(email, ''))) = 'edafejesugarec@gmail.com'
    )
  ) OR (
    LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', ''))) = 'edafejesugarec@gmail.com'
  ) OR (
    LOWER(TRIM(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', ''))) IN ('admin', 'superadmin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 2. Master Function: get_all_users_for_admin()
-- Retrieves all real registered FARM OWNER / CUSTOMER accounts.
-- Staff accounts (Farm Manager, Feeding Staff, etc.) are strictly EXCLUDED
-- from the customer user list and only tracked as operational staff under their farm.
-- Auto-repairs user_profiles and farms for any registered farm owners in auth.users.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_all_users_for_admin()
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  farm_name TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  role TEXT,
  active_plan TEXT,
  trial_start_date TIMESTAMPTZ,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  paystack_reference TEXT,
  last_payment_date TEXT,
  subscription_status TEXT,
  free_access BOOLEAN,
  farm_count BIGINT,
  pond_count BIGINT,
  staff_count BIGINT,
  last_sign_in_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
#variable_conflict use_column
BEGIN
  -- 2a. Self-heal: If any staff member was mistakenly given role = 'owner', ensure their role is 'staff'
  UPDATE public.user_profiles up
  SET role = 'staff'
  WHERE up.role != 'staff'
    AND LOWER(TRIM(COALESCE(up.email, ''))) != 'edafejesugarec@gmail.com'
    AND EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE (sm.staff_auth_id = up.id OR LOWER(TRIM(sm.email)) = LOWER(TRIM(up.email)))
        AND sm.user_id != up.id
    );

  -- 2b. Auto-repair: Ensure eligible farm owners in auth.users have a matching user_profiles row
  -- STRICTLY EXCLUDES staff accounts (role = 'staff', owner_id IS NOT NULL, or in staff_members)
  INSERT INTO public.user_profiles (
    id, name, farm_name, city, state, country, email, phone,
    currency_symbol, currency_code, active_plan, trial_start_date, role, status
  )
  SELECT
    au.id,
    COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
    COALESCE(au.raw_user_meta_data->>'farm_name', 'Primary Farm'),
    COALESCE(au.raw_user_meta_data->>'city', 'Lagos'),
    COALESCE(au.raw_user_meta_data->>'state', 'Lagos'),
    COALESCE(au.raw_user_meta_data->>'country', 'Nigeria'),
    COALESCE(au.email, ''),
    COALESCE(au.raw_user_meta_data->>'phone', ''),
    COALESCE(au.raw_user_meta_data->>'currency_symbol', '₦'),
    COALESCE(au.raw_user_meta_data->>'currency_code', 'NGN'),
    COALESCE(au.raw_user_meta_data->>'active_plan', 'Starter'),
    COALESCE((au.raw_user_meta_data->>'trial_start_date')::TIMESTAMPTZ, au.created_at, NOW()),
    CASE 
      WHEN LOWER(TRIM(COALESCE(au.email, ''))) = 'edafejesugarec@gmail.com' THEN 'admin'
      ELSE 'owner'
    END,
    'Active'
  FROM auth.users au
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.id = au.id
  )
  -- Filter out staff accounts:
  AND (au.raw_user_meta_data->>'role') IS DISTINCT FROM 'staff'
  AND (au.raw_user_meta_data->>'owner_id') IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.staff_members sm 
    WHERE (sm.staff_auth_id = au.id OR LOWER(TRIM(sm.email)) = LOWER(TRIM(au.email)))
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.staff_invitations si 
    WHERE LOWER(TRIM(si.email)) = LOWER(TRIM(au.email))
  )
  ON CONFLICT ON CONSTRAINT user_profiles_pkey DO NOTHING;

  -- 2c. Ensure farm owners have at least one farm record
  INSERT INTO public.farms (user_id, name, city, state, country)
  SELECT
    up.id,
    COALESCE(NULLIF(up.farm_name, ''), 'Primary Farm'),
    COALESCE(NULLIF(up.city, ''), 'Lagos'),
    COALESCE(NULLIF(up.state, ''), 'Lagos'),
    COALESCE(NULLIF(up.country, ''), 'Nigeria')
  FROM public.user_profiles up
  WHERE up.role IN ('owner', 'admin')
    AND NOT EXISTS (SELECT 1 FROM public.farms f WHERE f.user_id = up.id)
  ON CONFLICT DO NOTHING;

  -- 2d. Return ONLY farm-owner customer accounts joined with stats
  -- Excludes staff members (who belong to an owner's farm)
  RETURN QUERY
  SELECT
    au.id,
    COALESCE(NULLIF(p.name, ''), au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) AS name,
    COALESCE(au.email, p.email, '') AS email,
    COALESCE(p.phone, au.raw_user_meta_data->>'phone', '') AS phone,
    COALESCE(NULLIF(p.farm_name, ''), (SELECT f.name FROM farms f WHERE f.user_id = au.id ORDER BY f.created_at ASC LIMIT 1), 'Primary Farm') AS farm_name,
    COALESCE(NULLIF(p.city, ''), au.raw_user_meta_data->>'city', 'Lagos') AS city,
    COALESCE(NULLIF(p.state, ''), au.raw_user_meta_data->>'state', 'Lagos') AS state,
    COALESCE(NULLIF(p.country, ''), au.raw_user_meta_data->>'country', 'Nigeria') AS country,
    COALESCE(p.role, au.raw_user_meta_data->>'role', 'owner') AS role,
    COALESCE(p.active_plan, au.raw_user_meta_data->>'active_plan', 'Starter') AS active_plan,
    COALESCE(p.trial_start_date, (au.raw_user_meta_data->>'trial_start_date')::TIMESTAMPTZ, au.created_at) AS trial_start_date,
    COALESCE(p.status, 'Active') AS status,
    au.created_at,
    COALESCE(p.updated_at, au.updated_at, au.created_at) AS updated_at,
    p.paystack_reference,
    p.last_payment_date,
    p.subscription_status,
    COALESCE((p.raw_data->>'free_access')::BOOLEAN, false) AS free_access,
    (SELECT COUNT(*) FROM farms f WHERE f.user_id = au.id)::BIGINT AS farm_count,
    (SELECT COUNT(*) FROM ponds pd WHERE pd.user_id = au.id)::BIGINT AS pond_count,
    (SELECT COUNT(*) FROM staff_members sm WHERE sm.user_id = au.id)::BIGINT AS staff_count,
    au.last_sign_in_at
  FROM auth.users au
  LEFT JOIN public.user_profiles p ON p.id = au.id
  WHERE (
    -- STRICT EXCLUSION: Must not be a staff member
    (au.raw_user_meta_data->>'role') IS DISTINCT FROM 'staff'
    AND (au.raw_user_meta_data->>'owner_id') IS NULL
    AND LOWER(TRIM(COALESCE(p.role, ''))) NOT IN ('staff', 'general staff', 'farm manager', 'feeding staff', 'inventory staff', 'feeding & inventory staff')
    AND NOT EXISTS (
      SELECT 1 FROM public.staff_members sm 
      WHERE (sm.staff_auth_id = au.id OR LOWER(TRIM(sm.email)) = LOWER(TRIM(au.email)))
        AND sm.user_id != au.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.staff_invitations si 
      WHERE LOWER(TRIM(si.email)) = LOWER(TRIM(au.email))
        AND si.invited_by != au.id
    )
  )
  ORDER BY au.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_users_for_admin() TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 3. Admin Update Function: admin_update_user_profile()
-- Allows authenticated Admin to update any user's profile, role, status, and active plan
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_user_profile(
  target_user_id UUID,
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
  new_free_access BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  -- Update user_profiles
  UPDATE public.user_profiles
  SET
    name = COALESCE(new_name, name),
    farm_name = COALESCE(new_farm_name, farm_name),
    phone = COALESCE(new_phone, phone),
    city = COALESCE(new_city, city),
    state = COALESCE(new_state, state),
    country = COALESCE(new_country, country),
    role = COALESCE(new_role, role),
    active_plan = COALESCE(new_active_plan, active_plan),
    status = COALESCE(new_status, status),
    subscription_status = COALESCE(new_subscription_status, subscription_status),
    updated_at = NOW()
  WHERE id = target_user_id;

  -- Also update primary farm name if changed
  IF new_farm_name IS NOT NULL AND new_farm_name <> '' THEN
    UPDATE public.farms
    SET name = new_farm_name, updated_at = NOW()
    WHERE user_id = target_user_id;
  END IF;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_user_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 4. RLS Policy Updates: Ensure is_admin() has full access to user_profiles
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "own_profile" ON public.user_profiles;
CREATE POLICY "own_profile" ON public.user_profiles
  FOR ALL
  USING (auth.uid() = id OR is_admin())
  WITH CHECK (auth.uid() = id OR is_admin());

-- ------------------------------------------------------------------------------
-- 5. Platform Settings Policies & Defaults
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "allow_read_platform_settings" ON public.platform_settings;
CREATE POLICY "allow_read_platform_settings" ON public.platform_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_write_platform_settings" ON public.platform_settings;
CREATE POLICY "allow_write_platform_settings" ON public.platform_settings FOR ALL USING (true) WITH CHECK (true);

-- Seed default paystack configuration if not present
INSERT INTO public.platform_settings (key, value)
VALUES (
  'paystack_config',
  jsonb_build_object(
    'mode', 'test',
    'testPublicKey', 'pk_test_f6c0521e72550ca50049367fa66800c36badacf6',
    'livePublicKey', 'pk_live_460ba5856621112e2cfa532db6999201fbe0be1a'
  )
)
ON CONFLICT (key) DO NOTHING;
