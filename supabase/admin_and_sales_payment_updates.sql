-- ==============================================================================
-- PONDTORA SYSTEM UPDATE: Sales Payment Tracking, Audit Notes & Full Admin Farm Records
-- Run this script in your Supabase Project:
-- Supabase Dashboard -> SQL Editor -> New Query -> Paste & Click 'Run'
-- ==============================================================================

-- 1. Ensure `sales_calculation_payments` has all required fields for partial payments & audit
DO $$
BEGIN
  -- Add notes column for audit trail reasons / payment notes if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales_calculation_payments' AND column_name = 'notes'
  ) THEN
    ALTER TABLE sales_calculation_payments ADD COLUMN notes TEXT NULL;
  END IF;

  -- Add payment_date column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales_calculation_payments' AND column_name = 'payment_date'
  ) THEN
    ALTER TABLE sales_calculation_payments ADD COLUMN payment_date TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Add recorded_by column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales_calculation_payments' AND column_name = 'recorded_by'
  ) THEN
    ALTER TABLE sales_calculation_payments ADD COLUMN recorded_by TEXT NULL;
  END IF;

  -- Add user_id column if missing (for direct indexing/isolation)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales_calculation_payments' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE sales_calculation_payments ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Indexes for fast payment history and date queries
CREATE INDEX IF NOT EXISTS idx_sales_calc_payments_calc_id ON sales_calculation_payments(calculation_id);
CREATE INDEX IF NOT EXISTS idx_sales_calc_payments_date ON sales_calculation_payments(payment_date);

-- 3. Ensure Row Level Security (RLS) is enabled and grants proper permissions
ALTER TABLE IF EXISTS sales_calculation_payments ENABLE ROW LEVEL SECURITY;

-- Allow users to view payments related to calculations they own, or if admin
DROP POLICY IF EXISTS "sales_calc_payments_select" ON sales_calculation_payments;
CREATE POLICY "sales_calc_payments_select" ON sales_calculation_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sales_calculations sc
      WHERE sc.id = sales_calculation_payments.calculation_id
        AND (sc.user_id = auth.uid() OR auth.jwt() ->> 'email' IN ('admin@pondtora.com', 'pondtora.site@gmail.com') OR auth.jwt() ->> 'role' = 'service_role')
    )
  );

-- Allow users to record payments against their calculations
DROP POLICY IF EXISTS "sales_calc_payments_insert" ON sales_calculation_payments;
CREATE POLICY "sales_calc_payments_insert" ON sales_calculation_payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales_calculations sc
      WHERE sc.id = sales_calculation_payments.calculation_id
        AND (sc.user_id = auth.uid() OR auth.jwt() ->> 'email' IN ('admin@pondtora.com', 'pondtora.site@gmail.com') OR auth.jwt() ->> 'role' = 'service_role')
    )
  );

-- Allow users to update payments on their calculations
DROP POLICY IF EXISTS "sales_calc_payments_update" ON sales_calculation_payments;
CREATE POLICY "sales_calc_payments_update" ON sales_calculation_payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sales_calculations sc
      WHERE sc.id = sales_calculation_payments.calculation_id
        AND (sc.user_id = auth.uid() OR auth.jwt() ->> 'email' IN ('admin@pondtora.com', 'pondtora.site@gmail.com') OR auth.jwt() ->> 'role' = 'service_role')
    )
  );

-- Allow users to delete payments on their calculations (e.g. status correction to Unpaid)
DROP POLICY IF EXISTS "sales_calc_payments_delete" ON sales_calculation_payments;
CREATE POLICY "sales_calc_payments_delete" ON sales_calculation_payments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sales_calculations sc
      WHERE sc.id = sales_calculation_payments.calculation_id
        AND (sc.user_id = auth.uid() OR auth.jwt() ->> 'email' IN ('admin@pondtora.com', 'pondtora.site@gmail.com') OR auth.jwt() ->> 'role' = 'service_role')
    )
  );

