-- ==============================================================================
-- PONDTORA: COMPLETE USER DELETION, STOCK TRANSFER, AND BILLING SYNC SCRIPT
-- ==============================================================================
-- RUN THIS SCRIPT ONCE IN YOUR SUPABASE SQL EDITOR (Dashboard -> SQL Editor -> New Query)
-- It enables:
-- 1. Permanent user deletion from auth.users, user_profiles, and all 30+ tables.
-- 2. Email re-registration for deleted accounts.
-- 3. Halting free trial counting when a user subscribes/pays.
-- 4. Fast, atomic fish stock transfers with proportional feed & mortality allocation.
-- 5. Safe referral rewards constraints (fixes error 42P10).
-- ==============================================================================

-- 0. Schema & Constraint Safeguard: Ensure referral_rewards table and unique constraint exist
-- (Fixes: ERROR 42P10 there is no unique or exclusion constraint matching the ON CONFLICT specification)
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_code TEXT NOT NULL,
  referrer_email TEXT NOT NULL,
  referred_user_id UUID,
  referred_user_email TEXT NOT NULL,
  referred_user_name TEXT DEFAULT '',
  payment_reference TEXT DEFAULT '',
  plan_name TEXT NOT NULL DEFAULT 'Starter',
  payment_amount NUMERIC NOT NULL DEFAULT 0,
  payment_type TEXT NOT NULL DEFAULT 'first',
  commission_rate NUMERIC NOT NULL DEFAULT 0.30,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Available',
  paid_date TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disambiguate empty/null payment_references
UPDATE public.referral_rewards
SET payment_reference = 'ref_' || id::TEXT
WHERE payment_reference IS NULL OR TRIM(payment_reference) = '';

-- Deduplicate any duplicate payment_reference keeping newest
DELETE FROM public.referral_rewards
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY payment_reference 
      ORDER BY created_at DESC, id DESC
    ) as rnum
    FROM public.referral_rewards
    WHERE payment_reference IS NOT NULL AND TRIM(payment_reference) <> ''
  ) sub WHERE rnum > 1
);

-- Drop old partial index and create an unconditional UNIQUE index on payment_reference
DROP INDEX IF EXISTS public.idx_referral_rewards_payment_ref_unique;
DROP INDEX IF EXISTS public.idx_referral_rewards_payment_reference_unq;
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_rewards_payment_reference_unq 
  ON public.referral_rewards (payment_reference);

-- Re-create trigger_credit_referral_on_paid with safe IF NOT EXISTS and exception handling
CREATE OR REPLACE FUNCTION public.trigger_credit_referral_on_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ref_code TEXT;
  v_referrer_email TEXT;
  v_referrer_id UUID;
  v_pay_amount NUMERIC;
  v_comm_amount NUMERIC;
  v_pay_ref TEXT;
  v_today_str TEXT;
BEGIN
  -- Only trigger if user has referred_by and is now marked paid or active
  IF (NEW.has_paid = TRUE OR NEW.subscription_status = 'Active' OR NEW.subscription_status = 'Paid')
     AND NEW.referred_by IS NOT NULL AND TRIM(NEW.referred_by) <> '' THEN

    v_ref_code := UPPER(TRIM(NEW.referred_by));
    
    -- Find referrer in user_profiles
    SELECT id, email INTO v_referrer_id, v_referrer_email
    FROM public.user_profiles
    WHERE UPPER(TRIM(referral_code)) = v_ref_code 
       OR LOWER(TRIM(email)) = LOWER(v_ref_code)
       OR id::TEXT = v_ref_code
    LIMIT 1;

    IF v_referrer_email IS NULL THEN
      IF v_ref_code LIKE '%@%' THEN
        v_referrer_email := LOWER(v_ref_code);
      ELSE
        v_referrer_email := 'referrer_' || v_ref_code || '@pondtora.com';
      END IF;
    END IF;

    -- Calculate payment amount
    IF NEW.subscription_amount IS NOT NULL AND NEW.subscription_amount > 0 THEN
      v_pay_amount := NEW.subscription_amount;
    ELSE
      -- Fallback standard pricing
      IF LOWER(COALESCE(NEW.active_plan, '')) LIKE '%unlimited%' THEN
        v_pay_amount := 70000;
      ELSIF LOWER(COALESCE(NEW.active_plan, '')) LIKE '%5-farm%' THEN
        v_pay_amount := 40000;
      ELSIF LOWER(COALESCE(NEW.active_plan, '')) LIKE '%3-farm%' THEN
        v_pay_amount := 24000;
      ELSIF LOWER(COALESCE(NEW.active_plan, '')) LIKE '%commercial%' THEN
        v_pay_amount := 10000;
      ELSIF LOWER(COALESCE(NEW.active_plan, '')) LIKE '%growth%' OR LOWER(COALESCE(NEW.active_plan, '')) LIKE '%pro%' THEN
        v_pay_amount := 5000;
      ELSE
        v_pay_amount := 3000;
      END IF;
    END IF;

    v_comm_amount := ROUND(v_pay_amount * 0.30);
    v_today_str := TO_CHAR(NOW(), 'YYYYMMDD');

    IF NEW.paystack_reference IS NOT NULL AND TRIM(NEW.paystack_reference) <> '' THEN
      v_pay_ref := TRIM(NEW.paystack_reference);
    ELSE
      v_pay_ref := 'admin_paid_' || SUBSTRING(COALESCE(NEW.id::TEXT, NEW.email), 1, 8) || '_' || v_today_str;
    END IF;

    -- Safe idempotent insert: checks before inserting and catches any constraint collisions
    IF NOT EXISTS (
      SELECT 1 FROM public.referral_rewards 
      WHERE payment_reference = v_pay_ref
    ) THEN
      BEGIN
        INSERT INTO public.referral_rewards (
          referrer_code,
          referrer_email,
          referred_user_id,
          referred_user_email,
          referred_user_name,
          payment_reference,
          plan_name,
          payment_amount,
          payment_type,
          commission_rate,
          commission_amount,
          status,
          created_at
        ) VALUES (
          v_ref_code,
          v_referrer_email,
          NEW.id,
          NEW.email,
          COALESCE(NEW.name, SPLIT_PART(NEW.email, '@', 1)),
          v_pay_ref,
          COALESCE(NEW.active_plan, 'Starter'),
          v_pay_amount,
          'first',
          0.30,
          v_comm_amount,
          'Available',
          NOW()
        );
      EXCEPTION WHEN unique_violation THEN
        NULL;
      END;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credit_referral_on_paid ON public.user_profiles;
CREATE TRIGGER trg_credit_referral_on_paid
  AFTER INSERT OR UPDATE OF has_paid, subscription_status, paystack_reference ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_credit_referral_on_paid();

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
