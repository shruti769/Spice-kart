-- Spice Kart · When a bank bounces a refund after Stripe accepted it, undo what was recorded and tell
-- the admin. The money is back in the Stripe balance by then, so the customer still needs paying.
-- Run in Supabase Dashboard → SQL Editor. Safe to re-run. Called by the stripe-webhook function.
--
--   stripe_refund_failures      each failed refund once: Stripe can send the same event again
--   stripe_refund_failed()      order refund → removes it from the order, so it can be refunded again;
--                               wallet return → puts the money back in the wallet

create table if not exists public.stripe_refund_failures (
  refund_id  text primary key,
  created_at timestamptz not null default now()
);
alter table public.stripe_refund_failures enable row level security;
revoke all on public.stripe_refund_failures from public, anon, authenticated;

create or replace function public.stripe_refund_failed(p_refund text, p_intent text, p_amount numeric, p_reason text, p_wallet_customer uuid default null, p_refund_request text default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  o public.orders;
  v_order uuid;
  v_paid numeric;
  v_refunded numeric;
  why text := coalesce(nullif(replace(p_reason, '_', ' '), ''), 'not given');
  inserted integer;
begin
  insert into public.stripe_refund_failures (refund_id) values (p_refund) on conflict (refund_id) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return; end if;

  if p_wallet_customer is not null then
    update public.stripe_wallet_credits set refunded = greatest(refunded - p_amount, 0) where payment_intent = p_intent and customer_id = p_wallet_customer;
    perform public.wallet_apply(p_wallet_customer, p_amount, 'adjustment', null, 'Card', 'Card refund failed, money returned to your wallet');
    perform public.raise_alert('refund:failed:' || p_refund, 'payments', 'critical',
      'A $' || to_char(p_amount, 'FM999990.00') || ' wallet refund to card failed',
      'The bank returned it (reason: ' || why || '). The money is back in the customer’s wallet. Please contact them.',
      'pay', 'Review payments');
    return;
  end if;

  select order_id into v_order from public.payments where provider_ref = p_refund and status = 'refunded';
  if v_order is null then
    perform public.raise_alert('refund:failed:' || p_refund, 'payments', 'critical',
      'A $' || to_char(p_amount, 'FM999990.00') || ' refund failed',
      'The bank returned it (reason: ' || why || '), but it isn’t linked to an order. Stripe refund ' || p_refund || '.',
      'pay', 'Review payments');
    return;
  end if;

  delete from public.payments where provider_ref = p_refund and status = 'refunded';
  select coalesce(sum(amount) filter (where status = 'succeeded'), 0), coalesce(sum(amount) filter (where status = 'refunded'), 0)
    into v_paid, v_refunded from public.payments where order_id = v_order;
  update public.orders set payment_status = case when v_refunded >= v_paid and v_paid > 0 then 'refunded' when v_refunded > 0 then 'partially_refunded' else 'paid' end
   where id = v_order returning * into o;
  -- 'approved' = agreed but not paid yet, which is now true.
  if p_refund_request is not null then
    update public.refund_requests set status = 'approved' where number = p_refund_request and status = 'paid';
  end if;
  perform public.raise_alert('refund:failed:' || p_refund, 'payments', 'critical',
    'Refund failed on order #' || o.number || ' · $' || to_char(p_amount, 'FM999990.00'),
    'The bank returned it (reason: ' || why || '). The money is back in your Stripe balance and the customer hasn’t got it. Please contact them and refund another way.',
    'pay', 'Review payments');
end $$;
revoke execute on function public.stripe_refund_failed(text, text, numeric, text, uuid, text) from public, anon, authenticated;
grant execute on function public.stripe_refund_failed(text, text, numeric, text, uuid, text) to service_role;

-- For the cancel flow: a refund that can't go through right after cancelling.
grant execute on function public.raise_alert(text, text, text, text, text, text, text) to service_role;
