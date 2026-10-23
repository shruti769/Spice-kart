-- Server-owned mapping: Firebase string UIDs cannot be used as auth.uid() UUIDs.
-- Clients must never read aliases or choose the Supabase account associated with a UID.
create table if not exists public.firebase_identities (
  firebase_uid text primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  login_email text not null unique,
  created_at timestamptz not null default now()
);
alter table public.firebase_identities enable row level security;
revoke all on public.firebase_identities from anon, authenticated;
grant select, insert on public.firebase_identities to service_role;
