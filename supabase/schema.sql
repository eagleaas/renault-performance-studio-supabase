-- Renault After-Sales Performance Studio — Supabase schema
-- Run this once in your Supabase project's SQL editor (Project -> SQL Editor -> New query).

-- 1. Profiles: one row per signed-in user, extends auth.users with a name + role.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles are readable by any signed-in user" on public.profiles;
create policy "profiles are readable by any signed-in user"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "a user can update their own profile name" on public.profiles;
create policy "a user can update their own profile name"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- auto-create a profile row whenever a new auth user signs up (defaults to 'member')
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), 'member');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- helper used by policies below
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (select 1 from public.profiles where id = uid and role = 'admin');
$$;

-- 2. Documents: generic doc store, mirrors the original app's collections
--    (imports, config, audit, members, views) — one JSON blob per document.
create table if not exists public.documents (
  collection text not null check (collection in ('imports', 'config', 'audit', 'members', 'views')),
  id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);

alter table public.documents enable row level security;

drop policy if exists "documents are readable by any signed-in user" on public.documents;
create policy "documents are readable by any signed-in user"
  on public.documents for select
  to authenticated
  using (true);

drop policy if exists "only admins can write documents" on public.documents;
create policy "only admins can write documents"
  on public.documents for insert
  to authenticated
  with check (public.is_admin(auth.uid()));

drop policy if exists "only admins can update documents" on public.documents;
create policy "only admins can update documents"
  on public.documents for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "only admins can delete documents" on public.documents;
create policy "only admins can delete documents"
  on public.documents for delete
  to authenticated
  using (public.is_admin(auth.uid()));

-- 3. Blobs: metadata for uploaded files; the actual bytes live in Supabase Storage
--    (bucket "blobs", created below). Kept mainly for bookkeeping/auditing.
create table if not exists public.blobs (
  id text primary key,
  content_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

alter table public.blobs enable row level security;

drop policy if exists "blob metadata readable by any signed-in user" on public.blobs;
create policy "blob metadata readable by any signed-in user"
  on public.blobs for select
  to authenticated
  using (true);

drop policy if exists "only admins can register/delete blob metadata" on public.blobs;
create policy "only admins can register/delete blob metadata"
  on public.blobs for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- 4. Storage bucket for uploaded files (report backgrounds, imported attachments, etc.)
insert into storage.buckets (id, name, public)
values ('blobs', 'blobs', true)
on conflict (id) do nothing;

-- Reads are public (simplest option — the app links to these files directly as <img src>/exports).
-- Writes are restricted to admins. Tighten the read policy later if these files become sensitive.
drop policy if exists "blobs bucket is publicly readable" on storage.objects;
create policy "blobs bucket is publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'blobs');

drop policy if exists "only admins can upload to blobs bucket" on storage.objects;
create policy "only admins can upload to blobs bucket"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'blobs' and public.is_admin(auth.uid()));

drop policy if exists "only admins can delete from blobs bucket" on storage.objects;
create policy "only admins can delete from blobs bucket"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'blobs' and public.is_admin(auth.uid()));

-- 6. Enable Realtime on documents, so edits on one device/computer appear on
--    every other open tab within ~1 second instead of waiting on the 15s poll.
alter publication supabase_realtime add table public.documents;

-- 5. After running this once, make yourself an admin (replace with your email):
--    update public.profiles set role = 'admin'
--    where id = (select id from auth.users where email = 'you@example.com');
