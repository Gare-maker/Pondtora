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
  referred_by TEXT DEFAULT NULL,
  referral_code TEXT DEFAULT NULL,
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
  free_access BOOLEAN,
  farm_count BIGINT,
  pond_count BIGINT,
  staff_count BIGINT,
  last_sign_in_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
#variable_conflict use_column
BEGIN
  -- 1. Self-heal: If any staff member was mistakenly given role = 'owner', ensure their role is 'staff'
  UPDATE public.user_profiles up
  SET role = 'staff'
  WHERE up.role != 'staff'
    AND LOWER(TRIM(COALESCE(up.email, ''))) != 'edafejesugarec@gmail.com'
    AND EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE (sm.staff_auth_id = up.id OR LOWER(TRIM(sm.email)) = LOWER(TRIM(up.email)))
        AND sm.user_id != up.id
    );

  -- 2. Auto-repair: Ensure eligible farm owners in auth.users have a matching user_profiles row
  -- STRICTLY EXCLUDES staff accounts (role = 'staff', owner_id IS NOT NULL, or in staff_members)
  INSERT INTO public.user_profiles (
    id, name, farm_name, city, state, country, email, phone,
    currency_symbol, currency_code, active_plan, trial_start_date, role, status
  )
  SELECT
    au.id,
    COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
    COALESCE(au.raw_user_meta_data->>'farm_name', 'Primary Farm'),
    COALESCE(au.raw_user_meta_data->>'city', 'Lagos'),
    COALESCE(au.raw_user_meta_data->>'state', 'Lagos'),
    COALESCE(au.raw_user_meta_data->>'country', 'Nigeria'),
    COALESCE(au.email, ''),
    COALESCE(au.raw_user_meta_data->>'phone', ''),
    COALESCE(au.raw_user_meta_data->>'currency_symbol', '₦'),
    COALESCE(au.raw_user_meta_data->>'currency_code', 'NGN'),
    COALESCE(au.raw_user_meta_data->>'active_plan', 'Starter'),
    COALESCE((au.raw_user_meta_data->>'trial_start_date')::TIMESTAMPTZ, au.created_at, NOW()),
    CASE 
      WHEN LOWER(TRIM(COALESCE(au.email, ''))) = 'edafejesugarec@gmail.com' THEN 'admin'
      ELSE 'owner'
    END,
    'Active'
  FROM auth.users au
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.id = au.id
  )
  -- Filter out staff accounts:
  AND (au.raw_user_meta_data->>'role') IS DISTINCT FROM 'staff'
  AND (au.raw_user_meta_data->>'owner_id') IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.staff_members sm 
    WHERE (sm.staff_auth_id = au.id OR LOWER(TRIM(sm.email)) = LOWER(TRIM(au.email)))
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.staff_invitations si 
    WHERE LOWER(TRIM(si.email)) = LOWER(TRIM(au.email))
  )
  ON CONFLICT ON CONSTRAINT user_profiles_pkey DO NOTHING;

  -- 3. Ensure farm owners have at least one farm record
  INSERT INTO public.farms (user_id, name, city, state, country)
  SELECT
    up.id,
    COALESCE(NULLIF(up.farm_name, ''), 'Primary Farm'),
    COALESCE(NULLIF(up.city, ''), 'Lagos'),
    COALESCE(NULLIF(up.state, ''), 'Lagos'),
    COALESCE(NULLIF(up.country, ''), 'Nigeria')
  FROM public.user_profiles up
  WHERE up.role IN ('owner', 'admin')
    AND NOT EXISTS (SELECT 1 FROM public.farms f WHERE f.user_id = up.id)
  ON CONFLICT DO NOTHING;

  -- 4. Return ONLY farm-owner customer accounts joined with stats
  -- Excludes staff members (who belong to an owner's farm)
  RETURN QUERY
  SELECT
    au.id,
    COALESCE(NULLIF(p.name, ''), au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) AS name,
    COALESCE(au.email, p.email, '') AS email,
    COALESCE(p.phone, au.raw_user_meta_data->>'phone', '') AS phone,
    COALESCE(NULLIF(p.farm_name, ''), (SELECT f.name FROM farms f WHERE f.user_id = au.id ORDER BY f.created_at ASC LIMIT 1), 'Primary Farm') AS farm_name,
    COALESCE(NULLIF(p.city, ''), au.raw_user_meta_data->>'city', 'Lagos') AS city,
    COALESCE(NULLIF(p.state, ''), au.raw_user_meta_data->>'state', 'Lagos') AS state,
    COALESCE(NULLIF(p.country, ''), au.raw_user_meta_data->>'country', 'Nigeria') AS country,
    COALESCE(p.role, au.raw_user_meta_data->>'role', 'owner') AS role,
    COALESCE(p.active_plan, au.raw_user_meta_data->>'active_plan', 'Starter') AS active_plan,
    COALESCE(p.trial_start_date, (au.raw_user_meta_data->>'trial_start_date')::TIMESTAMPTZ, au.created_at) AS trial_start_date,
    COALESCE(p.status, 'Active') AS status,
    au.created_at,
    COALESCE(p.updated_at, au.updated_at, au.created_at) AS updated_at,
    p.paystack_reference,
    p.last_payment_date,
    p.subscription_status,
    COALESCE((p.raw_data->>'free_access')::BOOLEAN, false) AS free_access,
    (SELECT COUNT(*) FROM farms f WHERE f.user_id = au.id)::BIGINT AS farm_count,
    (SELECT COUNT(*) FROM ponds pd WHERE pd.user_id = au.id)::BIGINT AS pond_count,
    (SELECT COUNT(*) FROM staff_members sm WHERE sm.user_id = au.id)::BIGINT AS staff_count,
    au.last_sign_in_at
  FROM auth.users au
  LEFT JOIN public.user_profiles p ON p.id = au.id
  WHERE (
    -- STRICT EXCLUSION: Must not be a staff member
    (au.raw_user_meta_data->>'role') IS DISTINCT FROM 'staff'
    AND (au.raw_user_meta_data->>'owner_id') IS NULL
    AND LOWER(TRIM(COALESCE(p.role, ''))) NOT IN ('staff', 'general staff', 'farm manager', 'feeding staff', 'inventory staff', 'feeding & inventory staff')
    AND NOT EXISTS (
      SELECT 1 FROM public.staff_members sm 
      WHERE (sm.staff_auth_id = au.id OR LOWER(TRIM(sm.email)) = LOWER(TRIM(au.email)))
        AND sm.user_id != au.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.staff_invitations si 
      WHERE LOWER(TRIM(si.email)) = LOWER(TRIM(au.email))
        AND si.invited_by != au.id
    )
  )
  ORDER BY au.created_at DESC;
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
  pond_id UUID REFERENCES ponds(id) ON DELETE SET NULL,
  pond_name TEXT,
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

  -- 1. Disassociate foreign references from other users' records
  UPDATE staff_farm_assignments SET assigned_by = NULL WHERE assigned_by = target_user_id;
  UPDATE sales_calculations SET created_by_id = NULL WHERE created_by_id = target_user_id AND (user_id IS NULL OR user_id <> target_user_id);
  UPDATE expenses SET created_by_id = NULL WHERE created_by_id = target_user_id AND (user_id IS NULL OR user_id <> target_user_id);
  UPDATE revenues SET created_by_id = NULL WHERE created_by_id = target_user_id AND (user_id IS NULL OR user_id <> target_user_id);
  UPDATE reports SET created_by_id = NULL WHERE created_by_id = target_user_id AND (user_id IS NULL OR user_id <> target_user_id);
  UPDATE referral_rewards SET referred_user_id = NULL WHERE referred_user_id = target_user_id;
  UPDATE staff_members SET staff_auth_id = NULL WHERE staff_auth_id = target_user_id AND (user_id IS NULL OR user_id <> target_user_id);

  -- 2. Delete from sales calculation child items & payments
  DELETE FROM sales_calculation_items WHERE calculation_id IN (SELECT id FROM sales_calculations WHERE user_id = target_user_id);
  DELETE FROM sales_calculation_payments WHERE calculation_id IN (SELECT id FROM sales_calculations WHERE user_id = target_user_id);
  DELETE FROM sales_calculations WHERE user_id = target_user_id OR created_by_id = target_user_id;

  -- 3. Delete from financial & sales records
  DELETE FROM price_groups WHERE user_id = target_user_id;
  DELETE FROM customers WHERE user_id = target_user_id;
  DELETE FROM invoices WHERE user_id = target_user_id;
  DELETE FROM invoice_settings WHERE user_id = target_user_id;
  DELETE FROM investment_payments WHERE user_id = target_user_id;
  DELETE FROM investments WHERE user_id = target_user_id;
  DELETE FROM investors WHERE user_id = target_user_id;
  DELETE FROM revenues WHERE user_id = target_user_id;
  DELETE FROM expenses WHERE user_id = target_user_id;

  -- 4. Delete from operational records
  DELETE FROM pond_reports WHERE user_id = target_user_id;
  DELETE FROM treatment_records WHERE user_id = target_user_id;
  DELETE FROM mortality_entries WHERE user_id = target_user_id;
  DELETE FROM reports WHERE user_id = target_user_id;
  DELETE FROM feed_remaining_logs WHERE user_id = target_user_id;
  DELETE FROM bag_open_logs WHERE user_id = target_user_id;
  DELETE FROM feeding_records WHERE user_id = target_user_id;
  DELETE FROM feed_inventory WHERE user_id = target_user_id;
  DELETE FROM stock_events WHERE user_id = target_user_id;
  DELETE FROM fish_count_history WHERE farm_id IN (SELECT id FROM farms WHERE user_id = target_user_id);

  -- 5. Delete farm equipment
  DELETE FROM tool_quantity_history WHERE user_id = target_user_id;
  DELETE FROM farm_equipment WHERE user_id = target_user_id;

  -- 6. Delete staff & farms
  DELETE FROM staff_permissions WHERE staff_id IN (SELECT id FROM staff_members WHERE user_id = target_user_id);
  DELETE FROM staff_farm_assignments WHERE staff_id IN (SELECT id FROM staff_members WHERE user_id = target_user_id);
  DELETE FROM staff_invitations WHERE invited_by = target_user_id;
  DELETE FROM staff_members WHERE user_id = target_user_id OR staff_auth_id = target_user_id;
  DELETE FROM ponds WHERE user_id = target_user_id;
  DELETE FROM farms WHERE user_id = target_user_id;

  -- 7. Delete referral and push records
  DELETE FROM referral_clearances WHERE user_id = target_user_id;
  DELETE FROM referral_rewards WHERE user_id = target_user_id;
  DELETE FROM push_subscriptions WHERE user_id = target_user_id;

  -- 8. Delete user profile
  DELETE FROM user_profiles WHERE id = target_user_id;

  -- 9. Delete auth sessions, tokens, identities and the user from auth.users
  DELETE FROM auth.identities WHERE user_id = target_user_id;
  DELETE FROM auth.sessions WHERE user_id = target_user_id;
  DELETE FROM auth.refresh_tokens WHERE user_id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  DELETE FROM user_profiles WHERE id = target_user_id;
  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_completely(UUID) TO authenticated, anon;

-- Delete user by email (for cleaning up orphaned auth accounts)
CREATE OR REPLACE FUNCTION delete_user_by_email(target_email TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  clean_email TEXT;
  r RECORD;
BEGIN
  clean_email := LOWER(TRIM(target_email));
  IF clean_email = '' OR clean_email IS NULL THEN
    RETURN FALSE;
  END IF;

  FOR r IN (SELECT id FROM auth.users WHERE LOWER(email) = clean_email) LOOP
    PERFORM delete_user_completely(r.id);
  END LOOP;

  FOR r IN (SELECT id FROM user_profiles WHERE LOWER(email) = clean_email) LOOP
    PERFORM delete_user_completely(r.id);
  END LOOP;

  DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE LOWER(email) = clean_email);
  DELETE FROM auth.sessions WHERE user_id IN (SELECT id FROM auth.users WHERE LOWER(email) = clean_email);
  DELETE FROM auth.refresh_tokens WHERE user_id IN (SELECT id FROM auth.users WHERE LOWER(email) = clean_email);
  DELETE FROM auth.users WHERE LOWER(email) = clean_email;
  DELETE FROM user_profiles WHERE LOWER(email) = clean_email;
  DELETE FROM staff_members WHERE LOWER(email) = clean_email;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_by_email(TEXT) TO authenticated, anon;

-- ── Fish Stock Transfer RPC ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION transfer_fish_stock(
  p_from_pond_id UUID,
  p_to_pond_id UUID,
  p_percentage NUMERIC DEFAULT 100,
  p_count INTEGER DEFAULT NULL,
  p_date TEXT DEFAULT NULL,
  p_transferred_by TEXT DEFAULT 'User',
  p_stock_instance_id TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_from_pond RECORD;
  v_to_pond RECORD;
  v_fraction NUMERIC;
  v_safe_count INTEGER;
  v_is_full BOOLEAN;
  v_date_label TEXT;
  v_stock_label TEXT;
  v_stock_instance_id TEXT;
  v_dest_stock_instance_id TEXT;
  v_cost_share NUMERIC;
  v_init_dest INTEGER;
  v_from_init INTEGER;
  v_feed_rec RECORD;
  v_morning_dest NUMERIC;
  v_evening_dest NUMERIC;
  v_mort_rec RECORD;
  v_mort_dest INTEGER;
  v_treat_rec RECORD;
BEGIN
  -- 1. Validate ponds
  SELECT * INTO v_from_pond FROM ponds WHERE id = p_from_pond_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Source pond not found.');
  END IF;

  SELECT * INTO v_to_pond FROM ponds WHERE id = p_to_pond_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Destination pond not found.');
  END IF;

  IF COALESCE(v_from_pond.current_count, 0) <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Source pond has no active fish stock to transfer.');
  END IF;

  IF v_to_pond.status <> 'Empty' AND COALESCE(v_to_pond.current_count, 0) > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Destination pond must be empty to transfer fish stock.');
  END IF;

  -- 2. Calculate percentages and counts
  v_fraction := LEAST(1.0, GREATEST(0.01, COALESCE(p_percentage, 100)::NUMERIC / 100.0));
  IF p_count IS NOT NULL AND p_count > 0 THEN
    v_safe_count := LEAST(v_from_pond.current_count, p_count);
    v_fraction := v_safe_count::NUMERIC / v_from_pond.current_count::NUMERIC;
  ELSE
    v_safe_count := ROUND(v_from_pond.current_count * v_fraction);
  END IF;

  v_safe_count := LEAST(v_from_pond.current_count, GREATEST(1, v_safe_count));
  v_is_full := (v_safe_count >= v_from_pond.current_count) OR (v_fraction >= 0.999);

  v_date_label := COALESCE(p_date, TO_CHAR(CURRENT_DATE, 'Mon DD, YYYY'));
  v_stock_label := COALESCE(v_from_pond.fish_stock, v_from_pond.species || ' (' || COALESCE(v_from_pond.stocking_date, '—') || ')');

  -- Ensure reliable stock instance identity
  v_stock_instance_id := COALESCE(p_stock_instance_id, v_from_pond.fish_stock_id, gen_random_uuid()::text);
  v_dest_stock_instance_id := CASE WHEN v_is_full THEN v_stock_instance_id ELSE gen_random_uuid()::text END;

  v_from_init := COALESCE(v_from_pond.initial_stock, v_from_pond.current_count);
  IF v_from_init <= 0 THEN
    v_from_init := v_from_pond.current_count;
  END IF;

  IF v_is_full THEN
    -- =========================================================================
    -- A. 100% FISH STOCK TRANSFER (PRESERVES COMPLETE HISTORICAL DATA)
    -- =========================================================================
    v_cost_share := COALESCE(v_from_pond.total_cost, 0);

    -- 1. Clear source pond
    UPDATE ponds SET
      status = 'Empty',
      current_count = 0,
      initial_stock = 0,
      avg_weight = NULL,
      stocking_date = '—',
      stock_month = '',
      total_cost = 0,
      species = '—',
      fish_stock = NULL,
      fish_stock_id = NULL,
      supplier = NULL,
      default_pellet = NULL,
      max_kg_by_pallet = '{}'::jsonb,
      transfer_note = 'All fish transferred to ' || v_to_pond.name || ' on ' || v_date_label
    WHERE id = p_from_pond_id;

    -- 2. Activate destination pond with complete stock details & preserved stock instance identity
    UPDATE ponds SET
      status = 'Active',
      species = v_from_pond.species,
      fish_stock = v_stock_label,
      fish_stock_id = v_dest_stock_instance_id,
      initial_stock = v_from_init,
      current_count = v_from_pond.current_count,
      stocking_date = v_from_pond.stocking_date,
      stock_month = v_from_pond.stock_month,
      total_cost = v_cost_share,
      supplier = v_from_pond.supplier,
      avg_weight = v_from_pond.avg_weight,
      default_pellet = v_from_pond.default_pellet,
      max_kg_by_pallet = COALESCE(v_from_pond.max_kg_by_pallet, '{}'::jsonb),
      transfer_note = 'Full stock received from ' || v_from_pond.name || ' on ' || v_date_label
    WHERE id = p_to_pond_id;

    -- 3. Reassociate all feeding records to destination pond - isolated strictly to source pond
    UPDATE feeding_records SET
      pond = v_to_pond.name,
      pond_id = p_to_pond_id::text,
      fish_stock = v_stock_label,
      fish_stock_id = v_dest_stock_instance_id
    WHERE (pond_id = p_from_pond_id::text OR LOWER(TRIM(pond)) = LOWER(TRIM(v_from_pond.name)))
      AND (user_id = v_from_pond.user_id OR farm_id = v_from_pond.farm_id);

    -- 3b. Reassociate bag open logs to destination pond
    UPDATE bag_open_logs SET
      pond = v_to_pond.name,
      pond_id = p_to_pond_id::text,
      fish_stock = v_stock_label,
      fish_stock_id = v_dest_stock_instance_id
    WHERE (pond_id = p_from_pond_id::text OR LOWER(TRIM(COALESCE(pond, ''))) = LOWER(TRIM(v_from_pond.name)))
      AND (user_id = v_from_pond.user_id OR farm_id = v_from_pond.farm_id);

    -- 3c. Reassociate feed remaining logs to destination stock
    UPDATE feed_remaining_logs SET
      pond = v_to_pond.name,
      pond_id = p_to_pond_id::text,
      fish_stock = v_stock_label,
      fish_stock_id = v_dest_stock_instance_id
    WHERE (pond_id = p_from_pond_id::text OR LOWER(TRIM(COALESCE(pond, ''))) = LOWER(TRIM(v_from_pond.name)))
      AND (user_id = v_from_pond.user_id OR farm_id = v_from_pond.farm_id);

    -- 4. Reassociate all mortality entries to destination pond
    UPDATE mortality_entries SET
      pond_id = p_to_pond_id,
      pond_name = v_to_pond.name,
      fish_stock = v_stock_label,
      fish_stock_id = v_dest_stock_instance_id
    WHERE pond_id = p_from_pond_id;

    -- 5. Reassociate all treatment records to destination pond
    UPDATE treatment_records SET
      pond_id = p_to_pond_id,
      pond_name = v_to_pond.name,
      fish_stock = v_stock_label,
      fish_stock_id = v_dest_stock_instance_id
    WHERE pond_id = p_from_pond_id;

    -- 6. Reassociate pond reports (treatments and other issues)
    UPDATE pond_reports SET
      pond_id = p_to_pond_id,
      pond_name = v_to_pond.name,
      fish_stock_id = v_dest_stock_instance_id
    WHERE pond_id = p_from_pond_id;

    -- 7. Update fish count history pond association
    UPDATE fish_count_history SET
      pond_id = p_to_pond_id,
      pond_name = v_to_pond.name
    WHERE pond_id = p_from_pond_id;

    -- 8. Add fish count history entry for destination pond
    INSERT INTO fish_count_history (
      id, pond_id, pond_name, farm_id, previous_count, new_count, difference, changed_by, action_reason, created_at
    ) VALUES (
      gen_random_uuid(), p_to_pond_id, v_to_pond.name, COALESCE(v_to_pond.farm_id, v_from_pond.farm_id),
      0, v_from_pond.current_count, v_from_pond.current_count,
      p_transferred_by, 'Full stock transferred from ' || v_from_pond.name, NOW()
    );

    -- 9. Add fish count history entry for source pond
    INSERT INTO fish_count_history (
      id, pond_id, pond_name, farm_id, previous_count, new_count, difference, changed_by, action_reason, created_at
    ) VALUES (
      gen_random_uuid(), p_from_pond_id, v_from_pond.name, v_from_pond.farm_id,
      v_from_pond.current_count, 0, -v_from_pond.current_count,
      p_transferred_by, 'All fish transferred to ' || v_to_pond.name, NOW()
    );

    -- 10. Record stock events
    INSERT INTO stock_events (
      id, user_id, pond_id, farm_id, pond_name, date, species, count, cost, type, from_pond, batch, created_at
    ) VALUES (
      gen_random_uuid(), v_to_pond.user_id, p_to_pond_id, COALESCE(v_to_pond.farm_id, v_from_pond.farm_id),
      v_to_pond.name, v_date_label, v_from_pond.species, v_from_pond.current_count, v_cost_share,
      'Transfer', v_from_pond.name, v_stock_label, NOW()
    );

    INSERT INTO stock_events (
      id, user_id, pond_id, farm_id, pond_name, date, species, count, cost, type, cleared_date, batch, created_at
    ) VALUES (
      gen_random_uuid(), v_from_pond.user_id, p_from_pond_id, v_from_pond.farm_id,
      v_from_pond.name, v_date_label, v_from_pond.species, v_from_pond.current_count, v_cost_share,
      'Closed', v_date_label, v_stock_label, NOW()
    );

  ELSE
    -- =========================================================================
    -- B. PARTIAL (PERCENTAGE) FISH STOCK TRANSFER
    -- =========================================================================
    v_cost_share := ROUND(COALESCE(v_from_pond.total_cost, 0) * v_fraction, 2);
    v_init_dest := ROUND(v_from_init * v_fraction);
    IF v_init_dest <= 0 THEN
      v_init_dest := v_safe_count;
    END IF;

    -- 1. Update source pond with remaining count, cost, and stock instance ID
    UPDATE ponds SET
      current_count = GREATEST(0, v_from_pond.current_count - v_safe_count),
      initial_stock = GREATEST(v_from_pond.current_count - v_safe_count, v_from_init - v_init_dest),
      total_cost = GREATEST(0, COALESCE(v_from_pond.total_cost, 0) - v_cost_share),
      fish_stock_id = v_stock_instance_id,
      transfer_note = 'Transferred ' || v_safe_count || ' fish (' || ROUND(v_fraction * 100) || '%) to ' || v_to_pond.name || ' on ' || v_date_label
    WHERE id = p_from_pond_id;

    -- 2. Activate destination pond with transferred portion, preserving original stocking date & identity
    UPDATE ponds SET
      status = 'Active',
      species = v_from_pond.species,
      fish_stock = v_stock_label,
      fish_stock_id = v_dest_stock_instance_id,
      initial_stock = v_init_dest,
      current_count = v_safe_count,
      stocking_date = v_from_pond.stocking_date,
      stock_month = v_from_pond.stock_month,
      total_cost = v_cost_share,
      supplier = v_from_pond.supplier,
      avg_weight = v_from_pond.avg_weight,
      default_pellet = v_from_pond.default_pellet,
      transfer_note = v_safe_count || ' fish (' || ROUND(v_fraction * 100) || '%) received from ' || v_from_pond.name || ' on ' || v_date_label
    WHERE id = p_to_pond_id;

    -- 3. Proportionally allocate feeding records - strictly isolated to source pond
    FOR v_feed_rec IN
      SELECT * FROM feeding_records
      WHERE (pond_id = p_from_pond_id::text OR LOWER(TRIM(pond)) = LOWER(TRIM(v_from_pond.name)))
        AND (user_id = v_from_pond.user_id OR farm_id = v_from_pond.farm_id)
    LOOP
      v_morning_dest := ROUND(COALESCE(v_feed_rec.morning, 0) * v_fraction, 2);
      v_evening_dest := ROUND(COALESCE(v_feed_rec.evening, 0) * v_fraction, 2);

      -- Update source record with remaining quantity
      UPDATE feeding_records SET
        morning = GREATEST(0, COALESCE(v_feed_rec.morning, 0) - v_morning_dest),
        evening = GREATEST(0, COALESCE(v_feed_rec.evening, 0) - v_evening_dest),
        total = GREATEST(0, (COALESCE(v_feed_rec.morning, 0) - v_morning_dest) + (COALESCE(v_feed_rec.evening, 0) - v_evening_dest)),
        fish_stock = v_stock_label,
        fish_stock_id = v_stock_instance_id,
        pond_id = p_from_pond_id::text
      WHERE id = v_feed_rec.id;

      -- Insert allocated quantity record for destination pond
      INSERT INTO feeding_records (
        id, user_id, farm_id, date, month, year, pond, pond_id, brand, size,
        morning, evening, total, recorded_by, morning_time, evening_time, fish_stock, fish_stock_id, created_at
      ) VALUES (
        gen_random_uuid(), v_feed_rec.user_id, COALESCE(v_to_pond.farm_id, v_feed_rec.farm_id),
        v_feed_rec.date, v_feed_rec.month, v_feed_rec.year, v_to_pond.name, p_to_pond_id::text, v_feed_rec.brand, v_feed_rec.size,
        v_morning_dest, v_evening_dest, v_morning_dest + v_evening_dest,
        v_feed_rec.recorded_by, v_feed_rec.morning_time, v_feed_rec.evening_time, v_stock_label, v_dest_stock_instance_id, NOW()
      );
    END LOOP;

    -- 4. Proportionally allocate mortality records
    FOR v_mort_rec IN
      SELECT * FROM mortality_entries
      WHERE pond_id = p_from_pond_id
    LOOP
      v_mort_dest := ROUND(COALESCE(v_mort_rec.count, 0) * v_fraction);
      IF v_mort_dest > 0 THEN
        UPDATE mortality_entries SET
          count = GREATEST(0, COALESCE(v_mort_rec.count, 0) - v_mort_dest),
          fish_stock = v_stock_label,
          fish_stock_id = v_stock_instance_id
        WHERE id = v_mort_rec.id;

        INSERT INTO mortality_entries (
          id, user_id, pond_id, pond_name, farm_id, date, count, cause, notes, fish_stock, fish_stock_id, created_at
        ) VALUES (
          gen_random_uuid(), v_mort_rec.user_id, p_to_pond_id, v_to_pond.name, COALESCE(v_to_pond.farm_id, v_mort_rec.farm_id),
          v_mort_rec.date, v_mort_dest, v_mort_rec.cause,
          COALESCE(v_mort_rec.notes, '') || ' (Transferred from ' || v_from_pond.name || ')',
          v_stock_label, v_dest_stock_instance_id, NOW()
        );
      END IF;
    END LOOP;

    -- 5. Copy treatments to destination pond for medical reference
    FOR v_treat_rec IN
      SELECT * FROM treatment_records
      WHERE pond_id = p_from_pond_id
    LOOP
      INSERT INTO treatment_records (
        id, user_id, pond_id, pond_name, farm_id, date, cause, medicine, details, action_taken, remarks, fish_stock, fish_stock_id, recorded_by, created_at
      ) VALUES (
        gen_random_uuid(), v_treat_rec.user_id, p_to_pond_id, v_to_pond.name, COALESCE(v_to_pond.farm_id, v_treat_rec.farm_id),
        v_treat_rec.date, v_treat_rec.cause, v_treat_rec.medicine, v_treat_rec.details, v_treat_rec.action_taken,
        COALESCE(v_treat_rec.remarks, '') || ' (Medical reference from ' || v_from_pond.name || ')',
        v_stock_label, v_dest_stock_instance_id, v_treat_rec.recorded_by, NOW()
      );
    END LOOP;

    -- 5b. Copy pond_reports (treatment & other issues) to destination pond for medical and incident reference
    INSERT INTO pond_reports (
      id, user_id, farm_id, pond_id, pond_name, fish_stock_id, report_type,
      report_date, issue, description, medicine, cause, treatment_details,
      action_taken, remarks, notes, treatment_id, recorded_by, created_by, created_at
    )
    SELECT
      gen_random_uuid(), user_id, COALESCE(v_to_pond.farm_id, farm_id), p_to_pond_id, v_to_pond.name, v_dest_stock_instance_id, report_type,
      report_date, issue, description, medicine, cause, treatment_details,
      action_taken, COALESCE(remarks, '') || ' (From ' || v_from_pond.name || ')', notes, treatment_id, recorded_by, created_by, NOW()
    FROM pond_reports
    WHERE pond_id = p_from_pond_id;

    -- 6. Log fish count history
    INSERT INTO fish_count_history (
      id, pond_id, pond_name, farm_id, previous_count, new_count, difference, changed_by, action_reason, created_at
    ) VALUES (
      gen_random_uuid(), p_from_pond_id, v_from_pond.name, v_from_pond.farm_id,
      v_from_pond.current_count, v_from_pond.current_count - v_safe_count, -v_safe_count,
      p_transferred_by, 'Transferred ' || v_safe_count || ' fish (' || ROUND(v_fraction * 100) || '%) to ' || v_to_pond.name, NOW()
    );

    INSERT INTO fish_count_history (
      id, pond_id, pond_name, farm_id, previous_count, new_count, difference, changed_by, action_reason, created_at
    ) VALUES (
      gen_random_uuid(), p_to_pond_id, v_to_pond.name, COALESCE(v_to_pond.farm_id, v_from_pond.farm_id),
      0, v_safe_count, v_safe_count,
      p_transferred_by, 'Received ' || v_safe_count || ' fish (' || ROUND(v_fraction * 100) || '%) from ' || v_from_pond.name, NOW()
    );

    -- 7. Record stock event for destination pond
    INSERT INTO stock_events (
      id, user_id, pond_id, farm_id, pond_name, date, species, count, cost, type, from_pond, batch, created_at
    ) VALUES (
      gen_random_uuid(), v_to_pond.user_id, p_to_pond_id, COALESCE(v_to_pond.farm_id, v_from_pond.farm_id),
      v_to_pond.name, v_date_label, v_from_pond.species, v_safe_count, v_cost_share,
      'Transfer', v_from_pond.name, v_stock_label, NOW()
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Fish stock successfully transferred.',
    'isFullTransfer', v_is_full,
    'transferredCount', v_safe_count,
    'fromPondId', p_from_pond_id,
    'toPondId', p_to_pond_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION transfer_fish_stock(UUID, UUID, NUMERIC, INTEGER, TEXT, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION transfer_fish_stock(UUID, UUID, NUMERIC, INTEGER, TEXT, TEXT) TO authenticated, anon;

-- Ensure fish_stock_id and pond_name exist across tables
ALTER TABLE public.ponds ADD COLUMN IF NOT EXISTS fish_stock TEXT;
ALTER TABLE public.ponds ADD COLUMN IF NOT EXISTS fish_stock_id TEXT;
ALTER TABLE public.stock_events ADD COLUMN IF NOT EXISTS batch TEXT;
ALTER TABLE public.mortality_entries ADD COLUMN IF NOT EXISTS fish_stock TEXT;
ALTER TABLE public.mortality_entries ADD COLUMN IF NOT EXISTS fish_stock_id TEXT;
ALTER TABLE public.mortality_entries ADD COLUMN IF NOT EXISTS pond_name TEXT;
ALTER TABLE public.treatment_records ADD COLUMN IF NOT EXISTS fish_stock TEXT;
ALTER TABLE public.treatment_records ADD COLUMN IF NOT EXISTS fish_stock_id TEXT;
ALTER TABLE public.treatment_records ADD COLUMN IF NOT EXISTS pond_name TEXT;
ALTER TABLE public.bag_open_logs ADD COLUMN IF NOT EXISTS pond TEXT;
ALTER TABLE public.bag_open_logs ADD COLUMN IF NOT EXISTS pond_id TEXT;
ALTER TABLE public.bag_open_logs ADD COLUMN IF NOT EXISTS fish_stock TEXT;
ALTER TABLE public.bag_open_logs ADD COLUMN IF NOT EXISTS fish_stock_id TEXT;
ALTER TABLE public.feed_remaining_logs ADD COLUMN IF NOT EXISTS pond TEXT;
ALTER TABLE public.feed_remaining_logs ADD COLUMN IF NOT EXISTS pond_id TEXT;
ALTER TABLE public.feed_remaining_logs ADD COLUMN IF NOT EXISTS fish_stock TEXT;
ALTER TABLE public.feed_remaining_logs ADD COLUMN IF NOT EXISTS fish_stock_id TEXT;
ALTER TABLE public.pond_reports ADD COLUMN IF NOT EXISTS pond_name TEXT;
ALTER TABLE public.pond_reports ADD COLUMN IF NOT EXISTS fish_stock_id TEXT;



