-- Spice Kart · delivery area (postcodes) and order locations.
-- Run in Supabase Dashboard → SQL Editor after 20260929120000_orders.sql. Safe to re-run.
--
-- 1. `delivery_postcodes`: the postcodes the store delivers to (Admin → Settings → Delivery area).
--    While the list has no active postcodes, every postcode is accepted.
-- 2. Order locations, both optional:
--    · delivery_lat / delivery_lng: the delivery address's map pin (for the driver's route).
--    · order_lat / order_lng / order_accuracy_m / order_located_at: where the customer's phone
--      was when ordering (only with their location permission; for spotting unusual orders).
-- 3. `place_order()` gains the two locations and refuses addresses outside the delivery area.

-- ─── 1. Delivery area ───────────────────────────────────────────────────────────────────
create table if not exists public.delivery_postcodes (
  postcode    text primary key check (postcode ~ '^[0-9]{4}$'),
  suburb      text not null default '' check (char_length(suburb) <= 60),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.delivery_postcodes enable row level security;
grant select on public.delivery_postcodes to anon, authenticated;
grant insert, update, delete on public.delivery_postcodes to authenticated;

drop policy if exists "delivery postcodes are public" on public.delivery_postcodes;
create policy "delivery postcodes are public" on public.delivery_postcodes for select to anon, authenticated
  using (active or (select public.is_admin()));
drop policy if exists "admins insert delivery postcodes" on public.delivery_postcodes;
create policy "admins insert delivery postcodes" on public.delivery_postcodes for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "admins update delivery postcodes" on public.delivery_postcodes;
create policy "admins update delivery postcodes" on public.delivery_postcodes for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admins delete delivery postcodes" on public.delivery_postcodes;
create policy "admins delete delivery postcodes" on public.delivery_postcodes for delete to authenticated using ((select public.is_admin()));

-- The app live-updates through the change feed (see 20260928130000_offers_live.sql).
drop trigger if exists delivery_postcodes_app_change on public.delivery_postcodes;
create trigger delivery_postcodes_app_change after insert or update or delete on public.delivery_postcodes
  for each statement execute function public.bump_app_change();

/** True when the store delivers to `p_postcode` (always true while no postcodes are listed). */
create or replace function public.delivers_to(p_postcode text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.delivery_postcodes where active)
      or exists (select 1 from public.delivery_postcodes where active and postcode = p_postcode);
$$;
grant execute on function public.delivers_to(text) to anon, authenticated;

-- ─── 2. Order locations ─────────────────────────────────────────────────────────────────
alter table public.orders add column if not exists delivery_lat     double precision check (delivery_lat is null or delivery_lat between -90 and 90);
alter table public.orders add column if not exists delivery_lng     double precision check (delivery_lng is null or delivery_lng between -180 and 180);
alter table public.orders add column if not exists order_lat        double precision check (order_lat is null or order_lat between -90 and 90);
alter table public.orders add column if not exists order_lng        double precision check (order_lng is null or order_lng between -180 and 180);
alter table public.orders add column if not exists order_accuracy_m real check (order_accuracy_m is null or order_accuracy_m >= 0);
alter table public.orders add column if not exists order_located_at timestamptz;
alter table public.orders drop constraint if exists orders_delivery_pin_pair;
alter table public.orders add constraint orders_delivery_pin_pair check ((delivery_lat is null) = (delivery_lng is null));
alter table public.orders drop constraint if exists orders_order_pin_pair;
alter table public.orders add constraint orders_order_pin_pair check ((order_lat is null) = (order_lng is null));

-- ─── 3. place_order() with locations ────────────────────────────────────────────────────
-- Same as 20260929120000_orders.sql, plus:
-- p_delivery_location: {"lat": -37.81, "lng": 144.96} of the delivery address (optional).
-- p_device_location:   {"lat", "lng", "accuracy" (metres), "at" (ISO time)} (optional).
-- New error: not_deliverable:<postcode>.
drop function if exists public.place_order(jsonb, text, text, text, uuid, date, text);
drop function if exists public.place_order(jsonb, text, text, text, uuid, date, text, jsonb, jsonb);
create function public.place_order(
  p_items          jsonb,
  p_address_label  text,
  p_address_line   text,
  p_payment        text,
  p_slot_id        uuid default null,
  p_delivery_date  date default null,
  p_coupon         text default null,
  p_delivery_location jsonb default null,
  p_device_location   jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_now       timestamp := now() at time zone 'Australia/Melbourne';
  v_method    text;
  v_lines     jsonb;
  v_count     int;
  v_bad_qty   boolean;
  v_found     int := 0;
  v_item      record;
  v_settings  public.delivery_settings;
  v_slot      public.delivery_slots;
  v_label     text;
  v_promised  timestamptz;
  v_coupon    public.coupons;
  v_subtotal  numeric(10, 2) := 0;
  v_eligible  numeric(10, 2);
  v_discount  numeric(10, 2) := 0;
  v_delivery  numeric(10, 2);
  v_order     public.orders;
  v_postcode  text := substring(trim(p_address_line) from '(\d{4})$');
  v_dlat      double precision;
  v_dlng      double precision;
  v_olat      double precision;
  v_olng      double precision;
  v_oacc      real;
  v_oat       timestamptz;
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_cart';
  end if;
  if coalesce(trim(p_address_line), '') = '' then raise exception 'no_address'; end if;
  v_method := case p_payment when 'Card' then 'card' when 'Apple Pay' then 'apple_pay' when 'Google Pay' then 'google_pay' when 'PayID' then 'payid' when 'Spice Kart Money' then 'wallet' end;
  if v_method is null then raise exception 'bad_payment'; end if;
  if not public.delivers_to(v_postcode) then raise exception 'not_deliverable:%', coalesce(v_postcode, ''); end if;

  -- Map pins are optional extras: anything malformed or out of range is simply not stored.
  begin
    v_dlat := (p_delivery_location ->> 'lat')::double precision;
    v_dlng := (p_delivery_location ->> 'lng')::double precision;
  exception when others then v_dlat := null; v_dlng := null;
  end;
  if v_dlat is null or v_dlng is null or v_dlat not between -90 and 90 or v_dlng not between -180 and 180 then
    v_dlat := null; v_dlng := null;
  end if;
  begin
    v_olat := (p_device_location ->> 'lat')::double precision;
    v_olng := (p_device_location ->> 'lng')::double precision;
    v_oacc := greatest((p_device_location ->> 'accuracy')::real, 0);
    v_oat  := least(coalesce((p_device_location ->> 'at')::timestamptz, now()), now());
  exception when others then v_olat := null; v_olng := null;
  end;
  if v_olat is null or v_olng is null or v_olat not between -90 and 90 or v_olng not between -180 and 180 then
    v_olat := null; v_olng := null; v_oacc := null; v_oat := null;
  end if;

  -- One line per product.
  select jsonb_agg(jsonb_build_object('product_id', product_id, 'qty', qty)), count(*), bool_or(qty is null or qty < 1 or qty > 99)
    into v_lines, v_count, v_bad_qty
  from (
    select (e ->> 'product_id')::uuid as product_id, sum((e ->> 'qty')::int)::int as qty
    from jsonb_array_elements(p_items) e
    group by 1
  ) l;
  if v_bad_qty then raise exception 'bad_quantity'; end if;

  -- Lock the products so two orders can't both take the last unit.
  for v_item in
    select p.name, p.price, p.published, p.track_inventory, p.stock_qty, l.qty
    from jsonb_to_recordset(v_lines) as l (product_id uuid, qty int)
    join public.products p on p.id = l.product_id
    order by p.id
    for update of p
  loop
    v_found := v_found + 1;
    if not v_item.published then raise exception 'product_unavailable'; end if;
    if v_item.track_inventory and v_item.stock_qty < v_item.qty then
      raise exception 'out_of_stock:%', v_item.name;
    end if;
    v_subtotal := v_subtotal + v_item.price * v_item.qty;
  end loop;
  if v_found <> v_count then raise exception 'product_unavailable'; end if;

  -- Delivery fee (same rules as the app's cart): express, or a bookable scheduled slot.
  select * into v_settings from public.delivery_settings where id = 1;
  if p_slot_id is null then
    v_delivery := v_settings.express_fee;
    v_promised := now() + make_interval(mins => v_settings.express_eta_minutes);
  else
    -- Locking the slot serialises capacity checks for it.
    select * into v_slot from public.delivery_slots where id = p_slot_id and active for update;
    if not found
      or p_delivery_date is null
      or p_delivery_date < v_now::date
      or p_delivery_date > v_now::date + v_settings.book_ahead_days
      or v_slot.weekday <> (array['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])[extract(isodow from p_delivery_date)::int]
      or p_delivery_date + make_interval(mins => v_slot.start_min - v_settings.cutoff_minutes) <= v_now
    then
      raise exception 'slot_unavailable';
    end if;
    if (select count(*) from public.orders
        where slot_id = p_slot_id and slot_date = p_delivery_date and status <> 'cancelled') >= v_slot.capacity then
      raise exception 'slot_full';
    end if;
    v_delivery := coalesce(v_slot.fee, v_settings.scheduled_fee);
    -- "Tue 30 Sep · 9:00 – 11:00", 12-hour like the app.
    v_label := to_char(p_delivery_date, 'Dy FMDD Mon') || ' · '
      || ((v_slot.start_min / 60 + 11) % 12 + 1) || ':' || lpad((v_slot.start_min % 60)::text, 2, '0') || ' – '
      || ((v_slot.end_min / 60 + 11) % 12 + 1) || ':' || lpad((v_slot.end_min % 60)::text, 2, '0');
    v_promised := (p_delivery_date + make_interval(mins => v_slot.end_min)) at time zone 'Australia/Melbourne';
  end if;
  if v_subtotal >= v_settings.free_delivery_over then v_delivery := 0; end if;

  -- Coupon (same rules as the app's applyCouponRules). One that doesn't apply is simply dropped.
  if nullif(trim(p_coupon), '') is not null then
    select * into v_coupon from public.coupons
    where code = trim(p_coupon) and active
      and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now());
    if found then
      if v_coupon.category_id is null then
        v_eligible := v_subtotal;
      else
        select coalesce(sum(p.price * l.qty), 0) into v_eligible
        from jsonb_to_recordset(v_lines) as l (product_id uuid, qty int)
        join public.products p on p.id = l.product_id
        where p.category_id = v_coupon.category_id;
      end if;
      if v_eligible > 0 and v_eligible >= v_coupon.min_spend then
        if v_coupon.discount_type = 'flat' then
          v_discount := least(v_coupon.value, v_eligible);
        elsif v_coupon.discount_type = 'percent' then
          v_discount := round(v_eligible * v_coupon.value) / 100;
          if v_coupon.max_discount is not null then v_discount := least(v_discount, v_coupon.max_discount); end if;
        elsif v_delivery > 0 then
          v_delivery := 0;
        else
          v_coupon := null;
        end if;
      else
        v_coupon := null;
      end if;
    end if;
  end if;

  -- The admin panel's customer record, kept in step with the app's personal details.
  insert into public.customers (id, first_name, last_name, email, mobile)
  select v_uid, coalesce(left(p.first_name, 60), ''), coalesce(left(p.last_name, 60), ''), nullif(p.email, ''), nullif(p.mobile, '')
  from (select v_uid as id) u left join public.profiles p on p.id = u.id
  on conflict (id) do update set
    first_name = coalesce(nullif(excluded.first_name, ''), public.customers.first_name),
    last_name  = coalesce(nullif(excluded.last_name, ''), public.customers.last_name),
    email      = coalesce(excluded.email, public.customers.email),
    mobile     = coalesce(excluded.mobile, public.customers.mobile);

  insert into public.orders (
    customer_id, delivery_type, slot_id, slot_date, slot_label, promised_by,
    address_line, address_area, postcode,
    subtotal, delivery_fee, handling_fee, discount, total, coupon_code, payment_method,
    delivery_lat, delivery_lng, order_lat, order_lng, order_accuracy_m, order_located_at
  ) values (
    v_uid, case when p_slot_id is null then 'express' else 'scheduled' end,
    p_slot_id, case when p_slot_id is null then null else p_delivery_date end, v_label, v_promised,
    trim(p_address_line), coalesce(trim(p_address_label), ''), v_postcode,
    v_subtotal, v_delivery, v_settings.handling_fee, v_discount,
    v_subtotal - v_discount + v_delivery + v_settings.handling_fee, v_coupon.code, v_method,
    v_dlat, v_dlng, v_olat, v_olng, v_oacc, v_oat
  )
  returning * into v_order;

  insert into public.order_items (order_id, product_id, name, image_url, qty, unit_price)
  select v_order.id, p.id, p.name, p.image_url, l.qty, p.price
  from jsonb_to_recordset(v_lines) as l (product_id uuid, qty int)
  join public.products p on p.id = l.product_id;

  update public.products p set stock_qty = p.stock_qty - l.qty
  from jsonb_to_recordset(v_lines) as l (product_id uuid, qty int)
  where p.id = l.product_id and p.track_inventory;

  return jsonb_build_object('id', v_order.id, 'number', v_order.number, 'total', v_order.total);
end;
$$;

revoke all on function public.place_order(jsonb, text, text, text, uuid, date, text, jsonb, jsonb) from public, anon;
grant execute on function public.place_order(jsonb, text, text, text, uuid, date, text, jsonb, jsonb) to authenticated;
