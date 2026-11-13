-- Migration 1 of 2: app roles
-- Safe to run at any time (the current app does not use these objects). Safe to run more than once.
--
-- public.app_users lists who may use CommissionPro and with which role. Signing in is not enough:
-- an account without a row here sees no data, even if someone manages to create one.

create table if not exists public.app_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       text not null default 'member' check (role in ('super_admin', 'admin', 'member')),
  created_at timestamptz not null default now()
);

alter table public.app_users enable row level security;

-- Role of the signed-in user, or null. SECURITY DEFINER so policies can call it without
-- recursing into app_users' own policies; empty search_path as Supabase recommends.
create or replace function public.app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.app_users where user_id = (select auth.uid())
$$;

create or replace function public.is_app_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.app_users where user_id = (select auth.uid()))
$$;

-- Users can read their own role; super admins can see and manage everyone's
drop policy if exists "Users read their own role" on public.app_users;
create policy "Users read their own role" on public.app_users
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.app_role()) = 'super_admin');

drop policy if exists "Super admins manage roles" on public.app_users;
create policy "Super admins manage roles" on public.app_users
  for all to authenticated
  using ((select public.app_role()) = 'super_admin')
  with check ((select public.app_role()) = 'super_admin');

-- Granting a role (run after the person's account exists in Authentication → Users).
-- Keep real email addresses out of this repository:
--
--   insert into public.app_users (user_id, role)
--   select id, 'super_admin' from auth.users where email = '<email>'
--   on conflict (user_id) do update set role = excluded.role;
