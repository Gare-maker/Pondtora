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

-- 6. Ensure ponds fish_stock column exists
ALTER TABLE public.ponds ADD COLUMN IF NOT EXISTS fish_stock TEXT;

-- 7. ATOMIC FISH STOCK TRANSFER STORED PROCEDURE
CREATE OR REPLACE FUNCTION transfer_fish_stock(
  p_from_pond_id UUID,
  p_to_pond_id UUID,
  p_percentage NUMERIC DEFAULT 100,
  p_count INTEGER DEFAULT NULL,
  p_date TEXT DEFAULT NULL,
  p_transferred_by TEXT DEFAULT 'User'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_from_pond RECORD;
  v_to_pond RECORD;
  v_fraction NUMERIC;
  v_safe_count INTEGER;
  v_is_full BOOLEAN;
  v_date_label TEXT;
  v_stock_label TEXT;
  v_cost_share NUMERIC;
  v_init_dest INTEGER;
  v_from_init INTEGER;
  v_feed_rec RECORD;
  v_morning_dest NUMERIC;
  v_evening_dest NUMERIC;
  v_mort_rec RECORD;
  v_mort_dest INTEGER;
  v_treat_rec RECORD;
BEGIN
  -- 1. Validate ponds
  SELECT * INTO v_from_pond FROM ponds WHERE id = p_from_pond_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Source pond not found.');
  END IF;

  SELECT * INTO v_to_pond FROM ponds WHERE id = p_to_pond_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Destination pond not found.');
  END IF;

  IF COALESCE(v_from_pond.current_count, 0) <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Source pond has no active fish stock to transfer.');
  END IF;

  IF v_to_pond.status <> 'Empty' AND COALESCE(v_to_pond.current_count, 0) > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Destination pond must be empty to transfer fish stock.');
  END IF;

  -- 2. Calculate percentages and counts
  v_fraction := LEAST(1.0, GREATEST(0.01, COALESCE(p_percentage, 100)::NUMERIC / 100.0));
  IF p_count IS NOT NULL AND p_count > 0 THEN
    v_safe_count := LEAST(v_from_pond.current_count, p_count);
    v_fraction := v_safe_count::NUMERIC / v_from_pond.current_count::NUMERIC;
  ELSE
    v_safe_count := ROUND(v_from_pond.current_count * v_fraction);
  END IF;

  v_safe_count := LEAST(v_from_pond.current_count, GREATEST(1, v_safe_count));
  v_is_full := (v_safe_count >= v_from_pond.current_count) OR (v_fraction >= 0.999);

  v_date_label := COALESCE(p_date, TO_CHAR(CURRENT_DATE, 'Mon DD, YYYY'));
  v_stock_label := COALESCE(v_from_pond.fish_stock, v_from_pond.species || ' (' || COALESCE(v_from_pond.stocking_date, '—') || ')');

  v_from_init := COALESCE(v_from_pond.initial_stock, v_from_pond.current_count);
  IF v_from_init <= 0 THEN
    v_from_init := v_from_pond.current_count;
  END IF;

  IF v_is_full THEN
    -- =========================================================================
    -- A. 100% FISH STOCK TRANSFER
    -- =========================================================================
    v_cost_share := COALESCE(v_from_pond.total_cost, 0);

    -- 1. Clear source pond
    UPDATE ponds SET
      status = 'Empty',
      current_count = 0,
      initial_stock = 0,
      avg_weight = NULL,
      stocking_date = '—',
      stock_month = '',
      total_cost = 0,
      species = '—',
      fish_stock = NULL,
      supplier = NULL,
      default_pellet = NULL,
      max_kg_by_pallet = '{}'::jsonb,
      transfer_note = 'All fish transferred to ' || v_to_pond.name || ' on ' || v_date_label
    WHERE id = p_from_pond_id;

    -- 2. Activate destination pond with complete stock details
    UPDATE ponds SET
      status = 'Active',
      species = v_from_pond.species,
      fish_stock = v_stock_label,
      initial_stock = v_from_init,
      current_count = v_from_pond.current_count,
      stocking_date = v_from_pond.stocking_date,
      stock_month = v_from_pond.stock_month,
      total_cost = v_cost_share,
      supplier = v_from_pond.supplier,
      avg_weight = v_from_pond.avg_weight,
      default_pellet = v_from_pond.default_pellet,
      max_kg_by_pallet = COALESCE(v_from_pond.max_kg_by_pallet, '{}'::jsonb),
      transfer_note = 'Full stock received from ' || v_from_pond.name || ' on ' || v_date_label
    WHERE id = p_to_pond_id;

    -- 3. Reassociate all feeding records to destination pond
    UPDATE feeding_records SET
      pond = v_to_pond.name,
      pond_id = p_to_pond_id::text,
      fish_stock = v_stock_label
    WHERE (LOWER(TRIM(pond)) = LOWER(TRIM(v_from_pond.name)) OR pond_id = p_from_pond_id::text OR fish_stock = v_stock_label)
      AND (user_id = v_from_pond.user_id OR farm_id = v_from_pond.farm_id);

    -- 3b. Reassociate bag open logs to destination pond
    UPDATE bag_open_logs SET
      pond = v_to_pond.name,
      fish_stock = v_stock_label
    WHERE (LOWER(TRIM(COALESCE(pond, ''))) = LOWER(TRIM(v_from_pond.name)) OR fish_stock = v_stock_label OR fish_stock = v_from_pond.name)
      AND (user_id = v_from_pond.user_id OR farm_id = v_from_pond.farm_id);

    -- 3c. Reassociate feed remaining logs to destination stock
    UPDATE feed_remaining_logs SET
      fish_stock = v_stock_label
    WHERE (fish_stock = v_stock_label OR fish_stock = v_from_pond.name)
      AND (user_id = v_from_pond.user_id OR farm_id = v_from_pond.farm_id);

    -- 4. Reassociate all mortality entries to destination pond
    UPDATE mortality_entries SET
      pond_id = p_to_pond_id,
      fish_stock = v_stock_label
    WHERE pond_id = p_from_pond_id;

    -- 5. Reassociate all treatment records to destination pond
    UPDATE treatment_records SET
      pond_id = p_to_pond_id,
      fish_stock = v_stock_label
    WHERE pond_id = p_from_pond_id;

    -- 6. Reassociate pond reports (treatments and other issues)
    UPDATE pond_reports SET
      pond_id = p_to_pond_id,
      fish_stock_id = v_stock_label
    WHERE pond_id = p_from_pond_id;

    -- 7. Update fish count history pond association
    UPDATE fish_count_history SET
      pond_id = p_to_pond_id,
      pond_name = v_to_pond.name
    WHERE pond_id = p_from_pond_id;

    -- 8. Add fish count history entry for destination pond
    INSERT INTO fish_count_history (
      id, pond_id, pond_name, farm_id, previous_count, new_count, difference, changed_by, action_reason, created_at
    ) VALUES (
      gen_random_uuid(), p_to_pond_id, v_to_pond.name, COALESCE(v_to_pond.farm_id, v_from_pond.farm_id),
      0, v_from_pond.current_count, v_from_pond.current_count,
      p_transferred_by, 'Full stock transferred from ' || v_from_pond.name, NOW()
    );

    -- 9. Add fish count history entry for source pond
    INSERT INTO fish_count_history (
      id, pond_id, pond_name, farm_id, previous_count, new_count, difference, changed_by, action_reason, created_at
    ) VALUES (
      gen_random_uuid(), p_from_pond_id, v_from_pond.name, v_from_pond.farm_id,
      v_from_pond.current_count, 0, -v_from_pond.current_count,
      p_transferred_by, 'All fish transferred to ' || v_to_pond.name, NOW()
    );

    -- 10. Record stock events
    INSERT INTO stock_events (
      id, user_id, pond_id, farm_id, pond_name, date, species, count, cost, type, from_pond, batch, created_at
    ) VALUES (
      gen_random_uuid(), v_to_pond.user_id, p_to_pond_id, COALESCE(v_to_pond.farm_id, v_from_pond.farm_id),
      v_to_pond.name, v_date_label, v_from_pond.species, v_from_pond.current_count, v_cost_share,
      'Transfer', v_from_pond.name, v_stock_label, NOW()
    );

    INSERT INTO stock_events (
      id, user_id, pond_id, farm_id, pond_name, date, species, count, cost, type, cleared_date, batch, created_at
    ) VALUES (
      gen_random_uuid(), v_from_pond.user_id, p_from_pond_id, v_from_pond.farm_id,
      v_from_pond.name, v_date_label, v_from_pond.species, v_from_pond.current_count, v_cost_share,
      'Closed', v_date_label, v_stock_label, NOW()
    );

  ELSE
    -- =========================================================================
    -- B. PARTIAL (PERCENTAGE) FISH STOCK TRANSFER
    -- =========================================================================
    v_cost_share := ROUND(COALESCE(v_from_pond.total_cost, 0) * v_fraction, 2);
    v_init_dest := ROUND(v_from_init * v_fraction);
    IF v_init_dest <= 0 THEN
      v_init_dest := v_safe_count;
    END IF;

    -- 1. Update source pond with remaining count and cost
    UPDATE ponds SET
      current_count = GREATEST(0, v_from_pond.current_count - v_safe_count),
      initial_stock = GREATEST(v_from_pond.current_count - v_safe_count, v_from_init - v_init_dest),
      total_cost = GREATEST(0, COALESCE(v_from_pond.total_cost, 0) - v_cost_share),
      transfer_note = 'Transferred ' || v_safe_count || ' fish (' || ROUND(v_fraction * 100) || '%) to ' || v_to_pond.name || ' on ' || v_date_label
    WHERE id = p_from_pond_id;

    -- 2. Activate destination pond with transferred portion, preserving original stocking date & identity
    UPDATE ponds SET
      status = 'Active',
      species = v_from_pond.species,
      fish_stock = v_stock_label,
      initial_stock = v_init_dest,
      current_count = v_safe_count,
      stocking_date = v_from_pond.stocking_date,
      stock_month = v_from_pond.stock_month,
      total_cost = v_cost_share,
      supplier = v_from_pond.supplier,
      avg_weight = v_from_pond.avg_weight,
      default_pellet = v_from_pond.default_pellet,
      transfer_note = v_safe_count || ' fish (' || ROUND(v_fraction * 100) || '%) received from ' || v_from_pond.name || ' on ' || v_date_label
    WHERE id = p_to_pond_id;

    -- 3. Proportionally allocate feeding records
    FOR v_feed_rec IN
      SELECT * FROM feeding_records
      WHERE (LOWER(TRIM(pond)) = LOWER(TRIM(v_from_pond.name)) OR pond_id = p_from_pond_id::text OR fish_stock = v_stock_label)
        AND (user_id = v_from_pond.user_id OR farm_id = v_from_pond.farm_id)
    LOOP
      v_morning_dest := ROUND(COALESCE(v_feed_rec.morning, 0) * v_fraction, 2);
      v_evening_dest := ROUND(COALESCE(v_feed_rec.evening, 0) * v_fraction, 2);

      -- Update source record with remaining quantity
      UPDATE feeding_records SET
        morning = GREATEST(0, COALESCE(v_feed_rec.morning, 0) - v_morning_dest),
        evening = GREATEST(0, COALESCE(v_feed_rec.evening, 0) - v_evening_dest),
        total = GREATEST(0, (COALESCE(v_feed_rec.morning, 0) - v_morning_dest) + (COALESCE(v_feed_rec.evening, 0) - v_evening_dest)),
        fish_stock = v_stock_label,
        pond_id = p_from_pond_id::text
      WHERE id = v_feed_rec.id;

      -- Insert allocated quantity record for destination pond
      INSERT INTO feeding_records (
        id, user_id, farm_id, date, month, year, pond, pond_id, brand, size,
        morning, evening, total, recorded_by, morning_time, evening_time, fish_stock, created_at
      ) VALUES (
        gen_random_uuid(), v_feed_rec.user_id, COALESCE(v_to_pond.farm_id, v_feed_rec.farm_id),
        v_feed_rec.date, v_feed_rec.month, v_feed_rec.year, v_to_pond.name, p_to_pond_id::text, v_feed_rec.brand, v_feed_rec.size,
        v_morning_dest, v_evening_dest, v_morning_dest + v_evening_dest,
        v_feed_rec.recorded_by, v_feed_rec.morning_time, v_feed_rec.evening_time, v_stock_label, NOW()
      );
    END LOOP;

    -- 4. Proportionally allocate mortality records
    FOR v_mort_rec IN
      SELECT * FROM mortality_entries
      WHERE pond_id = p_from_pond_id
    LOOP
      v_mort_dest := ROUND(COALESCE(v_mort_rec.count, 0) * v_fraction);
      IF v_mort_dest > 0 THEN
        UPDATE mortality_entries SET
          count = GREATEST(0, COALESCE(v_mort_rec.count, 0) - v_mort_dest),
          fish_stock = v_stock_label
        WHERE id = v_mort_rec.id;

        INSERT INTO mortality_entries (
          id, user_id, pond_id, farm_id, date, count, cause, notes, fish_stock, created_at
        ) VALUES (
          gen_random_uuid(), v_mort_rec.user_id, p_to_pond_id, COALESCE(v_to_pond.farm_id, v_mort_rec.farm_id),
          v_mort_rec.date, v_mort_dest, v_mort_rec.cause,
          COALESCE(v_mort_rec.notes, '') || ' (Transferred from ' || v_from_pond.name || ')',
          v_stock_label, NOW()
        );
      END IF;
    END LOOP;

    -- 5. Copy treatments to destination pond for medical reference
    FOR v_treat_rec IN
      SELECT * FROM treatment_records
      WHERE pond_id = p_from_pond_id
    LOOP
      INSERT INTO treatment_records (
        id, user_id, pond_id, farm_id, date, cause, medicine, details, action_taken, remarks, fish_stock, recorded_by, created_at
      ) VALUES (
        gen_random_uuid(), v_treat_rec.user_id, p_to_pond_id, COALESCE(v_to_pond.farm_id, v_treat_rec.farm_id),
        v_treat_rec.date, v_treat_rec.cause, v_treat_rec.medicine, v_treat_rec.details, v_treat_rec.action_taken,
        COALESCE(v_treat_rec.remarks, '') || ' (Medical reference from ' || v_from_pond.name || ')',
        v_stock_label, v_treat_rec.recorded_by, NOW()
      );
    END LOOP;

    -- 5b. Copy pond_reports (treatment & other issues) to destination pond for medical and incident reference
    INSERT INTO pond_reports (
      id, user_id, farm_id, pond_id, fish_stock_id, report_type,
      report_date, issue, description, medicine, cause, treatment_details,
      action_taken, remarks, notes, treatment_id, recorded_by, created_by, created_at
    )
    SELECT
      gen_random_uuid(), user_id, COALESCE(v_to_pond.farm_id, farm_id), p_to_pond_id, v_stock_label, report_type,
      report_date, issue, description, medicine, cause, treatment_details,
      action_taken, COALESCE(remarks, '') || ' (From ' || v_from_pond.name || ')', notes, treatment_id, recorded_by, created_by, NOW()
    FROM pond_reports
    WHERE pond_id = p_from_pond_id;

    -- 6. Log fish count history
    INSERT INTO fish_count_history (
      id, pond_id, pond_name, farm_id, previous_count, new_count, difference, changed_by, action_reason, created_at
    ) VALUES (
      gen_random_uuid(), p_from_pond_id, v_from_pond.name, v_from_pond.farm_id,
      v_from_pond.current_count, v_from_pond.current_count - v_safe_count, -v_safe_count,
      p_transferred_by, 'Transferred ' || v_safe_count || ' fish (' || ROUND(v_fraction * 100) || '%) to ' || v_to_pond.name, NOW()
    );

    INSERT INTO fish_count_history (
      id, pond_id, pond_name, farm_id, previous_count, new_count, difference, changed_by, action_reason, created_at
    ) VALUES (
      gen_random_uuid(), p_to_pond_id, v_to_pond.name, COALESCE(v_to_pond.farm_id, v_from_pond.farm_id),
      0, v_safe_count, v_safe_count,
      p_transferred_by, 'Received ' || v_safe_count || ' fish (' || ROUND(v_fraction * 100) || '%) from ' || v_from_pond.name, NOW()
    );

    -- 7. Record stock event for destination pond
    INSERT INTO stock_events (
      id, user_id, pond_id, farm_id, pond_name, date, species, count, cost, type, from_pond, batch, created_at
    ) VALUES (
      gen_random_uuid(), v_to_pond.user_id, p_to_pond_id, COALESCE(v_to_pond.farm_id, v_from_pond.farm_id),
      v_to_pond.name, v_date_label, v_from_pond.species, v_safe_count, v_cost_share,
      'Transfer', v_from_pond.name, v_stock_label, NOW()
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Fish stock successfully transferred.',
    'isFullTransfer', v_is_full,
    'transferredCount', v_safe_count,
    'fromPondId', p_from_pond_id,
    'toPondId', p_to_pond_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION transfer_fish_stock(UUID, UUID, NUMERIC, INTEGER, TEXT, TEXT) TO authenticated, anon;

-- ==============================================================================
-- 6. Feeding Records & Stock Isolation Schema Safeguards
-- ==============================================================================
ALTER TABLE public.feeding_records ADD COLUMN IF NOT EXISTS pond_id TEXT;
ALTER TABLE public.feeding_records ADD COLUMN IF NOT EXISTS fish_stock TEXT;
ALTER TABLE public.feeding_records ADD COLUMN IF NOT EXISTS fish_stock_id TEXT;
ALTER TABLE public.feeding_records ADD COLUMN IF NOT EXISTS edit_history JSONB;

ALTER TABLE public.ponds ADD COLUMN IF NOT EXISTS fish_stock_id TEXT;

ALTER TABLE public.stock_events ADD COLUMN IF NOT EXISTS batch TEXT;

ALTER TABLE public.mortality_entries ADD COLUMN IF NOT EXISTS fish_stock TEXT;
ALTER TABLE public.mortality_entries ADD COLUMN IF NOT EXISTS pond_name TEXT;

ALTER TABLE public.treatment_records ADD COLUMN IF NOT EXISTS fish_stock TEXT;
