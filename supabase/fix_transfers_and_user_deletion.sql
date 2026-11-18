 

-- ==============================================================================
-- 2. PERMANENT USER DELETION STORED PROCEDURES
-- ==============================================================================
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
  -- Fallback: ensure public profile and direct public records are removed
  DELETE FROM user_profiles WHERE id = target_user_id;
  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_completely(UUID) TO authenticated, anon;


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
