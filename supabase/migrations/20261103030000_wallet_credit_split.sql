-- Spice Kart · Keeps credit given by an admin apart from money the customer paid in. `balance` stays the
-- total the customer sees. Credit is spent first and can never go back to a card.
-- Run in Supabase Dashboard → SQL Editor. Safe to re-run.
--
--   wallets.credit_balance                the part of `balance` that is admin credit
--   wallet_transactions.credit_amount     the part of a transaction's amount that is admin credit
--   wallet_apply()                        decides that part. Every wallet change goes through it, so
--                                         its callers don't change.

alter table public.wallets add column if not exists credit_balance numeric(10, 2) not null default 0;
alter table public.wallets drop constraint if exists wallets_credit_balance_check;
alter table public.wallets add constraint wallets_credit_balance_check check (credit_balance >= 0 and credit_balance <= balance);
alter table public.wallet_transactions add column if not exists credit_amount numeric(10, 2) not null default 0;

create or replace function public.wallet_apply(p_customer uuid, p_amount numeric, p_kind text, p_order uuid default null, p_method text default null, p_note text default '')
returns numeric
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_amount numeric(10, 2) := round(p_amount, 2);
  v_balance numeric(10, 2);
  v_credit numeric(10, 2);
  v_part numeric(10, 2) := 0;
begin
  insert into public.customers (id) values (p_customer) on conflict (id) do nothing;
  insert into public.wallets (customer_id) values (p_customer) on conflict (customer_id) do nothing;
  select balance, credit_balance into v_balance, v_credit from public.wallets where customer_id = p_customer for update;

  if p_kind = 'order_payment' then
    v_part := -least(v_credit, -v_amount);
  elsif p_kind = 'refund' and p_order is not null then
    -- Credit spent on this order and not refunded yet goes back as credit, the rest as the customer's money.
    select least(greatest(coalesce(-sum(credit_amount), 0), 0), v_amount) into v_part
      from public.wallet_transactions where customer_id = p_customer and order_id = p_order;
  elsif p_kind = 'adjustment' and p_method is distinct from 'Card' then
    -- wallet_adjust(). Method 'Card' is the customer's own money going to or coming back from their card.
    v_part := case when v_amount > 0 then v_amount else -least(v_credit, -v_amount) end;
  end if;

  v_balance := v_balance + v_amount;
  v_credit := v_credit + v_part;
  if v_balance < 0 or v_credit > v_balance then raise exception 'insufficient_balance'; end if;
  update public.wallets set balance = v_balance, credit_balance = v_credit, updated_at = now() where customer_id = p_customer;
  insert into public.wallet_transactions (customer_id, amount, credit_amount, balance_after, kind, order_id, method, note, created_by)
  values (p_customer, v_amount, v_part, v_balance, p_kind, p_order, p_method, coalesce(p_note, ''), (select auth.uid()));
  return v_balance;
end $$;
