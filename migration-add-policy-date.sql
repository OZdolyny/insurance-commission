-- Migration: add the policy (contract) date to client_policies
-- Run in the Supabase SQL Editor. Safe to run more than once.
--
-- policy_date = "Дата укладення Договору" (the date the contract was signed).
-- It is a DATE like start_date/end_date: the policy documents give no time, and a timestamp
-- would add time-zone conversions that can shift the day.
-- Existing policies are left empty (NULL); new ones get it from the form or the PDF import.

ALTER TABLE client_policies
  ADD COLUMN IF NOT EXISTS policy_date DATE;

-- Reports filter and sort by this date
CREATE INDEX IF NOT EXISTS idx_client_policies_policy_date ON client_policies(policy_date);
