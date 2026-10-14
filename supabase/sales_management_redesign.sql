-- ==============================================================================
-- Pondtora: Sales Management Redesign & Supabase Database Migration
-- Complete, self-contained, idempotent SQL migration for Sales Calculations, Items, and Payments
-- ==============================================================================

-- 1. Helper Security Functions (Self-contained to ensure seamless execution on any Supabase project)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin')
      OR (auth.jwt() ->> 'email' = 'edafejesugarec@gmail.com');
$$;

CREATE OR REPLACE FUNCTION user_can_access_owner_data(p_user_id UUID, p_farm_id UUID DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  -- 1. Direct owner match or platform admin
  IF is_admin() THEN
    RETURN TRUE;
  END IF;

  IF p_user_id IS NOT NULL AND auth.uid() = p_user_id THEN
    RETURN TRUE;
  END IF;

  -- 2. Farm-level access for farm owner
  IF p_farm_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM farms WHERE id = p_farm_id AND user_id = auth.uid()) THEN
      RETURN TRUE;
    END IF;

    -- 3. Farm-level access for assigned staff members
    IF EXISTS (
      SELECT 1 FROM staff_members sm
      JOIN staff_farm_assignments sfa ON sfa.staff_id = sm.id
      WHERE (
        sm.staff_auth_id = auth.uid()
        OR sm.user_id = auth.uid()
        OR LOWER(sm.email) = LOWER(COALESCE(auth.jwt()->>'email', ''))
      )
      AND sfa.farm_id = p_farm_id
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- 4. Check general staff-to-owner relationship
  IF p_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM staff_members sm
    WHERE (sm.staff_auth_id = auth.uid() OR LOWER(sm.email) = LOWER(COALESCE(auth.jwt()->>'email', '')))
      AND sm.user_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION user_can_access_record(p_user_id UUID, p_farm_id UUID DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT user_can_access_owner_data(p_user_id, p_farm_id);
$$;

-- 2. Table: sales_calculations
CREATE TABLE IF NOT EXISTS sales_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NULL,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  general_discount_type TEXT NULL,
  general_discount_value NUMERIC DEFAULT 0,
  general_discount_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'Unpaid',
  items JSONB DEFAULT '[]'::jsonb,
  created_by TEXT NULL,
  created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table was partially created
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_calculations' AND column_name = 'customer_phone') THEN
    ALTER TABLE sales_calculations ADD COLUMN customer_phone TEXT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_calculations' AND column_name = 'items') THEN
    ALTER TABLE sales_calculations ADD COLUMN items JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_calculations' AND column_name = 'created_by') THEN
    ALTER TABLE sales_calculations ADD COLUMN created_by TEXT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_calculations' AND column_name = 'created_by_id') THEN
    ALTER TABLE sales_calculations ADD COLUMN created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Table: sales_calculation_items (Relational snapshot for historical preservation)
CREATE TABLE IF NOT EXISTS sales_calculation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculation_id UUID NOT NULL REFERENCES sales_calculations(id) ON DELETE CASCADE,
  price_group_id UUID NULL REFERENCES price_groups(id) ON DELETE SET NULL,
  price_group_name TEXT NULL,
  price_group_code TEXT NULL,
  quantity_kg NUMERIC NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  individual_discount_type TEXT NULL,
  individual_discount_value NUMERIC DEFAULT 0,
  individual_discount_amount NUMERIC DEFAULT 0,
  final_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table: sales_calculation_payments (Audit trail of payments against calculations)
CREATE TABLE IF NOT EXISTS sales_calculation_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculation_id UUID NOT NULL REFERENCES sales_calculations(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'Cash',
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  recorded_by TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Indexes for high performance queries and date filtering
CREATE INDEX IF NOT EXISTS idx_sales_calculations_user_id ON sales_calculations(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_calculations_farm_id ON sales_calculations(farm_id);
CREATE INDEX IF NOT EXISTS idx_sales_calculations_created_at ON sales_calculations(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_calculations_payment_status ON sales_calculations(payment_status);
CREATE INDEX IF NOT EXISTS idx_sales_calc_items_calc_id ON sales_calculation_items(calculation_id);
CREATE INDEX IF NOT EXISTS idx_sales_calc_items_price_group_id ON sales_calculation_items(price_group_id);
CREATE INDEX IF NOT EXISTS idx_sales_calc_payments_calc_id ON sales_calculation_payments(calculation_id);

-- 6. Enable Row Level Security
ALTER TABLE sales_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_calculation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_calculation_payments ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies on sales_calculations
DROP POLICY IF EXISTS "sales_calculations_select" ON sales_calculations;
CREATE POLICY "sales_calculations_select" ON sales_calculations
  FOR SELECT USING (user_can_access_owner_data(user_id, farm_id));

DROP POLICY IF EXISTS "sales_calculations_insert" ON sales_calculations;
CREATE POLICY "sales_calculations_insert" ON sales_calculations
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_can_access_owner_data(user_id, farm_id));

DROP POLICY IF EXISTS "sales_calculations_update" ON sales_calculations;
CREATE POLICY "sales_calculations_update" ON sales_calculations
  FOR UPDATE USING (user_can_access_owner_data(user_id, farm_id));

DROP POLICY IF EXISTS "sales_calculations_delete" ON sales_calculations;
CREATE POLICY "sales_calculations_delete" ON sales_calculations
  FOR DELETE USING (user_can_access_owner_data(user_id, farm_id));

-- 8. RLS Policies on sales_calculation_items
DROP POLICY IF EXISTS "sales_calc_items_select" ON sales_calculation_items;
CREATE POLICY "sales_calc_items_select" ON sales_calculation_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sales_calculations sc
      WHERE sc.id = sales_calculation_items.calculation_id
        AND user_can_access_owner_data(sc.user_id, sc.farm_id)
    )
  );

DROP POLICY IF EXISTS "sales_calc_items_insert" ON sales_calculation_items;
CREATE POLICY "sales_calc_items_insert" ON sales_calculation_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales_calculations sc
      WHERE sc.id = sales_calculation_items.calculation_id
        AND (sc.user_id = auth.uid() OR user_can_access_owner_data(sc.user_id, sc.farm_id))
    )
  );

