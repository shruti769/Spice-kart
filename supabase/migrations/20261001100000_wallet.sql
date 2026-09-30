-- Spice Kart · Spice Kart Money (the customer wallet).
-- Run in Supabase Dashboard → SQL Editor. Safe to re-run.
-- Needs the admin panel's orders.sql, order_admin.sql and business_settings.sql. Then re-run
-- this repo's 20260930000000_delivery_area.sql, whose place_order() now accepts 'Spice Kart Money'.
--
--   wallets              one balance per customer (never below $0); written only by the functions below
--   wallet_transactions  every change: top-up, order payment, refund, admin adjustment
--   wallet_top_up()      Add money. DEMO: no payment provider yet, so nothing is charged; the
--                        top-up is credited straight away (like orders, payment isn't captured)
--   orders paid with 'wallet' are charged when placed (not enough balance → insufficient_balance)
--   refunds              a 'refunded' payment on a wallet order (or any order when Settings →
--                        Payments → refund destination is Wallet) credits the wallet; cancelling
--                        a wallet order refunds what's left automatically
--   wallet_adjust()      admins add or take away credit (goodwill, cashback, corrections)

-- ═══ Tables ══════════════════════════════════════════════════════════════════════════════
create table if not exists public.wallets (
  customer_id uuid primary key references public.customers (id) on delete cascade,
  balance     numeric(10, 2) not null default 0 check (balance >= 0),
  updated_at  timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id            bigint generated always as identity primary key,
  customer_id   uuid not null references public.customers (id) on delete cascade,
  amount        numeric(10, 2) not null check (amount <> 0),   -- + credit, − debit
  balance_after numeric(10, 2) not null check (balance_after >= 0),
  kind          text not null check (kind in ('topup', 'order_payment', 'refund', 'adjustment')),
  order_id      uuid references public.orders (id) on delete set null,
  method        text,            -- top-ups: 'Visa · 4417', 'Apple Pay', …
  note          text not null default '',
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists wallet_transactions_customer on public.wallet_transactions (customer_id, created_at desc);

alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
grant select on public.wallets, public.wallet_transactions to authenticated;

drop policy if exists "Customers read own wallet" on public.wallets;
create policy "Customers read own wallet" on public.wallets for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "Customers read own wallet transactions" on public.wallet_transactions;
create policy "Customers read own wallet transactions" on public.wallet_transactions for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_admin()));

-- The app live-updates the balance and activity.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wallet_transactions') then
    alter publication supabase_realtime add table public.wallet_transactions;
  end if;
end $$;

