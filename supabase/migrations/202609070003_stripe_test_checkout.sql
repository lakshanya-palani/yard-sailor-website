-- Requires 001/002. Test-mode foundation only. No existing products/data rewritten.
begin;
create table public.checkout_orders (
 id uuid primary key default gen_random_uuid(), buyer_id uuid not null references auth.users(id),
 request_key uuid not null, state text not null default 'creating' check(state in ('creating','open','paid','expired')),
 currency text not null default 'usd' check(currency='usd'), amount_total bigint not null check(amount_total between 50 and 99999999),
 livemode boolean not null default false check(livemode=false),
 stripe_session_id text unique, payment_intent_id text unique,
 created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null default date_trunc('second',clock_timestamp()+interval '45 minutes'), paid_at timestamptz,
 unique(buyer_id,request_key)
);
create unique index one_pending_checkout_per_buyer on public.checkout_orders(buyer_id) where state in ('creating','open');
create table public.checkout_order_items (
 order_id uuid not null references public.checkout_orders(id), product_id uuid not null,
 buyer_id uuid not null references auth.users(id), seller_id uuid not null references auth.users(id),
 title text not null, image_url text, unit_amount bigint not null check(unit_amount between 50 and 99999999),
 quantity integer not null default 1 check(quantity=1), primary key(order_id,product_id), check(buyer_id<>seller_id)
);
-- Isolated payment inventory: test purchases never change products or initiate real fulfillment.
create table public.checkout_inventory (
 product_id uuid primary key references public.products(id), order_id uuid not null references public.checkout_orders(id),
 state text not null check(state in ('reserved','sold')), livemode boolean not null default false check(livemode=false)
);
create index checkout_inventory_order on public.checkout_inventory(order_id);
create table public.checkout_webhook_events (
 event_id text primary key, order_id uuid not null references public.checkout_orders(id), event_type text not null,
 processed_at timestamptz not null default clock_timestamp()
);
alter table public.checkout_orders enable row level security;
alter table public.checkout_order_items enable row level security;
alter table public.checkout_inventory enable row level security;
alter table public.checkout_webhook_events enable row level security;
revoke all on public.checkout_orders,public.checkout_order_items,public.checkout_inventory,public.checkout_webhook_events from public,anon,authenticated;
grant select on public.checkout_orders,public.checkout_order_items,public.checkout_inventory to service_role;
-- UI uses the narrow RPC below, not raw order/payment identifiers.

