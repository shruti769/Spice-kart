-- Keep legacy nine-digit Australian records valid and accept canonical AU/IN numbers.
begin;
alter table public.profiles drop constraint if exists profiles_mobile_check;
alter table public.profiles add constraint profiles_mobile_check check (
  mobile = '' or mobile ~ '^[0-9]{9}$' or mobile ~ '^\+614[0-9]{8}$' or mobile ~ '^\+91[6-9][0-9]{9}$'
);
alter table public.customers drop constraint if exists customers_mobile_check;
alter table public.customers add constraint customers_mobile_check check (
  mobile is null or mobile ~ '^[0-9]{9}$' or mobile ~ '^\+614[0-9]{8}$' or mobile ~ '^\+91[6-9][0-9]{9}$'
);
commit;
