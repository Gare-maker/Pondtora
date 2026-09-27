-- Pondtora Referral System Migration
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/fegtvgfkxueorybefthj/sql/new

ALTER TABLE IF EXISTS user_profiles
  ADD COLUMN IF NOT EXISTS referred_by TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS referral_code TEXT DEFAULT NULL;

-- Index on referred_by and referral_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_referred_by ON user_profiles (referred_by);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON user_profiles (referral_code);

-- Optional referral rewards ledger table for recording payments & payouts
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
