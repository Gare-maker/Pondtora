-- ==============================================================================
-- PONDTORA: Purge All User Accounts & Operational Data Except Master Admin
-- ==============================================================================
-- Instructions:
-- 1. Open your Supabase Dashboard SQL Editor:
--    https://supabase.com/dashboard/project/fegtvgfkxueorybefthj/sql/new
-- 2. Paste this entire script into the SQL Editor.
-- 3. Click "Run" (or press Ctrl + Enter / Cmd + Enter).
-- 4. Result:
--    - All non-admin user accounts (auth.users and user_profiles) are permanently deleted.
--    - Master Admin account (edafejesugarec@gmail.com) and any superadmins are strictly preserved.
--    - All operational data buckets (ponds, feedings, records, logs, invoices) are wiped clean ("empty buckets").
--    - A clean primary farm is preserved/created for the admin account.
--    - The emails previously registered (User A, staff, etc.) are 100% freed to start afresh.
--    - Installs the instant staff password provisioning RPC function.
--    - NO schemas, tables, triggers, or indexes are dropped.
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_master_admin_email TEXT := 'edafejesugarec@gmail.com';
  v_admin_ids UUID[];
  v_wipe_operational_data BOOLEAN := TRUE; -- Set TRUE to clear test ponds/feedings/records for empty buckets
  v_deleted_auth_count INTEGER := 0;
  v_deleted_prof_count INTEGER := 0;
