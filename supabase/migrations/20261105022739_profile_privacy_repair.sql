begin;

-- Narrow, repeatable repair for legacy and hardened profile schemas.
-- Table privileges override column revocations, so revoke both before regranting.
revoke select, insert, update on public.profiles from public, anon, authenticated;
revoke delete on public.profiles from public, anon, authenticated;
do $$
declare col text;
begin
 for col in select attname from pg_attribute
   where attrelid='public.profiles'::regclass and attnum>0 and not attisdropped loop
  execute format('revoke select (%I), insert (%I), update (%I) on public.profiles from public, anon, authenticated', col, col, col);
 end loop;
end $$;
grant select (id, username, avatar_url) on public.profiles to anon, authenticated;
grant insert (id, username, avatar_url), update (id, username, avatar_url) on public.profiles to authenticated;

alter table public.profiles enable row level security;
-- Named policies are additive and repeatable; restrictive policies still constrain
-- any broad legacy permissive policies already present on the table.
do $$
begin
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profile_repair_public_select') then
  create policy profile_repair_public_select on public.profiles for select to anon, authenticated using (true);
 end if;
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profile_repair_owner_insert') then
  create policy profile_repair_owner_insert on public.profiles for insert to authenticated with check (id=(select auth.uid()));
 end if;
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profile_repair_owner_update') then
  create policy profile_repair_owner_update on public.profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));
 end if;
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profile_repair_restrict_insert') then
  create policy profile_repair_restrict_insert on public.profiles as restrictive for insert to authenticated with check (id=(select auth.uid()));
 end if;
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profile_repair_restrict_update') then
  create policy profile_repair_restrict_update on public.profiles as restrictive for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));
 end if;
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profile_repair_restrict_delete') then
  create policy profile_repair_restrict_delete on public.profiles as restrictive for delete to authenticated using (id=(select auth.uid()));
 end if;
end $$;

create or replace function public.profile_repair_verified_email() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then return new; end if;
 if new.id is distinct from auth.uid() or (tg_op='UPDATE' and new.id is distinct from old.id) then
  raise exception 'Not authorized.' using errcode='42501';
 end if;
 new.email=(select email from auth.users where id=auth.uid());
 return new;
end $$;
revoke all on function public.profile_repair_verified_email() from public, anon, authenticated;
drop trigger if exists profile_repair_verified_email on public.profiles;
create trigger profile_repair_verified_email before insert or update on public.profiles
 for each row execute function public.profile_repair_verified_email();

commit;
