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
ALTER TABLE knowledge_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE compatibility_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE compatibility_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin' OR email = 'edafejesugarec@gmail.com')
  ) OR (
    auth.jwt() ->> 'email' = 'edafejesugarec@gmail.com'
  );
$$;

CREATE OR REPLACE FUNCTION user_can_access_farm(p_farm_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM farms f WHERE f.id = p_farm_id AND f.user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM staff_farm_assignments sfa
    JOIN staff_members sm ON sm.id = sfa.staff_id
    WHERE sfa.farm_id = p_farm_id AND sm.staff_auth_id = auth.uid() AND sm.status = 'Active'
  );
$$;

-- user_profiles: own row OR admin access
DROP POLICY IF EXISTS "own_profile" ON user_profiles;
CREATE POLICY "own_profile" ON user_profiles
  USING (auth.uid() = id OR is_admin()) WITH CHECK (auth.uid() = id OR is_admin());

-- farms: owner full access OR admin access
DROP POLICY IF EXISTS "owner_farms" ON farms;
CREATE POLICY "owner_farms" ON farms
  USING (auth.uid() = user_id OR is_admin()) WITH CHECK (auth.uid() = user_id OR is_admin());

-- staff_members: owner manages, staff sees self
DROP POLICY IF EXISTS "owner_staff" ON staff_members;
CREATE POLICY "owner_staff" ON staff_members
  FOR ALL USING (auth.uid() = user_id OR is_admin()) WITH CHECK (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "staff_view_self" ON staff_members;
CREATE POLICY "staff_view_self" ON staff_members
  FOR SELECT USING (auth.uid() = staff_auth_id);

-- staff_invitations
DROP POLICY IF EXISTS "inviter_invitations" ON staff_invitations;
CREATE POLICY "inviter_invitations" ON staff_invitations
  FOR ALL USING (auth.uid() = invited_by OR is_admin()) WITH CHECK (auth.uid() = invited_by OR is_admin());

-- staff_farm_assignments
DROP POLICY IF EXISTS "owner_assignments" ON staff_farm_assignments;
CREATE POLICY "owner_assignments" ON staff_farm_assignments
  FOR ALL USING (
    is_admin() OR
    EXISTS (SELECT 1 FROM farms f WHERE f.id = staff_farm_assignments.farm_id AND f.user_id = auth.uid())
  ) WITH CHECK (
    is_admin() OR
    EXISTS (SELECT 1 FROM farms f WHERE f.id = staff_farm_assignments.farm_id AND f.user_id = auth.uid())
  );

-- staff_permissions
DROP POLICY IF EXISTS "owner_permissions" ON staff_permissions;
CREATE POLICY "owner_permissions" ON staff_permissions
  FOR ALL USING (
    is_admin() OR
    EXISTS (SELECT 1 FROM staff_members sm WHERE sm.id = staff_permissions.staff_id AND sm.user_id = auth.uid())
  ) WITH CHECK (
    is_admin() OR
    EXISTS (SELECT 1 FROM staff_members sm WHERE sm.id = staff_permissions.staff_id AND sm.user_id = auth.uid())
  );

-- Ponds
DROP POLICY IF EXISTS "farm_ponds" ON ponds;
CREATE POLICY "farm_ponds" ON ponds
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin())
  WITH CHECK (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin());

-- Stock events
DROP POLICY IF EXISTS "farm_stock" ON stock_events;
CREATE POLICY "farm_stock" ON stock_events
  USING (auth.uid() = user_id OR (farm_id IS NOT NULL AND user_can_access_farm(farm_id)) OR is_admin())
  WITH CHECK (auth.uid() = user_id OR (farm_id IS NOT NULL AND user_can_access_farm(farm_id)) OR is_admin());

-- Feed inventory
DROP POLICY IF EXISTS "farm_feed_inv" ON feed_inventory;
CREATE POLICY "farm_feed_inv" ON feed_inventory
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin())
  WITH CHECK (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin());

-- Feeding records
DROP POLICY IF EXISTS "farm_feeding" ON feeding_records;
CREATE POLICY "farm_feeding" ON feeding_records
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin())
  WITH CHECK (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin());

-- Bag open logs
DROP POLICY IF EXISTS "farm_bags" ON bag_open_logs;
CREATE POLICY "farm_bags" ON bag_open_logs
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin())
  WITH CHECK (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin());

-- Feed remaining logs
DROP POLICY IF EXISTS "farm_remain" ON feed_remaining_logs;
CREATE POLICY "farm_remain" ON feed_remaining_logs
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin())
  WITH CHECK (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin());

-- Expenses
DROP POLICY IF EXISTS "farm_expenses" ON expenses;
CREATE POLICY "farm_expenses" ON expenses
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin())
  WITH CHECK (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin());

-- Revenues
DROP POLICY IF EXISTS "farm_revenues" ON revenues;
CREATE POLICY "farm_revenues" ON revenues
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin())
  WITH CHECK (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin());

-- Mortality
DROP POLICY IF EXISTS "farm_mortality" ON mortality_entries;
CREATE POLICY "farm_mortality" ON mortality_entries
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin())
  WITH CHECK (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin());

-- Treatments
DROP POLICY IF EXISTS "farm_treatment" ON treatment_records;
CREATE POLICY "farm_treatment" ON treatment_records
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin())
  WITH CHECK (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin());

-- Reports
DROP POLICY IF EXISTS "farm_reports" ON reports;
CREATE POLICY "farm_reports" ON reports
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin())
  WITH CHECK (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin());

-- Customers
DROP POLICY IF EXISTS "farm_customers" ON customers;
CREATE POLICY "farm_customers" ON customers
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin())
  WITH CHECK (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin());

-- Price groups
DROP POLICY IF EXISTS "farm_prices" ON price_groups;
CREATE POLICY "farm_prices" ON price_groups
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin())
  WITH CHECK (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin());

-- Invoices
DROP POLICY IF EXISTS "farm_invoices" ON invoices;
CREATE POLICY "farm_invoices" ON invoices
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin())
  WITH CHECK (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin());

-- Invoice settings
DROP POLICY IF EXISTS "own_inv_settings" ON invoice_settings;
CREATE POLICY "own_inv_settings" ON invoice_settings
  USING (auth.uid() = user_id OR is_admin())
  WITH CHECK (auth.uid() = user_id OR is_admin());

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
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'owner');

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
  ) ON CONFLICT (id) DO NOTHING;

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
    v_owner_id := (NEW.raw_user_meta_data->>'owner_id')::UUID;
    IF v_owner_id IS NOT NULL THEN
      UPDATE staff_members SET staff_auth_id = NEW.id, status = 'Active', updated_at = NOW()
        WHERE email = NEW.email AND user_id = v_owner_id;
      UPDATE staff_invitations SET status = 'accepted', accepted_at = NOW()
        WHERE email = NEW.email AND invited_by = v_owner_id AND status = 'pending';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
