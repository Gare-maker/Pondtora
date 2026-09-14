-- ══════════════════════════════════════════════════════════════════════════════
-- Pondtora: Investor Management & Pond-Based Reports Migration
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql/new
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Investors Table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Investments Table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  investor_id UUID REFERENCES investors(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  pond_id UUID REFERENCES ponds(id) ON DELETE SET NULL,
  fish_stock_id TEXT,
  amount_invested NUMERIC NOT NULL DEFAULT 0,
  investor_percentage NUMERIC NOT NULL DEFAULT 0,
  expected_return NUMERIC NOT NULL DEFAULT 0,
  total_amount_due NUMERIC NOT NULL DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  payment_type TEXT NOT NULL DEFAULT 'one-time', -- 'one-time' | 'recurring'
  payment_frequency TEXT,                        -- 'Monthly' | 'Quarterly' | 'Annually' | 'Custom'
  custom_frequency_desc TEXT,
  status TEXT NOT NULL DEFAULT 'Active',          -- 'Active' | 'Paid' | 'Overdue' | 'Completed'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Investment Payments Table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS investment_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  payment_date DATE,
  payment_period TEXT NOT NULL,
  amount_due NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'Bank Transfer',
  status TEXT NOT NULL DEFAULT 'Pending',         -- 'Pending' | 'Partial' | 'Paid' | 'Overdue'
  notes TEXT,
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. Pond Reports Table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pond_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  pond_id UUID REFERENCES ponds(id) ON DELETE CASCADE,
  fish_stock_id TEXT NOT NULL,
  report_type TEXT NOT NULL,                      -- 'treatment' | 'other_issue'
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  issue TEXT,
  description TEXT,
  action_taken TEXT,
  notes TEXT,
  treatment_id UUID REFERENCES treatment_records(id) ON DELETE SET NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_investors_user_id ON investors(user_id);
CREATE INDEX IF NOT EXISTS idx_investors_farm_id ON investors(farm_id);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_investor_id ON investments(investor_id);
CREATE INDEX IF NOT EXISTS idx_investments_farm_id ON investments(farm_id);
CREATE INDEX IF NOT EXISTS idx_investments_pond_id ON investments(pond_id);
CREATE INDEX IF NOT EXISTS idx_investment_payments_user_id ON investment_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_payments_inv_id ON investment_payments(investment_id);
CREATE INDEX IF NOT EXISTS idx_pond_reports_user_id ON pond_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_pond_reports_farm_id ON pond_reports(farm_id);
CREATE INDEX IF NOT EXISTS idx_pond_reports_pond_stock ON pond_reports(pond_id, fish_stock_id);

-- ── Enable Row Level Security (RLS) ───────────────────────────────────────────
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pond_reports ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies ──────────────────────────────────────────────────────────────

-- Investors: Owner full access OR staff assigned to farm OR platform admin
DROP POLICY IF EXISTS "farm_investors" ON investors;
CREATE POLICY "farm_investors" ON investors
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin())
  WITH CHECK (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin());

-- Investments: Owner full access OR staff assigned to farm OR platform admin
DROP POLICY IF EXISTS "farm_investments" ON investments;
CREATE POLICY "farm_investments" ON investments
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin())
  WITH CHECK (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin());

-- Investment Payments: Owner full access OR staff access via investment farm OR admin
DROP POLICY IF EXISTS "farm_investment_payments" ON investment_payments;
CREATE POLICY "farm_investment_payments" ON investment_payments
  USING (
    auth.uid() = user_id OR is_admin() OR
    EXISTS (
      SELECT 1 FROM investments i
      WHERE i.id = investment_payments.investment_id
        AND (i.user_id = auth.uid() OR user_can_access_farm(i.farm_id))
    )
  )
  WITH CHECK (
    auth.uid() = user_id OR is_admin() OR
    EXISTS (
      SELECT 1 FROM investments i
      WHERE i.id = investment_payments.investment_id
        AND (i.user_id = auth.uid() OR user_can_access_farm(i.farm_id))
    )
  );

-- Pond Reports: Owner full access OR staff assigned to farm OR platform admin
DROP POLICY IF EXISTS "farm_pond_reports" ON pond_reports;
CREATE POLICY "farm_pond_reports" ON pond_reports
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin())
  WITH CHECK (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin());
