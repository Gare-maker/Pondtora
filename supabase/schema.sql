-- Pondtora Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/fegtvgfkxueorybefthj/sql/new

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- user_profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  farm_name TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT 'Nigeria',
  email TEXT UNIQUE NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  currency_symbol TEXT NOT NULL DEFAULT '₦',
  currency_code TEXT NOT NULL DEFAULT 'NGN',
  active_plan TEXT,
  trial_start_date TIMESTAMPTZ,
  role TEXT NOT NULL DEFAULT 'owner',
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- farms
CREATE TABLE IF NOT EXISTS farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  country TEXT DEFAULT 'Nigeria',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- staff_members (no password column — passwords are Supabase Auth only)
CREATE TABLE IF NOT EXISTS staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  staff_auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  role TEXT DEFAULT 'General Staff',
  status TEXT DEFAULT 'Pending',
  joined_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email)
);

-- staff_invitations
CREATE TABLE IF NOT EXISTS staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invited_by UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- staff_farm_assignments
CREATE TABLE IF NOT EXISTS staff_farm_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES staff_members(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, farm_id)
);

-- staff_permissions
CREATE TABLE IF NOT EXISTS staff_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES staff_members(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  can_view BOOLEAN DEFAULT TRUE,
  can_create BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, feature)
);

-- ponds
CREATE TABLE IF NOT EXISTS ponds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  name TEXT, type TEXT, species TEXT,
  size_m2 NUMERIC, initial_stock INTEGER DEFAULT 0,
  current_count INTEGER DEFAULT 0, avg_weight NUMERIC DEFAULT 0,
  stocking_date DATE, stock_month TEXT, total_cost NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Active', notes TEXT,
  default_pellet TEXT, category TEXT, max_kg_by_pallet JSONB,
  supplier TEXT, transfer_note TEXT,
  length_ft TEXT, width_ft TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- stock_events
