-- ==============================================================================
-- PONDTORA: Clear All Payment & Referral Commission Data (Preserve Tables & Users)
-- ==============================================================================
-- Purpose:
-- 1. Clears all referral commission records from referral_rewards table.
-- 2. Resets all fake/unverified payment and transaction references in user_profiles.
-- 3. Resets subscription payment metadata in platform_settings.
-- 4. KEEPS all tables, schemas, RLS policies, user accounts, farms, ponds, and
--    operational records 100% intact.
--
-- Instructions:
-- 1. Open your Supabase SQL Editor:
--    https://supabase.com/dashboard/project/fegtvgfkxueorybefthj/sql/new
-- 2. Paste this entire script and click "Run" (or Ctrl + Enter).
-- ==============================================================================

BEGIN;

-- 1. Clear all referral commission reward ledger records (table remains intact)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'referral_rewards') THEN
    DELETE FROM public.referral_rewards;
    RAISE NOTICE 'Cleared all records from public.referral_rewards table.';
  END IF;
END $$;

-- 2. Reset payment and transaction fields in user_profiles
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    -- Reset payment columns while preserving user profile, identity, farm, and account
    UPDATE public.user_profiles
    SET
      paystack_reference = NULL,
      last_payment_date = NULL,
      subscription_amount = NULL,
      subscription_start = NULL,
      subscription_expiry = NULL,
      subscription_status = CASE
        WHEN role IN ('admin', 'superadmin') OR free_access = true THEN 'Active'
        ELSE 'Trial'
      END,
      billing_frequency = 'monthly',
      updated_at = NOW()
    WHERE paystack_reference IS NOT NULL 
       OR last_payment_date IS NOT NULL 
       OR subscription_amount IS NOT NULL
       OR subscription_status = 'Active' AND (role NOT IN ('admin', 'superadmin') AND COALESCE(free_access, false) = false);

    -- Clean JSONB raw_data if column exists
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'raw_data'
    ) THEN
      UPDATE public.user_profiles
      SET raw_data = raw_data - 'paystack_reference' - 'paystackReference' - 'last_payment_date' - 'lastPaymentDate' - 'has_paid' - 'hasPaid' - 'subscription_amount' - 'subscriptionAmount'
      WHERE raw_data IS NOT NULL;
    END IF;

    RAISE NOTICE 'Reset payment and subscription transaction fields in public.user_profiles.';
  END IF;
END $$;

-- 3. Clear payment transaction caches and activity logs from platform_settings
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_settings') THEN
    -- Clear referral reward ledger from platform_settings
    DELETE FROM public.platform_settings WHERE key = 'admin_referral_rewards';

    -- Clear payment logs from admin activity log if present
    UPDATE public.platform_settings
    SET value = jsonb_strip_nulls((
      SELECT jsonb_agg(elem)
      FROM jsonb_array_elements(value) elem
      WHERE elem->>'category' NOT IN ('payment', 'subscription_payment')
        AND elem->>'action' NOT ILIKE '%payment%'
        AND elem->>'action' NOT ILIKE '%subscribed%'
    ))
    WHERE key = 'admin_activity_log' AND jsonb_typeof(value) = 'array';

    -- Reset admin user overrides to clear cached payment flags
    UPDATE public.platform_settings
    SET value = '{}'::jsonb
    WHERE key = 'admin_user_overrides';

    RAISE NOTICE 'Reset payment-related platform_settings records.';
  END IF;
END $$;

COMMIT;

-- Verification query
SELECT 
  (SELECT COUNT(*) FROM referral_rewards) AS remaining_referral_rewards,
  (SELECT COUNT(*) FROM user_profiles WHERE paystack_reference IS NOT NULL) AS profiles_with_paystack_ref,
  (SELECT COUNT(*) FROM user_profiles WHERE last_payment_date IS NOT NULL) AS profiles_with_payment_date;
