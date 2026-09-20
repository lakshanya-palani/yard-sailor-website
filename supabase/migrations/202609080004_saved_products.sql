-- Requires existing products only. Payment inventory is optional.
begin;
create table public.saved_products (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 product_id uuid not null references public.products(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(user_id,product_id)
);
create index saved_products_product on public.saved_products(product_id);
alter table public.saved_products enable row level security;
revoke all on public.saved_products from public,anon,authenticated;
grant select,insert,delete on public.saved_products to authenticated;
create policy saved_read_owner on public.saved_products for select to authenticated using(user_id=auth.uid());
create policy saved_insert_owner on public.saved_products for insert to authenticated with check(user_id=auth.uid());
create policy saved_delete_owner on public.saved_products for delete to authenticated using(user_id=auth.uid());
-- Return only availability of the caller's saved products, never payment/order data.
create function public.saved_product_availability() returns table(product_id uuid,unavailable boolean)
language plpgsql stable security definer set search_path='' as $$
begin
 if to_regclass('public.checkout_inventory') is null then
  return query select s.product_id, false from public.saved_products s where s.user_id=auth.uid();
 else
  return query execute 'select s.product_id, exists(select 1 from public.checkout_inventory i where i.product_id=s.product_id) from public.saved_products s where s.user_id=auth.uid()';
 end if;
end;
$$;
revoke all on function public.saved_product_availability() from public,anon;
grant execute on function public.saved_product_availability() to authenticated;
notify pgrst, 'reload schema';
commit;