-- 4. Create an RPC function for Admin User Details to fetch comprehensive lifetime farm data without limits
CREATE OR REPLACE FUNCTION get_user_full_records_for_admin(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Build comprehensive JSON of all farm modules without row truncation
  SELECT jsonb_build_object(
    'farms', COALESCE((SELECT jsonb_agg(f) FROM (SELECT * FROM farms WHERE user_id = p_user_id ORDER BY created_at ASC) f), '[]'::jsonb),
    'ponds', COALESCE((SELECT jsonb_agg(p) FROM (SELECT * FROM ponds WHERE user_id = p_user_id ORDER BY created_at DESC) p), '[]'::jsonb),
    'stock_events', COALESCE((SELECT jsonb_agg(se) FROM (SELECT * FROM stock_events WHERE user_id = p_user_id ORDER BY event_date DESC) se), '[]'::jsonb),
    'feed_inventory', COALESCE((SELECT jsonb_agg(fi) FROM (SELECT * FROM feed_inventory WHERE user_id = p_user_id ORDER BY created_at DESC) fi), '[]'::jsonb),
    'feeding_records', COALESCE((SELECT jsonb_agg(fr) FROM (SELECT * FROM feeding_records WHERE user_id = p_user_id ORDER BY date DESC) fr), '[]'::jsonb),
    'bag_open_logs', COALESCE((SELECT jsonb_agg(bol) FROM (SELECT * FROM bag_open_logs WHERE user_id = p_user_id ORDER BY date DESC) bol), '[]'::jsonb),
    'feed_remaining_logs', COALESCE((SELECT jsonb_agg(frl) FROM (SELECT * FROM feed_remaining_logs WHERE user_id = p_user_id ORDER BY date DESC) frl), '[]'::jsonb),
    'sales_calculations', COALESCE((SELECT jsonb_agg(sc) FROM (SELECT * FROM sales_calculations WHERE user_id = p_user_id ORDER BY created_at DESC) sc), '[]'::jsonb),
    'sales_payments', COALESCE((
      SELECT jsonb_agg(scp) 
      FROM (
        SELECT scp.* 
        FROM sales_calculation_payments scp
        JOIN sales_calculations sc ON sc.id = scp.calculation_id
        WHERE sc.user_id = p_user_id
        ORDER BY scp.payment_date DESC
      ) scp
    ), '[]'::jsonb),
    'revenues', COALESCE((SELECT jsonb_agg(r) FROM (SELECT * FROM revenues WHERE user_id = p_user_id ORDER BY date DESC) r), '[]'::jsonb),
    'expenses', COALESCE((SELECT jsonb_agg(e) FROM (SELECT * FROM expenses WHERE user_id = p_user_id ORDER BY date DESC) e), '[]'::jsonb),
    'invoices', COALESCE((SELECT jsonb_agg(inv) FROM (SELECT * FROM invoices WHERE user_id = p_user_id ORDER BY created_at DESC) inv), '[]'::jsonb),
    'treatment_records', COALESCE((SELECT jsonb_agg(tr) FROM (SELECT * FROM treatment_records WHERE user_id = p_user_id ORDER BY date DESC) tr), '[]'::jsonb),
    'pond_reports', COALESCE((SELECT jsonb_agg(pr) FROM (SELECT * FROM pond_reports WHERE user_id = p_user_id ORDER BY report_date DESC) pr), '[]'::jsonb),
    'farm_equipment', COALESCE((SELECT jsonb_agg(eq) FROM (SELECT * FROM farm_equipment WHERE user_id = p_user_id ORDER BY created_at DESC) eq), '[]'::jsonb),
    'staff_members', COALESCE((SELECT jsonb_agg(sm) FROM (SELECT * FROM staff_members WHERE user_id = p_user_id ORDER BY created_at DESC) sm), '[]'::jsonb),
    'investors', COALESCE((SELECT jsonb_agg(i) FROM (SELECT * FROM investors WHERE user_id = p_user_id ORDER BY created_at DESC) i), '[]'::jsonb),
    'investments', COALESCE((SELECT jsonb_agg(invm) FROM (SELECT * FROM investments WHERE user_id = p_user_id ORDER BY created_at DESC) invm), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execution permission to authenticated users (admin checks are handled inside UI & RLS)
GRANT EXECUTE ON FUNCTION get_user_full_records_for_admin(UUID) TO authenticated, service_role;
