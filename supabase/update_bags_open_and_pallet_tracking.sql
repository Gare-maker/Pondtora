-- ==============================================================================
-- Migration: Bags Open, Pallet Tracking, and Feeding Mismatch Reconciliation
-- Pondtora Farm Aquaculture Management
-- ==============================================================================
-- 1. Add pallet tracking column to feeding_records, bag_open_logs, and feed_remaining_logs
-- 2. Index pallet and stock columns for rapid reconciliation and carryover queries
-- ==============================================================================

-- Step 1: Add pallet column to feeding_records if not exists
ALTER TABLE feeding_records 
ADD COLUMN IF NOT EXISTS pallet TEXT DEFAULT NULL;

-- Step 2: Add pallet column to bag_open_logs if not exists
ALTER TABLE bag_open_logs 
ADD COLUMN IF NOT EXISTS pallet TEXT DEFAULT NULL;

-- Step 3: Add pallet column to feed_remaining_logs if not exists
ALTER TABLE feed_remaining_logs 
ADD COLUMN IF NOT EXISTS pallet TEXT DEFAULT NULL;

-- Step 4: Add indexes to optimize pallet-based reconciliation and daily bags open queries
CREATE INDEX IF NOT EXISTS idx_feeding_records_user_stock_pallet
ON feeding_records (user_id, date, LOWER(TRIM(pallet)));

CREATE INDEX IF NOT EXISTS idx_bag_open_logs_user_stock_pallet
ON bag_open_logs (user_id, date, LOWER(TRIM(pallet)));

CREATE INDEX IF NOT EXISTS idx_feed_remaining_logs_user_stock_pallet
ON feed_remaining_logs (user_id, date, LOWER(TRIM(pallet)));

COMMENT ON COLUMN feeding_records.pallet IS 'Pallet identification (e.g. Pallet A, Pallet 1) used for independent pallet feed tracking.';
COMMENT ON COLUMN bag_open_logs.pallet IS 'Pallet identification associated with the opened bag.';
COMMENT ON COLUMN feed_remaining_logs.pallet IS 'Pallet identification associated with the remaining feed balance.';
