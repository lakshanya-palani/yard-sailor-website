begin;
alter table public.checkout_orders add column protocol integer not null default 0 check(protocol in (0,2)), add column first_dispatch_at timestamptz, add column frozen_create_params jsonb, add column cancel_requested boolean not null default false;
alter table public.checkout_orders add constraint checkout_dispatch_pair check ((first_dispatch_at is null) = (frozen_create_params is null));
create function public.release_virgin_test_checkout(p_order uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare o public.checkout_orders; expected integer; actual integer;
begin
 select * into o from public.checkout_orders where id=p_order for update;
 if not found or o.protocol<>2 or o.first_dispatch_at is not null or o.stripe_session_id is not null or o.state<>'creating' then return false; end if;
 select count(*) into expected from public.checkout_order_items where order_id=p_order;
 select count(*) into actual from public.checkout_inventory where order_id=p_order and state='reserved';
 if expected=0 or expected<>actual or exists(select 1 from public.checkout_inventory where order_id=p_order and state<>'reserved') or exists(select product_id from public.checkout_order_items where order_id=p_order except select product_id from public.checkout_inventory where order_id=p_order and state='reserved') then raise exception 'Inventory reservation mismatch.'; end if;
 delete from public.checkout_inventory where order_id=p_order and state='reserved';
 update public.checkout_orders set state='expired',cancel_requested=true where id=p_order;
 return true;
end $$;
create function public.reserve_test_checkout_internal(p_buyer uuid,p_products uuid[],p_request uuid,p_source text,p_protocol integer) returns uuid
language plpgsql security definer set search_path='' as $$
declare existing public.checkout_orders; order_id uuid; ids uuid[]; total bigint; candidate record;
begin
 if p_buyer is null or p_request is null or not exists(select 1 from auth.users where id=p_buyer) then raise exception 'Not authorized.' using errcode='42501'; end if;
 if p_source is null or p_source not in ('cart','buy_now') or cardinality(p_products) is null or cardinality(p_products) not between 1 and 20
   or array_position(p_products,null) is not null then raise exception 'Invalid checkout selection.'; end if;
 select array_agg(distinct id order by id) into ids from unnest(p_products) id;
 if cardinality(ids)<>cardinality(p_products) or (p_source='buy_now' and cardinality(ids)<>1) then raise exception 'Quantity must be one per item.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_buyer::text,73));
 -- Lock each candidate before rechecking; only virgin v2 rows can be reaped.
 for candidate in select o.id from public.checkout_orders o where o.protocol=2 and o.first_dispatch_at is null and o.state='creating' and o.expires_at<=clock_timestamp() and (o.buyer_id=p_buyer or exists(select 1 from public.checkout_inventory i where i.order_id=o.id and i.product_id=any(ids))) order by o.id for update of o loop
  perform public.release_virgin_test_checkout(candidate.id);
 end loop;
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
 insert into public.checkout_orders(buyer_id,request_key,amount_total,protocol) values(p_buyer,p_request,total,p_protocol) returning id into order_id;
 insert into public.checkout_order_items(order_id,product_id,buyer_id,seller_id,title,image_url,unit_amount)
 select order_id,id,p_buyer,user_id,title,image_urls[1],(price*100)::bigint from public.products where id=any(ids);
 insert into public.checkout_inventory(product_id,order_id,state) select id,order_id,'reserved' from unnest(ids) id;
 return order_id;
end $$;

create or replace function public.bind_test_checkout(p_order uuid,p_session text) returns void
language plpgsql security definer set search_path='' as $$
declare o public.checkout_orders;
begin
 select * into o from public.checkout_orders where id=p_order for update;
 if not found or p_session is null or p_session not like 'cs_test_%' or (o.stripe_session_id is not null and o.stripe_session_id<>p_session) then raise exception 'Checkout association mismatch.'; end if;
 if o.stripe_session_id is null and (o.state in ('paid','expired') or (o.protocol=2 and o.first_dispatch_at is null)) then raise exception 'Checkout association mismatch.'; end if;
 update public.checkout_orders set stripe_session_id=p_session,state=case when state='creating' then 'open' else state end where id=p_order;
end $$;

create or replace function public.apply_test_checkout(p_order uuid,p_session text,p_amount bigint,p_currency text,p_result text,p_intent text,p_event text default null,p_type text default 'reconcile') returns text
language plpgsql security definer set search_path='' as $$
declare o public.checkout_orders; n integer;
begin
 select * into o from public.checkout_orders where id=p_order for update;
 if not found or p_session is null or p_session not like 'cs_test_%' or p_amount is distinct from o.amount_total or p_currency is distinct from o.currency
  or (o.stripe_session_id is not null and o.stripe_session_id<>p_session) or p_result is null or p_result not in ('paid','expired') then raise exception 'Payment validation failed.'; end if;
 if o.stripe_session_id is null and (o.state in ('paid','expired') or (o.protocol=2 and o.first_dispatch_at is null)) then raise exception 'Checkout association mismatch.'; end if;
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


create or replace function public.reserve_test_checkout(p_buyer uuid,p_products uuid[],p_request uuid,p_source text) returns uuid language sql security definer set search_path='' as $$ select public.reserve_test_checkout_internal(p_buyer,p_products,p_request,p_source,0) $$;
create function public.reserve_test_checkout_v2(p_buyer uuid,p_products uuid[],p_request uuid,p_source text) returns uuid language sql security definer set search_path='' as $$ select public.reserve_test_checkout_internal(p_buyer,p_products,p_request,p_source,2) $$;
create function public.prepare_test_checkout(p_order uuid,p_buyer uuid,p_action text,p_params jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.checkout_orders; now_at timestamptz; cutoff timestamptz;
begin
 if p_action is null or p_action not in ('create','resume','cancel','refresh') then raise exception 'Invalid action.'; end if;
 select * into o from public.checkout_orders where id=p_order for update;
 if not found or o.buyer_id is distinct from p_buyer then raise exception 'Not authorized.' using errcode='42501'; end if;
 now_at:=clock_timestamp();
 if o.state in ('paid','expired') then return jsonb_build_object('kind','terminal','state',o.state); end if;
 if o.protocol=2 and o.first_dispatch_at is null and (p_action='cancel' or o.expires_at<=now_at) then
  if not public.release_virgin_test_checkout(o.id) then raise exception 'Checkout release failed.'; end if;
  return jsonb_build_object('kind','terminal','state','expired');
 end if;
 if p_action='cancel' or o.expires_at<=now_at then
  update public.checkout_orders set cancel_requested=true where id=o.id returning * into o;
 end if;
 if o.stripe_session_id is not null then return jsonb_build_object('kind','bound','session_id',o.stripe_session_id); end if;
 if o.protocol=0 then return jsonb_build_object('kind','review'); end if;
 if o.first_dispatch_at is null then
  if p_action='refresh' then return jsonb_build_object('kind','creating'); end if;
  if o.cancel_requested or p_params is null or jsonb_typeof(p_params)<>'object' then raise exception 'Invalid dispatch.'; end if;
  update public.checkout_orders set first_dispatch_at=now_at,frozen_create_params=p_params || jsonb_build_object('expires_at',floor(extract(epoch from (now_at+interval '23 hours')))::bigint) where id=o.id returning * into o;
 end if;
 cutoff:=o.first_dispatch_at+interval '22 hours';
 if now_at>=cutoff then return jsonb_build_object('kind','review'); end if;
 return jsonb_build_object('kind','dispatch','params',o.frozen_create_params,'db_time',now_at,'cutoff',cutoff);
end $$;
revoke all on function public.release_virgin_test_checkout(uuid),public.reserve_test_checkout_internal(uuid,uuid[],uuid,text,integer),public.reserve_test_checkout_v2(uuid,uuid[],uuid,text),public.prepare_test_checkout(uuid,uuid,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.reserve_test_checkout_v2(uuid,uuid[],uuid,text),public.prepare_test_checkout(uuid,uuid,text,jsonb) to service_role;
commit;
