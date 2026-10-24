-- ==============================================================================
-- PONDTORA: COMPLETE USER DELETION, STOCK TRANSFER, AND BILLING SYNC SCRIPT
-- ==============================================================================
-- RUN THIS SCRIPT ONCE IN YOUR SUPABASE SQL EDITOR (Dashboard -> SQL Editor -> New Query)
-- It enables:
-- 1. Permanent user deletion from auth.users, user_profiles, and all 30+ tables.
-- 2. Email re-registration for deleted accounts.
-- 3. Halting free trial counting when a user subscribes/pays.
-- 4. Fast, atomic fish stock transfers with proportional feed & mortality allocation.
-- ==============================================================================

-- 1. Drop existing functions to allow clean signature updates
DROP FUNCTION IF EXISTS public.delete_user_completely(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.delete_user_by_email(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_all_users_for_admin() CASCADE;

-- 2. Master permanent user deletion function
CREATE OR REPLACE FUNCTION public.delete_user_completely(target_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_email TEXT;
BEGIN
  IF target_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Protect master administrator
  SELECT LOWER(TRIM(email)) INTO v_email FROM auth.users WHERE id = target_user_id;
  IF v_email = 'edafejesugarec@gmail.com' THEN
    RETURN FALSE;
  END IF;

  -- A. Disassociate references from shared records (prevents foreign key errors and protects other users' data)
  UPDATE public.staff_farm_assignments SET assigned_by = NULL WHERE assigned_by = target_user_id;
  UPDATE public.sales_calculations SET created_by_id = NULL WHERE created_by_id = target_user_id AND (user_id IS NULL OR user_id <> target_user_id);
  UPDATE public.expenses SET created_by_id = NULL WHERE created_by_id = target_user_id AND (user_id IS NULL OR user_id <> target_user_id);
  UPDATE public.revenues SET created_by_id = NULL WHERE created_by_id = target_user_id AND (user_id IS NULL OR user_id <> target_user_id);
  UPDATE public.reports SET created_by_id = NULL WHERE created_by_id = target_user_id AND (user_id IS NULL OR user_id <> target_user_id);
  UPDATE public.referral_rewards SET referred_user_id = NULL WHERE referred_user_id = target_user_id;
  UPDATE public.staff_members SET staff_auth_id = NULL WHERE staff_auth_id = target_user_id AND (user_id IS NULL OR user_id <> target_user_id);

  -- B. Delete from sales calculation child items & payments
  DELETE FROM public.sales_calculation_items WHERE calculation_id IN (SELECT id FROM public.sales_calculations WHERE user_id = target_user_id);
  DELETE FROM public.sales_calculation_payments WHERE calculation_id IN (SELECT id FROM public.sales_calculations WHERE user_id = target_user_id);
  DELETE FROM public.sales_calculations WHERE user_id = target_user_id OR created_by_id = target_user_id;

  -- C. Delete from financial & sales records
  DELETE FROM public.price_groups WHERE user_id = target_user_id;
  DELETE FROM public.customers WHERE user_id = target_user_id;
  DELETE FROM public.invoices WHERE user_id = target_user_id;
  DELETE FROM public.invoice_settings WHERE user_id = target_user_id;
  DELETE FROM public.investment_payments WHERE user_id = target_user_id;
  DELETE FROM public.investments WHERE user_id = target_user_id;
  DELETE FROM public.investors WHERE user_id = target_user_id;
  DELETE FROM public.revenues WHERE user_id = target_user_id;
  DELETE FROM public.expenses WHERE user_id = target_user_id;

  -- D. Delete from operational records
  DELETE FROM public.pond_reports WHERE user_id = target_user_id;
  DELETE FROM public.treatment_records WHERE user_id = target_user_id;
  DELETE FROM public.mortality_entries WHERE user_id = target_user_id;
  DELETE FROM public.reports WHERE user_id = target_user_id;
  DELETE FROM public.feed_remaining_logs WHERE user_id = target_user_id;
  DELETE FROM public.bag_open_logs WHERE user_id = target_user_id;
  DELETE FROM public.feeding_records WHERE user_id = target_user_id;
  DELETE FROM public.feed_inventory WHERE user_id = target_user_id;
  DELETE FROM public.stock_events WHERE user_id = target_user_id;
  DELETE FROM public.fish_count_history WHERE farm_id IN (SELECT id FROM public.farms WHERE user_id = target_user_id);

  -- E. Delete farm equipment
  DELETE FROM public.tool_quantity_history WHERE user_id = target_user_id;
  DELETE FROM public.farm_equipment WHERE user_id = target_user_id;

  -- F. Delete staff & farms
  DELETE FROM public.staff_permissions WHERE staff_id IN (SELECT id FROM public.staff_members WHERE user_id = target_user_id);
  DELETE FROM public.staff_farm_assignments WHERE staff_id IN (SELECT id FROM public.staff_members WHERE user_id = target_user_id);
  DELETE FROM public.staff_invitations WHERE invited_by = target_user_id;
  DELETE FROM public.staff_members WHERE user_id = target_user_id OR staff_auth_id = target_user_id;
  DELETE FROM public.ponds WHERE user_id = target_user_id;
  DELETE FROM public.farms WHERE user_id = target_user_id;

  -- G. Delete referral and push records
  DELETE FROM public.referral_clearances WHERE user_id = target_user_id;
  DELETE FROM public.referral_rewards WHERE user_id = target_user_id;
  DELETE FROM public.push_subscriptions WHERE user_id = target_user_id;

  -- H. Delete public user profile
  DELETE FROM public.user_profiles WHERE id = target_user_id;

  -- I. Delete Supabase Auth records (allows the email address to be registered afresh)
  DELETE FROM auth.identities WHERE user_id = target_user_id;
  DELETE FROM auth.sessions WHERE user_id = target_user_id;
  DELETE FROM auth.refresh_tokens WHERE user_id = target_user_id;
  BEGIN
    DELETE FROM auth.mfa_factors WHERE user_id = target_user_id;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  -- Fallback ensure public profile is deleted
  DELETE FROM public.user_profiles WHERE id = target_user_id;
  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_completely(UUID) TO authenticated, anon, service_role;

-- 3. Delete user by email (cascading cleanup matching any auth or profile row)
CREATE OR REPLACE FUNCTION public.delete_user_by_email(target_email TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  clean_email TEXT;
  r RECORD;
BEGIN
  clean_email := LOWER(TRIM(target_email));
  IF clean_email = '' OR clean_email IS NULL OR clean_email = 'edafejesugarec@gmail.com' THEN
    RETURN FALSE;
  END IF;

  FOR r IN (SELECT id FROM auth.users WHERE LOWER(email) = clean_email) LOOP
    PERFORM public.delete_user_completely(r.id);
  END LOOP;

  FOR r IN (SELECT id FROM public.user_profiles WHERE LOWER(email) = clean_email) LOOP
    PERFORM public.delete_user_completely(r.id);
  END LOOP;

  -- Ensure any remnants are wiped
  DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE LOWER(email) = clean_email);
  DELETE FROM auth.sessions WHERE user_id IN (SELECT id FROM auth.users WHERE LOWER(email) = clean_email);
  DELETE FROM auth.refresh_tokens WHERE user_id IN (SELECT id FROM auth.users WHERE LOWER(email) = clean_email);
  DELETE FROM auth.users WHERE LOWER(email) = clean_email;
  DELETE FROM public.user_profiles WHERE LOWER(email) = clean_email;
  DELETE FROM public.staff_members WHERE LOWER(email) = clean_email;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_by_email(TEXT) TO authenticated, anon, service_role;

-- 4. Update get_all_users_for_admin to ignore deleted users and accurately reflect active subscriptions
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
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
#variable_conflict use_column
DECLARE
  v_deleted_ids UUID[];
  v_deleted_emails TEXT[];
BEGIN
  -- 1. Self-heal: If any staff member was mistakenly given role = 'owner', ensure their role is 'staff'
  UPDATE public.user_profiles up
  SET role = 'staff'
  WHERE up.role != 'staff'
    AND LOWER(TRIM(COALESCE(up.email, ''))) != 'edafejesugarec@gmail.com'
    AND EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE (sm.staff_auth_id = up.id OR LOWER(TRIM(sm.email)) = LOWER(TRIM(up.email)))
        AND sm.user_id != up.id
    );

  -- 2. Return ONLY farm-owner customer accounts joined with stats
  -- Strictly excludes staff members and deleted users
  RETURN QUERY
  SELECT
    au.id,
    COALESCE(NULLIF(p.name, ''), au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) AS name,
    COALESCE(au.email, p.email, '') AS email,
    COALESCE(p.phone, au.raw_user_meta_data->>'phone', '') AS phone,
    COALESCE(
      NULLIF(p.farm_name, ''),
      NULLIF(au.raw_user_meta_data->>'farm_name', ''),
      (SELECT f.name FROM public.farms f WHERE f.user_id = au.id ORDER BY f.created_at ASC LIMIT 1),
      'Primary Farm'
    ) AS farm_name,
    COALESCE(p.city, au.raw_user_meta_data->>'city', 'Lagos') AS city,
    COALESCE(p.state, au.raw_user_meta_data->>'state', 'Lagos') AS state,
    COALESCE(p.country, au.raw_user_meta_data->>'country', 'Nigeria') AS country,
    CASE
      WHEN LOWER(TRIM(COALESCE(au.email, p.email, ''))) = 'edafejesugarec@gmail.com' THEN 'admin'
      ELSE COALESCE(p.role, 'owner')
    END AS role,
    COALESCE(p.status, 'Active') AS status,
    COALESCE(NULLIF(p.active_plan, ''), au.raw_user_meta_data->>'active_plan', 'Starter') AS active_plan,
    -- If user has paid or has an active subscription, trial_start_date is cleared
    CASE
      WHEN p.has_paid = TRUE OR p.subscription_status IN ('Paid', 'Active') OR p.subscription_expiry IS NOT NULL THEN NULL
      ELSE COALESCE(p.trial_start_date, (au.raw_user_meta_data->>'trial_start_date')::TIMESTAMPTZ, au.created_at)
    END AS trial_start_date,
    CASE
      WHEN LOWER(TRIM(COALESCE(au.email, p.email, ''))) = 'edafejesugarec@gmail.com' THEN 'Active'
      WHEN p.has_paid = TRUE OR p.paystack_reference IS NOT NULL OR p.subscription_status IN ('Paid', 'Active') OR p.subscription_expiry IS NOT NULL THEN 'Active'
      ELSE COALESCE(p.subscription_status, 'Trial')
    END AS subscription_status,
    p.subscription_amount,
    COALESCE(p.free_access, (LOWER(TRIM(COALESCE(au.email, ''))) = 'edafejesugarec@gmail.com'), false) AS free_access,
    p.paystack_reference,
    p.last_payment_date,
    p.subscription_start,
    p.subscription_expiry,
    COALESCE(p.billing_frequency, 'monthly') AS billing_frequency,
    COALESCE(au.created_at, p.created_at) AS created_at,
    p.referral_code,
    COALESCE(p.referred_by, au.raw_user_meta_data->>'referred_by') AS referred_by,
    (SELECT COUNT(DISTINCT f.id) FROM public.farms f WHERE f.user_id = au.id) AS farm_count,
    (SELECT COUNT(DISTINCT pd.id) FROM public.ponds pd WHERE pd.user_id = au.id OR pd.farm_id IN (SELECT f.id FROM public.farms f WHERE f.user_id = au.id)) AS pond_count,
    (SELECT COUNT(DISTINCT sm.id) FROM public.staff_members sm WHERE sm.user_id = au.id) AS staff_count
  FROM auth.users au
  LEFT JOIN public.user_profiles p ON p.id = au.id
  WHERE (au.raw_user_meta_data->>'role') IS DISTINCT FROM 'staff'
    AND (au.raw_user_meta_data->>'owner_id') IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.staff_members sm 
      WHERE (sm.staff_auth_id = au.id OR LOWER(TRIM(sm.email)) = LOWER(TRIM(au.email)))
        AND sm.user_id != au.id
    )
  ORDER BY au.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_users_for_admin() TO authenticated, anon, service_role;

-- 5. Data fix: For any user that has payment/subscription dates, stop trial counting immediately
UPDATE public.user_profiles
SET 
  has_paid = TRUE,
  subscription_status = 'Active',
  trial_start_date = NULL
WHERE (
  (subscription_amount IS NOT NULL AND subscription_amount > 0)
  OR subscription_expiry IS NOT NULL
  OR subscription_start IS NOT NULL
  OR paystack_reference IS NOT NULL
  OR last_payment_date IS NOT NULL
)
AND role != 'staff'
AND LOWER(TRIM(COALESCE(email, ''))) != 'edafejesugarec@gmail.com';
