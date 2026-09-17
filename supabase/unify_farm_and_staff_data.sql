-- ==============================================================================
-- PONDTORA: UNIFIED FARM & STAFF DATA MIGRATION
-- Ensures that all staff members, farm managers, and owners access and modify
-- the exact same shared data on every page across the entire platform.
--
-- KEY DESIGN:
--   • Staff can ONLY access farms explicitly assigned to them via staff_farm_assignments
--   • Staff records are stored under the OWNER's user_id, not the staff's user_id
--   • Page/module access is enforced at the API layer (server/index.tsx)
--   • RLS enforces farm-level isolation; API enforces page-level isolation
-- ==============================================================================

-- 1. Helper function: check if user can access a specific farm
--    STRICT: staff must be explicitly assigned via staff_farm_assignments.
--    No fallback to "all owner farms" — avoids data leakage between farms.
CREATE OR REPLACE FUNCTION user_can_access_farm(p_farm_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  -- 1. Farm Owner: owns this farm directly
  SELECT EXISTS (
    SELECT 1 FROM farms f
    WHERE f.id = p_farm_id AND f.user_id = auth.uid()
  )
  -- 2. Explicitly assigned staff member
  --    Staff must appear in staff_farm_assignments for this specific farm.
  --    No fallback to "all owner farms" — farm assignments are mandatory.
  OR EXISTS (
    SELECT 1
    FROM staff_members sm
    JOIN staff_farm_assignments sfa ON sfa.staff_id = sm.id AND sfa.farm_id = p_farm_id
    WHERE (
      sm.staff_auth_id = auth.uid()
      OR LOWER(sm.email) = LOWER(COALESCE(auth.jwt()->>'email', ''))
    )
  )
  -- 3. Platform admin / superadmin
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
      AND (role = 'admin' OR role = 'superadmin' OR email = 'edafejesugarec@gmail.com')
  )
  OR (auth.jwt() ->> 'email' = 'edafejesugarec@gmail.com');
$$;

