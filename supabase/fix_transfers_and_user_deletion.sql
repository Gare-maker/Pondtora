-- ==============================================================================
-- Migration: Fix Fish Stock Transfers Between Ponds & Permanent User Deletion
-- Pondtora Farm Aquaculture Management
-- ==============================================================================

-- ==============================================================================
-- 1. ATOMIC FISH STOCK TRANSFER STORED PROCEDURE
-- ==============================================================================
CREATE OR REPLACE FUNCTION transfer_fish_stock(
  p_from_pond_id UUID,
  p_to_pond_id UUID,
  p_percentage NUMERIC DEFAULT 100,
  p_count INTEGER DEFAULT NULL,
  p_date TEXT DEFAULT NULL,
  p_transferred_by TEXT DEFAULT 'User'
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
  v_cost_share NUMERIC;
  v_init_dest INTEGER;
  v_from_init INTEGER;
  v_feed_rec RECORD;
  v_morning_dest NUMERIC;
  v_evening_dest NUMERIC;
  v_mort_rec RECORD;
  v_mort_dest INTEGER;
  v_treat_rec RECORD;
  v_new_feed_id UUID;
  v_new_mort_id UUID;
  v_new_treat_id UUID;
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

  v_from_init := COALESCE(v_from_pond.initial_stock, v_from_pond.current_count);
  IF v_from_init <= 0 THEN
    v_from_init := v_from_pond.current_count;
  END IF;

  IF v_is_full THEN
    -- =========================================================================
    -- A. 100% FISH STOCK TRANSFER
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
      max_kg_by_pallet = '{}'::jsonb,
      transfer_note = 'All fish transferred to ' || v_to_pond.name || ' on ' || v_date_label
    WHERE id = p_from_pond_id;

    -- 2. Activate destination pond with complete stock details
    UPDATE ponds SET
      status = 'Active',
      species = v_from_pond.species,
      fish_stock = v_stock_label,
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

    -- 3. Reassociate all feeding records to destination pond
    UPDATE feeding_records SET
      pond = v_to_pond.name,
      fish_stock = v_stock_label
    WHERE (LOWER(TRIM(pond)) = LOWER(TRIM(v_from_pond.name)) OR fish_stock = v_stock_label)
      AND (user_id = v_from_pond.user_id OR farm_id = v_from_pond.farm_id);

    -- 4. Reassociate all mortality entries to destination pond
    UPDATE mortality_entries SET
      pond_id = p_to_pond_id,
      fish_stock = v_stock_label
    WHERE pond_id = p_from_pond_id;

    -- 5. Reassociate all treatment records to destination pond
    UPDATE treatment_records SET
      pond_id = p_to_pond_id,
      fish_stock = v_stock_label
    WHERE pond_id = p_from_pond_id;

    -- 6. Reassociate pond reports
    UPDATE pond_reports SET
      pond_id = p_to_pond_id,
      fish_stock_id = v_stock_label
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

    -- 1. Update source pond with remaining count and cost
    UPDATE ponds SET
      current_count = GREATEST(0, v_from_pond.current_count - v_safe_count),
      initial_stock = GREATEST(v_from_pond.current_count - v_safe_count, v_from_init - v_init_dest),
      total_cost = GREATEST(0, COALESCE(v_from_pond.total_cost, 0) - v_cost_share),
      transfer_note = 'Transferred ' || v_safe_count || ' fish (' || ROUND(v_fraction * 100) || '%) to ' || v_to_pond.name || ' on ' || v_date_label
    WHERE id = p_from_pond_id;

    -- 2. Activate destination pond with transferred portion, preserving original stocking date & identity
    UPDATE ponds SET
      status = 'Active',
      species = v_from_pond.species,
      fish_stock = v_stock_label,
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

    -- 3. Proportionally allocate feeding records
    FOR v_feed_rec IN
      SELECT * FROM feeding_records
      WHERE (LOWER(TRIM(pond)) = LOWER(TRIM(v_from_pond.name)) OR fish_stock = v_stock_label)
        AND (user_id = v_from_pond.user_id OR farm_id = v_from_pond.farm_id)
    LOOP
      v_morning_dest := ROUND(COALESCE(v_feed_rec.morning, 0) * v_fraction, 2);
      v_evening_dest := ROUND(COALESCE(v_feed_rec.evening, 0) * v_fraction, 2);

      -- Update source record with remaining quantity
      UPDATE feeding_records SET
        morning = GREATEST(0, COALESCE(v_feed_rec.morning, 0) - v_morning_dest),
        evening = GREATEST(0, COALESCE(v_feed_rec.evening, 0) - v_evening_dest),
        total = GREATEST(0, (COALESCE(v_feed_rec.morning, 0) - v_morning_dest) + (COALESCE(v_feed_rec.evening, 0) - v_evening_dest)),
        fish_stock = v_stock_label
      WHERE id = v_feed_rec.id;

      -- Insert allocated quantity record for destination pond
      INSERT INTO feeding_records (
        id, user_id, farm_id, date, month, year, pond, brand, size,
        morning, evening, total, recorded_by, morning_time, evening_time, fish_stock, created_at
      ) VALUES (
        gen_random_uuid(), v_feed_rec.user_id, COALESCE(v_to_pond.farm_id, v_feed_rec.farm_id),
        v_feed_rec.date, v_feed_rec.month, v_feed_rec.year, v_to_pond.name, v_feed_rec.brand, v_feed_rec.size,
        v_morning_dest, v_evening_dest, v_morning_dest + v_evening_dest,
        v_feed_rec.recorded_by, v_feed_rec.morning_time, v_feed_rec.evening_time, v_stock_label, NOW()
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
          fish_stock = v_stock_label
        WHERE id = v_mort_rec.id;

        INSERT INTO mortality_entries (
          id, user_id, pond_id, farm_id, date, count, cause, notes, fish_stock, created_at
        ) VALUES (
          gen_random_uuid(), v_mort_rec.user_id, p_to_pond_id, COALESCE(v_to_pond.farm_id, v_mort_rec.farm_id),
          v_mort_rec.date, v_mort_dest, v_mort_rec.cause,
          COALESCE(v_mort_rec.notes, '') || ' (Transferred from ' || v_from_pond.name || ')',
          v_stock_label, NOW()
        );
      END IF;
    END LOOP;

    -- 5. Copy treatments to destination pond for medical reference
    FOR v_treat_rec IN
      SELECT * FROM treatment_records
      WHERE pond_id = p_from_pond_id
    LOOP
      INSERT INTO treatment_records (
        id, user_id, pond_id, farm_id, date, cause, medicine, details, action_taken, remarks, fish_stock, recorded_by, created_at
      ) VALUES (
        gen_random_uuid(), v_treat_rec.user_id, p_to_pond_id, COALESCE(v_to_pond.farm_id, v_treat_rec.farm_id),
        v_treat_rec.date, v_treat_rec.cause, v_treat_rec.medicine, v_treat_rec.details, v_treat_rec.action_taken,
        COALESCE(v_treat_rec.remarks, '') || ' (Medical reference from ' || v_from_pond.name || ')',
        v_stock_label, v_treat_rec.recorded_by, NOW()
      );
    END LOOP;

    -- 5b. Copy pond_reports (treatment & other issues) to destination pond for medical and incident reference
    INSERT INTO pond_reports (
      id, user_id, farm_id, pond_id, fish_stock_id, report_type,
      report_date, issue, description, medicine, cause, treatment_details,
      action_taken, remarks, notes, treatment_id, recorded_by, created_by, created_at
    )
    SELECT
      gen_random_uuid(), user_id, COALESCE(v_to_pond.farm_id, farm_id), p_to_pond_id, v_stock_label, report_type,
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

GRANT EXECUTE ON FUNCTION transfer_fish_stock(UUID, UUID, NUMERIC, INTEGER, TEXT, TEXT) TO authenticated, anon;


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
