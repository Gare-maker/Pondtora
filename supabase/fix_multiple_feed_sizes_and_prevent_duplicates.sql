-- ==============================================================================
-- Migration: Fix Multiple Feed Sizes in One Day & Prevent Duplicate Feed Sizes
-- Pondtora Farm Aquaculture Management
-- ==============================================================================
-- 1. Deduplicate legacy records where same (user_id, pond, date, size) exists
--    Keeping the latest record by created_at or id.
-- 2. Create unique index to strictly prevent duplicate feed sizes for the same
--    pond / fish stock on the same feeding date at database level.
-- ==============================================================================

-- Step 1: Clean up any pre-existing duplicates before creating unique index
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, LOWER(TRIM(pond)), date, LOWER(TRIM(size))
           ORDER BY created_at DESC NULLS LAST, id DESC
         ) as rn
  FROM feeding_records
  WHERE pond IS NOT NULL AND date IS NOT NULL AND size IS NOT NULL
)
DELETE FROM feeding_records
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Step 2: Create a unique index to enforce that each feed size can only be recorded
-- once per pond/stock per date for a given user/farm.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_feeding_record_pond_date_size 
ON feeding_records (user_id, LOWER(TRIM(pond)), date, LOWER(TRIM(size)));

-- Step 3: Add index on bag_open_logs to optimize feed stock and opened bag queries
CREATE INDEX IF NOT EXISTS idx_bag_open_logs_stock_date_size
ON bag_open_logs (user_id, date, LOWER(TRIM(size)));

COMMENT ON INDEX idx_unique_feeding_record_pond_date_size IS 
'Ensures a fish stock cannot have duplicate feeding records for the same pallet/feed size on the same date while allowing multiple distinct feed sizes on that date.';
