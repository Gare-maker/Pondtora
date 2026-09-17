-- ==============================================================================
-- PONDTORA: DATABASE RESET SCRIPT (PRESERVE ADMIN & PLATFORM SETTINGS)
-- ==============================================================================
-- This script completely wipes all farm data, staff members, logs, financials,
-- and regular user accounts so emails can be reused for fresh testing.
-- The Admin Dashboard account (edafejesugarec@gmail.com / admin roles) and
-- platform settings are safely preserved.
-- ==============================================================================

BEGIN;

-- 1. Clear all operational farm and investor records
TRUNCATE TABLE pond_reports CASCADE;
TRUNCATE TABLE investment_payments CASCADE;
TRUNCATE TABLE investments CASCADE;
TRUNCATE TABLE investors CASCADE;
TRUNCATE TABLE knowledge_results CASCADE;
TRUNCATE TABLE compatibility_results CASCADE;
TRUNCATE TABLE invoices CASCADE;
TRUNCATE TABLE price_groups CASCADE;
TRUNCATE TABLE customers CASCADE;
TRUNCATE TABLE treatment_records CASCADE;
TRUNCATE TABLE mortality_entries CASCADE;
TRUNCATE TABLE revenues CASCADE;
TRUNCATE TABLE expenses CASCADE;
TRUNCATE TABLE reports CASCADE;
TRUNCATE TABLE feed_remaining_logs CASCADE;
TRUNCATE TABLE bag_open_logs CASCADE;
TRUNCATE TABLE feeding_records CASCADE;
TRUNCATE TABLE feed_inventory CASCADE;
TRUNCATE TABLE stock_events CASCADE;
TRUNCATE TABLE ponds CASCADE;

-- 2. Clear all staff and farm assignments
TRUNCATE TABLE staff_permissions CASCADE;
TRUNCATE TABLE staff_farm_assignments CASCADE;
TRUNCATE TABLE staff_invitations CASCADE;
TRUNCATE TABLE staff_members CASCADE;
TRUNCATE TABLE farms CASCADE;

-- 3. Clear key-value store if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kv_store_1da59a07') THEN
    EXECUTE 'TRUNCATE TABLE kv_store_1da59a07 CASCADE';
  END IF;
END $$;

-- 4. Clear invoice settings for non-admin accounts
DELETE FROM invoice_settings
WHERE user_id NOT IN (
  SELECT id FROM auth.users WHERE LOWER(email) = 'edafejesugarec@gmail.com'
  UNION
  SELECT id FROM user_profiles WHERE role IN ('admin', 'superadmin')
);

-- 5. Delete all regular user profiles (preserve admin)
DELETE FROM user_profiles
WHERE LOWER(email) != 'edafejesugarec@gmail.com'
  AND (role IS NULL OR role NOT IN ('admin', 'superadmin'));

-- 6. Delete all regular users from Supabase Auth (auth.users)
-- This frees up their emails so they can be registered anew
DELETE FROM auth.users
WHERE LOWER(email) != 'edafejesugarec@gmail.com'
  AND id NOT IN (SELECT id FROM user_profiles WHERE role IN ('admin', 'superadmin'));

COMMIT;

-- Verification query
SELECT
  (SELECT COUNT(*) FROM auth.users) AS remaining_auth_users,
  (SELECT COUNT(*) FROM user_profiles) AS remaining_profiles,
  (SELECT COUNT(*) FROM farms) AS remaining_farms,
  (SELECT COUNT(*) FROM staff_members) AS remaining_staff,
  (SELECT COUNT(*) FROM ponds) AS remaining_ponds;
