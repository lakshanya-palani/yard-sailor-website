begin;

-- For a profile merge, BEFORE INSERT runs before conflict resolution. Preserve
-- only this authenticated owner’s existing legacy avatar during that check.
create or replace function public.validate_listing_content() returns trigger
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
    case when tg_op='UPDATE' then array[old.avatar_url]
      else (select array[p.avatar_url] from public.profiles p where p.id=new.id) end,new.id,'avatars');
 end if;
 return new;
end $$;
revoke all on function public.validate_listing_content() from public,anon,authenticated;

commit;
