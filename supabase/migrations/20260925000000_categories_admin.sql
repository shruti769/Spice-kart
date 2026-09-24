-- Spice Kart · categories managed from the admin panel.
-- Run after 20260924000000_catalogue.sql in Supabase Dashboard → SQL Editor. Safe to re-run.

-- ─── Extra category fields ──────────────────────────────────────────────────────────────
alter table public.categories add column if not exists image_url  text;
alter table public.categories add column if not exists bg_color   text not null default '#F1F3EE';
alter table public.categories add column if not exists enabled    boolean not null default true;
alter table public.categories add column if not exists created_at timestamptz not null default now();
alter table public.categories add column if not exists updated_at timestamptz not null default now();

drop trigger if exists categories_touch on public.categories;
create trigger categories_touch before update on public.categories
  for each row execute function public.touch_updated_at();

-- Renaming a sub-category keeps products pointing at it.
alter table public.subcategories drop constraint if exists subcategories_category_id_fkey;
alter table public.subcategories add constraint subcategories_category_id_fkey
  foreign key (category_id) references public.categories (id) on update cascade on delete cascade;

-- ─── Access: the app reads enabled categories; admins read everything and can write ──────
drop policy if exists "categories are public" on public.categories;
create policy "categories are public" on public.categories for select to anon, authenticated
  using (enabled or (select public.is_admin()));

drop policy if exists "admins insert categories" on public.categories;
create policy "admins insert categories" on public.categories for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "admins update categories" on public.categories;
create policy "admins update categories" on public.categories for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admins delete categories" on public.categories;
create policy "admins delete categories" on public.categories for delete to authenticated using ((select public.is_admin()));

drop policy if exists "admins insert subcategories" on public.subcategories;
create policy "admins insert subcategories" on public.subcategories for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "admins update subcategories" on public.subcategories;
create policy "admins update subcategories" on public.subcategories for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admins delete subcategories" on public.subcategories;
create policy "admins delete subcategories" on public.subcategories for delete to authenticated using ((select public.is_admin()));

-- Category images go in the existing public `product-images` bucket under `categories/`
-- (admins can already upload there).

-- ─── Realtime: the app updates when an admin edits categories ───────────────────────────
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'categories') then
    alter publication supabase_realtime add table public.categories;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'subcategories') then
    alter publication supabase_realtime add table public.subcategories;
  end if;
end $$;