-- ═══ The one place balances change ══════════════════════════════════════════════════════
-- Locks the wallet, applies `p_amount` (+ credit / − debit) and records it. Raises
-- insufficient_balance when a debit would go below $0. Internal: not callable from the app.
create or replace function public.wallet_apply(
  p_customer uuid, p_amount numeric, p_kind text,
  p_order uuid default null, p_method text default null, p_note text default ''
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance numeric(10, 2);
begin
  insert into public.customers (id) values (p_customer) on conflict (id) do nothing;
  insert into public.wallets (customer_id) values (p_customer) on conflict (customer_id) do nothing;
  select balance into v_balance from public.wallets where customer_id = p_customer for update;
  v_balance := v_balance + round(p_amount, 2);
  if v_balance < 0 then raise exception 'insufficient_balance'; end if;
  update public.wallets set balance = v_balance, updated_at = now() where customer_id = p_customer;
  insert into public.wallet_transactions (customer_id, amount, balance_after, kind, order_id, method, note, created_by)
  values (p_customer, round(p_amount, 2), v_balance, p_kind, p_order, p_method, coalesce(p_note, ''), (select auth.uid()));
  return v_balance;
end $$;
revoke execute on function public.wallet_apply(uuid, numeric, text, uuid, text, text) from public, anon, authenticated;

-- ═══ Add money (demo) ════════════════════════════════════════════════════════════════════
-- $5–$500 per top-up. DEMO: credited without charging anything until a payment provider is
-- connected (then the provider's webhook should call wallet_apply instead).
-- Errors: not_signed_in, bad_amount. Returns the new balance.
create or replace function public.wallet_top_up(p_amount numeric, p_method text)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;
  if p_amount is null or p_amount < 5 or p_amount > 500 or p_amount <> round(p_amount, 2) then raise exception 'bad_amount'; end if;
  return public.wallet_apply(v_uid, p_amount, 'topup', null, left(coalesce(p_method, ''), 40), 'Added money');
end $$;
revoke execute on function public.wallet_top_up(numeric, text) from public, anon;
grant execute on function public.wallet_top_up(numeric, text) to authenticated;

-- ═══ Paying for orders ═══════════════════════════════════════════════════════════════════
-- An order placed with payment_method 'wallet' is charged in the same transaction, so
-- place_order() fails with insufficient_balance when the balance doesn't cover it.
create or replace function public.wallet_charge_order() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.payment_method <> 'wallet' or new.total <= 0 then return null; end if;
  perform public.wallet_apply(new.customer_id, -new.total, 'order_payment', new.id, 'Spice Kart Money', 'Order #' || new.number);
  -- payments_sync_order (orders.sql) marks the order paid.
  insert into public.payments (order_id, amount, method, status) values (new.id, new.total, 'wallet', 'succeeded');
  return null;
end $$;
drop trigger if exists wallet_charge_order on public.orders;
create trigger wallet_charge_order after insert on public.orders for each row execute function public.wallet_charge_order();

-- ═══ Refunds ═════════════════════════════════════════════════════════════════════════════
-- A refund recorded on an order (refund_order / decide_refund in the admin's admin_data.sql, or
-- the cancel trigger below) goes back to the wallet when the order was paid from it, or when
-- Settings → Payments → Refund destination is Wallet.
create or replace function public.wallet_refund_payment() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders;
  v_to_wallet boolean;
begin
  if new.status <> 'refunded' or new.amount <= 0 then return null; end if;
  select * into o from public.orders where id = new.order_id;
  v_to_wallet := o.payment_method = 'wallet';
  if not v_to_wallet and to_regclass('public.business_settings') is not null then
    execute 'select coalesce((select refund_destination = ''wallet'' from public.business_settings limit 1), false)' into v_to_wallet;
  end if;
  if v_to_wallet then
    perform public.wallet_apply(o.customer_id, new.amount, 'refund', o.id, null,
      'Refund · order #' || o.number || coalesce(' · ' || nullif(btrim(to_jsonb(new) ->> 'refund_reason'), ''), ''));
  end if;
  return null;
end $$;
drop trigger if exists wallet_refund_payment on public.payments;
create trigger wallet_refund_payment after insert on public.payments for each row execute function public.wallet_refund_payment();

-- Cancelling an order paid from the wallet refunds whatever hasn't been refunded yet.
create or replace function public.wallet_refund_cancelled() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_left numeric(10, 2);
begin
  if new.status <> 'cancelled' or old.status = 'cancelled' or new.payment_method <> 'wallet' then return null; end if;
  select coalesce(sum(amount) filter (where status = 'succeeded'), 0) - coalesce(sum(amount) filter (where status = 'refunded'), 0)
    into v_left from public.payments where order_id = new.id;
  if v_left > 0 then
    -- wallet_refund_payment credits the wallet; payments_sync_order marks the order refunded.
    insert into public.payments (order_id, amount, method, status) values (new.id, v_left, 'wallet', 'refunded');
  end if;
  return null;
end $$;
drop trigger if exists wallet_refund_cancelled on public.orders;
create trigger wallet_refund_cancelled after update of status on public.orders for each row execute function public.wallet_refund_cancelled();

-- ═══ Admin adjustments ═══════════════════════════════════════════════════════════════════
-- Add (+) or take away (−) credit with a reason. Errors: admins only, bad_amount, insufficient_balance.
create or replace function public.wallet_adjust(p_customer uuid, p_amount numeric, p_note text)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  if p_amount is null or p_amount = 0 or abs(p_amount) > 10000 then raise exception 'bad_amount'; end if;
  return public.wallet_apply(p_customer, p_amount, 'adjustment', null, null, coalesce(nullif(btrim(p_note), ''), 'Adjustment by Spice Kart'));
end $$;
revoke execute on function public.wallet_adjust(uuid, numeric, text) from public, anon;
grant execute on function public.wallet_adjust(uuid, numeric, text) to authenticated;
