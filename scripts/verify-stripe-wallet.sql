begin;
do $$
declare uid uuid; b numeric; after_first numeric; after_second numeric;
begin
  if has_function_privilege('authenticated','public.wallet_top_up(numeric,text)','EXECUTE') then raise exception 'Demo credit still accessible'; end if;
  if has_function_privilege('authenticated','public.credit_stripe_wallet(text,uuid,numeric)','EXECUTE') then raise exception 'Credit RPC exposed'; end if;
  select id into uid from public.customers limit 1;
  if uid is null then raise exception 'No customer fixture'; end if;
  select coalesce(balance,0) into b from public.wallets where customer_id=uid;
  b := coalesce(b,0);
  after_first := public.credit_stripe_wallet('pi_verification_rollback_only',uid,5);
  after_second := public.credit_stripe_wallet('pi_verification_rollback_only',uid,5);
  if after_first <> b+5 or after_second <> after_first then raise exception 'Duplicate credit or wrong balance'; end if;
  begin
    perform public.credit_stripe_wallet('pi_verification_rollback_only',uid,6);
    raise exception 'Mismatch was accepted';
  exception when raise_exception then
    if sqlerrm <> 'credit_mismatch' then raise; end if;
  end;
  begin
    perform public.credit_stripe_wallet('pi_invalid_rollback_only',uid,4);
    raise exception 'Invalid amount accepted';
  exception when raise_exception then
    if sqlerrm <> 'bad_amount' then raise; end if;
  end;
end $$;
rollback;