create function public.reserve_test_checkout(p_buyer uuid,p_products uuid[],p_request uuid,p_source text) returns uuid
language plpgsql security definer set search_path='' as $$
declare existing public.checkout_orders; order_id uuid; ids uuid[]; total bigint;
begin
 if p_buyer is null or p_request is null or not exists(select 1 from auth.users where id=p_buyer) then raise exception 'Not authorized.' using errcode='42501'; end if;
 if p_source is null or p_source not in ('cart','buy_now') or cardinality(p_products) is null or cardinality(p_products) not between 1 and 20
   or array_position(p_products,null) is not null then raise exception 'Invalid checkout selection.'; end if;
 select array_agg(distinct id order by id) into ids from unnest(p_products) id;
 if cardinality(ids)<>cardinality(p_products) or (p_source='buy_now' and cardinality(ids)<>1) then raise exception 'Quantity must be one per item.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_buyer::text,73));
 select * into existing from public.checkout_orders where buyer_id=p_buyer and request_key=p_request;
 if found then
  if (select array_agg(product_id order by product_id) from public.checkout_order_items where checkout_order_items.order_id=existing.id)<>ids then raise exception 'Request key already used for different items.'; end if;
  return existing.id;
 end if;
 select * into existing from public.checkout_orders where buyer_id=p_buyer and state in ('creating','open');
 if found then
  if (select array_agg(product_id order by product_id) from public.checkout_order_items where checkout_order_items.order_id=existing.id)=ids then return existing.id; end if;
  raise exception 'Finish or cancel your pending checkout in Orders first.';
 end if;
 if (select count(*) from public.checkout_orders where buyer_id=p_buyer and created_at>clock_timestamp()-interval '1 hour')>=10 then raise exception 'Please wait before starting another checkout.'; end if;
 -- Deterministic row locking serializes competing buyers and seller edits/deletes.
 perform id from public.products where id=any(ids) order by id for update;
 if (select count(*) from public.products where id=any(ids))<>cardinality(ids)
  or exists(select 1 from public.products where id=any(ids) and (user_id is null or user_id=p_buyer)) then raise exception 'An item is unavailable or belongs to you.'; end if;
 if exists(select 1 from public.checkout_inventory where product_id=any(ids)) then raise exception 'An item is reserved or already purchased in test mode.'; end if;
 if p_source='cart' and (select count(*) from public.cart_items where user_id=p_buyer and product_id=any(ids))<>cardinality(ids) then raise exception 'An item is no longer in your cart.'; end if;
 if exists(select 1 from public.products where id=any(ids) and (price is null or price::text in ('NaN','Infinity','-Infinity') or price<0.50 or price>999999.99 or price*100<>trunc(price*100))) then raise exception 'An item has an invalid USD price.'; end if;
 select sum(price*100)::bigint into total from public.products where id=any(ids);
 if total>99999999 then raise exception 'Checkout total is too large.'; end if;
 insert into public.checkout_orders(buyer_id,request_key,amount_total) values(p_buyer,p_request,total) returning id into order_id;
 insert into public.checkout_order_items(order_id,product_id,buyer_id,seller_id,title,image_url,unit_amount)
 select order_id,id,p_buyer,user_id,title,image_urls[1],(price*100)::bigint from public.products where id=any(ids);
 insert into public.checkout_inventory(product_id,order_id,state) select id,order_id,'reserved' from unnest(ids) id;
 return order_id;
end $$;

create function public.bind_test_checkout(p_order uuid,p_session text) returns void
language plpgsql security definer set search_path='' as $$
declare o public.checkout_orders;
begin
 select * into o from public.checkout_orders where id=p_order for update;
 if not found or p_session is null or p_session not like 'cs_test_%' or (o.stripe_session_id is not null and o.stripe_session_id<>p_session) then raise exception 'Checkout association mismatch.'; end if;
 update public.checkout_orders set stripe_session_id=p_session,state=case when state='creating' then 'open' else state end where id=p_order;
end $$;

-- Called only after server verification with Stripe. Changes and event ledger commit atomically.
create function public.apply_test_checkout(p_order uuid,p_session text,p_amount bigint,p_currency text,p_result text,p_intent text,p_event text default null,p_type text default 'reconcile') returns text
language plpgsql security definer set search_path='' as $$
declare o public.checkout_orders; n integer;
begin
 select * into o from public.checkout_orders where id=p_order for update;
 if not found or p_session is null or p_session not like 'cs_test_%' or p_amount is distinct from o.amount_total or p_currency is distinct from o.currency
  or (o.stripe_session_id is not null and o.stripe_session_id<>p_session) or p_result is null or p_result not in ('paid','expired') then raise exception 'Payment validation failed.'; end if;
 if p_result='paid' and (p_intent is null or p_intent not like 'pi_%' or (o.payment_intent_id is not null and o.payment_intent_id<>p_intent)) then raise exception 'Payment identifier mismatch.'; end if;
 if p_event is not null then
  insert into public.checkout_webhook_events(event_id,order_id,event_type) values(p_event,p_order,p_type) on conflict do nothing;
  get diagnostics n=row_count;
  if n=0 then
   if not exists(select 1 from public.checkout_webhook_events where event_id=p_event and order_id=p_order and event_type=p_type) then raise exception 'Event association mismatch.'; end if;
   return o.state;
  end if;
 end if;
 if o.state='paid' then return 'paid'; end if; -- Never downgrade a paid order.
 if o.state='expired' then
  if p_result='paid' then raise exception 'Payment after confirmed expiration requires review.'; end if;
  return 'expired';
 end if;
 if (select count(*) from public.checkout_inventory where order_id=p_order and state='reserved')<>(select count(*) from public.checkout_order_items where order_id=p_order) then raise exception 'Inventory reservation mismatch.'; end if;
 if p_result='paid' then
  update public.checkout_inventory set state='sold' where order_id=p_order;
  update public.checkout_orders set state='paid',stripe_session_id=p_session,payment_intent_id=p_intent,paid_at=clock_timestamp() where id=p_order;
  delete from public.cart_items where product_id in(select product_id from public.checkout_order_items where order_id=p_order);
 else
  delete from public.checkout_inventory where order_id=p_order and state='reserved';
  update public.checkout_orders set state='expired',stripe_session_id=p_session where id=p_order;
 end if;
 return p_result;