BEGIN
  -- 1. Identify all admin IDs to preserve
  SELECT ARRAY_AGG(DISTINCT id) INTO v_admin_ids
  FROM (
    SELECT id FROM auth.users WHERE LOWER(email) = LOWER(v_master_admin_email)
    UNION
    SELECT id FROM user_profiles WHERE role IN ('admin', 'superadmin') OR LOWER(email) = LOWER(v_master_admin_email)
  ) sub;

  IF v_admin_ids IS NULL OR array_length(v_admin_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Safety check failed: Master admin account % not found! Aborting to prevent accidental lock-out.', v_master_admin_email;
  END IF;

  RAISE NOTICE 'Preserving Admin Account IDs: %', v_admin_ids;

  -- 2. Explicitly clean all operational child tables
  IF v_wipe_operational_data THEN
    -- Complete empty buckets for operational records
    DELETE FROM pond_reports;
    DELETE FROM investment_payments;
    DELETE FROM investments;
    DELETE FROM investors;
    DELETE FROM invoices;
    DELETE FROM invoice_settings WHERE user_id NOT = ANY(v_admin_ids);
    DELETE FROM customers;
    DELETE FROM price_groups;
    DELETE FROM knowledge_results;
    DELETE FROM compatibility_results;
    DELETE FROM mortality_entries;
    DELETE FROM treatment_records;
    DELETE FROM reports;
    DELETE FROM revenues;
    DELETE FROM expenses;
    DELETE FROM feed_remaining_logs;
    DELETE FROM bag_open_logs;
    DELETE FROM feeding_records;
    DELETE FROM feed_inventory;
    DELETE FROM stock_events;
    DELETE FROM ponds;
    DELETE FROM staff_permissions;
    DELETE FROM staff_farm_assignments;
    DELETE FROM staff_invitations;
    DELETE FROM staff_members;
    DELETE FROM farms WHERE user_id NOT = ANY(v_admin_ids);
  ELSE
    -- Non-admin data cleanup only
    DELETE FROM pond_reports WHERE user_id NOT = ANY(v_admin_ids);
    DELETE FROM investment_payments WHERE user_id NOT = ANY(v_admin_ids);
    DELETE FROM investments WHERE user_id NOT = ANY(v_admin_ids);
    DELETE FROM investors WHERE user_id NOT = ANY(v_admin_ids);
    DELETE FROM invoices WHERE user_id NOT = ANY(v_admin_ids);
    DELETE FROM invoice_settings WHERE user_id NOT = ANY(v_admin_ids);
    DELETE FROM customers WHERE user_id NOT = ANY(v_admin_ids);
    DELETE FROM price_groups WHERE user_id NOT = ANY(v_admin_ids);
    DELETE FROM knowledge_results WHERE user_id NOT = ANY(v_admin_ids);
    DELETE FROM compatibility_results WHERE user_id NOT = ANY(v_admin_ids);
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
  END IF;

  -- 3. Delete non-admin profiles from user_profiles table
  DELETE FROM user_profiles 
  WHERE id NOT = ANY(v_admin_ids) 
    AND LOWER(email) != LOWER(v_master_admin_email);
  GET DIAGNOSTICS v_deleted_prof_count = ROW_COUNT;

  -- 4. Delete sessions, identities, and refresh tokens for non-admin accounts
  DELETE FROM auth.refresh_tokens WHERE user_id NOT = ANY(v_admin_ids);
  DELETE FROM auth.sessions WHERE user_id NOT = ANY(v_admin_ids);
  BEGIN
    DELETE FROM auth.identities WHERE user_id NOT = ANY(v_admin_ids);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 5. Delete non-admin accounts from auth.users (frees email for fresh signups)
  DELETE FROM auth.users 
  WHERE id NOT = ANY(v_admin_ids) 
    AND LOWER(email) != LOWER(v_master_admin_email);
  GET DIAGNOSTICS v_deleted_auth_count = ROW_COUNT;

  -- 6. Clean storage objects if storage schema exists
  BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
      DELETE FROM storage.objects WHERE owner NOT = ANY(v_admin_ids);
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 7. Ensure Admin has exactly one clean primary farm ready
  IF NOT EXISTS (SELECT 1 FROM farms WHERE user_id = ANY(v_admin_ids)) THEN
    INSERT INTO farms (id, user_id, name, city, state, country)
    SELECT 
      gen_random_uuid(),
      u.id,
      'Main Farm',
      'Lagos',
      'Lagos',
      'Nigeria'
    FROM auth.users u
    WHERE u.id = ANY(v_admin_ids)
    LIMIT 1;
  END IF;

  RAISE NOTICE 'Successfully purged: % auth accounts and % user profiles.', v_deleted_auth_count, v_deleted_prof_count;
END $$;

-- 8. Add compatibility columns to staff_members if not present
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS farms JSONB DEFAULT '[]'::jsonb;
ALTER TABLE ponds ADD COLUMN IF NOT EXISTS length_ft TEXT;
ALTER TABLE ponds ADD COLUMN IF NOT EXISTS width_ft TEXT;
ALTER TABLE ponds ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE ponds ADD COLUMN IF NOT EXISTS default_pellet TEXT;
ALTER TABLE ponds ADD COLUMN IF NOT EXISTS max_kg_by_pallet JSONB;
ALTER TABLE ponds ADD COLUMN IF NOT EXISTS supplier TEXT;
ALTER TABLE ponds ADD COLUMN IF NOT EXISTS transfer_note TEXT;

-- 9. Install RPC to provision/update staff login directly with confirmed password
CREATE OR REPLACE FUNCTION provision_staff_auth_user(
  p_email TEXT,
  p_password TEXT,
  p_name TEXT,
  p_owner_id UUID DEFAULT NULL,
  p_staff_id UUID DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions AS $$
DECLARE
  v_uid UUID;
  clean_email TEXT;
  v_encrypted_pw TEXT;
BEGIN
  clean_email := LOWER(TRIM(p_email));
  IF clean_email = '' OR p_password IS NULL OR LENGTH(p_password) < 6 THEN
    RAISE EXCEPTION 'Valid email and password (min 6 chars) required';
  END IF;

  v_encrypted_pw := crypt(p_password, gen_salt('bf'));

  -- Check if auth user already exists
  SELECT id INTO v_uid FROM auth.users WHERE LOWER(email) = clean_email LIMIT 1;

  IF v_uid IS NOT NULL THEN
    -- Update existing auth user: set password, confirm email, update metadata
    UPDATE auth.users
    SET 
      encrypted_password = v_encrypted_pw,
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
        'name', p_name,
        'role', 'staff',
        'owner_id', p_owner_id,
        'staff_id', p_staff_id
      ),
      updated_at = NOW()
    WHERE id = v_uid;
  ELSE
    -- Insert new confirmed auth user
    v_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_uid,
      'authenticated',
      'authenticated',
      clean_email,
      v_encrypted_pw,
      NOW(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object(
        'name', p_name,
        'role', 'staff',
        'owner_id', p_owner_id,
        'staff_id', p_staff_id
      ),
      NOW(),
      NOW()
    );

    -- Insert into auth.identities for email/password login
    BEGIN
      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid()::text,
        v_uid,
        jsonb_build_object('sub', v_uid::text, 'email', clean_email),
        'email',
        clean_email,
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT (provider, provider_id) DO UPDATE
      SET user_id = v_uid, identity_data = jsonb_build_object('sub', v_uid::text, 'email', clean_email), updated_at = NOW();
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION provision_staff_auth_user(TEXT, TEXT, TEXT, UUID, UUID) TO authenticated, anon;

-- 10. Update check_email_exists to strictly ignore purged orphaned rows
CREATE OR REPLACE FUNCTION check_email_exists(lookup_email TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  clean_email TEXT;
BEGIN
  clean_email := LOWER(TRIM(lookup_email));
  IF clean_email = '' OR clean_email IS NULL THEN
    RETURN FALSE;
  END IF;

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

COMMIT;

-- ==============================================================================
-- Verification Summary
-- ==============================================================================
SELECT 
  u.id AS preserved_admin_id,
  u.email AS admin_email,
  p.name AS admin_name,
  p.role AS admin_role,
  (SELECT COUNT(*) FROM auth.users WHERE LOWER(email) != 'edafejesugarec@gmail.com') AS other_users_remaining,
  (SELECT COUNT(*) FROM farms) AS active_farms,
  (SELECT COUNT(*) FROM ponds) AS active_ponds
FROM auth.users u
LEFT JOIN user_profiles p ON p.id = u.id
WHERE LOWER(u.email) = 'edafejesugarec@gmail.com';
