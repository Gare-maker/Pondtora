-- ══════════════════════════════════════════════════════════════════════════════
-- Pondtora: User Data Isolation, Farm Ownership, Staff Report Protection,
--           and Functional Permissions Migration
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/fegtvgfkxueorybefthj/sql/new
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Helper Security Functions ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin' OR email = 'edafejesugarec@gmail.com')
  ) OR (
    COALESCE(auth.jwt() ->> 'email', '') = 'edafejesugarec@gmail.com'
  );
END;
$$;

-- Function: Checks if current user is the owner of a farm
CREATE OR REPLACE FUNCTION user_owns_farm(p_farm_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  IF p_farm_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM farms f WHERE f.id = p_farm_id AND f.user_id = auth.uid()
  ) OR is_admin();
END;
$$;

-- Function: Checks if staff member has explicit assignment to a farm
CREATE OR REPLACE FUNCTION staff_has_farm_assignment(p_farm_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  IF p_farm_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM staff_members sm
    WHERE (sm.staff_auth_id = auth.uid() OR LOWER(sm.email) = LOWER(COALESCE(auth.jwt()->>'email', '')))
      AND (
        EXISTS (
          SELECT 1 FROM staff_farm_assignments sfa
          WHERE sfa.staff_id = sm.id AND sfa.farm_id = p_farm_id
        )
        OR (sm.farms IS NOT NULL AND sm.farms::text LIKE '%' || p_farm_id::text || '%')
      )
  ) OR is_admin();
END;
$$;

-- Function: Universal farm access check (Owner, Assigned Staff, or Admin)
-- Staff with NO assigned farms cannot access any farm.
CREATE OR REPLACE FUNCTION user_can_access_farm(p_farm_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  IF p_farm_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN user_owns_farm(p_farm_id) OR staff_has_farm_assignment(p_farm_id) OR is_admin();
END;
$$;

-- ── 2. Add Review, Author & farm_id Columns ───────────────────────────────────
ALTER TABLE IF EXISTS reports
  ADD COLUMN IF NOT EXISTS created_by_id UUID,
  ADD COLUMN IF NOT EXISTS created_by_role TEXT DEFAULT 'owner',
  ADD COLUMN IF NOT EXISTS is_staff_submission BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_review_note TEXT,
  ADD COLUMN IF NOT EXISTS admin_review_status TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS pond_reports
  ADD COLUMN IF NOT EXISTS created_by_id UUID,
  ADD COLUMN IF NOT EXISTS created_by_role TEXT DEFAULT 'owner',
  ADD COLUMN IF NOT EXISTS is_staff_submission BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_review_note TEXT,
  ADD COLUMN IF NOT EXISTS admin_review_status TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Ensure investment_payments has farm_id column
ALTER TABLE IF EXISTS investment_payments
  ADD COLUMN IF NOT EXISTS farm_id UUID REFERENCES farms(id) ON DELETE CASCADE;

-- Backfill farm_id on investment_payments from investments if null
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investment_payments' AND column_name = 'investment_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investments' AND column_name = 'farm_id'
  ) THEN
    UPDATE investment_payments ip
    SET farm_id = i.farm_id
    FROM investments i
    WHERE ip.investment_id = i.id AND ip.farm_id IS NULL;
  END IF;
END;
$$;

-- ── 3. Staff Report Immutability Triggers ──────────────────────────────────────
-- Reports immutability trigger
CREATE OR REPLACE FUNCTION protect_staff_report_immutability()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.is_staff_submission = true OR OLD.created_by_role = 'staff' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Submitted staff reports are official records and cannot be deleted.';
    END IF;

    IF TG_OP = 'UPDATE' THEN
      IF NEW.title IS DISTINCT FROM OLD.title OR
         NEW.content IS DISTINCT FROM OLD.content OR
         NEW.type IS DISTINCT FROM OLD.type OR
         NEW.date IS DISTINCT FROM OLD.date OR
         NEW.farm_id IS DISTINCT FROM OLD.farm_id OR
         NEW.author IS DISTINCT FROM OLD.author OR
         NEW.created_by_id IS DISTINCT FROM OLD.created_by_id OR
         NEW.created_by_role IS DISTINCT FROM OLD.created_by_role OR
         NEW.is_staff_submission IS DISTINCT FROM OLD.is_staff_submission THEN
        RAISE EXCEPTION 'Original staff report fields are immutable. Only administrative review fields can be updated.';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_reports ON reports;
CREATE TRIGGER trg_protect_reports
BEFORE UPDATE OR DELETE ON reports
FOR EACH ROW EXECUTE FUNCTION protect_staff_report_immutability();

-- Pond reports immutability trigger
CREATE OR REPLACE FUNCTION protect_staff_pond_report_immutability()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.is_staff_submission = true OR OLD.created_by_role = 'staff' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Submitted staff pond reports are official records and cannot be deleted.';
    END IF;

    IF TG_OP = 'UPDATE' THEN
      IF NEW.description IS DISTINCT FROM OLD.description OR
         NEW.issue IS DISTINCT FROM OLD.issue OR
         NEW.action_taken IS DISTINCT FROM OLD.action_taken OR
         NEW.report_type IS DISTINCT FROM OLD.report_type OR
         NEW.report_date IS DISTINCT FROM OLD.report_date OR
         NEW.pond_id IS DISTINCT FROM OLD.pond_id OR
         NEW.farm_id IS DISTINCT FROM OLD.farm_id OR
         NEW.created_by_id IS DISTINCT FROM OLD.created_by_id OR
         NEW.created_by_role IS DISTINCT FROM OLD.created_by_role OR
         NEW.is_staff_submission IS DISTINCT FROM OLD.is_staff_submission THEN
        RAISE EXCEPTION 'Original staff pond report fields are immutable. Only administrative review fields can be updated.';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_pond_reports ON pond_reports;
