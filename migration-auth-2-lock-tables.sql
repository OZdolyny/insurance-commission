-- Migration 2 of 2: only signed-in app users can read or change data
-- Run AFTER migration 1, AFTER at least one super admin exists in public.app_users, and AFTER the
-- version of the app with the login screen is deployed. The app version without login stops
-- showing data once this runs. Safe to run more than once.
--
-- Not affected:
--   * notifications: no policies, so only the server-side service-role key (renewal reminders) can use it
--   * Server functions with the service-role key (renewal reminders) bypass these rules
--   * keep-alive still reaches the database; its query simply returns no rows

do $$
declare
  t text;
begin
  foreach t in array array['clients', 'client_policies', 'insurance_companies', 'insurance_policy_types', 'insurance_policy_rates']
  loop
    execute format('alter table public.%I enable row level security', t);
    -- Remove the old open rules
    execute format('drop policy if exists "Allow all operations" on public.%I', t);
    execute format('drop policy if exists "Enable all operations for authenticated users" on public.%I', t);
    -- Only users listed in app_users (any role)
    execute format('drop policy if exists "App users have full access" on public.%I', t);
    execute format(
      'create policy "App users have full access" on public.%I for all to authenticated '
      'using ((select public.is_app_user())) with check ((select public.is_app_user()))',
      t
    );
  end loop;
end $$;

-- Emergency rollback (re-opens the data to everyone, as before; use only if you are locked out):
--
--   do $$ declare t text; begin
--     foreach t in array array['clients','client_policies','insurance_companies','insurance_policy_types','insurance_policy_rates'] loop
--       execute format('drop policy if exists "App users have full access" on public.%I', t);
--       execute format('create policy "Allow all operations" on public.%I for all using (true)', t);
--     end loop;
--   end $$;
