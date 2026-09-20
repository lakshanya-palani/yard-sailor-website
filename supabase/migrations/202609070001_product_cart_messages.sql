-- Apply once, in Supabase SQL Editor or through your migration runner.
-- This intentionally fails if these tables already exist: inspect/reconcile first.
-- Existing products/profiles must use UUID id and products.user_id UUID ownership.
begin;

do $$
begin
  if to_regclass('public.cart_items') is not null or to_regclass('public.carts') is not null
     or to_regclass('public.conversations') is not null or to_regclass('public.messages') is not null
     or to_regclass('public.conversation_participants') is not null then
    raise exception 'Existing cart/messaging tables found. Reconcile their schema before applying this migration.';
  end if;
end $$;

create table public.cart_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index cart_items_product_idx on public.cart_items(product_id);
alter table public.cart_items enable row level security;
revoke all on public.cart_items from public, anon, authenticated;
grant select, delete on public.cart_items to authenticated;
create policy cart_read_own on public.cart_items for select to authenticated using (user_id = (select auth.uid()));
create policy cart_remove_own on public.cart_items for delete to authenticated using (user_id = (select auth.uid()));

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  buyer_read_at timestamptz,
  seller_read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (buyer_id <> seller_id),
  unique (product_id, buyer_id, seller_id)
);
create index conversations_buyer_idx on public.conversations(buyer_id, updated_at desc);
create index conversations_seller_idx on public.conversations(seller_id, updated_at desc);
alter table public.conversations enable row level security;
revoke all on public.conversations from public, anon, authenticated;
grant select on public.conversations to authenticated;
create policy conversation_participant_read on public.conversations for select to authenticated
  using ((select auth.uid()) in (buyer_id, seller_id));

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default clock_timestamp()
);
create index messages_conversation_time_idx on public.messages(conversation_id, created_at, id);
alter table public.messages enable row level security;
revoke all on public.messages from public, anon, authenticated;
grant select on public.messages to authenticated;
-- Sender and timestamps cannot be supplied/updated by the browser.
grant insert (id, conversation_id, body) on public.messages to authenticated;
create policy message_participant_read on public.messages for select to authenticated using (
  exists (select 1 from public.conversations c where c.id = conversation_id and (select auth.uid()) in (c.buyer_id,c.seller_id))
);
create policy message_participant_send on public.messages for insert to authenticated with check (
  sender_id = (select auth.uid()) and exists (
    select 1 from public.conversations c where c.id = conversation_id and (select auth.uid()) in (c.buyer_id,c.seller_id)
  )
);

