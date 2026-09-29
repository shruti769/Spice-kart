-- Spice Kart · customer profiles (Personal details screen) and profile photos.
-- Run in Supabase Dashboard → SQL Editor. Safe to re-run.
--
-- The app signs each device in with Supabase Auth (anonymously until SMS OTP is wired up), so
-- every profile belongs to an `auth.users` row. Requires Authentication → Sign In / Providers →
-- "Allow anonymous sign-ins" to be ON.

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  first_name  text not null default '',
  last_name   text not null default '',
  email       text not null default '' check (email = '' or email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  -- Australian mobile: the 9 digits after +61.
  mobile      text not null default '' check (mobile = '' or mobile ~ '^\d{9}$'),
  dob         date check (dob is null or (dob >= '1900-01-01' and dob < current_date)),
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_mobile_idx on public.profiles (mobile) where mobile <> '';

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;

-- Each user reads and edits only their own profile; admins can read all of them.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ─── Profile photos (public bucket; each user writes only inside their own `<uid>/` folder) ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 3145728, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Storage needs SELECT as well to remove (or upsert) a file.
drop policy if exists "users read own avatar" on storage.objects;
create policy "users read own avatar" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "users upload own avatar" on storage.objects;
create policy "users upload own avatar" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "users update own avatar" on storage.objects;
create policy "users update own avatar" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "users delete own avatar" on storage.objects;
create policy "users delete own avatar" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
