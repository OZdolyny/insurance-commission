-- Migration: store a policy file (PDF) per policy in Supabase Storage
-- Safe to run before the app version that uses it, and more than once.
--
-- * Private bucket "policy-files": no public links; only signed-in app users (public.app_users)
--   can read, add, replace or delete files. Anonymous visitors have no access.
-- * The original file is stored unchanged, including an insurer's electronic-signature envelope
--   (legal value); the app unwraps it in the browser for preview.
-- * Path: <policy id>/<random id>.pdf — random, so paths cannot be guessed; user file names are
--   never used as paths (the original name is kept in file_name for downloads).

-- 1. File details on the policy (empty = no file)
alter table public.client_policies
  add column if not exists file_path text,
  add column if not exists file_name text,
  add column if not exists file_size integer,
  add column if not exists file_uploaded_at timestamptz;

-- 2. Private bucket: PDFs up to 10 MB
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('policy-files', 'policy-files', false, 10485760, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 3. Access rules on the bucket's files: app users only
drop policy if exists "App users read policy files" on storage.objects;
create policy "App users read policy files" on storage.objects
  for select to authenticated
  using (bucket_id = 'policy-files' and (select public.is_app_user()));

drop policy if exists "App users add policy files" on storage.objects;
create policy "App users add policy files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'policy-files' and (select public.is_app_user()));

drop policy if exists "App users replace policy files" on storage.objects;
create policy "App users replace policy files" on storage.objects
  for update to authenticated
  using (bucket_id = 'policy-files' and (select public.is_app_user()))
  with check (bucket_id = 'policy-files' and (select public.is_app_user()));

drop policy if exists "App users delete policy files" on storage.objects;
create policy "App users delete policy files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'policy-files' and (select public.is_app_user()));
