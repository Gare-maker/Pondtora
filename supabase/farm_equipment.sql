-- ==============================================================================
-- FARM EQUIPMENT INVENTORY TABLE & POLICIES FOR PONDTORA
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.farm_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General Equipment',
    quantity INTEGER NOT NULL DEFAULT 1,
    condition TEXT NOT NULL DEFAULT 'Working',
    location TEXT,
    purchase_date DATE,
    cost NUMERIC(15, 2),
    notes TEXT,
    created_by TEXT,
    created_by_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_farm_equipment_farm_id ON public.farm_equipment(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_equipment_category ON public.farm_equipment(category);
CREATE INDEX IF NOT EXISTS idx_farm_equipment_condition ON public.farm_equipment(condition);

-- Enable Row Level Security (RLS)
ALTER TABLE public.farm_equipment ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if re-running
DROP POLICY IF EXISTS "Users can manage farm equipment for their accessible farms" ON public.farm_equipment;

-- RLS Policy allowing farm owners and authorized staff full CRUD access
CREATE POLICY "Users can manage farm equipment for their accessible farms"
    ON public.farm_equipment
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.farms f
            WHERE f.id = farm_equipment.farm_id
            AND (
                f.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.staff_members s
                    WHERE (s.user_id = auth.uid() OR s.staff_auth_id = auth.uid())
                    AND (
                        s.farms @> jsonb_build_array(f.id::text)
                        OR s.farms::text LIKE '%' || f.id::text || '%'
                    )
                )
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.farms f
            WHERE f.id = farm_equipment.farm_id
            AND (
                f.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.staff_members s
                    WHERE (s.user_id = auth.uid() OR s.staff_auth_id = auth.uid())
                    AND (
                        s.farms @> jsonb_build_array(f.id::text)
                        OR s.farms::text LIKE '%' || f.id::text || '%'
                    )
                )
            )
        )
    );
