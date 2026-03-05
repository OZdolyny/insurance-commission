-- Migration Script: Add paid_amount and no_commission fields
-- Run this in Supabase SQL Editor if you already have the database set up

-- Step 1: Add new columns to client_policies
ALTER TABLE client_policies 
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS no_commission BOOLEAN DEFAULT FALSE;

-- Step 2: Set paid_amount equal to amount for existing records (assumes no discount previously)
UPDATE client_policies 
SET paid_amount = amount 
WHERE paid_amount IS NULL;

-- Step 3: Make paid_amount NOT NULL after setting values
ALTER TABLE client_policies 
ALTER COLUMN paid_amount SET NOT NULL;

-- Step 4: Drop the old discount column if it exists as a regular column
ALTER TABLE client_policies 
DROP COLUMN IF EXISTS discount;

-- Step 5: Add discount as a generated column (auto-calculated)
ALTER TABLE client_policies 
ADD COLUMN discount DECIMAL(12, 2) GENERATED ALWAYS AS (amount - paid_amount) STORED;

-- Done! Your database is now updated with the new commission calculation logic.