CREATE TABLE IF NOT EXISTS stock_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  pond_id UUID REFERENCES ponds(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  pond_name TEXT, date DATE, species TEXT,
  count INTEGER, avg_weight NUMERIC, cost NUMERIC, sale_price NUMERIC,
  type TEXT, from_pond TEXT, cleared_date DATE, supplier TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- feed_inventory
CREATE TABLE IF NOT EXISTS feed_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  brand TEXT, size TEXT, bags INTEGER, weight_per_bag NUMERIC,
  total_kg NUMERIC, cost_per_bag NUMERIC, supplier TEXT,
  purchase_date DATE, month TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- feeding_records
CREATE TABLE IF NOT EXISTS feeding_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  date DATE, month TEXT, year INTEGER,
  pond TEXT, brand TEXT, size TEXT,
  morning NUMERIC, evening NUMERIC, total NUMERIC,
  recorded_by TEXT, morning_time TEXT, evening_time TEXT,
  created_by TEXT, created_by_id TEXT,
  edit_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- bag_open_logs
CREATE TABLE IF NOT EXISTS bag_open_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  date DATE, month TEXT, year INTEGER,
  brand TEXT, size TEXT, kg_per_bag NUMERIC,
  bags_opened INTEGER, total_kg NUMERIC, fish_stock TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- feed_remaining_logs
CREATE TABLE IF NOT EXISTS feed_remaining_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  brand TEXT, size TEXT, fish_stock TEXT, remaining_kg NUMERIC, date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  category TEXT, amount NUMERIC, date DATE, month TEXT, year INTEGER,
  pond TEXT, description TEXT, fish_stock TEXT,
  created_by TEXT, created_by_id TEXT,
  original_description TEXT,
  edit_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- revenues
CREATE TABLE IF NOT EXISTS revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  source TEXT, amount NUMERIC, date DATE, month TEXT, year INTEGER,
  notes TEXT, original_notes TEXT, pond TEXT, stock_batch TEXT, fish_stock TEXT,
  created_by TEXT, created_by_id TEXT,
  edit_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- mortality_entries
CREATE TABLE IF NOT EXISTS mortality_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  pond_id UUID REFERENCES ponds(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  date DATE, count INTEGER, cause TEXT, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- treatment_records
CREATE TABLE IF NOT EXISTS treatment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  pond_id UUID REFERENCES ponds(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  date DATE, cause TEXT, medicine TEXT, remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  title TEXT, content TEXT, type TEXT, author TEXT,
  date DATE, status TEXT DEFAULT 'Open',
  resolved_by TEXT, resolved_date DATE,
  tags JSONB DEFAULT '[]'::jsonb, timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  name TEXT, phone TEXT, email TEXT, business_name TEXT, address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- price_groups
CREATE TABLE IF NOT EXISTS price_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  group_key TEXT, display_name TEXT, description TEXT,
  price_per_kg NUMERIC, status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  inv_number TEXT, customer JSONB,
  pond TEXT, species TEXT, items JSONB DEFAULT '[]'::jsonb,
  discount_type TEXT, subtotal NUMERIC, discount NUMERIC,
  additional_charges NUMERIC, grand_total NUMERIC,
  amount_paid NUMERIC, outstanding NUMERIC,
  status TEXT, payment_method TEXT,
  invoice_date DATE, due_date DATE, notes TEXT, issued_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- invoice_settings (singleton per user)
CREATE TABLE IF NOT EXISTS invoice_settings (
  user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_name TEXT, farm_address TEXT, farm_phone TEXT, farm_email TEXT,
  bank_details TEXT, default_notes TEXT, footer_message TEXT,
  tax_rate NUMERIC DEFAULT 0, invoice_prefix TEXT DEFAULT 'INV',
  payment_terms TEXT, updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- platform_settings (global configuration for paystack mode, public keys, system toggles)
CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- knowledge_questions
CREATE TABLE IF NOT EXISTS knowledge_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  text TEXT, category TEXT, options JSONB, correct_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- compatibility_questions
CREATE TABLE IF NOT EXISTS compatibility_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  text TEXT, category TEXT, options JSONB, correct_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- knowledge_results
CREATE TABLE IF NOT EXISTS knowledge_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT, email TEXT, phone TEXT, gender TEXT,
  date_taken DATE, time_taken TEXT,
  total_correct INTEGER, total_wrong INTEGER,
  overall_score INTEGER, pass BOOLEAN, category_breakdown JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- compatibility_results
CREATE TABLE IF NOT EXISTS compatibility_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT, email TEXT, phone TEXT, gender TEXT,
  date_taken DATE, time_taken TEXT,
  category_scores JSONB, overall_score INTEGER, recommendation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_farms_user_id ON farms(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff_members(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_auth_id ON staff_members(staff_auth_id);
CREATE INDEX IF NOT EXISTS idx_staff_email ON staff_members(email);
CREATE INDEX IF NOT EXISTS idx_sfa_staff_id ON staff_farm_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_sfa_farm_id ON staff_farm_assignments(farm_id);
CREATE INDEX IF NOT EXISTS idx_sp_staff_id ON staff_permissions(staff_id);
CREATE INDEX IF NOT EXISTS idx_ponds_user_id ON ponds(user_id);
CREATE INDEX IF NOT EXISTS idx_ponds_farm_id ON ponds(farm_id);
CREATE INDEX IF NOT EXISTS idx_stock_user_id ON stock_events(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_inv_user_id ON feed_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_rec_user_id ON feeding_records(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_revenues_user_id ON revenues(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
DROP INDEX IF EXISTS idx_feed_rec_farm_pond_date;
CREATE INDEX IF NOT EXISTS idx_feed_rec_farm_pond_date ON feeding_records(farm_id, pond, date);

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE compatibility_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE compatibility_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_read_platform_settings" ON platform_settings;
CREATE POLICY "allow_read_platform_settings" ON platform_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_write_platform_settings" ON platform_settings;
CREATE POLICY "allow_write_platform_settings" ON platform_settings FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND (
      LOWER(TRIM(COALESCE(role, ''))) IN ('admin', 'superadmin')
      OR LOWER(TRIM(COALESCE(email, ''))) = 'edafejesugarec@gmail.com'
    )
  ) OR (
    LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', ''))) = 'edafejesugarec@gmail.com'
  ) OR (
    LOWER(TRIM(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', ''))) IN ('admin', 'superadmin')
  );
$$;

-- Secure RPC to retrieve all registered users with operational stats for the Admin Panel
CREATE OR REPLACE FUNCTION get_all_users_for_admin()
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  farm_name TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  role TEXT,
  active_plan TEXT,
  trial_start_date TIMESTAMPTZ,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  paystack_reference TEXT,
  last_payment_date TEXT,
  subscription_status TEXT,
  farm_count BIGINT,
  pond_count BIGINT,
  staff_count BIGINT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    COALESCE(p.name, split_part(p.email, '@', 1)) AS name,
    p.email,
    COALESCE(p.phone, '') AS phone,
    COALESCE(p.farm_name, (SELECT f.name FROM farms f WHERE f.user_id = p.id ORDER BY f.created_at ASC LIMIT 1), 'Primary Farm') AS farm_name,
    COALESCE(p.city, 'Lagos') AS city,
    COALESCE(p.state, 'Lagos') AS state,
    COALESCE(p.country, 'Nigeria') AS country,
    COALESCE(p.role, 'owner') AS role,
    COALESCE(p.active_plan, 'Starter') AS active_plan,
    p.trial_start_date,
    COALESCE(p.status, 'Active') AS status,
    p.created_at,
    p.updated_at,
    p.paystack_reference,
    p.last_payment_date,
    p.subscription_status,
    (SELECT COUNT(*) FROM farms f WHERE f.user_id = p.id)::BIGINT AS farm_count,
    (SELECT COUNT(*) FROM ponds pd WHERE pd.user_id = p.id)::BIGINT AS pond_count,
    (SELECT COUNT(*) FROM staff_members sm WHERE sm.user_id = p.id)::BIGINT AS staff_count
  FROM user_profiles p
  ORDER BY p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION user_can_access_farm(p_farm_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  -- 1. Farm Owner: owns this farm directly
  SELECT EXISTS (
    SELECT 1 FROM farms f
    WHERE f.id = p_farm_id AND f.user_id = auth.uid()
  )
  -- 2. Explicitly assigned staff member (via staff_farm_assignments ONLY)
  --    No fallback to "all owner farms" — explicit assignment required.
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

CREATE OR REPLACE FUNCTION user_can_access_owner_data(p_user_id UUID, p_farm_id UUID DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  -- Direct owner match or platform admin
  SELECT (auth.uid() = p_user_id)
  OR is_admin()
  -- Farm-level access (covers both owners and explicitly-assigned staff)
  OR (p_farm_id IS NOT NULL AND user_can_access_farm(p_farm_id))
  -- Caller is staff member of the record owner (no farm_id or farm matches)
  OR EXISTS (
    SELECT 1 FROM staff_members sm
    WHERE (
      sm.staff_auth_id = auth.uid()
      OR LOWER(sm.email) = LOWER(COALESCE(auth.jwt()->>'email', ''))
    )
    AND sm.user_id = p_user_id
    AND (
      p_farm_id IS NULL
      OR EXISTS (
        SELECT 1 FROM staff_farm_assignments sfa
        WHERE sfa.staff_id = sm.id AND sfa.farm_id = p_farm_id
      )
    )
  )
  -- Caller is farm owner and the record belongs to their staff member
  OR EXISTS (
    SELECT 1 FROM staff_members sm
    WHERE sm.user_id = auth.uid()
      AND (sm.staff_auth_id = p_user_id OR sm.id = p_user_id)
  );
$$;

-- user_profiles: own row OR admin access
DROP POLICY IF EXISTS "own_profile" ON user_profiles;
CREATE POLICY "own_profile" ON user_profiles
  USING (auth.uid() = id OR is_admin()) WITH CHECK (auth.uid() = id OR is_admin());

-- farms: owner full access OR admin access OR assigned staff access
DROP POLICY IF EXISTS "owner_farms" ON farms;
CREATE POLICY "owner_farms" ON farms
  FOR ALL USING (auth.uid() = user_id OR user_can_access_farm(id) OR is_admin())
  WITH CHECK (auth.uid() = user_id OR is_admin());

-- staff_members: owner manages, staff sees self / colleagues on farm
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

-- staff_invitations
DROP POLICY IF EXISTS "inviter_invitations" ON staff_invitations;
CREATE POLICY "inviter_invitations" ON staff_invitations
  FOR ALL USING (auth.uid() = invited_by OR is_admin()) WITH CHECK (auth.uid() = invited_by OR is_admin());

-- staff_farm_assignments
DROP POLICY IF EXISTS "owner_assignments" ON staff_farm_assignments;
CREATE POLICY "owner_assignments" ON staff_farm_assignments
  FOR ALL USING (
    is_admin() OR
    EXISTS (SELECT 1 FROM farms f WHERE f.id = staff_farm_assignments.farm_id AND (f.user_id = auth.uid() OR user_can_access_farm(f.id)))
  ) WITH CHECK (
    is_admin() OR
    EXISTS (SELECT 1 FROM farms f WHERE f.id = staff_farm_assignments.farm_id AND (f.user_id = auth.uid() OR user_can_access_farm(f.id)))
  );

-- staff_permissions
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

-- Mortality
DROP POLICY IF EXISTS "farm_mortality" ON mortality_entries;
CREATE POLICY "farm_mortality" ON mortality_entries
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Treatments
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

-- Knowledge / compatibility
DROP POLICY IF EXISTS "own_kq" ON knowledge_questions;
CREATE POLICY "own_kq" ON knowledge_questions
  USING (auth.uid() = user_id OR is_admin()) WITH CHECK (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "public_read_kq" ON knowledge_questions;
CREATE POLICY "public_read_kq" ON knowledge_questions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "own_cq" ON compatibility_questions;
CREATE POLICY "own_cq" ON compatibility_questions
  USING (auth.uid() = user_id OR is_admin()) WITH CHECK (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "public_read_cq" ON compatibility_questions;
CREATE POLICY "public_read_cq" ON compatibility_questions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "own_kr" ON knowledge_results;
CREATE POLICY "own_kr" ON knowledge_results
  USING (auth.uid() = user_id OR is_admin()) WITH CHECK (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "public_insert_kr" ON knowledge_results;
CREATE POLICY "public_insert_kr" ON knowledge_results
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "own_cr" ON compatibility_results;
CREATE POLICY "own_cr" ON compatibility_results
  USING (auth.uid() = user_id OR is_admin()) WITH CHECK (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "public_insert_cr" ON compatibility_results;
CREATE POLICY "public_insert_cr" ON compatibility_results
  FOR INSERT WITH CHECK (true);

-- Auto-farm trigger: runs on auth.users INSERT, creates user_profiles + farm
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role TEXT;
  v_owner_id UUID;
  v_staff_id UUID;
BEGIN
  -- 1. Check if user is staff (explicit role in metadata OR pre-existing staff_members record)
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

  -- Only owners get an auto-created farm. Staff NEVER get separate farms.
  IF v_role = 'owner' THEN
    INSERT INTO farms (user_id, name, city, state, country) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'farm_name', 'My Farm'),
      COALESCE(NEW.raw_user_meta_data->>'city', ''),
      COALESCE(NEW.raw_user_meta_data->>'state', ''),
      COALESCE(NEW.raw_user_meta_data->>'country', 'Nigeria')
    );
  END IF;

  -- If staff, immediately link their auth id and mark status as Active
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

-- Helper function to check if an email already belongs to an existing account
CREATE OR REPLACE FUNCTION check_email_exists(lookup_email TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  clean_email TEXT;
BEGIN
  clean_email := LOWER(TRIM(lookup_email));
  IF clean_email = '' OR clean_email IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Only consider as existing if they have an active user_profile or staff_member record,
  -- or if they exist in auth.users WITH an associated user_profile.
  -- Orphaned auth.users rows without a profile (e.g. from admin deletion) should NOT block new signups.
  RETURN EXISTS (
    SELECT 1 FROM user_profiles WHERE LOWER(email) = clean_email
  ) OR EXISTS (
    SELECT 1 FROM staff_members WHERE LOWER(email) = clean_email
  ) OR EXISTS (
    SELECT 1 FROM auth.users u
    JOIN user_profiles p ON p.id = u.id
    WHERE LOWER(u.email) = clean_email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION check_email_exists(TEXT) TO authenticated, anon;

-- ── 23. Investors Table ────────────────────────────────────────────────────────
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

-- ── 24. Investments Table ──────────────────────────────────────────────────────
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
  payment_type TEXT NOT NULL DEFAULT 'one-time',
  payment_frequency TEXT,
  custom_frequency_desc TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 25. Investment Payments Table ─────────────────────────────────────────────
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
  status TEXT NOT NULL DEFAULT 'Pending',
  notes TEXT,
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 26. Pond Reports Table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pond_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  pond_id UUID REFERENCES ponds(id) ON DELETE CASCADE,
  fish_stock_id TEXT NOT NULL,
  report_type TEXT NOT NULL,
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

-- Indexes
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

-- Enable RLS
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pond_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "farm_investors" ON investors;
CREATE POLICY "farm_investors" ON investors
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin())
  WITH CHECK (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin());

DROP POLICY IF EXISTS "farm_investments" ON investments;
CREATE POLICY "farm_investments" ON investments
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin())
  WITH CHECK (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin());

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

DROP POLICY IF EXISTS "farm_pond_reports" ON pond_reports;
CREATE POLICY "farm_pond_reports" ON pond_reports
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin())
  WITH CHECK (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin());

-- ── Complete User Deletion RPCs ──────────────────────────────────────────────
-- Permanently deletes user from auth.users, user_profiles, and all related tables
CREATE OR REPLACE FUNCTION delete_user_completely(target_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF target_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Delete from all user child tables to ensure complete cleanup
  DELETE FROM pond_reports WHERE user_id = target_user_id;
  DELETE FROM investment_payments WHERE user_id = target_user_id;
  DELETE FROM investments WHERE user_id = target_user_id;
  DELETE FROM investors WHERE user_id = target_user_id;
  DELETE FROM invoices WHERE user_id = target_user_id;
  DELETE FROM invoice_settings WHERE user_id = target_user_id;
  DELETE FROM mortality_entries WHERE user_id = target_user_id;
  DELETE FROM treatment_records WHERE user_id = target_user_id;
  DELETE FROM reports WHERE user_id = target_user_id;
  DELETE FROM revenues WHERE user_id = target_user_id;
  DELETE FROM expenses WHERE user_id = target_user_id;
  DELETE FROM feed_remaining_logs WHERE user_id = target_user_id;
  DELETE FROM bag_open_logs WHERE user_id = target_user_id;
  DELETE FROM feeding_records WHERE user_id = target_user_id;
  DELETE FROM feed_inventory WHERE user_id = target_user_id;
  DELETE FROM stock_events WHERE user_id = target_user_id;
  DELETE FROM ponds WHERE user_id = target_user_id;
  DELETE FROM staff_permissions WHERE staff_id IN (SELECT id FROM staff_members WHERE user_id = target_user_id);
  DELETE FROM staff_farm_assignments WHERE staff_id IN (SELECT id FROM staff_members WHERE user_id = target_user_id);
  DELETE FROM staff_invitations WHERE invited_by = target_user_id;
  DELETE FROM staff_members WHERE user_id = target_user_id OR staff_auth_id = target_user_id;
  DELETE FROM farms WHERE user_id = target_user_id;
  DELETE FROM user_profiles WHERE id = target_user_id;

  -- Delete from auth.users (so user cannot log in and can create account afresh)
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  -- Fallback: ensure public profile is removed even if auth.users has issues
  DELETE FROM user_profiles WHERE id = target_user_id;
  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_completely(UUID) TO authenticated, anon;

-- Delete user by email (for cleaning up orphaned auth accounts)
CREATE OR REPLACE FUNCTION delete_user_by_email(target_email TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_uid UUID;
  clean_email TEXT;
BEGIN
  clean_email := LOWER(TRIM(target_email));
  IF clean_email = '' OR clean_email IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Locate user ID
  SELECT id INTO v_uid FROM auth.users WHERE LOWER(email) = clean_email LIMIT 1;
  IF v_uid IS NULL THEN
    SELECT id INTO v_uid FROM user_profiles WHERE LOWER(email) = clean_email LIMIT 1;
  END IF;

  IF v_uid IS NOT NULL THEN
    PERFORM delete_user_completely(v_uid);
  END IF;

  -- Explicit fallback deletes
  DELETE FROM auth.users WHERE LOWER(email) = clean_email;
  DELETE FROM user_profiles WHERE LOWER(email) = clean_email;
  DELETE FROM staff_members WHERE LOWER(email) = clean_email;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_by_email(TEXT) TO authenticated, anon;


