-- Spice Kart · product ratings & reviews from the app.
-- Run in Supabase Dashboard → SQL Editor after the admin's orders.sql and admin_data.sql (the
-- `reviews` table, moderation and replies) and 20260928130000_offers_live.sql. Safe to re-run.
--
--   submit_review()     the only way a customer writes a review: they must have a DELIVERED order
--                       containing the product. One review per customer per product; submitting
--                       again edits it. 1–2 stars wait for moderation (as the admin's trigger does).
--   product_ratings     average rating + count of published reviews per product (public)
--   product_reviews()   published reviews for a product with the reviewer's first name + initial,
--                       plus the signed-in customer's own review whatever its status
--   reviews bump app_changes, so ratings in the app update when an admin hides or replies.

-- ═══ Writing ═════════════════════════════════════════════════════════════════════════════
-- Reviews go only through submit_review(): the admin schema's policy let any signed-in user
-- review any product, any number of times.
drop policy if exists "Customers write own reviews" on public.reviews;

create or replace function public.submit_review(p_product uuid, p_rating int, p_comment text default '')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_order   uuid;
  v_comment text := trim(coalesce(p_comment, ''));
  v_review  public.reviews;
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'invalid_rating'; end if;
  if char_length(v_comment) > 1000 then raise exception 'comment_too_long'; end if;

  -- The latest delivered order with this product in it.
  select o.id into v_order
  from public.orders o
  join public.order_items i on i.order_id = o.id
  where o.customer_id = v_uid and o.status = 'delivered' and i.product_id = p_product
  order by o.delivered_at desc nulls last, o.placed_at desc
  limit 1;
  if v_order is null then raise exception 'not_delivered'; end if;

  select * into v_review from public.reviews
  where customer_id = v_uid and product_id = p_product
  order by created_at desc limit 1
  for update;

  if v_review.id is null then
    -- reviews_moderate (admin schema) holds 1–2 stars as 'pending'.
    insert into public.reviews (customer_id, order_id, product_id, rating, comment)
    values (v_uid, v_order, p_product, p_rating, v_comment)
    returning * into v_review;
  else
    -- An edit is moderated again, unless an admin has hidden the review (it stays hidden).
    update public.reviews set
      rating  = p_rating,
      comment = v_comment,
      status  = case when status = 'hidden' then 'hidden'
                     when p_rating <= 2 then 'pending'
                     else 'published' end
    where id = v_review.id
    returning * into v_review;
  end if;

  return jsonb_build_object('id', v_review.id, 'rating', v_review.rating, 'status', v_review.status);
end;
$$;

revoke all on function public.submit_review(uuid, int, text) from public, anon;
grant execute on function public.submit_review(uuid, int, text) to authenticated;

-- ═══ Reading ═════════════════════════════════════════════════════════════════════════════
create or replace view public.product_ratings
with (security_invoker = true) as
  select product_id, round(avg(rating), 1) as average, count(*)::int as count
  from public.reviews
  where status = 'published' and product_id is not null
  group by product_id;

grant select on public.product_ratings to anon, authenticated;

-- Reviewer names come from `customers`, which other customers can't read, hence security definer.
create or replace function public.product_reviews(p_product uuid, p_limit int default 20)
returns table (
  id uuid, rating int, comment text, reply text, replied_at timestamptz, created_at timestamptz,
  updated_at timestamptz, status text, author text, mine boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.rating, r.comment, r.reply, r.replied_at, r.created_at, r.updated_at, r.status,
         coalesce(nullif(trim(c.first_name || ' ' || left(c.last_name, 1) ||
                              case when c.last_name <> '' then '.' else '' end), ''), 'Spice Kart customer'),
         r.customer_id = (select auth.uid())
  from public.reviews r
  left join public.customers c on c.id = r.customer_id
  where r.product_id = p_product
    and (r.status = 'published' or r.customer_id = (select auth.uid()))
  order by (r.customer_id = (select auth.uid())) desc, r.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

revoke all on function public.product_reviews(uuid, int) from public;
grant execute on function public.product_reviews(uuid, int) to anon, authenticated;

-- ═══ Live updates ════════════════════════════════════════════════════════════════════════
drop trigger if exists reviews_app_change on public.reviews;
create trigger reviews_app_change after insert or update or delete on public.reviews
  for each statement execute function public.bump_app_change();
