-- ============================================================================
-- Pondtora: Referral Tracking & Onboarding Plan Persistence Fix
-- ============================================================================

-- 1. Ensure user_profiles has all required columns
ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS has_paid BOOLEAN DEFAULT FALSE;

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT DEFAULT NULL;

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS referred_by TEXT DEFAULT NULL;

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'Trial';

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS subscription_amount NUMERIC DEFAULT NULL;

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS billing_frequency TEXT DEFAULT 'monthly';

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS paystack_reference TEXT DEFAULT NULL;

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS last_payment_date TEXT DEFAULT NULL;

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS subscription_start TEXT DEFAULT NULL;

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS subscription_expiry TEXT DEFAULT NULL;

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS raw_data JSONB DEFAULT '{}'::jsonb;

-- 2. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding_completed ON public.user_profiles (onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_user_profiles_has_paid ON public.user_profiles (has_paid);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referred_by ON public.user_profiles (referred_by);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON public.user_profiles (referral_code);

-- 3. Self-repair existing users so returning users don't see onboarding overlay repeatedly
UPDATE public.user_profiles
SET onboarding_completed = TRUE
WHERE active_plan IS NOT NULL 
  AND TRIM(active_plan) <> ''
  AND (onboarding_completed IS NULL OR onboarding_completed = FALSE);

UPDATE public.user_profiles
SET has_paid = TRUE,
    onboarding_completed = TRUE
WHERE (
    (paystack_reference IS NOT NULL AND TRIM(paystack_reference) <> '')
    OR subscription_status = 'Active'
    OR subscription_status = 'Paid'
  )
  AND (has_paid IS NULL OR has_paid = FALSE);

-- 4. Ensure referral_rewards table exists with idempotency
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_code TEXT NOT NULL,
  referrer_email TEXT NOT NULL,
  referred_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  referred_user_email TEXT NOT NULL,
  referred_user_name TEXT DEFAULT '',
  payment_reference TEXT DEFAULT '',
  plan_name TEXT NOT NULL DEFAULT 'Starter',
  payment_amount NUMERIC NOT NULL DEFAULT 0,
  payment_type TEXT NOT NULL DEFAULT 'first', -- 'first' (30%) or 'recurring' (10%)
  commission_rate NUMERIC NOT NULL DEFAULT 0.30,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Available', -- 'Available' or 'Paid'
  paid_date TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deduplicate any existing duplicate payment references before creating unique index
-- Step A: Disambiguate placeholder references (e.g. LIVE-PAYMENT, test) with row id
UPDATE public.referral_rewards
SET payment_reference = payment_reference || '_' || SUBSTRING(COALESCE(id::TEXT, MD5(created_at::TEXT)), 1, 8)
WHERE UPPER(TRIM(payment_reference)) IN ('LIVE-PAYMENT', 'LIVE-CONFIRMED', 'TEST', 'PENDING', 'UNVERIFIED', 'MANUAL');

-- Step B: Remove any remaining duplicate records keeping only the newest entry
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

-- Ensure strict idempotency: each payment reference can only produce ONE commission reward
DROP INDEX IF EXISTS public.idx_referral_rewards_payment_ref_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_rewards_payment_ref_unique 
  ON public.referral_rewards (payment_reference) 
  WHERE payment_reference IS NOT NULL AND payment_reference <> '';

CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer_code ON public.referral_rewards (referrer_code);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer_email ON public.referral_rewards (referrer_email);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referred_email ON public.referral_rewards (referred_user_email);

-- Enable RLS on referral_rewards
ALTER TABLE IF EXISTS public.referral_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select referral_rewards" ON public.referral_rewards;
CREATE POLICY "Allow select referral_rewards" ON public.referral_rewards
  FOR SELECT USING (
    LOWER(TRIM(referrer_email)) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', '')))
    OR referred_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
        AND (up.role = 'admin' OR up.role = 'superadmin' OR up.email = 'edafejesugarec@gmail.com')
    )
  );

DROP POLICY IF EXISTS "Allow insert referral_rewards" ON public.referral_rewards;
CREATE POLICY "Allow insert referral_rewards" ON public.referral_rewards
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update referral_rewards" ON public.referral_rewards;
CREATE POLICY "Allow update referral_rewards" ON public.referral_rewards
  FOR UPDATE USING (
    LOWER(TRIM(referrer_email)) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', '')))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.id = auth.uid() 
        AND (up.role = 'admin' OR up.role = 'superadmin' OR up.email = 'edafejesugarec@gmail.com')
    )
  );

