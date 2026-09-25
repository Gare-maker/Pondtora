-- ==============================================================================
-- Supabase SQL Script: Investor Cascade Delete & Orphan Cleanup
-- ==============================================================================
-- Description:
-- 1. Cleans up any existing orphaned investment and payment records whose
--    investor was deleted.
-- 2. Ensures foreign key constraints have ON DELETE CASCADE enabled so future
--    deletions in Supabase or the app automatically purge child investments and payments.
-- ==============================================================================

-- 1. Delete orphaned investment payments (payments without valid investments or investors)
DELETE FROM investment_payments
WHERE investment_id NOT IN (SELECT id FROM investments)
   OR investment_id IN (
     SELECT id FROM investments WHERE investor_id IS NOT NULL AND investor_id NOT IN (SELECT id FROM investors)
   );

-- 2. Delete orphaned investments (investments without valid investors)
DELETE FROM investments
WHERE investor_id IS NOT NULL AND investor_id NOT IN (SELECT id FROM investors);

-- 3. Ensure ON DELETE CASCADE constraint on investments -> investors
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'investments_investor_id_fkey'
  ) THEN
    ALTER TABLE investments DROP CONSTRAINT investments_investor_id_fkey;
  END IF;
  
  ALTER TABLE investments
    ADD CONSTRAINT investments_investor_id_fkey
    FOREIGN KEY (investor_id) REFERENCES investors(id) ON DELETE CASCADE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Constraint investments_investor_id_fkey setup notice: %', SQLERRM;
END $$;

-- 4. Ensure ON DELETE CASCADE constraint on investment_payments -> investments
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'investment_payments_investment_id_fkey'
  ) THEN
    ALTER TABLE investment_payments DROP CONSTRAINT investment_payments_investment_id_fkey;
  END IF;
  
  ALTER TABLE investment_payments
    ADD CONSTRAINT investment_payments_investment_id_fkey
    FOREIGN KEY (investment_id) REFERENCES investments(id) ON DELETE CASCADE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Constraint investment_payments_investment_id_fkey setup notice: %', SQLERRM;
END $$;

-- 5. Confirmation query: Count remaining investors, investments, and payments
SELECT 
  (SELECT COUNT(*) FROM investors) AS total_investors,
  (SELECT COUNT(*) FROM investments) AS total_investments,
  (SELECT COUNT(*) FROM investment_payments) AS total_payments;