create function public.add_product_to_cart(p_product_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid; inserted_count integer;
begin
  if auth.uid() is null then raise exception 'Please sign in.' using errcode = '42501'; end if;
  select p.user_id into owner_id from public.products p where p.id = p_product_id for share;
  if not found or owner_id is null then raise exception 'This listing is no longer available.'; end if;
  if owner_id = auth.uid() then raise exception 'You cannot add your own listing.' using errcode = '42501'; end if;
  insert into public.cart_items(user_id,product_id) values(auth.uid(),p_product_id) on conflict do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count = 1;
end $$;

-- No payment or reservation is performed. Always use current server-side prices.
create function public.review_product_checkout(p_product_id uuid default null)
returns table(product_id uuid, title text, price numeric, image_url text, seller_name text, available boolean)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Please sign in.' using errcode = '42501'; end if;
  if p_product_id is not null and not exists(select 1 from public.products p where p.id=p_product_id and p.user_id<>auth.uid()) then
    raise exception 'This listing is unavailable or belongs to you.';
  end if;
  return query
    select p.id, p.title::text, p.price::numeric, p.image_urls[1]::text,
      coalesce(nullif(trim(pr.username),''),'Yard Sailor seller')::text, p.user_id<>auth.uid()
    from public.products p left join public.profiles pr on pr.id=p.user_id
    where (p_product_id is not null and p.id=p_product_id)
       or (p_product_id is null and exists(select 1 from public.cart_items ci where ci.user_id=auth.uid() and ci.product_id=p.id))
    order by p.id;
end $$;

-- Seller identity is resolved from products, never trusted from client arguments.
create function public.open_product_conversation(p_product_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare seller uuid; conversation uuid;
begin
  if auth.uid() is null then raise exception 'Please sign in.' using errcode = '42501'; end if;
  select p.user_id into seller from public.products p where p.id=p_product_id for share;
  if not found or seller is null then raise exception 'This listing is no longer available.'; end if;
  if seller=auth.uid() then raise exception 'You cannot message yourself.' using errcode='42501'; end if;
  insert into public.conversations(product_id,buyer_id,seller_id) values(p_product_id,auth.uid(),seller)
    on conflict (product_id,buyer_id,seller_id) do nothing;
  select c.id into conversation from public.conversations c where c.product_id=p_product_id and c.buyer_id=auth.uid() and c.seller_id=seller;
  return conversation;
end $$;

create function public.touch_product_conversation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations set updated_at = greatest(updated_at,new.created_at) where id=new.conversation_id;
  return new;
end $$;
create trigger message_touch_conversation after insert on public.messages for each row execute function public.touch_product_conversation();

-- Mark only through the last message actually loaded, rather than racing new arrivals.
create function public.mark_product_conversation_read(p_conversation_id uuid, p_message_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare seen_at timestamptz;
begin
  if not exists(select 1 from public.conversations c where c.id=p_conversation_id and auth.uid() in (c.buyer_id,c.seller_id)) then
    raise exception 'Conversation unavailable.' using errcode='42501';
  end if;
  select m.created_at into seen_at from public.messages m where m.id=p_message_id and m.conversation_id=p_conversation_id;
  if not found then raise exception 'Message unavailable.'; end if;
  update public.conversations set
    buyer_read_at = case when buyer_id=auth.uid() then greatest(buyer_read_at,seen_at) else buyer_read_at end,
    seller_read_at = case when seller_id=auth.uid() then greatest(seller_read_at,seen_at) else seller_read_at end
    where id=p_conversation_id;
end $$;

create function public.list_product_conversations()
returns table(id uuid, product_id uuid, product_title text, product_image text, other_name text, other_avatar text,
  last_body text, last_at timestamptz, unread_count bigint)
language sql stable security definer set search_path = '' as $$
  select c.id,c.product_id,p.title::text,p.image_urls[1]::text,
    coalesce(nullif(trim(pr.username),''),'Yard Sailor member')::text,pr.avatar_url::text,
    latest.body,coalesce(latest.created_at,c.created_at),
    (select count(*) from public.messages m where m.conversation_id=c.id and m.sender_id<>auth.uid()
      and m.created_at>coalesce(case when c.buyer_id=auth.uid() then c.buyer_read_at else c.seller_read_at end,'epoch'::timestamptz))
  from public.conversations c
  left join public.products p on p.id=c.product_id
  left join public.profiles pr on pr.id=case when c.buyer_id=auth.uid() then c.seller_id else c.buyer_id end
  left join lateral (select m.body,m.created_at from public.messages m where m.conversation_id=c.id order by m.created_at desc,m.id desc limit 1) latest on true
  where auth.uid() in (c.buyer_id,c.seller_id)
  order by coalesce(latest.created_at,c.created_at) desc,c.id;
$$;

revoke all on function public.add_product_to_cart(uuid), public.review_product_checkout(uuid), public.open_product_conversation(uuid),
  public.mark_product_conversation_read(uuid,uuid), public.list_product_conversations(), public.touch_product_conversation() from public, anon, authenticated;
grant execute on function public.add_product_to_cart(uuid), public.review_product_checkout(uuid), public.open_product_conversation(uuid),
  public.mark_product_conversation_read(uuid,uuid), public.list_product_conversations() to authenticated;

-- Realtime still applies SELECT RLS before delivering private row changes.
do $$
declare name text;
begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime') then
    foreach name in array array['cart_items','conversations','messages'] loop
      if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=name) then
        execute format('alter publication supabase_realtime add table public.%I',name);
      end if;
    end loop;
  end if;
end $$;
commit;
