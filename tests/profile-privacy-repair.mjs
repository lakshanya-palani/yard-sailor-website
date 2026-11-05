import assert from 'node:assert/strict';
import {readFile, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const {PGlite}=await import(pathToFileURL(process.argv[2]).href);
const seller='10000000-0000-4000-8000-000000000001';
const buyer='10000000-0000-4000-8000-000000000002';
const outsider='10000000-0000-4000-8000-000000000003';
const product='20000000-0000-4000-8000-000000000001';
for (const hardened of [false,true]) {
 const directory=await mkdtemp(join(tmpdir(),'profile-repair-'));
 const db=new PGlite(directory);
 try {
 await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  grant usage on schema auth,public to authenticated,anon;
  create table public.products(id uuid primary key,user_id uuid references auth.users(id),title text,price numeric,image_urls text[]);
  create table public.profiles(id uuid primary key references auth.users(id),username text,avatar_url text);
  insert into auth.users values('${seller}'),('${buyer}'),('${outsider}');
  insert into products values('${product}','${seller}','A secondhand chair',25.50,array['/chair.jpg']);
  insert into profiles values('${seller}','seller',null),('${buyer}','buyer',null),('${outsider}','outsider',null);
 `);
 if (hardened) await db.exec(await readFile(new URL('../supabase/migrations/202609070001_product_cart_messages.sql',import.meta.url),'utf8'));
 await db.exec(`
  alter table auth.users add column email text;
  alter table products add column description text default 'A useful item';
  alter table products add column brand text;
  alter table products add column condition text;
  alter table profiles add column email text;
  alter table profiles add column updated_at timestamptz;
  create table sales(id uuid primary key,host_id uuid references auth.users(id),title text,description text,address text,start_time timestamptz,end_time timestamptz,lat double precision,lng double precision,images text[]);
  create schema storage;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
  alter table storage.objects enable row level security;
  grant usage on schema storage to authenticated,anon;
  grant all on storage.objects to authenticated,anon;
  create policy broad_legacy on storage.objects for all to authenticated using(true) with check(true);
  grant all on products,sales,profiles to authenticated;
  create policy legacy_products on products for all to authenticated using(true) with check(true);
  create policy legacy_sales on sales for all to authenticated using(true) with check(true);
  create policy legacy_profiles on profiles for all to authenticated using(true) with check(true);
 `);
 if (hardened) await db.exec(await readFile(new URL('../supabase/migrations/202609070002_security_hardening.sql',import.meta.url),'utf8'));
 if (hardened) await db.exec(await readFile(new URL('../supabase/migrations/202609070003_stripe_test_checkout.sql',import.meta.url),'utf8'));

 await db.exec(`update auth.users set email=id::text || '@example.invalid'; update profiles set email='old@example.invalid'; alter table profiles alter column email set not null;
  grant all on public.profiles to anon,authenticated;
  grant select(email), insert(email), update(email) on public.profiles to anon,authenticated;`);
 const migration=await readFile(new URL('../supabase/migrations/20261105022739_profile_privacy_repair.sql',import.meta.url),'utf8');
 await db.exec(migration); await db.exec(migration);
 for (const role of ['anon','authenticated']) {
  await db.exec(`set role ${role}`);
  await assert.rejects(db.query('select email from profiles'));
  await assert.rejects(db.query('select * from profiles'));
  assert.ok((await db.query('select id,username,avatar_url from profiles')).rows.length>0);
  if (role==='anon') await assert.rejects(db.query('delete from profiles'));
  await db.exec('reset role');
 }
 const fresh='10000000-0000-4000-8000-000000000004';
 await db.query('insert into auth.users(id,email) values($1,$2)',[fresh,'fresh@example.invalid']);
 const as=async id=>db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`);
 const merge=`insert into public.profiles(id,username,avatar_url) values($1,$2,$3) on conflict(id) do update set id=excluded.id,username=excluded.username,avatar_url=excluded.avatar_url returning username,avatar_url`;
 for (const [id,name] of [[buyer,'updated_buyer'],[fresh,'fresh_sailor']]) {
  await as(id); assert.equal((await db.query(merge,[id,name,''])).rows[0].username,name);
  await assert.rejects(db.query('update profiles set email=$1 where id=$2',['spoof@example.invalid',id]));
  await assert.rejects(db.query('insert into profiles(id,username,avatar_url,email) values($1,$2,$3,$4)',[id,'fake_name','','spoof@example.invalid']));
 }
 await as(buyer);
 await assert.rejects(db.query(merge,[fresh,'stolen_name','']));
 await assert.rejects(db.query('update profiles set id=$1 where id=$2',[fresh,buyer]));
 await assert.rejects(db.query('delete from profiles where id=$1 returning id',[fresh]));
 await assert.rejects(db.query('delete from profiles where id=$1 returning id',[buyer]));
 await db.exec('reset role');
 const values=(await db.query('select id,email from profiles where id in ($1,$2) order by id',[buyer,fresh])).rows;
 assert.deepEqual(values.map(row=>row.email),[`${buyer}@example.invalid`,'fresh@example.invalid']);
 assert.equal((await db.query("select has_function_privilege('anon','public.profile_repair_verified_email()','execute') or has_function_privilege('authenticated','public.profile_repair_verified_email()','execute') as allowed")).rows[0].allowed,false);
 // A provisioning operation without a user claim retains its supplied email.
 await db.exec("select set_config('request.jwt.claim.sub','',false)");
 await db.query('update profiles set email=$1 where id=$2',['admin@example.invalid',buyer]);
 assert.equal((await db.query('select email from profiles where id=$1',[buyer])).rows[0].email,'admin@example.invalid');
 console.log(`PASS ${hardened?'full hardened':'wide-grant legacy'} profile repair, applied twice`);
 } finally {await db.close();await rm(directory,{recursive:true,force:true});}
}
