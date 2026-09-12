-- ==============================================================================
-- PONDTORA: Clear Operational Data While Keeping User Accounts & Logins
-- ==============================================================================
--
-- Instructions:
-- 1. Open your Supabase Dashboard:
--    https://supabase.com/dashboard/project/fegtvgfkxueorybefthj/sql/new
-- 2. Paste this entire script into the SQL Editor.
-- 3. Click "Run" (or Ctrl+Enter).
-- 4. Result: All operational data (ponds, feeding records, expenses, revenues,
--    invoices, logs, etc.) will be wiped clean.
--    Your user accounts (auth.users and user_profiles) will remain 100% intact.
--    Each user will have one fresh, clean farm to start afresh immediately.
-- ==============================================================================

BEGIN;

-- 1. Truncate all operational and activity tables (CASCADE cleans all dependencies)
TRUNCATE TABLE 
  stock_events,
  mortality_entries,
  treatment_records,
  feeding_records,
  bag_open_logs,
  feed_remaining_logs,
  feed_inventory,
  expenses,
  revenues,
  invoices,
  invoice_settings,
  customers,
  price_groups,
  reports,
  knowledge_results,
  compatibility_results,
  staff_permissions,
  staff_farm_assignments,
  staff_invitations,
  staff_members,
  ponds,
  farms
CASCADE;

-- 2. Automatically re-seed one clean primary farm for each existing user
INSERT INTO farms (id, user_id, name, city, state, country)
SELECT 
  gen_random_uuid(),
  up.id,
  COALESCE(NULLIF(TRIM(up.farm_name), ''), 'Main Farm'),
  COALESCE(up.city, ''),
  COALESCE(up.state, ''),
  COALESCE(NULLIF(TRIM(up.country), ''), 'Nigeria')
FROM user_profiles up;

-- 3. Reset any default invoice settings for each user
INSERT INTO invoice_settings (user_id, farm_name, invoice_prefix, tax_rate)
SELECT 
  up.id,
  COALESCE(NULLIF(TRIM(up.farm_name), ''), 'Main Farm'),
  'INV',
  0
FROM user_profiles up
ON CONFLICT (user_id) DO NOTHING;

-- 4. Ensure all columns exist on ponds and feeding_records for seamless compatibility
ALTER TABLE ponds ADD COLUMN IF NOT EXISTS length_ft TEXT;
ALTER TABLE ponds ADD COLUMN IF NOT EXISTS width_ft TEXT;
ALTER TABLE ponds ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE ponds ADD COLUMN IF NOT EXISTS default_pellet TEXT;
ALTER TABLE ponds ADD COLUMN IF NOT EXISTS max_kg_by_pallet JSONB;
ALTER TABLE ponds ADD COLUMN IF NOT EXISTS supplier TEXT;
ALTER TABLE ponds ADD COLUMN IF NOT EXISTS transfer_note TEXT;
ALTER TABLE feeding_records ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE revenues ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]'::jsonb;

COMMIT;

-- ==============================================================================
-- Verification Summary
-- ==============================================================================
SELECT 
  (SELECT COUNT(*) FROM auth.users) AS preserved_auth_users,
  (SELECT COUNT(*) FROM user_profiles) AS preserved_user_profiles,
  (SELECT COUNT(*) FROM farms) AS fresh_primary_farms,
  (SELECT COUNT(*) FROM ponds) AS active_ponds_remaining,
  (SELECT COUNT(*) FROM feeding_records) AS feeding_records_remaining,
  (SELECT COUNT(*) FROM expenses) AS expenses_remaining,
  (SELECT COUNT(*) FROM revenues) AS revenues_remaining,
  (SELECT COUNT(*) FROM invoices) AS invoices_remaining;