DROP POLICY IF EXISTS "sales_calc_items_update" ON sales_calculation_items;
CREATE POLICY "sales_calc_items_update" ON sales_calculation_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sales_calculations sc
      WHERE sc.id = sales_calculation_items.calculation_id
        AND user_can_access_owner_data(sc.user_id, sc.farm_id)
    )
  );

DROP POLICY IF EXISTS "sales_calc_items_delete" ON sales_calculation_items;
CREATE POLICY "sales_calc_items_delete" ON sales_calculation_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sales_calculations sc
      WHERE sc.id = sales_calculation_items.calculation_id
        AND user_can_access_owner_data(sc.user_id, sc.farm_id)
    )
  );

-- 9. RLS Policies on sales_calculation_payments
DROP POLICY IF EXISTS "sales_calc_payments_select" ON sales_calculation_payments;
CREATE POLICY "sales_calc_payments_select" ON sales_calculation_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sales_calculations sc
      WHERE sc.id = sales_calculation_payments.calculation_id
        AND user_can_access_owner_data(sc.user_id, sc.farm_id)
    )
  );

DROP POLICY IF EXISTS "sales_calc_payments_insert" ON sales_calculation_payments;
CREATE POLICY "sales_calc_payments_insert" ON sales_calculation_payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales_calculations sc
      WHERE sc.id = sales_calculation_payments.calculation_id
        AND (sc.user_id = auth.uid() OR user_can_access_owner_data(sc.user_id, sc.farm_id))
    )
  );

DROP POLICY IF EXISTS "sales_calc_payments_update" ON sales_calculation_payments;
CREATE POLICY "sales_calc_payments_update" ON sales_calculation_payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sales_calculations sc
      WHERE sc.id = sales_calculation_payments.calculation_id
        AND user_can_access_owner_data(sc.user_id, sc.farm_id)
    )
  );

DROP POLICY IF EXISTS "sales_calc_payments_delete" ON sales_calculation_payments;
CREATE POLICY "sales_calc_payments_delete" ON sales_calculation_payments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sales_calculations sc
      WHERE sc.id = sales_calculation_payments.calculation_id
        AND user_can_access_owner_data(sc.user_id, sc.farm_id)
    )
  );
