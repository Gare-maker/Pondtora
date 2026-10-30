-- ==============================================================================
-- PONDTORA: AUDIT & EDIT HISTORY TABLES AND POLICIES
-- Tracks:
-- 1. Fish current count changes
-- 2. Investment overview details changes
-- 3. Farm tools / equipment quantity changes
-- ==============================================================================

-- ── 1. Fish Count History Table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fish_count_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    pond_id TEXT NOT NULL,
    pond_name TEXT,
    previous_count INTEGER NOT NULL,
    new_count INTEGER NOT NULL,
    difference INTEGER NOT NULL,
    action_reason TEXT,
    changed_by TEXT NOT NULL,
    changed_by_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_fish_count_hist_pond_id ON public.fish_count_history(pond_id);
CREATE INDEX IF NOT EXISTS idx_fish_count_hist_farm_id ON public.fish_count_history(farm_id);
CREATE INDEX IF NOT EXISTS idx_fish_count_hist_created_at ON public.fish_count_history(created_at DESC);

ALTER TABLE public.fish_count_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fish_count_history_select" ON public.fish_count_history;
CREATE POLICY "fish_count_history_select" ON public.fish_count_history
    FOR SELECT USING (
        user_can_access_owner_data(user_id, farm_id)
    );

DROP POLICY IF EXISTS "fish_count_history_insert" ON public.fish_count_history;
CREATE POLICY "fish_count_history_insert" ON public.fish_count_history
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR user_can_access_farm(farm_id)
    );

DROP POLICY IF EXISTS "fish_count_history_modify" ON public.fish_count_history;
CREATE POLICY "fish_count_history_modify" ON public.fish_count_history
    FOR ALL USING (
        user_can_access_owner_data(user_id, farm_id)
    );

-- ── 2. Investment Edit History Table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.investment_edit_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    investor_id UUID REFERENCES public.investors(id) ON DELETE CASCADE,
    investment_id UUID REFERENCES public.investments(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    previous_value TEXT NOT NULL,
    new_value TEXT NOT NULL,
    action_reason TEXT,
    changed_by TEXT NOT NULL,
    changed_by_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_inv_edit_hist_investor_id ON public.investment_edit_history(investor_id);
CREATE INDEX IF NOT EXISTS idx_inv_edit_hist_investment_id ON public.investment_edit_history(investment_id);
CREATE INDEX IF NOT EXISTS idx_inv_edit_hist_farm_id ON public.investment_edit_history(farm_id);
CREATE INDEX IF NOT EXISTS idx_inv_edit_hist_created_at ON public.investment_edit_history(created_at DESC);

ALTER TABLE public.investment_edit_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "investment_edit_history_select" ON public.investment_edit_history;
CREATE POLICY "investment_edit_history_select" ON public.investment_edit_history
    FOR SELECT USING (
        user_can_access_owner_data(user_id, farm_id)
    );

DROP POLICY IF EXISTS "investment_edit_history_insert" ON public.investment_edit_history;
CREATE POLICY "investment_edit_history_insert" ON public.investment_edit_history
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR user_can_access_farm(farm_id)
    );

DROP POLICY IF EXISTS "investment_edit_history_modify" ON public.investment_edit_history;
CREATE POLICY "investment_edit_history_modify" ON public.investment_edit_history
    FOR ALL USING (
        user_can_access_owner_data(user_id, farm_id)
    );

-- ── 3. Farm Tool Quantity History Table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.farm_tool_quantity_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    tool_id UUID REFERENCES public.farm_equipment(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    difference INTEGER NOT NULL,
    location TEXT,
    action_reason TEXT,
    changed_by TEXT NOT NULL,
    changed_by_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_tool_qty_hist_tool_id ON public.farm_tool_quantity_history(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_qty_hist_farm_id ON public.farm_tool_quantity_history(farm_id);
CREATE INDEX IF NOT EXISTS idx_tool_qty_hist_created_at ON public.farm_tool_quantity_history(created_at DESC);

ALTER TABLE public.farm_tool_quantity_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "farm_tool_quantity_history_select" ON public.farm_tool_quantity_history;
CREATE POLICY "farm_tool_quantity_history_select" ON public.farm_tool_quantity_history
    FOR SELECT USING (
        user_can_access_owner_data(user_id, farm_id)
    );

DROP POLICY IF EXISTS "farm_tool_quantity_history_insert" ON public.farm_tool_quantity_history;
CREATE POLICY "farm_tool_quantity_history_insert" ON public.farm_tool_quantity_history
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR user_can_access_farm(farm_id)
    );

DROP POLICY IF EXISTS "farm_tool_quantity_history_modify" ON public.farm_tool_quantity_history;
CREATE POLICY "farm_tool_quantity_history_modify" ON public.farm_tool_quantity_history
    FOR ALL USING (
        user_can_access_owner_data(user_id, farm_id)
    );

-- ── 4. Sales Calculation Edit History Table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sales_calculation_edit_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    calculation_id TEXT NOT NULL,
    customer_name TEXT,
    field_name TEXT,
    field_changed TEXT,
    previous_value TEXT,
    new_value TEXT,
    previous_total NUMERIC NOT NULL DEFAULT 0,
    new_total NUMERIC NOT NULL DEFAULT 0,
    previous_weight_kg NUMERIC NOT NULL DEFAULT 0,
    new_weight_kg NUMERIC NOT NULL DEFAULT 0,
    difference NUMERIC NOT NULL DEFAULT 0,
    items_summary TEXT,
    action_reason TEXT,
    changed_by TEXT NOT NULL,
    changed_by_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.sales_calculation_edit_history ADD COLUMN IF NOT EXISTS field_name TEXT;
ALTER TABLE public.sales_calculation_edit_history ADD COLUMN IF NOT EXISTS field_changed TEXT;
ALTER TABLE public.sales_calculation_edit_history ADD COLUMN IF NOT EXISTS previous_value TEXT;
ALTER TABLE public.sales_calculation_edit_history ADD COLUMN IF NOT EXISTS new_value TEXT;
ALTER TABLE public.sales_calculations ADD COLUMN IF NOT EXISTS sales_schedule TEXT;

CREATE INDEX IF NOT EXISTS idx_sales_calc_edit_hist_calc_id ON public.sales_calculation_edit_history(calculation_id);
CREATE INDEX IF NOT EXISTS idx_sales_calc_edit_hist_farm_id ON public.sales_calculation_edit_history(farm_id);
CREATE INDEX IF NOT EXISTS idx_sales_calc_edit_hist_created_at ON public.sales_calculation_edit_history(created_at DESC);

ALTER TABLE public.sales_calculation_edit_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_calc_edit_history_select" ON public.sales_calculation_edit_history;
CREATE POLICY "sales_calc_edit_history_select" ON public.sales_calculation_edit_history
    FOR SELECT USING (
        user_can_access_owner_data(user_id, farm_id)
    );

DROP POLICY IF EXISTS "sales_calc_edit_history_insert" ON public.sales_calculation_edit_history;
CREATE POLICY "sales_calc_edit_history_insert" ON public.sales_calculation_edit_history
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR user_can_access_farm(farm_id)
    );

DROP POLICY IF EXISTS "sales_calc_edit_history_modify" ON public.sales_calculation_edit_history;
CREATE POLICY "sales_calc_edit_history_modify" ON public.sales_calculation_edit_history
    FOR ALL USING (
        user_can_access_owner_data(user_id, farm_id)
    );