-- 5. Ensure platform_settings table exists
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON public.platform_settings (key);
ALTER TABLE IF EXISTS public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all users to read platform_settings" ON public.platform_settings;
CREATE POLICY "Allow all users to read platform_settings" ON public.platform_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert/update platform_settings" ON public.platform_settings;
CREATE POLICY "Allow authenticated users to insert/update platform_settings" ON public.platform_settings
  FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- 6. SECURITY DEFINER RPC Functions for querying referrals securely across RLS
DROP FUNCTION IF EXISTS public.get_user_referrals(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_user_referrals(TEXT);
DROP FUNCTION IF EXISTS public.get_user_referrals();

CREATE OR REPLACE FUNCTION public.get_user_referrals(p_referrer_code TEXT, p_referrer_email TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  farm_name TEXT,
  active_plan TEXT,
  subscription_status TEXT,
  billing_frequency TEXT,
  has_paid BOOLEAN,
  subscription_amount NUMERIC,
  trial_start_date TEXT,
  paystack_reference TEXT,
  last_payment_date TEXT,
  referred_by TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    up.name,
    up.email,
    up.farm_name,
    up.active_plan,
    up.subscription_status,
    up.billing_frequency,
    COALESCE(up.has_paid, FALSE) AS has_paid,
    up.subscription_amount,
    up.trial_start_date,
    up.paystack_reference,
    up.last_payment_date,
    up.referred_by,
    up.created_at
  FROM public.user_profiles up
  WHERE (
    (p_referrer_code IS NOT NULL AND p_referrer_code <> '' AND UPPER(TRIM(up.referred_by)) = UPPER(TRIM(p_referrer_code)))
    OR (p_referrer_email IS NOT NULL AND p_referrer_email <> '' AND LOWER(TRIM(up.referred_by)) = LOWER(TRIM(p_referrer_email)))
  )
  AND (p_referrer_email IS NULL OR LOWER(TRIM(up.email)) <> LOWER(TRIM(p_referrer_email)))
  ORDER BY up.created_at DESC;
END;
$$;

DROP FUNCTION IF EXISTS public.get_user_referral_rewards(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_user_referral_rewards(TEXT);
DROP FUNCTION IF EXISTS public.get_user_referral_rewards();

CREATE OR REPLACE FUNCTION public.get_user_referral_rewards(p_referrer_code TEXT, p_referrer_email TEXT)
RETURNS TABLE (
  id UUID,
  referrer_code TEXT,
  referrer_email TEXT,
  referred_user_id UUID,
  referred_user_email TEXT,
  referred_user_name TEXT,
  payment_reference TEXT,
  plan_name TEXT,
  payment_amount NUMERIC,
  payment_type TEXT,
  commission_rate NUMERIC,
  commission_amount NUMERIC,
  status TEXT,
  paid_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rr.id,
    rr.referrer_code,
    rr.referrer_email,
    rr.referred_user_id,
    rr.referred_user_email,
    rr.referred_user_name,
    rr.payment_reference,
    rr.plan_name,
    rr.payment_amount,
    rr.payment_type,
    rr.commission_rate,
    rr.commission_amount,
    rr.status,
    rr.paid_date,
    rr.created_at
  FROM public.referral_rewards rr
  WHERE (
    (p_referrer_code IS NOT NULL AND p_referrer_code <> '' AND UPPER(TRIM(rr.referrer_code)) = UPPER(TRIM(p_referrer_code)))
    OR (p_referrer_email IS NOT NULL AND p_referrer_email <> '' AND LOWER(TRIM(rr.referrer_email)) = LOWER(TRIM(p_referrer_email)))
  )
  ORDER BY rr.created_at DESC;
END;
$$;

-- 7. Automatic Database Trigger: When a referred user is marked as paid, credit referral reward immediately
DROP TRIGGER IF EXISTS trg_credit_referral_on_paid ON public.user_profiles;
DROP FUNCTION IF EXISTS public.trigger_credit_referral_on_paid() CASCADE;

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

    -- Insert into referral_rewards with idempotency
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
    )
    ON CONFLICT (payment_reference) DO NOTHING;

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credit_referral_on_paid ON public.user_profiles;
CREATE TRIGGER trg_credit_referral_on_paid
  AFTER INSERT OR UPDATE OF has_paid, subscription_status, paystack_reference ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_credit_referral_on_paid();
