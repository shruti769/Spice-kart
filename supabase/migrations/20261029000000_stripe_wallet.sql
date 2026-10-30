-- Stripe customer identities are server-only; never accept a customer ID from the app.
create table if not exists public.stripe_customers (
  customer_id uuid primary key references auth.users(id) on delete cascade,
  stripe_id text not null unique
);
alter table public.stripe_customers enable row level security;
revoke all on public.stripe_customers from anon, authenticated;
create table if not exists public.stripe_wallet_credits (
  payment_intent text primary key,
  customer_id uuid not null references auth.users(id),
  amount numeric(10,2) not null check (amount between 5 and 500),
  created_at timestamptz not null default now()
);
alter table public.stripe_wallet_credits enable row level security;
revoke all on public.stripe_wallet_credits from anon, authenticated;
-- Disable the old demo endpoint even for older installed apps.
create or replace function public.wallet_top_up(p_amount numeric, p_method text)
returns numeric language plpgsql security definer set search_path = '' as $$
begin raise exception 'Use Stripe to add money'; end $$;
revoke execute on function public.wallet_top_up(numeric,text) from public, anon, authenticated;
-- Atomic ledger insertion + balance update: webhook retries and app confirmations cannot double credit.
create or replace function public.credit_stripe_wallet(p_intent text, p_customer uuid, p_amount numeric)
returns numeric language plpgsql security definer set search_path = '' as $$
declare inserted integer;
begin
  if p_amount is null or p_amount < 5 or p_amount > 500 or p_amount <> round(p_amount,2) then raise exception 'bad_amount'; end if;
  insert into public.stripe_wallet_credits(payment_intent,customer_id,amount)
  values(p_intent,p_customer,p_amount) on conflict(payment_intent) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 1 then
    return public.wallet_apply(p_customer,p_amount,'topup',null,'Stripe','Added money');
  end if;
  if not exists(select 1 from public.stripe_wallet_credits where payment_intent=p_intent and customer_id=p_customer and amount=p_amount) then raise exception 'credit_mismatch'; end if;
  return (select balance from public.wallets where customer_id=p_customer);
end $$;
revoke all on function public.credit_stripe_wallet(text,uuid,numeric) from public,anon,authenticated;
grant execute on function public.credit_stripe_wallet(text,uuid,numeric) to service_role;
