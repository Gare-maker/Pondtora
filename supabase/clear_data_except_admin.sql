-- ==============================================================================
-- PONDTORA: COMPLETE DATABASE PURGE SCRIPT (ONLY ADMIN REMAINS)
-- ==============================================================================

BEGIN;

-- 1. Wipe all operational farm records, logs, financials, reports, invoices & investors
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

-- 2. Wipe all staff permissions, farm assignments, invitations, staff members & farms
TRUNCATE TABLE staff_permissions CASCADE;
TRUNCATE TABLE staff_farm_assignments CASCADE;
TRUNCATE TABLE staff_invitations CASCADE;
TRUNCATE TABLE staff_members CASCADE;
TRUNCATE TABLE farms CASCADE;
TRUNCATE TABLE invoice_settings CASCADE;

-- 3. Wipe KV store if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kv_store_1da59a07') THEN
    EXECUTE 'TRUNCATE TABLE kv_store_1da59a07 CASCADE';
  END IF;
END $$;

-- 4. Delete all non-admin user profiles
DELETE FROM user_profiles
WHERE LOWER(email) NOT IN ('edafejesugarec@gmail.com');

-- 5. Set the administrator profile strictly as superadmin with a valid non-null farm_name
UPDATE user_profiles
SET
  role = 'superadmin',
  status = 'Active',
  farm_name = 'Pondtora HQ'
WHERE LOWER(email) = 'edafejesugarec@gmail.com';

-- 6. Delete all non-admin users from Supabase Auth (auth.users)
DELETE FROM auth.users
WHERE LOWER(email) NOT IN ('edafejesugarec@gmail.com');

COMMIT;

-- 7. Verification results check
SELECT
  (SELECT COUNT(*) FROM auth.users) AS remaining_auth_users,
  (SELECT COUNT(*) FROM user_profiles) AS remaining_user_profiles,
  (SELECT COUNT(*) FROM farms) AS remaining_farms,
  (SELECT COUNT(*) FROM staff_members) AS remaining_staff_members,
  (SELECT COUNT(*) FROM ponds) AS remaining_ponds;
