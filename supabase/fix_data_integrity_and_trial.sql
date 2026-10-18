-- ==============================================================================
-- PONDTORA: DATA INTEGRITY & TRIAL DURATION UPDATE
-- Ensures operational records are linked to fish stock and farm
-- Preserves historical records on transfer without reassigning event context
-- Standardizes trial duration to 40 days
-- ==============================================================================

-- 1. Ensure fish_stock column exists on feeding_records
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'feeding_records' 
        AND column_name = 'fish_stock'
    ) THEN
        ALTER TABLE public.feeding_records ADD COLUMN fish_stock TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_feeding_records_fish_stock ON public.feeding_records(fish_stock);
CREATE INDEX IF NOT EXISTS idx_feeding_records_pond ON public.feeding_records(pond);

-- 2. Ensure fish_stock column exists on mortality_entries
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mortality_entries' 
        AND column_name = 'fish_stock'
    ) THEN
        ALTER TABLE public.mortality_entries ADD COLUMN fish_stock TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mortality_entries_fish_stock ON public.mortality_entries(fish_stock);
CREATE INDEX IF NOT EXISTS idx_mortality_entries_pond_id ON public.mortality_entries(pond_id);

-- 3. Ensure fish_stock column exists on treatments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'treatments' 
        AND column_name = 'fish_stock'
    ) THEN
        ALTER TABLE public.treatments ADD COLUMN fish_stock TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_treatments_fish_stock ON public.treatments(fish_stock);
CREATE INDEX IF NOT EXISTS idx_treatments_pond_id ON public.treatments(pond_id);

-- 4. Set comment documentation
COMMENT ON COLUMN public.feeding_records.fish_stock IS 'Identifies the specific fish stock lifecycle batch associated with the feeding record, preserving historical event context.';
COMMENT ON COLUMN public.mortality_entries.fish_stock IS 'Identifies the specific fish stock batch associated with the mortality entry.';
