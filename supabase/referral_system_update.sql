-- ============================================================================
-- Pondtora Referral System & Instant Reflection Migration
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/fegtvgfkxueorybefthj/sql/new
-- ============================================================================

-- 1. Ensure user_profiles columns exist
ALTER TABLE IF EXISTS user_profiles
  ADD COLUMN IF NOT EXISTS referred_by TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS referral_code TEXT DEFAULT NULL;

-- 2. Indexes for instant lookup
CREATE INDEX IF NOT EXISTS idx_user_profiles_referred_by ON user_profiles (referred_by);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON user_profiles (referral_code);

-- 3. Referral rewards ledger table
CREATE TABLE IF NOT EXISTS referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_code TEXT NOT NULL,
  referrer_email TEXT NOT NULL,
  referred_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  referred_user_email TEXT NOT NULL,
  referred_user_name TEXT DEFAULT '',
  payment_reference TEXT DEFAULT '',
  plan_name TEXT NOT NULL,
  payment_amount NUMERIC NOT NULL DEFAULT 0,
  payment_type TEXT NOT NULL DEFAULT 'first', -- 'first' (30%) or 'recurring' (10%)
  commission_rate NUMERIC NOT NULL DEFAULT 0.30,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Available', -- 'Available' or 'Paid'
  paid_date TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer_code ON referral_rewards (referrer_code);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer_email ON referral_rewards (referrer_email);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referred_email ON referral_rewards (referred_user_email);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_status ON referral_rewards (status);

-- 4. Enable RLS on referral_rewards
ALTER TABLE IF EXISTS referral_rewards ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users and anon to select and insert referral rewards
DROP POLICY IF EXISTS "Allow select referral_rewards" ON referral_rewards;
CREATE POLICY "Allow select referral_rewards" ON referral_rewards
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert referral_rewards" ON referral_rewards;
CREATE POLICY "Allow insert referral_rewards" ON referral_rewards
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update referral_rewards" ON referral_rewards;
CREATE POLICY "Allow update referral_rewards" ON referral_rewards
  FOR UPDATE USING (true);

-- 5. RPC function: get_user_referrals
-- SECURITY DEFINER allows a user to query profiles they referred without being blocked by RLS
CREATE OR REPLACE FUNCTION get_user_referrals(
  p_referrer_code TEXT,
  p_referrer_email TEXT
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  farm_name TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ,
  active_plan TEXT,
  billing_frequency TEXT,
  subscription_status TEXT,
  subscription_amount NUMERIC,
  trial_start_date TIMESTAMPTZ,
  last_payment_date TIMESTAMPTZ,
  paystack_reference TEXT,
  subscription_expiry TIMESTAMPTZ,
  referred_by TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  clean_code TEXT := UPPER(TRIM(COALESCE(p_referrer_code, '')));
  clean_email TEXT := LOWER(TRIM(COALESCE(p_referrer_email, '')));
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.email,
    p.farm_name,
    p.city,
    p.state,
    p.country,
    p.phone,
    p.created_at,
    p.active_plan,
    p.billing_frequency,
    p.status AS subscription_status,
    p.subscription_amount,
    p.trial_start_date,
    p.last_payment_date,
    p.paystack_reference,
    p.subscription_expiry,
    p.referred_by
  FROM user_profiles p
  WHERE (
    (clean_code <> '' AND UPPER(TRIM(COALESCE(p.referred_by, ''))) = clean_code)
    OR (clean_email <> '' AND LOWER(TRIM(COALESCE(p.referred_by, ''))) = clean_email)
  )
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION get_user_referrals(TEXT, TEXT) TO authenticated, anon;

-- 6. RPC function: get_user_referral_rewards
CREATE OR REPLACE FUNCTION get_user_referral_rewards(
  p_referrer_code TEXT,
  p_referrer_email TEXT
)
RETURNS SETOF referral_rewards
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  clean_code TEXT := UPPER(TRIM(COALESCE(p_referrer_code, '')));
  clean_email TEXT := LOWER(TRIM(COALESCE(p_referrer_email, '')));
BEGIN
  RETURN QUERY
  SELECT *
  FROM referral_rewards
  WHERE (
    (clean_code <> '' AND UPPER(TRIM(referrer_code)) = clean_code)
    OR (clean_email <> '' AND LOWER(TRIM(referrer_email)) = clean_email)
  )
  ORDER BY created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_referral_rewards(TEXT, TEXT) TO authenticated, anon;

-- 7. RPC function: clear_user_referral_balance
CREATE OR REPLACE FUNCTION clear_user_referral_balance(
  p_referrer_code TEXT,
  p_referrer_email TEXT
)
RETURNS TABLE (
  cleared_count INT,
  cleared_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  clean_code TEXT := UPPER(TRIM(COALESCE(p_referrer_code, '')));
  clean_email TEXT := LOWER(TRIM(COALESCE(p_referrer_email, '')));
  v_count INT := 0;
  v_amount NUMERIC := 0;
BEGIN
  -- Sum available amount
  SELECT COALESCE(SUM(commission_amount), 0), COUNT(*)
  INTO v_amount, v_count
  FROM referral_rewards
  WHERE status = 'Available'
    AND (
      (clean_code <> '' AND UPPER(TRIM(referrer_code)) = clean_code)
      OR (clean_email <> '' AND LOWER(TRIM(referrer_email)) = clean_email)
    );

  -- Update status to Paid
  IF v_count > 0 THEN
    UPDATE referral_rewards
    SET status = 'Paid',
        paid_date = NOW(),
        updated_at = NOW()
    WHERE status = 'Available'
      AND (
        (clean_code <> '' AND UPPER(TRIM(referrer_code)) = clean_code)
        OR (clean_email <> '' AND LOWER(TRIM(referrer_email)) = clean_email)
      );
  END IF;

  RETURN QUERY SELECT v_count, v_amount;
END;
$$;

GRANT EXECUTE ON FUNCTION clear_user_referral_balance(TEXT, TEXT) TO authenticated, anon;
