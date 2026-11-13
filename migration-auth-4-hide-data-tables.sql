-- Migration 4: hide the data tables from anonymous visitors
-- The access rules (migration 2) already return no rows to anonymous visitors; this also removes
-- the tables from what they can see at all (REST and GraphQL), as Supabase's security check advises.
--
-- Run AFTER the version of api/keep-alive.js that uses SUPABASE_SERVICE_ROLE_KEY is deployed,
-- and SUPABASE_SERVICE_ROLE_KEY is set in Vercel (the renewal reminders already need it).
-- Otherwise the daily keep-alive fails with "permission denied". Safe to run more than once.

revoke all on table
  public.clients,
  public.client_policies,
  public.insurance_companies,
  public.insurance_policy_types,
  public.insurance_policy_rates
from anon;

-- Undo (only if something that runs without signing in still needs these tables):
--   grant select, insert, update, delete on table public.clients, public.client_policies,
--     public.insurance_companies, public.insurance_policy_types, public.insurance_policy_rates to anon;
