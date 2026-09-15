-- ==============================================================================
-- PONDTORA: Delete All User Accounts Except Master Admin
-- ==============================================================================
-- Instructions:
-- 1. Open your Supabase Dashboard:
--    https://supabase.com/dashboard/project/fegtvgfkxueorybefthj/sql/new
-- 2. Paste this entire script into the SQL Editor.
-- 3. Click "Run" (or press Ctrl + Enter / Cmd + Enter).
-- 4. Result:
--    - All non-admin user accounts (auth.users and user_profiles) will be permanently deleted.
--    - Master Admin account (edafejesugarec@gmail.com) and any admin accounts are strictly preserved.
--    - NO database tables, schemas, triggers, or functions are dropped or tampered with.
--    - You and your users can now start afresh with clean registrations.
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_master_admin_email TEXT := 'edafejesugarec@gmail.com';
  v_admin_ids UUID[];
  v_deleted_count INTEGER := 0;
BEGIN
  -- 1. Identify all admin IDs to preserve
  SELECT ARRAY_AGG(DISTINCT id) INTO v_admin_ids
  FROM (
    SELECT id FROM auth.users WHERE LOWER(email) = v_master_admin_email
    UNION
    SELECT id FROM user_profiles WHERE role IN ('admin', 'superadmin') OR LOWER(email) = v_master_admin_email
  ) sub;

  IF v_admin_ids IS NULL THEN
    v_admin_ids := ARRAY[]::UUID[];
  END IF;

  RAISE NOTICE 'Preserving Admin Account IDs: %', v_admin_ids;

  -- 2. Explicitly clean operational child tables for all non-admin accounts
  DELETE FROM pond_reports WHERE user_id NOT = ANY(v_admin_ids);
  DELETE FROM investment_payments WHERE user_id NOT = ANY(v_admin_ids);
  DELETE FROM investments WHERE user_id NOT = ANY(v_admin_ids);
  DELETE FROM investors WHERE user_id NOT = ANY(v_admin_ids);
  DELETE FROM invoices WHERE user_id NOT = ANY(v_admin_ids);
  DELETE FROM invoice_settings WHERE user_id NOT = ANY(v_admin_ids);
  DELETE FROM mortality_entries WHERE user_id NOT = ANY(v_admin_ids);
  DELETE FROM treatment_records WHERE user_id NOT = ANY(v_admin_ids);
  DELETE FROM reports WHERE user_id NOT = ANY(v_admin_ids);
  DELETE FROM revenues WHERE user_id NOT = ANY(v_admin_ids);
  DELETE FROM expenses WHERE user_id NOT = ANY(v_admin_ids);
  DELETE FROM feed_remaining_logs WHERE user_id NOT = ANY(v_admin_ids);
  DELETE FROM bag_open_logs WHERE user_id NOT = ANY(v_admin_ids);
  DELETE FROM feeding_records WHERE user_id NOT = ANY(v_admin_ids);
  DELETE FROM feed_inventory WHERE user_id NOT = ANY(v_admin_ids);
  DELETE FROM stock_events WHERE user_id NOT = ANY(v_admin_ids);
  DELETE FROM ponds WHERE user_id NOT = ANY(v_admin_ids);
  DELETE FROM staff_permissions WHERE staff_id IN (SELECT id FROM staff_members WHERE user_id NOT = ANY(v_admin_ids));
  DELETE FROM staff_farm_assignments WHERE staff_id IN (SELECT id FROM staff_members WHERE user_id NOT = ANY(v_admin_ids));
  DELETE FROM staff_invitations WHERE invited_by NOT = ANY(v_admin_ids);
  DELETE FROM staff_members WHERE (user_id NOT = ANY(v_admin_ids)) OR (staff_auth_id IS NOT NULL AND staff_auth_id NOT = ANY(v_admin_ids));
  DELETE FROM farms WHERE user_id NOT = ANY(v_admin_ids);

  -- 3. Delete non-admin profiles from user_profiles table
  DELETE FROM user_profiles 
  WHERE id NOT = ANY(v_admin_ids) 
    AND LOWER(email) != v_master_admin_email;

  -- 4. Delete sessions and refresh tokens for non-admin accounts to prevent ghost logins
  DELETE FROM auth.refresh_tokens WHERE user_id NOT = ANY(v_admin_ids);
  DELETE FROM auth.sessions WHERE user_id NOT = ANY(v_admin_ids);

  -- 5. Delete non-admin accounts from auth.users
  DELETE FROM auth.users 
  WHERE id NOT = ANY(v_admin_ids) 
    AND LOWER(email) != v_master_admin_email;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE 'Successfully purged non-admin user accounts. Ready to start afresh.';

END $$;

COMMIT;

-- ==============================================================================
-- Verification: Display preserved admin accounts
-- ==============================================================================
SELECT 
  u.id AS auth_user_id,
  u.email,
  p.name AS admin_name,
  p.role AS user_role,
  u.created_at,
  u.last_sign_in_at
FROM auth.users u
LEFT JOIN user_profiles p ON p.id = u.id
ORDER BY u.created_at ASC;
