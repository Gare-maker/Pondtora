-- ==============================================================================
-- PONDTORA: POND MANAGEMENT, DATA INTEGRITY & FINANCIAL RECORD PROTECTION
-- 1. Updates foreign keys referencing ponds(id) to ON DELETE SET NULL to preserve
--    historical records (pond_reports, treatment_records, mortality_entries, stock_events)
-- 2. Adjusts staff report immutability trigger to allow pond_id to become NULL when a pond is deleted
-- 3. Enforces backend database immutability: prevents DELETION of financial records (expenses, revenues)
-- ==============================================================================

-- ── 1. Ensure pond_name column exists on historical tables for auditing ────────
ALTER TABLE IF EXISTS public.pond_reports ADD COLUMN IF NOT EXISTS pond_name TEXT;
ALTER TABLE IF EXISTS public.treatment_records ADD COLUMN IF NOT EXISTS pond_name TEXT;
ALTER TABLE IF EXISTS public.mortality_entries ADD COLUMN IF NOT EXISTS pond_name TEXT;

-- Backfill pond_name from ponds where available
UPDATE public.pond_reports pr
SET pond_name = p.name
FROM public.ponds p
WHERE pr.pond_id = p.id AND (pr.pond_name IS NULL OR pr.pond_name = '');

UPDATE public.treatment_records tr
SET pond_name = p.name
FROM public.ponds p
WHERE tr.pond_id = p.id AND (tr.pond_name IS NULL OR tr.pond_name = '');

UPDATE public.mortality_entries me
SET pond_name = p.name
FROM public.ponds p
WHERE me.pond_id = p.id AND (me.pond_name IS NULL OR me.pond_name = '');

-- ── 2. Allow pond_id to be SET NULL when a pond is deleted in staff report trigger ─
CREATE OR REPLACE FUNCTION public.protect_staff_pond_report_immutability()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.is_staff_submission = true OR OLD.created_by_role = 'staff' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Submitted staff pond reports are official records and cannot be deleted.';
    END IF;

    IF TG_OP = 'UPDATE' THEN
      -- Allow pond_id to be set to NULL when the parent pond is deleted
      IF (NEW.pond_id IS DISTINCT FROM OLD.pond_id AND NEW.pond_id IS NOT NULL) OR
         NEW.description IS DISTINCT FROM OLD.description OR
         NEW.issue IS DISTINCT FROM OLD.issue OR
         NEW.action_taken IS DISTINCT FROM OLD.action_taken OR
         NEW.report_type IS DISTINCT FROM OLD.report_type OR
         NEW.report_date IS DISTINCT FROM OLD.report_date OR
         NEW.farm_id IS DISTINCT FROM OLD.farm_id OR
         NEW.created_by_id IS DISTINCT FROM OLD.created_by_id OR
         NEW.created_by_role IS DISTINCT FROM OLD.created_by_role OR
         NEW.is_staff_submission IS DISTINCT FROM OLD.is_staff_submission THEN
        RAISE EXCEPTION 'Original staff pond report fields are immutable. Only administrative review fields can be updated.';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_pond_reports ON public.pond_reports;
CREATE TRIGGER trg_protect_pond_reports
BEFORE UPDATE OR DELETE ON public.pond_reports
FOR EACH ROW EXECUTE FUNCTION public.protect_staff_pond_report_immutability();

-- ── 3. Update Foreign Keys to ON DELETE SET NULL ─────────────────────────────

-- 3a. pond_reports -> ponds
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_name = 'pond_reports' AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%pond_id%'
  ) LOOP
    EXECUTE 'ALTER TABLE public.pond_reports DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
  END LOOP;

  ALTER TABLE public.pond_reports
    ADD CONSTRAINT pond_reports_pond_id_fkey
    FOREIGN KEY (pond_id) REFERENCES public.ponds(id) ON DELETE SET NULL;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Constraint pond_reports_pond_id_fkey notice: %', SQLERRM;
END $$;

-- 3b. treatment_records -> ponds
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_name = 'treatment_records' AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%pond_id%'
  ) LOOP
    EXECUTE 'ALTER TABLE public.treatment_records DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
  END LOOP;

  ALTER TABLE public.treatment_records
    ADD CONSTRAINT treatment_records_pond_id_fkey
    FOREIGN KEY (pond_id) REFERENCES public.ponds(id) ON DELETE SET NULL;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Constraint treatment_records_pond_id_fkey notice: %', SQLERRM;
END $$;

-- 3c. mortality_entries -> ponds
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_name = 'mortality_entries' AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%pond_id%'
  ) LOOP
    EXECUTE 'ALTER TABLE public.mortality_entries DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
  END LOOP;

  ALTER TABLE public.mortality_entries
    ADD CONSTRAINT mortality_entries_pond_id_fkey
    FOREIGN KEY (pond_id) REFERENCES public.ponds(id) ON DELETE SET NULL;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Constraint mortality_entries_pond_id_fkey notice: %', SQLERRM;
END $$;

-- 3d. stock_events -> ponds
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_name = 'stock_events' AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%pond_id%'
  ) LOOP
    EXECUTE 'ALTER TABLE public.stock_events DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
  END LOOP;

  ALTER TABLE public.stock_events
    ADD CONSTRAINT stock_events_pond_id_fkey
    FOREIGN KEY (pond_id) REFERENCES public.ponds(id) ON DELETE SET NULL;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Constraint stock_events_pond_id_fkey notice: %', SQLERRM;
END $$;

-- ── 4. Prevent Deletion of Financial Records (Expenses & Revenues) ───────────

CREATE OR REPLACE FUNCTION public.prevent_financial_record_deletion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RAISE EXCEPTION 'Financial records cannot be deleted. You can only edit them.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_expense_deletion ON public.expenses;
CREATE TRIGGER trg_prevent_expense_deletion
BEFORE DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_record_deletion();

DROP TRIGGER IF EXISTS trg_prevent_revenue_deletion ON public.revenues;
CREATE TRIGGER trg_prevent_revenue_deletion
BEFORE DELETE ON public.revenues
FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_record_deletion();