end $$;

create function public.guard_checkout_product() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.checkout_inventory where product_id=old.id) then raise exception 'This product is reserved or purchased in a test checkout. Resolve the order before changing the listing.'; end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
create trigger guard_checkout_product before update or delete on public.products for each row execute function public.guard_checkout_product();

create function public.list_my_checkout_orders() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(row_data order by created_at desc),'[]'::jsonb) from (
  select o.created_at,jsonb_build_object('id',o.id,'state',o.state,'currency',o.currency,'created_at',o.created_at,'paid_at',o.paid_at,'expires_at',o.expires_at,
   'is_buyer',o.buyer_id=auth.uid(),'test_mode',true,
   'amount_total',(select sum(i.unit_amount) from public.checkout_order_items i where i.order_id=o.id and (o.buyer_id=auth.uid() or i.seller_id=auth.uid())),
   'items',(select jsonb_agg(jsonb_build_object('product_id',i.product_id,'title',i.title,'image_url',i.image_url,'unit_amount',i.unit_amount) order by i.product_id)
    from public.checkout_order_items i where i.order_id=o.id and (o.buyer_id=auth.uid() or i.seller_id=auth.uid()))) as row_data
  from public.checkout_orders o where o.buyer_id=auth.uid() or exists(select 1 from public.checkout_order_items i where i.order_id=o.id and i.seller_id=auth.uid())
  order by o.created_at desc limit 100
 ) visible_orders;
$$;

-- Current review and cart entry now reflect reservations/sold test inventory.
create or replace function public.add_product_to_cart(p_product_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare owner_id uuid; n integer;
begin
 if auth.uid() is null then raise exception 'Please sign in.' using errcode='42501'; end if;
 select user_id into owner_id from public.products where id=p_product_id for share;
 if not found or owner_id is null or owner_id=auth.uid() or exists(select 1 from public.checkout_inventory where product_id=p_product_id) then raise exception 'Item unavailable.'; end if;
 insert into public.cart_items(user_id,product_id) values(auth.uid(),p_product_id) on conflict do nothing;
 get diagnostics n=row_count; return n=1;
end $$;
create or replace function public.review_product_checkout(p_product_id uuid default null)
returns table(product_id uuid,title text,price numeric,image_url text,seller_name text,available boolean)
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Please sign in.' using errcode='42501'; end if;
 return query select p.id,p.title::text,p.price::numeric,p.image_urls[1]::text,coalesce(pr.username,'Yard Sailor seller')::text,
 p.user_id<>auth.uid() and not exists(select 1 from public.checkout_inventory i where i.product_id=p.id)
 from public.products p left join public.profiles pr on pr.id=p.user_id
 where (p_product_id is not null and p.id=p_product_id) or (p_product_id is null and exists(select 1 from public.cart_items c where c.user_id=auth.uid() and c.product_id=p.id)) order by p.id;
end $$;

revoke all on function public.reserve_test_checkout(uuid,uuid[],uuid,text),public.bind_test_checkout(uuid,text),public.apply_test_checkout(uuid,text,bigint,text,text,text,text,text),public.guard_checkout_product(),public.list_my_checkout_orders() from public,anon,authenticated;
grant execute on function public.reserve_test_checkout(uuid,uuid[],uuid,text),public.bind_test_checkout(uuid,text),public.apply_test_checkout(uuid,text,bigint,text,text,text,text,text) to service_role;
grant execute on function public.list_my_checkout_orders() to authenticated;
commit;
