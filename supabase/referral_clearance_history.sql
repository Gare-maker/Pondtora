-- ============================================================================
-- Pondtora Referral Clearance History & Payout Settlement Migration
-- ============================================================================

-- 1. Create referral_payouts ledger table for tracking cleared balances
CREATE TABLE IF NOT EXISTS public.referral_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID DEFAULT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT DEFAULT '',
  referral_code TEXT DEFAULT '',
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  cleared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cleared_by TEXT DEFAULT 'Admin',
  payment_method TEXT DEFAULT 'Bank Transfer',
  notes TEXT DEFAULT 'Settled referral balance payout',
  status TEXT NOT NULL DEFAULT 'Paid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Performance indexes for instant lookup
CREATE INDEX IF NOT EXISTS idx_referral_payouts_user_email ON public.referral_payouts (LOWER(TRIM(user_email)));
CREATE INDEX IF NOT EXISTS idx_referral_payouts_referral_code ON public.referral_payouts (UPPER(TRIM(referral_code)));
CREATE INDEX IF NOT EXISTS idx_referral_payouts_user_id ON public.referral_payouts (user_id);
CREATE INDEX IF NOT EXISTS idx_referral_payouts_cleared_at ON public.referral_payouts (cleared_at DESC);

-- 3. Enable RLS with safe access policies
ALTER TABLE IF EXISTS public.referral_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select referral_payouts" ON public.referral_payouts;
CREATE POLICY "Public select referral_payouts" ON public.referral_payouts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert referral_payouts" ON public.referral_payouts;
CREATE POLICY "Public insert referral_payouts" ON public.referral_payouts
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update referral_payouts" ON public.referral_payouts;
CREATE POLICY "Public update referral_payouts" ON public.referral_payouts
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public delete referral_payouts" ON public.referral_payouts;
CREATE POLICY "Public delete referral_payouts" ON public.referral_payouts
  FOR DELETE USING (true);

-- 4. RPC function: clear_user_referral_balance (Enhanced with payout recording)
CREATE OR REPLACE FUNCTION clear_user_referral_balance(
  p_referrer_code TEXT,
  p_referrer_email TEXT,
  p_user_id TEXT DEFAULT NULL,
  p_user_name TEXT DEFAULT '',
  p_amount NUMERIC DEFAULT NULL,
  p_cleared_by TEXT DEFAULT 'Admin',
  p_notes TEXT DEFAULT 'Settled referral balance payout'
)
RETURNS TABLE (
  cleared_count INT,
  cleared_amount NUMERIC,
  payout_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  clean_code TEXT := UPPER(TRIM(COALESCE(p_referrer_code, '')));
  clean_email TEXT := LOWER(TRIM(COALESCE(p_referrer_email, '')));
  v_count INT := 0;
  v_amount NUMERIC := 0;
  v_payout_id UUID := gen_random_uuid();
  v_target_user_id UUID := NULL;
BEGIN
  IF clean_code = '' AND clean_email = '' THEN
    RETURN QUERY SELECT 0, 0::NUMERIC, NULL::UUID;
    RETURN;
  END IF;

  -- Safe cast of p_user_id if valid UUID
  IF p_user_id IS NOT NULL AND p_user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    v_target_user_id := p_user_id::UUID;
  END IF;

  -- 1. Check if referral_rewards table exists and sum available amounts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referral_rewards') THEN
    SELECT COALESCE(SUM(commission_amount), 0), COUNT(*)
    INTO v_amount, v_count
    FROM public.referral_rewards
    WHERE status = 'Available'
      AND (
        (clean_code <> '' AND UPPER(TRIM(referrer_code)) = clean_code)
        OR (clean_email <> '' AND LOWER(TRIM(referrer_email)) = clean_email)
      );

    -- Mark matching available rewards as Paid
    IF v_count > 0 THEN
      UPDATE public.referral_rewards
      SET status = 'Paid',
          paid_date = NOW(),
          updated_at = NOW()
      WHERE status = 'Available'
        AND (
          (clean_code <> '' AND UPPER(TRIM(referrer_code)) = clean_code)
          OR (clean_email <> '' AND LOWER(TRIM(referrer_email)) = clean_email)
        );
    END IF;
  END IF;

  -- 2. If explicit amount passed from client, respect the explicit amount
  IF p_amount IS NOT NULL AND p_amount > 0 THEN
    v_amount := p_amount;
  END IF;

  -- 3. Record payout in referral_payouts table if amount > 0
  IF v_amount > 0 THEN
    INSERT INTO public.referral_payouts (
      id,
      user_id,
      user_email,
      user_name,
      referral_code,
      amount,
      cleared_at,
      cleared_by,
      payment_method,
      notes,
      status
    ) VALUES (
      v_payout_id,
      v_target_user_id,
      clean_email,
      COALESCE(p_user_name, ''),
      clean_code,
      v_amount,
      NOW(),
      COALESCE(p_cleared_by, 'Admin'),
      'Bank Transfer',
      COALESCE(p_notes, 'Settled referral balance payout'),
      'Paid'
    );
  ELSE
    v_payout_id := NULL;
  END IF;

  RETURN QUERY SELECT v_count, v_amount, v_payout_id;
END;
$$;

GRANT EXECUTE ON FUNCTION clear_user_referral_balance(TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT) TO authenticated, anon;

-- 5. RPC function: get_user_referral_payouts
CREATE OR REPLACE FUNCTION get_user_referral_payouts(
  p_referrer_code TEXT,
  p_referrer_email TEXT
)
RETURNS SETOF public.referral_payouts
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  clean_code TEXT := UPPER(TRIM(COALESCE(p_referrer_code, '')));
  clean_email TEXT := LOWER(TRIM(COALESCE(p_referrer_email, '')));
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.referral_payouts
  WHERE (clean_code <> '' AND UPPER(TRIM(referral_code)) = clean_code)
     OR (clean_email <> '' AND LOWER(TRIM(user_email)) = clean_email)
  ORDER BY cleared_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_referral_payouts(TEXT, TEXT) TO authenticated, anon;
