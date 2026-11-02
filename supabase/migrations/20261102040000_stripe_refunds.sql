-- Spice Kart · Refunds that really reach the customer's card, through the stripe-refund function.
-- Run in Supabase Dashboard → SQL Editor. Safe to re-run.
--
--   refund_order / decide_refund   take the Stripe refund id. When refunds go to the original payment
--                                  method, a card payment can't be marked refunded without one, so
--                                  nothing can say "refunded" while the money stays put.
--   stripe_wallet_credits.refunded how much of each wallet top-up has gone back to its card
--   wallet_card_refund_reserve()   takes money out of the wallet before Stripe is asked to return it,
--   wallet_card_refund_undo()      and puts it back if Stripe refuses

begin;

drop function if exists public.refund_order(uuid, numeric, text);
drop function if exists public.decide_refund(uuid, boolean, numeric);

create or replace function public.refund_order(p_order uuid, p_amount numeric default null, p_reason text default null, p_provider_ref text default null)
returns public.payments
language plpgsql
security definer
set search_path to 'public'
as $$
declare o public.orders; paid numeric; refunded numeric; amt numeric; p public.payments; m text; dest text;
begin
  if not public.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  select * into o from public.orders where id = p_order for update;
  if o.id is null then raise exception 'Order not found' using errcode = 'P0002'; end if;
  select coalesce(sum(amount) filter (where status = 'succeeded'), 0), coalesce(sum(amount) filter (where status = 'refunded'), 0)
    into paid, refunded from public.payments where order_id = p_order;
  if paid = 0 then raise exception 'Nothing was paid on this order, so there’s nothing to refund' using errcode = 'P0001'; end if;
  amt := round(coalesce(p_amount, paid - refunded), 2);
  if amt <= 0 or amt > paid - refunded then
    raise exception 'Refund must be between $0.01 and $% (what’s left)', to_char(paid - refunded, 'FM999990.00') using errcode = 'P0001';
  end if;
  select refund_destination into dest from public.business_settings limit 1;
  if coalesce(dest, '') <> 'wallet' and p_provider_ref is null
     and exists (select 1 from public.payments where order_id = p_order and status = 'succeeded' and provider_ref like 'pi\_%') then
    raise exception 'This refund must be sent through Stripe. Please refresh the admin panel and try again' using errcode = 'P0001';
  end if;
  select method into m from public.payments where order_id = p_order and status = 'succeeded' order by created_at desc limit 1;
  insert into public.payments (order_id, amount, method, status, refund_reason, provider_ref)
  values (p_order, amt, coalesce(m, o.payment_method), 'refunded', nullif(btrim(p_reason), ''), p_provider_ref) returning * into p;
  -- payments_sync_order sets 'refunded'; a partial refund is 'partially_refunded'.
  update public.orders set payment_status = case when refunded + amt >= paid then 'refunded' else 'partially_refunded' end where id = p_order;
  return p;
end $$;
revoke execute on function public.refund_order(uuid, numeric, text, text) from public, anon;
grant execute on function public.refund_order(uuid, numeric, text, text) to authenticated;

create or replace function public.decide_refund(p_request uuid, p_approve boolean, p_amount numeric default null, p_provider_ref text default null)
returns public.refund_requests
language plpgsql
security definer
set search_path to 'public'
as $$
declare r public.refund_requests; o public.orders; paid numeric; refunded numeric; amt numeric;
begin
  if not public.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  select * into r from public.refund_requests where id = p_request for update;
  if r.id is null then raise exception 'Refund request not found' using errcode = 'P0002'; end if;
  if r.status <> 'pending' then raise exception 'This request was already decided' using errcode = 'P0001'; end if;
  select * into o from public.orders where id = r.order_id;
  if p_approve then
    select coalesce(sum(amount) filter (where status = 'succeeded'), 0), coalesce(sum(amount) filter (where status = 'refunded'), 0)
      into paid, refunded from public.payments where order_id = r.order_id;
    amt := round(coalesce(p_amount, r.amount, case when paid > 0 then paid - refunded else o.total end), 2);
    if amt <= 0 or amt > o.total then raise exception 'Refund must be between $0.01 and the order total ($%)', to_char(o.total, 'FM999990.00') using errcode = 'P0001'; end if;
    if paid - refunded > 0 then
      perform public.refund_order(r.order_id, least(amt, paid - refunded), 'Refund request ' || r.number, p_provider_ref);
      update public.refund_requests set status = 'paid', amount = least(amt, paid - refunded), decided_at = now() where id = p_request returning * into r;
    else
      update public.refund_requests set status = 'approved', amount = amt, decided_at = now() where id = p_request returning * into r;
    end if;
  else
    update public.refund_requests set status = 'rejected', decided_at = now() where id = p_request returning * into r;
  end if;
  insert into public.customer_notifications (customer_id, order_id, kind, title, body, link)
  values (r.customer_id, r.order_id, 'order_update',
          case when p_approve then 'Refund ' || r.number || ' approved' else 'Refund ' || r.number || ' declined' end,
          case when p_approve then '$' || to_char(r.amount, 'FM999990.00') || ' for order #' || o.number || ' is on its way back to you.'
               else 'We couldn’t approve the refund for order #' || o.number || '. Contact support if you have questions.' end,
          'order:' || r.order_id);
  perform public.kick_push_sender();
  return r;
end $$;
revoke execute on function public.decide_refund(uuid, boolean, numeric, text) from public, anon;
grant execute on function public.decide_refund(uuid, boolean, numeric, text) to authenticated;

alter table public.stripe_wallet_credits add column if not exists refunded numeric(10, 2) not null default 0;
alter table public.stripe_wallet_credits drop constraint if exists stripe_wallet_credits_refunded_check;
alter table public.stripe_wallet_credits add constraint stripe_wallet_credits_refunded_check check (refunded >= 0 and refunded <= amount);

create or replace function public.wallet_card_refund_reserve(p_customer uuid, p_intent text, p_amount numeric)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.stripe_wallet_credits set refunded = refunded + p_amount
   where payment_intent = p_intent and customer_id = p_customer and refunded + p_amount <= amount;
  if not found then raise exception 'not_refundable'; end if;
  return public.wallet_apply(p_customer, -p_amount, 'adjustment', null, 'Card', 'Returned to your card');
end $$;

create or replace function public.wallet_card_refund_undo(p_customer uuid, p_intent text, p_amount numeric)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.stripe_wallet_credits set refunded = refunded - p_amount where payment_intent = p_intent and customer_id = p_customer;
  return public.wallet_apply(p_customer, p_amount, 'adjustment', null, 'Card', 'Card refund failed, money returned to your wallet');
end $$;

revoke execute on function public.wallet_card_refund_reserve(uuid, text, numeric) from public, anon, authenticated;
revoke execute on function public.wallet_card_refund_undo(uuid, text, numeric) from public, anon, authenticated;
grant execute on function public.wallet_card_refund_reserve(uuid, text, numeric) to service_role;
grant execute on function public.wallet_card_refund_undo(uuid, text, numeric) to service_role;
-- scripts/verify-stripe-refunds.mjs adds test credit with this.
grant execute on function public.wallet_apply(uuid, numeric, text, uuid, text, text) to service_role;

commit;
