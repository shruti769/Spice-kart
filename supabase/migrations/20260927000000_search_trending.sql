-- Spice Kart · search analytics for "Trending in Melbourne" on the app's Search tab.
-- Run in Supabase Dashboard → SQL Editor. Safe to re-run.

-- Every search the app submits (term only — no user or device data).
create table if not exists public.search_events (
  id         bigint generated always as identity primary key,
  term       text not null check (char_length(term) between 2 and 60),
  created_at timestamptz not null default now()
);

create index if not exists search_events_created_idx on public.search_events (created_at desc);

alter table public.search_events enable row level security;

-- The app may only add searches; nobody can read raw events through the API.
drop policy if exists "anyone can log a search" on public.search_events;
create policy "anyone can log a search" on public.search_events for insert to anon, authenticated with check (true);

drop policy if exists "admins read searches" on public.search_events;
create policy "admins read searches" on public.search_events for select to authenticated using ((select public.is_admin()));

-- Top searched terms of the last 7 days, compared with the 7 days before. Only terms that match
-- at least one published product are returned, so junk or abusive searches never show up.
create or replace function public.trending_searches(limit_count int default 5)
returns table (term text, searches int, change_pct int, image_url text, product_count int)
language sql
stable
security definer
set search_path = ''
as $$
  with recent as (
    select lower(trim(e.term)) as t, count(*) as n
    from public.search_events e
    where e.created_at > now() - interval '7 days'
    group by 1
  ),
  previous as (
    select lower(trim(e.term)) as t, count(*) as n
    from public.search_events e
    where e.created_at > now() - interval '14 days' and e.created_at <= now() - interval '7 days'
    group by 1
  ),
  matched as (
    select r.t, r.n, coalesce(p.n, 0) as prev_n,
      '%' || replace(replace(replace(r.t, '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
    from recent r
    left join previous p on p.t = r.t
  )
  select
    initcap(m.t),
    m.n::int,
    case when m.prev_n = 0 then null else round((m.n - m.prev_n) * 100.0 / m.prev_n)::int end,
    (select pr.image_url from public.products pr
      where pr.published and pr.image_url is not null
        and (pr.name ilike m.pattern or pr.brand ilike m.pattern or coalesce(pr.subcategory, '') ilike m.pattern)
      order by pr.created_at desc limit 1),
    (select count(*)::int from public.products pr
      where pr.published and (pr.name ilike m.pattern or pr.brand ilike m.pattern or coalesce(pr.subcategory, '') ilike m.pattern))
  from matched m
  where exists (
    select 1 from public.products pr
    where pr.published and (pr.name ilike m.pattern or pr.brand ilike m.pattern or coalesce(pr.subcategory, '') ilike m.pattern)
  )
  order by m.n desc, m.t
  limit greatest(1, least(limit_count, 20));
$$;

grant execute on function public.trending_searches(int) to anon, authenticated;

-- Realtime so the app can refresh trending as searches come in.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'search_events') then
    alter publication supabase_realtime add table public.search_events;
  end if;
end $$;
