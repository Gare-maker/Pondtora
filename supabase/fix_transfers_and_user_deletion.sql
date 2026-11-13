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
  v_total_dest NUMERIC;
  v_bag_rec RECORD;
  v_bags_dest NUMERIC;
  v_kg_dest NUMERIC;
  v_rem_rec RECORD;
  v_rem_dest NUMERIC;
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

  IF v_from_pond.status <> 'Active' OR COALESCE(v_from_pond.current_count, 0) <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Source pond has no active fish stock to transfer.');
  END IF;

  IF p_from_pond_id = p_to_pond_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Source and destination ponds must be different.');
  END IF;

  IF v_to_pond.status <> 'Empty' OR COALESCE(v_to_pond.current_count, 0) > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Destination pond must be empty to transfer fish stock.');
  END IF;

  -- 2. Calculate percentages and counts with strict validation
  IF p_count IS NOT NULL THEN
    IF p_count <= 0 OR p_count > v_from_pond.current_count THEN
      RETURN jsonb_build_object('success', false, 'error', 'Transfer quantity must be between 1 and current fish population.');
    END IF;
    v_safe_count := p_count;
    v_fraction := v_safe_count::NUMERIC / v_from_pond.current_count::NUMERIC;
  ELSE
    IF p_percentage IS NULL OR p_percentage <= 0 OR p_percentage > 100 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Transfer percentage must be greater than 0 and at most 100.');
    END IF;
    v_fraction := LEAST(1.0, GREATEST(0.0001, p_percentage::NUMERIC / 100.0));
    v_safe_count := LEAST(v_from_pond.current_count, GREATEST(1, ROUND(v_from_pond.current_count * v_fraction)));
    v_fraction := v_safe_count::NUMERIC / v_from_pond.current_count::NUMERIC;
  END IF;

  v_is_full := (v_safe_count >= v_from_pond.current_count);

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
      transfer_note = NULL
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

    -- 3. Move active feeding history to destination pond (clean slate for emptied source pond)
    UPDATE feeding_records SET
      pond = v_to_pond.name,
      pond_id = p_to_pond_id::text,
      farm_id = COALESCE(v_to_pond.farm_id, farm_id),
      fish_stock = v_stock_label,
      fish_stock_id = v_dest_stock_instance_id
    WHERE (
        pond_id = p_from_pond_id::text
        OR (pond_id IS NULL AND LOWER(TRIM(pond)) = LOWER(TRIM(v_from_pond.name)))
      )
      AND (user_id = v_from_pond.user_id OR farm_id = v_from_pond.farm_id)
      AND (
        v_from_pond.fish_stock_id IS NULL
        OR fish_stock_id IS NULL
        OR fish_stock_id = v_from_pond.fish_stock_id
      );

    -- 3b. Reassociate bag open logs to destination pond
    UPDATE bag_open_logs SET
      pond = v_to_pond.name,
      pond_id = p_to_pond_id::text,
      farm_id = COALESCE(v_to_pond.farm_id, farm_id),
      fish_stock = v_stock_label,
      fish_stock_id = v_dest_stock_instance_id
    WHERE (
        pond_id = p_from_pond_id::text
        OR (pond_id IS NULL AND LOWER(TRIM(COALESCE(pond, ''))) = LOWER(TRIM(v_from_pond.name)))
      )
      AND (user_id = v_from_pond.user_id OR farm_id = v_from_pond.farm_id)
      AND (
        v_from_pond.fish_stock_id IS NULL
        OR fish_stock_id IS NULL
        OR fish_stock_id = v_from_pond.fish_stock_id
      );

    -- 3c. Reassociate feed remaining logs to destination stock
    UPDATE feed_remaining_logs SET
      pond = v_to_pond.name,
      pond_id = p_to_pond_id::text,
      farm_id = COALESCE(v_to_pond.farm_id, farm_id),
      fish_stock = v_stock_label,
      fish_stock_id = v_dest_stock_instance_id
    WHERE (
        pond_id = p_from_pond_id::text
        OR (pond_id IS NULL AND LOWER(TRIM(COALESCE(pond, ''))) = LOWER(TRIM(v_from_pond.name)))
      )
      AND (user_id = v_from_pond.user_id OR farm_id = v_from_pond.farm_id)
      AND (
        v_from_pond.fish_stock_id IS NULL
        OR fish_stock_id IS NULL
        OR fish_stock_id = v_from_pond.fish_stock_id
      );

    -- 4. Reassociate all mortality entries to destination pond
    UPDATE mortality_entries SET
      pond_id = p_to_pond_id,
      pond_name = v_to_pond.name,
      farm_id = COALESCE(v_to_pond.farm_id, farm_id),
      fish_stock = v_stock_label,
      fish_stock_id = v_dest_stock_instance_id
    WHERE pond_id = p_from_pond_id
      AND (
        v_from_pond.fish_stock_id IS NULL
        OR fish_stock_id IS NULL
        OR fish_stock_id = v_from_pond.fish_stock_id
      );

    -- 5. Reassociate all treatment records to destination pond (100%)
    UPDATE treatment_records SET
      pond_id = p_to_pond_id,
      pond_name = v_to_pond.name,
      farm_id = COALESCE(v_to_pond.farm_id, farm_id),
      fish_stock = v_stock_label,
      fish_stock_id = v_dest_stock_instance_id
    WHERE pond_id = p_from_pond_id
      AND (
        v_from_pond.fish_stock_id IS NULL
        OR fish_stock_id IS NULL
        OR fish_stock_id = v_from_pond.fish_stock_id
      );

    -- 6. Reassociate pond reports (treatments and other issues at 100%)
    UPDATE pond_reports SET
      pond_id = p_to_pond_id,
      pond_name = v_to_pond.name,
      farm_id = COALESCE(v_to_pond.farm_id, farm_id),
      fish_stock_id = v_dest_stock_instance_id
    WHERE pond_id = p_from_pond_id
      AND (
        v_from_pond.fish_stock_id IS NULL
        OR fish_stock_id IS NULL
        OR fish_stock_id = v_from_pond.fish_stock_id
      );

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

    -- 3. Proportionally split feeding_records between source pond and destination pond
    FOR v_feed_rec IN
      SELECT * FROM feeding_records
      WHERE (
          pond_id = p_from_pond_id::text
          OR (pond_id IS NULL AND LOWER(TRIM(pond)) = LOWER(TRIM(v_from_pond.name)))
        )
        AND (user_id = v_from_pond.user_id OR farm_id = v_from_pond.farm_id)
        AND (
          v_from_pond.fish_stock_id IS NULL
          OR fish_stock_id IS NULL
          OR fish_stock_id = v_from_pond.fish_stock_id
        )
    LOOP
      v_morning_dest := ROUND(COALESCE(v_feed_rec.morning, 0) * v_fraction, 2);
      v_evening_dest := ROUND(COALESCE(v_feed_rec.evening, 0) * v_fraction, 2);
      v_total_dest := ROUND(v_morning_dest + v_evening_dest, 2);
      IF COALESCE(v_feed_rec.morning, 0) = 0 AND COALESCE(v_feed_rec.evening, 0) = 0 AND COALESCE(v_feed_rec.total, 0) > 0 THEN
        v_morning_dest := ROUND(v_feed_rec.total * v_fraction, 2);
        v_total_dest := v_morning_dest;
      END IF;

      UPDATE feeding_records SET
        morning = GREATEST(0, ROUND(COALESCE(v_feed_rec.morning, 0) - v_morning_dest, 2)),
        evening = GREATEST(0, ROUND(COALESCE(v_feed_rec.evening, 0) - v_evening_dest, 2)),
        total = GREATEST(0, ROUND(COALESCE(v_feed_rec.total, 0) - v_total_dest, 2)),
        fish_stock = v_stock_label,
        fish_stock_id = v_stock_instance_id
      WHERE id = v_feed_rec.id;

      IF v_total_dest > 0 THEN
        INSERT INTO feeding_records (
          id, user_id, farm_id, date, month, year, pond, pond_id, brand, size,
          morning, evening, total, recorded_by, morning_time, evening_time,
          fish_stock, fish_stock_id, created_by, created_by_id, created_at
        ) VALUES (
          gen_random_uuid(), v_feed_rec.user_id, COALESCE(v_to_pond.farm_id, v_feed_rec.farm_id),
          v_feed_rec.date, v_feed_rec.month, v_feed_rec.year, v_to_pond.name, p_to_pond_id::text,
          v_feed_rec.brand, v_feed_rec.size,
          v_morning_dest, v_evening_dest, v_total_dest,
          v_feed_rec.recorded_by, v_feed_rec.morning_time, v_feed_rec.evening_time,
          v_stock_label, v_dest_stock_instance_id, v_feed_rec.created_by, v_feed_rec.created_by_id, NOW()
        );
      END IF;
    END LOOP;

    -- 3b. Proportionally split bag_open_logs scoped to source pond + stock
    FOR v_bag_rec IN
      SELECT * FROM bag_open_logs
      WHERE (
          pond_id = p_from_pond_id::text
          OR (pond_id IS NULL AND LOWER(TRIM(COALESCE(pond, ''))) = LOWER(TRIM(v_from_pond.name)))
        )
        AND (user_id = v_from_pond.user_id OR farm_id = v_from_pond.farm_id)
        AND (
          v_from_pond.fish_stock_id IS NULL
          OR fish_stock_id IS NULL
          OR fish_stock_id = v_from_pond.fish_stock_id
        )
    LOOP
      v_bags_dest := ROUND(COALESCE(v_bag_rec.bags_opened, 0) * v_fraction, 2);
      v_kg_dest := ROUND(COALESCE(v_bag_rec.total_kg, 0) * v_fraction, 2);

      UPDATE bag_open_logs SET
        bags_opened = GREATEST(0, ROUND(COALESCE(v_bag_rec.bags_opened, 0) - v_bags_dest, 2)),
        total_kg = GREATEST(0, ROUND(COALESCE(v_bag_rec.total_kg, 0) - v_kg_dest, 2)),
        fish_stock = v_stock_label,
        fish_stock_id = v_stock_instance_id
      WHERE id = v_bag_rec.id;

      IF v_bags_dest > 0 OR v_kg_dest > 0 THEN
        INSERT INTO bag_open_logs (
          id, user_id, farm_id, date, month, year, brand, size, kg_per_bag,
          bags_opened, total_kg, fish_stock, fish_stock_id, pond, pond_id, created_at
        ) VALUES (
          gen_random_uuid(), v_bag_rec.user_id, COALESCE(v_to_pond.farm_id, v_bag_rec.farm_id),
          v_bag_rec.date, v_bag_rec.month, v_bag_rec.year, v_bag_rec.brand, v_bag_rec.size, v_bag_rec.kg_per_bag,
          v_bags_dest, v_kg_dest, v_stock_label, v_dest_stock_instance_id, v_to_pond.name, p_to_pond_id::text, NOW()
        );
      END IF;
    END LOOP;

    -- 3c. Proportionally split feed_remaining_logs scoped to source pond + stock
    FOR v_rem_rec IN
      SELECT * FROM feed_remaining_logs
      WHERE (
          pond_id = p_from_pond_id::text
          OR (pond_id IS NULL AND LOWER(TRIM(COALESCE(pond, ''))) = LOWER(TRIM(v_from_pond.name)))
        )
        AND (user_id = v_from_pond.user_id OR farm_id = v_from_pond.farm_id)
        AND (
          v_from_pond.fish_stock_id IS NULL
          OR fish_stock_id IS NULL
          OR fish_stock_id = v_from_pond.fish_stock_id
        )
    LOOP
      v_rem_dest := ROUND(COALESCE(v_rem_rec.remaining_kg, 0) * v_fraction, 1);

      UPDATE feed_remaining_logs SET
        remaining_kg = GREATEST(0, ROUND(COALESCE(v_rem_rec.remaining_kg, 0) - v_rem_dest, 1)),
        fish_stock = v_stock_label,
        fish_stock_id = v_stock_instance_id
      WHERE id = v_rem_rec.id;

      IF v_rem_dest > 0 THEN
        INSERT INTO feed_remaining_logs (
          id, user_id, farm_id, brand, size, fish_stock, fish_stock_id, remaining_kg,
          date, month, year, pond, pond_id, created_at
        ) VALUES (
          gen_random_uuid(), v_rem_rec.user_id, COALESCE(v_to_pond.farm_id, v_rem_rec.farm_id),
          v_rem_rec.brand, v_rem_rec.size, v_stock_label, v_dest_stock_instance_id, v_rem_dest,
          v_rem_rec.date, v_rem_rec.month, v_rem_rec.year, v_to_pond.name, p_to_pond_id::text, NOW()
        );
      END IF;
    END LOOP;

    -- 4. Proportionally allocate mortality records scoped to source pond + stock
    FOR v_mort_rec IN
      SELECT * FROM mortality_entries
      WHERE pond_id = p_from_pond_id
        AND (
          v_from_pond.fish_stock_id IS NULL
          OR fish_stock_id IS NULL
          OR fish_stock_id = v_from_pond.fish_stock_id
        )
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

    -- 5. Copy 100% of treatment records to destination pond (medical history inherited in full)
    FOR v_treat_rec IN
      SELECT * FROM treatment_records
      WHERE pond_id = p_from_pond_id
        AND (
          v_from_pond.fish_stock_id IS NULL
          OR fish_stock_id IS NULL
          OR fish_stock_id = v_from_pond.fish_stock_id
        )
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

    -- 5b. Copy 100% of pond_reports (treatments & other issues) to destination pond
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
    WHERE pond_id = p_from_pond_id
      AND (
        v_from_pond.fish_stock_id IS NULL
        OR fish_stock_id IS NULL
        OR fish_stock_id = v_from_pond.fish_stock_id
      );

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
