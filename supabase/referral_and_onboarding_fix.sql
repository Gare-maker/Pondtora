-- ============================================================================
-- Pondtora: Referral Tracking & Onboarding Plan Persistence Fix
-- ============================================================================

-- 1. Ensure user_profiles has onboarding_completed and has_paid columns
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
  ADD COLUMN IF NOT EXISTS paystack_reference TEXT DEFAULT NULL;

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS last_payment_date TEXT DEFAULT NULL;

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

-- Ensure strict idempotency: each payment reference can only produce ONE commission reward
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
