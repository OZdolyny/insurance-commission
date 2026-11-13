-- Migration 3: hide internal objects from anonymous visitors (applied 2026-11-13)
-- Safe to run at any time and more than once. Nothing in the app uses these without signing in.

-- Role helpers: only signed-in users (and the server) may call them; the access rules still use them
revoke execute on function public.app_role(), public.is_app_user() from public, anon;
grant execute on function public.app_role(), public.is_app_user() to authenticated, service_role;

-- Tables the app never reads without signing in
revoke all on table public.app_users from anon;
revoke all on table public.notifications from anon;

-- New tables and functions created later (e.g. policy files) are hidden from anonymous visitors by default
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke execute on functions from anon;