-- 2. Helper function: check if user can access data scoped to owner/farm
--    Used by RLS policies on all farm data tables.
CREATE OR REPLACE FUNCTION user_can_access_owner_data(p_user_id UUID, p_farm_id UUID DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  -- Direct owner match or platform admin
  SELECT (auth.uid() = p_user_id)
  OR is_admin()
  -- Farm-level access check (covers both owners and explicitly-assigned staff)
  OR (p_farm_id IS NOT NULL AND user_can_access_farm(p_farm_id))
  -- Caller is staff member belonging to the record owner (no farm_id provided)
  OR EXISTS (
    SELECT 1 FROM staff_members sm
    WHERE (
      sm.staff_auth_id = auth.uid()
      OR LOWER(sm.email) = LOWER(COALESCE(auth.jwt()->>'email', ''))
    )
    AND sm.user_id = p_user_id
    AND (
      -- Staff must be assigned to at least one farm for this owner
      p_farm_id IS NULL
      OR EXISTS (
        SELECT 1 FROM staff_farm_assignments sfa
        WHERE sfa.staff_id = sm.id AND sfa.farm_id = p_farm_id
      )
    )
  )
  -- Caller is farm owner and the user_id in the record belongs to their staff member
  OR EXISTS (
    SELECT 1 FROM staff_members sm
    WHERE sm.user_id = auth.uid()
      AND (sm.staff_auth_id = p_user_id OR sm.id = p_user_id)
  );
$$;

-- 3. Enable RLS on all tables
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_farm_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponds ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeding_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_open_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_remaining_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE mortality_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pond_reports ENABLE ROW LEVEL SECURITY;

-- 4. Update RLS policies to unified access

-- Farms
DROP POLICY IF EXISTS "owner_farms" ON farms;
CREATE POLICY "owner_farms" ON farms
  FOR ALL USING (auth.uid() = user_id OR user_can_access_farm(id) OR is_admin())
  WITH CHECK (auth.uid() = user_id OR is_admin());

-- Staff members
DROP POLICY IF EXISTS "owner_staff" ON staff_members;
CREATE POLICY "owner_staff" ON staff_members
  FOR ALL USING (
    auth.uid() = user_id 
    OR auth.uid() = staff_auth_id 
    OR LOWER(email) = LOWER(COALESCE(auth.jwt()->>'email', '')) 
    OR is_admin()
  ) WITH CHECK (
    auth.uid() = user_id 
    OR auth.uid() = staff_auth_id 
    OR LOWER(email) = LOWER(COALESCE(auth.jwt()->>'email', ''))
    OR is_admin()
  );

DROP POLICY IF EXISTS "staff_view_self" ON staff_members;
CREATE POLICY "staff_view_self" ON staff_members
  FOR SELECT USING (
    auth.uid() = staff_auth_id 
    OR LOWER(email) = LOWER(COALESCE(auth.jwt()->>'email', ''))
    OR auth.uid() = user_id
    OR is_admin()
  );

-- Staff assignments & permissions
DROP POLICY IF EXISTS "owner_assignments" ON staff_farm_assignments;
CREATE POLICY "owner_assignments" ON staff_farm_assignments
  FOR ALL USING (
    is_admin() OR
    EXISTS (SELECT 1 FROM farms f WHERE f.id = staff_farm_assignments.farm_id AND (f.user_id = auth.uid() OR user_can_access_farm(f.id)))
  ) WITH CHECK (
    is_admin() OR
    EXISTS (SELECT 1 FROM farms f WHERE f.id = staff_farm_assignments.farm_id AND (f.user_id = auth.uid() OR user_can_access_farm(f.id)))
  );

DROP POLICY IF EXISTS "owner_permissions" ON staff_permissions;
CREATE POLICY "owner_permissions" ON staff_permissions
  FOR ALL USING (
    is_admin() OR
    EXISTS (SELECT 1 FROM staff_members sm WHERE sm.id = staff_permissions.staff_id AND (sm.user_id = auth.uid() OR sm.staff_auth_id = auth.uid()))
  ) WITH CHECK (
    is_admin() OR
    EXISTS (SELECT 1 FROM staff_members sm WHERE sm.id = staff_permissions.staff_id AND (sm.user_id = auth.uid() OR sm.staff_auth_id = auth.uid()))
  );

-- Ponds
DROP POLICY IF EXISTS "farm_ponds" ON ponds;
CREATE POLICY "farm_ponds" ON ponds
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Stock events
DROP POLICY IF EXISTS "farm_stock" ON stock_events;
CREATE POLICY "farm_stock" ON stock_events
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Feed inventory
DROP POLICY IF EXISTS "farm_feed_inv" ON feed_inventory;
CREATE POLICY "farm_feed_inv" ON feed_inventory
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Feeding records
DROP POLICY IF EXISTS "farm_feeding" ON feeding_records;
CREATE POLICY "farm_feeding" ON feeding_records
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Bag open logs
DROP POLICY IF EXISTS "farm_bags" ON bag_open_logs;
CREATE POLICY "farm_bags" ON bag_open_logs
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Feed remaining logs
DROP POLICY IF EXISTS "farm_remain" ON feed_remaining_logs;
CREATE POLICY "farm_remain" ON feed_remaining_logs
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Expenses
DROP POLICY IF EXISTS "farm_expenses" ON expenses;
CREATE POLICY "farm_expenses" ON expenses
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Revenues
DROP POLICY IF EXISTS "farm_revenues" ON revenues;
CREATE POLICY "farm_revenues" ON revenues
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Mortality entries
DROP POLICY IF EXISTS "farm_mortality" ON mortality_entries;
CREATE POLICY "farm_mortality" ON mortality_entries
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Treatment records
DROP POLICY IF EXISTS "farm_treatment" ON treatment_records;
CREATE POLICY "farm_treatment" ON treatment_records
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Reports
DROP POLICY IF EXISTS "farm_reports" ON reports;
CREATE POLICY "farm_reports" ON reports
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Customers
DROP POLICY IF EXISTS "farm_customers" ON customers;
CREATE POLICY "farm_customers" ON customers
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Price groups
DROP POLICY IF EXISTS "farm_prices" ON price_groups;
CREATE POLICY "farm_prices" ON price_groups
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Invoices
DROP POLICY IF EXISTS "farm_invoices" ON invoices;
CREATE POLICY "farm_invoices" ON invoices
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Invoice settings
DROP POLICY IF EXISTS "own_inv_settings" ON invoice_settings;
CREATE POLICY "own_inv_settings" ON invoice_settings
  FOR ALL USING (user_can_access_owner_data(user_id, NULL))
  WITH CHECK (user_can_access_owner_data(user_id, NULL));

-- Investors
DROP POLICY IF EXISTS "farm_investors" ON investors;
CREATE POLICY "farm_investors" ON investors
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Investments
DROP POLICY IF EXISTS "farm_investments" ON investments;
CREATE POLICY "farm_investments" ON investments
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Investment payments
DROP POLICY IF EXISTS "farm_investment_payments" ON investment_payments;
CREATE POLICY "farm_investment_payments" ON investment_payments
  FOR ALL USING (
    user_can_access_owner_data(user_id, NULL) OR
    EXISTS (
      SELECT 1 FROM investments i
      WHERE i.id = investment_payments.investment_id
        AND user_can_access_owner_data(i.user_id, i.farm_id)
    )
  )
  WITH CHECK (
    user_can_access_owner_data(user_id, NULL) OR
    EXISTS (
      SELECT 1 FROM investments i
      WHERE i.id = investment_payments.investment_id
        AND user_can_access_owner_data(i.user_id, i.farm_id)
    )
  );

-- Pond reports
DROP POLICY IF EXISTS "farm_pond_reports" ON pond_reports;
CREATE POLICY "farm_pond_reports" ON pond_reports
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- 5. Data Backfill & Unification: Link all past/existing rows under the farm and owner

DO $$
DECLARE
  rec RECORD;
  owner_farm_id UUID;
BEGIN
  -- 5a. Self-heal staff_auth_id on staff_members from auth.users
  FOR rec IN (
    SELECT sm.id as staff_id, u.id as auth_id 
    FROM staff_members sm
    JOIN auth.users u ON LOWER(u.email) = LOWER(sm.email)
    WHERE sm.staff_auth_id IS NULL OR sm.staff_auth_id != u.id
  ) LOOP
    UPDATE staff_members SET staff_auth_id = rec.auth_id, status = 'Active', updated_at = NOW() WHERE id = rec.staff_id;
  END LOOP;

  -- 5b. For all staff records created with staff_auth_id, re-assign user_id to the owner
  FOR rec IN (
    SELECT sm.staff_auth_id, sm.user_id as owner_id
    FROM staff_members sm
    WHERE sm.staff_auth_id IS NOT NULL AND sm.user_id IS NOT NULL
  ) LOOP
    UPDATE ponds SET user_id = rec.owner_id WHERE user_id = rec.staff_auth_id;
    UPDATE stock_events SET user_id = rec.owner_id WHERE user_id = rec.staff_auth_id;
    UPDATE feed_inventory SET user_id = rec.owner_id WHERE user_id = rec.staff_auth_id;
    UPDATE feeding_records SET user_id = rec.owner_id WHERE user_id = rec.staff_auth_id;
    UPDATE bag_open_logs SET user_id = rec.owner_id WHERE user_id = rec.staff_auth_id;
    UPDATE feed_remaining_logs SET user_id = rec.owner_id WHERE user_id = rec.staff_auth_id;
    UPDATE expenses SET user_id = rec.owner_id WHERE user_id = rec.staff_auth_id;
    UPDATE revenues SET user_id = rec.owner_id WHERE user_id = rec.staff_auth_id;
    UPDATE mortality_entries SET user_id = rec.owner_id WHERE user_id = rec.staff_auth_id;
    UPDATE treatment_records SET user_id = rec.owner_id WHERE user_id = rec.staff_auth_id;
    UPDATE reports SET user_id = rec.owner_id WHERE user_id = rec.staff_auth_id;
    UPDATE customers SET user_id = rec.owner_id WHERE user_id = rec.staff_auth_id;
    UPDATE price_groups SET user_id = rec.owner_id WHERE user_id = rec.staff_auth_id;
    UPDATE invoices SET user_id = rec.owner_id WHERE user_id = rec.staff_auth_id;
    UPDATE investors SET user_id = rec.owner_id WHERE user_id = rec.staff_auth_id;
    UPDATE investments SET user_id = rec.owner_id WHERE user_id = rec.staff_auth_id;
    UPDATE investment_payments SET user_id = rec.owner_id WHERE user_id = rec.staff_auth_id;
    UPDATE pond_reports SET user_id = rec.owner_id WHERE user_id = rec.staff_auth_id;
  END LOOP;

  -- 5c. For all tables, backfill missing farm_id with the user's primary farm
  FOR rec IN (
    SELECT DISTINCT user_id FROM farms WHERE user_id IS NOT NULL
  ) LOOP
    SELECT id INTO owner_farm_id FROM farms WHERE user_id = rec.user_id ORDER BY created_at ASC LIMIT 1;
    IF owner_farm_id IS NOT NULL THEN
      UPDATE ponds SET farm_id = owner_farm_id WHERE user_id = rec.user_id AND farm_id IS NULL;
      UPDATE stock_events SET farm_id = owner_farm_id WHERE user_id = rec.user_id AND farm_id IS NULL;
      UPDATE feed_inventory SET farm_id = owner_farm_id WHERE user_id = rec.user_id AND farm_id IS NULL;
      UPDATE feeding_records SET farm_id = owner_farm_id WHERE user_id = rec.user_id AND farm_id IS NULL;
      UPDATE bag_open_logs SET farm_id = owner_farm_id WHERE user_id = rec.user_id AND farm_id IS NULL;
      UPDATE feed_remaining_logs SET farm_id = owner_farm_id WHERE user_id = rec.user_id AND farm_id IS NULL;
      UPDATE expenses SET farm_id = owner_farm_id WHERE user_id = rec.user_id AND farm_id IS NULL;
      UPDATE revenues SET farm_id = owner_farm_id WHERE user_id = rec.user_id AND farm_id IS NULL;
      UPDATE mortality_entries SET farm_id = owner_farm_id WHERE user_id = rec.user_id AND farm_id IS NULL;
      UPDATE treatment_records SET farm_id = owner_farm_id WHERE user_id = rec.user_id AND farm_id IS NULL;
      UPDATE reports SET farm_id = owner_farm_id WHERE user_id = rec.user_id AND farm_id IS NULL;
      UPDATE customers SET farm_id = owner_farm_id WHERE user_id = rec.user_id AND farm_id IS NULL;
      UPDATE price_groups SET farm_id = owner_farm_id WHERE user_id = rec.user_id AND farm_id IS NULL;
      UPDATE invoices SET farm_id = owner_farm_id WHERE user_id = rec.user_id AND farm_id IS NULL;
      UPDATE investors SET farm_id = owner_farm_id WHERE user_id = rec.user_id AND farm_id IS NULL;
      UPDATE investments SET farm_id = owner_farm_id WHERE user_id = rec.user_id AND farm_id IS NULL;
      UPDATE pond_reports SET farm_id = owner_farm_id WHERE user_id = rec.user_id AND farm_id IS NULL;
    END IF;
  END LOOP;
END $$;

-- 6. Trigger: prevent staff signup from creating independent farms
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role TEXT;
  v_owner_id UUID;
  v_staff_id UUID;
BEGIN
  IF (NEW.raw_user_meta_data->>'role') = 'staff' THEN
    v_role := 'staff';
    v_owner_id := (NEW.raw_user_meta_data->>'owner_id')::UUID;
  ELSE
    SELECT user_id, id INTO v_owner_id, v_staff_id
    FROM staff_members
    WHERE LOWER(email) = LOWER(NEW.email)
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_owner_id IS NOT NULL THEN
      v_role := 'staff';
    ELSE
      v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'owner');
    END IF;
  END IF;

  INSERT INTO user_profiles (
    id, name, farm_name, city, state, country,
    email, phone, currency_symbol, currency_code,
    active_plan, trial_start_date, role, status
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'farm_name', 'My Farm'),
    COALESCE(NEW.raw_user_meta_data->>'city', ''),
    COALESCE(NEW.raw_user_meta_data->>'state', ''),
    COALESCE(NEW.raw_user_meta_data->>'country', 'Nigeria'),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'currency_symbol', '₦'),
    COALESCE(NEW.raw_user_meta_data->>'currency_code', 'NGN'),
    NEW.raw_user_meta_data->>'active_plan',
    CASE WHEN (NEW.raw_user_meta_data->>'trial_start_date') IS NOT NULL
         THEN (NEW.raw_user_meta_data->>'trial_start_date')::TIMESTAMPTZ
         ELSE NOW() END,
    v_role,
    'Active'
  ) ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    status = 'Active',
    updated_at = NOW();

  IF v_role = 'owner' THEN
    INSERT INTO farms (user_id, name, city, state, country) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'farm_name', 'My Farm'),
      COALESCE(NEW.raw_user_meta_data->>'city', ''),
      COALESCE(NEW.raw_user_meta_data->>'state', ''),
      COALESCE(NEW.raw_user_meta_data->>'country', 'Nigeria')
    );
  END IF;

  IF v_role = 'staff' THEN
    IF v_owner_id IS NOT NULL THEN
      UPDATE staff_members SET staff_auth_id = NEW.id, status = 'Active', updated_at = NOW()
        WHERE LOWER(email) = LOWER(NEW.email) AND user_id = v_owner_id;
      UPDATE staff_invitations SET status = 'accepted', accepted_at = NOW()
        WHERE LOWER(email) = LOWER(NEW.email) AND invited_by = v_owner_id AND status = 'pending';
    ELSE
      UPDATE staff_members SET staff_auth_id = NEW.id, status = 'Active', updated_at = NOW()
        WHERE LOWER(email) = LOWER(NEW.email);
      UPDATE staff_invitations SET status = 'accepted', accepted_at = NOW()
        WHERE LOWER(email) = LOWER(NEW.email) AND status = 'pending';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