CREATE TRIGGER trg_protect_pond_reports
BEFORE UPDATE OR DELETE ON pond_reports
FOR EACH ROW EXECUTE FUNCTION protect_staff_pond_report_immutability();

-- ── 4. RLS on Farms ─────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS farms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "farms_select_policy" ON farms;
CREATE POLICY "farms_select_policy" ON farms
FOR SELECT USING (
  user_id = auth.uid()
  OR staff_has_farm_assignment(id)
  OR is_admin()
);

DROP POLICY IF EXISTS "farms_insert_policy" ON farms;
CREATE POLICY "farms_insert_policy" ON farms
FOR INSERT WITH CHECK (
  user_id = auth.uid() OR is_admin()
);

DROP POLICY IF EXISTS "farms_update_policy" ON farms;
CREATE POLICY "farms_update_policy" ON farms
FOR UPDATE USING (
  user_id = auth.uid() OR is_admin()
);

DROP POLICY IF EXISTS "farms_delete_policy" ON farms;
CREATE POLICY "farms_delete_policy" ON farms
FOR DELETE USING (
  user_id = auth.uid() OR is_admin()
);

-- ── 5. RLS on Staff Farm Assignments ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_farm_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (staff_id, farm_id)
);

ALTER TABLE IF EXISTS staff_farm_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_farm_assignments_select" ON staff_farm_assignments;
CREATE POLICY "staff_farm_assignments_select" ON staff_farm_assignments
FOR SELECT USING (
  user_owns_farm(farm_id)
  OR staff_has_farm_assignment(farm_id)
  OR is_admin()
);

DROP POLICY IF EXISTS "staff_farm_assignments_modify" ON staff_farm_assignments;
CREATE POLICY "staff_farm_assignments_modify" ON staff_farm_assignments
FOR ALL USING (
  user_owns_farm(farm_id) OR is_admin()
);

-- ── 6. RLS on Standard Farm-Scoped Tables ─────────────────────────────────────
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'ponds', 'stock_events', 'feed_inventory', 'feeding_records', 'bag_open_logs',
    'feed_remaining_logs', 'expenses', 'revenues', 'mortality_entries', 'treatment_records',
    'reports', 'customers', 'price_groups', 'invoices', 'investors', 'investments',
    'pond_reports'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);

      EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', tbl || '_select_isolated', tbl);
      EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (user_can_access_farm(farm_id));', tbl || '_select_isolated', tbl);

      EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', tbl || '_insert_isolated', tbl);
      EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (user_can_access_farm(farm_id));', tbl || '_insert_isolated', tbl);

      EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', tbl || '_update_isolated', tbl);
      EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (user_can_access_farm(farm_id));', tbl || '_update_isolated', tbl);

      EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', tbl || '_delete_isolated', tbl);
      EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING (user_can_access_farm(farm_id));', tbl || '_delete_isolated', tbl);
    END IF;
  END LOOP;
END;
$$;

-- ── 7. RLS on Investment Payments (Supports direct farm_id & parent investment) ─
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'investment_payments'
  ) THEN
    ALTER TABLE investment_payments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "investment_payments_select_isolated" ON investment_payments;
    CREATE POLICY "investment_payments_select_isolated" ON investment_payments
    FOR SELECT USING (
      (farm_id IS NOT NULL AND user_can_access_farm(farm_id))
      OR EXISTS (
        SELECT 1 FROM investments i
        WHERE i.id = investment_payments.investment_id AND user_can_access_farm(i.farm_id)
      )
    );

    DROP POLICY IF EXISTS "investment_payments_insert_isolated" ON investment_payments;
    CREATE POLICY "investment_payments_insert_isolated" ON investment_payments
    FOR INSERT WITH CHECK (
      (farm_id IS NOT NULL AND user_can_access_farm(farm_id))
      OR EXISTS (
        SELECT 1 FROM investments i
        WHERE i.id = investment_payments.investment_id AND user_can_access_farm(i.farm_id)
      )
    );

    DROP POLICY IF EXISTS "investment_payments_update_isolated" ON investment_payments;
    CREATE POLICY "investment_payments_update_isolated" ON investment_payments
    FOR UPDATE USING (
      (farm_id IS NOT NULL AND user_can_access_farm(farm_id))
      OR EXISTS (
        SELECT 1 FROM investments i
        WHERE i.id = investment_payments.investment_id AND user_can_access_farm(i.farm_id)
      )
    );

    DROP POLICY IF EXISTS "investment_payments_delete_isolated" ON investment_payments;
    CREATE POLICY "investment_payments_delete_isolated" ON investment_payments
    FOR DELETE USING (
      (farm_id IS NOT NULL AND user_can_access_farm(farm_id))
      OR EXISTS (
        SELECT 1 FROM investments i
        WHERE i.id = investment_payments.investment_id AND user_can_access_farm(i.farm_id)
      )
    );
  END IF;
END;
$$;
