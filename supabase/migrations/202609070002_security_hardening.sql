-- Requires 001. Review the live schema/policies before applying. No existing rows are changed.
begin;
create table public.validated_uploads (
 path text primary key, user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('products','yard-sales','avatars')),
 url text not null unique, created_at timestamptz not null default now()
);
alter table public.validated_uploads enable row level security;
revoke all on public.validated_uploads from public,anon,authenticated;
grant select,insert,delete on public.validated_uploads to service_role;
create index validated_uploads_owner on public.validated_uploads(user_id);
create table public.image_upload_budget(user_id uuid primary key references auth.users(id) on delete cascade, window_start timestamptz not null, attempts integer not null);
alter table public.image_upload_budget enable row level security;
revoke all on public.image_upload_budget from public,anon,authenticated;
create function public.consume_image_upload_budget(p_user_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare allowed boolean;
begin
 if (select count(*) from public.validated_uploads where user_id=p_user_id)>=400 then return false; end if;
 insert into public.image_upload_budget(user_id,window_start,attempts) values(p_user_id,clock_timestamp(),1)
 on conflict(user_id) do update set
  attempts=case when image_upload_budget.window_start < clock_timestamp()-interval '1 hour' then 1 else image_upload_budget.attempts+1 end,
  window_start=case when image_upload_budget.window_start < clock_timestamp()-interval '1 hour' then clock_timestamp() else image_upload_budget.window_start end
 where image_upload_budget.attempts<40 or image_upload_budget.window_start<clock_timestamp()-interval '1 hour'
 returning true into allowed;
 return coalesce(allowed,false);
end $$;
revoke all on function public.consume_image_upload_budget(uuid) from public,anon,authenticated;
grant execute on function public.consume_image_upload_budget(uuid) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('validated-images','validated-images',true,5242880,array['image/jpeg']);
-- Restrictive policies constrain even previously broad permissive policies.
alter table storage.objects enable row level security;
create policy validated_image_insert_gate on storage.objects as restrictive for insert to anon,authenticated
 with check(bucket_id not in ('sale-images','avatars','validated-images'));
create policy validated_image_update_gate on storage.objects as restrictive for update to anon,authenticated
 using(bucket_id not in ('sale-images','avatars','validated-images'))
 with check(bucket_id not in ('sale-images','avatars','validated-images'));
create policy validated_image_delete_gate on storage.objects as restrictive for delete to anon,authenticated
 using(bucket_id not in ('sale-images','avatars','validated-images'));

create function public.check_uploaded_images(urls text[], old_urls text[], owner_id uuid, image_kind text) returns void
language plpgsql security definer set search_path='' as $$
declare image_url text;
begin
 if coalesce(cardinality(urls),0)>(case when image_kind='avatars' then 1 else 8 end) then raise exception 'Too many images.' using errcode='23514'; end if;
 foreach image_url in array coalesce(urls,array[]::text[]) loop
  if image_url is null or image_url='' then raise exception 'Invalid image reference.' using errcode='23514'; end if;
  -- Unmodified legacy references are retained; new references must come from the processing pipeline.
  if not coalesce(image_url=any(coalesce(old_urls,array[]::text[])),false) and not exists(
    select 1 from public.validated_uploads u where u.url=image_url and u.user_id=owner_id and u.kind=image_kind
  ) then raise exception 'Upload images through the secure image service.' using errcode='23514'; end if;
 end loop;
end $$;
revoke all on function public.check_uploaded_images(text[],text[],uuid,text) from public,anon,authenticated;

create function public.validate_listing_content() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then return new; end if; -- Admin/auth provisioning only; client RLS still denies null uid.
 if tg_table_name='products' then
  if new.user_id<>auth.uid() or (tg_op='UPDATE' and new.user_id<>old.user_id) then raise exception 'Not authorized.' using errcode='42501'; end if;
  new.title=btrim(new.title); new.description=btrim(new.description);
  if new.title is null or char_length(new.title) not between 1 and 70 or new.description is null or char_length(new.description) not between 1 and 500
    or new.price is null or new.price<0 or new.price::text in ('NaN','Infinity','-Infinity')
    or char_length(coalesce(new.brand,''))>100 or char_length(coalesce(new.condition,''))>100 then raise exception 'Invalid product fields.' using errcode='23514'; end if;
  perform public.check_uploaded_images(new.image_urls,case when tg_op='UPDATE' then old.image_urls else null end,new.user_id,'products');
 elsif tg_table_name='sales' then
  if new.host_id<>auth.uid() or (tg_op='UPDATE' and new.host_id<>old.host_id) then raise exception 'Not authorized.' using errcode='42501'; end if;
  new.title=btrim(new.title); new.description=btrim(new.description); new.address=btrim(new.address);
  if new.title is null or char_length(new.title) not between 1 and 80 or new.description is null or char_length(new.description) not between 1 and 1000
    or new.address is null or char_length(new.address) not between 1 and 500
    or new.start_time is null or new.end_time is null or new.end_time<=new.start_time
    or new.lat is null or new.lat not between -90 and 90 or new.lng is null or new.lng not between -180 and 180 then raise exception 'Invalid yard-sale fields.' using errcode='23514'; end if;
  perform public.check_uploaded_images(new.images,case when tg_op='UPDATE' then old.images else null end,new.host_id,'yard-sales');
 else
  if new.id<>auth.uid() or (tg_op='UPDATE' and new.id<>old.id) then raise exception 'Not authorized.' using errcode='42501'; end if;
  new.username=btrim(new.username);
  new.updated_at=clock_timestamp();
  if new.username is null or new.username !~ '^[A-Za-z0-9_]{3,20}$' then raise exception 'Invalid username.' using errcode='23514'; end if;
  -- A profile's private email must not be supplied on behalf of another user.
  new.email=(select email from auth.users where id=auth.uid());
  perform public.check_uploaded_images(case when coalesce(new.avatar_url,'')='' then array[]::text[] else array[new.avatar_url] end,
    case when tg_op='UPDATE' then array[old.avatar_url] else null end,new.id,'avatars');
 end if;
 return new;
end $$;
revoke all on function public.validate_listing_content() from public,anon,authenticated;
create trigger validate_product before insert or update on public.products for each row execute function public.validate_listing_content();
create trigger validate_sale before insert or update on public.sales for each row execute function public.validate_listing_content();
create trigger validate_profile before insert or update on public.profiles for each row execute function public.validate_listing_content();

do $$
declare table_name text; owner_column text;
begin
 for table_name,owner_column in select * from (values('products','user_id'),('sales','host_id'),('profiles','id')) as t(n,o) loop
  execute format('alter table public.%I enable row level security',table_name);
  execute format('create policy hardening_insert_owner on public.%I as restrictive for insert to authenticated with check (%I=auth.uid())',table_name,owner_column);
  execute format('create policy hardening_update_owner on public.%I as restrictive for update to authenticated using (%I=auth.uid()) with check (%I=auth.uid())',table_name,owner_column,owner_column);
  execute format('create policy hardening_delete_owner on public.%I as restrictive for delete to authenticated using (%I=auth.uid())',table_name,owner_column);
  execute format('revoke insert,update,delete on public.%I from anon,public',table_name);
 end loop;
end $$;
-- Public profile display never needs private email or other account columns.
revoke select on public.profiles from public,anon,authenticated;
do $$ declare column_name text; begin
 for column_name in select attname from pg_attribute where attrelid='public.profiles'::regclass and attnum>0 and not attisdropped loop
  execute format('revoke select (%I) on public.profiles from public,anon,authenticated',column_name);
 end loop;
end $$;
grant select(id,username,avatar_url) on public.profiles to anon,authenticated;

create function public.message_abuse_guard() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or new.sender_id<>auth.uid() then raise exception 'Not authorized.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,71));
 if (select count(*) from public.messages where sender_id=auth.uid() and created_at>clock_timestamp()-interval '1 minute')>=30 then
  raise exception 'Please wait before sending more messages.' using errcode='P0001';
 end if;
 new.body=btrim(new.body);
 return new;
end $$;
revoke all on function public.message_abuse_guard() from public,anon,authenticated;
create trigger message_abuse_guard before insert on public.messages for each row execute function public.message_abuse_guard();
create index messages_sender_rate_idx on public.messages(sender_id,created_at);
create function public.conversation_abuse_guard() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or new.buyer_id<>auth.uid() then raise exception 'Not authorized.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,72));
 if not exists(select 1 from public.conversations where product_id=new.product_id and buyer_id=new.buyer_id and seller_id=new.seller_id)
 and (select count(*) from public.conversations where buyer_id=auth.uid() and created_at>clock_timestamp()-interval '1 hour')>=20 then
  raise exception 'Please wait before starting more conversations.' using errcode='P0001';
 end if;
 return new;
end $$;
revoke all on function public.conversation_abuse_guard() from public,anon,authenticated;
create trigger conversation_abuse_guard before insert on public.conversations for each row execute function public.conversation_abuse_guard();
commit;
