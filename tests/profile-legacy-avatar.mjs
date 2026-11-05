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
for (const hardened of [true]) {
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

 await db.exec(await readFile(new URL('../supabase/migrations/20261105022739_profile_privacy_repair.sql',import.meta.url),'utf8'));
 // Optional forward migration under review; --baseline verifies the known failure instead.
 const args=process.argv.slice(3);
 const patch=args.find(value=>value!=='--baseline');
 if (patch) await db.exec(await readFile(patch,'utf8'));
 const baseline=args.includes('--baseline');
 const own='https://legacy.example.invalid/own.jpg', other='https://legacy.example.invalid/other.jpg';
 const arbitrary='https://legacy.example.invalid/arbitrary.jpg', verified='https://validated.example.invalid/owned.jpg', foreignVerified='https://validated.example.invalid/foreign.jpg', wrongKind='https://validated.example.invalid/product.jpg';
 await db.exec("update auth.users set email=id::text || '@example.invalid'; update profiles set email=id::text || '@example.invalid'; alter table profiles alter column email set not null; alter table profiles add constraint profiles_email_unique unique(email)");
 await db.query('update profiles set avatar_url=$1 where id=$2',[own,buyer]);
 await db.query('update profiles set avatar_url=$1 where id=$2',[other,seller]);
 await db.query('insert into validated_uploads(path,user_id,kind,url) values($1,$2,$3,$4)',['avatars/owned.jpg',buyer,'avatars',verified]);
 await db.query('insert into validated_uploads(path,user_id,kind,url) values($1,$2,$3,$4)',['avatars/foreign.jpg',seller,'avatars',foreignVerified]);
 await db.query('insert into validated_uploads(path,user_id,kind,url) values($1,$2,$3,$4)',['products/product.jpg',buyer,'products',wrongKind]);
 assert.equal((await db.query("select has_function_privilege('authenticated','public.validate_listing_content()','execute') as allowed")).rows[0].allowed,false);
 await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${buyer}',false)`);
 const merge=`insert into profiles(id,username,avatar_url) values($1,$2,$3) on conflict(id) do update set id=excluded.id,username=excluded.username,avatar_url=excluded.avatar_url returning username,avatar_url`;
 // UPDATE's OLD row permits retaining a legacy image; UPSERT must also do so.
 assert.equal((await db.query('update profiles set username=$1 where id=$2 returning avatar_url',['buyer_updated',buyer])).rows[0].avatar_url,own);
 if (baseline) {
  await assert.rejects(db.query(merge,[buyer,'buyer_updated',own]),error=>error.code==='23514');
  console.log('PASS reproduced: UPDATE retains own legacy avatar but merge UPSERT rejects it with 23514');
 } else {
  for (let i=0;i<2;i++) assert.equal((await db.query(merge,[buyer,'buyer_updated',own])).rows[0].avatar_url,own);
  console.log('PASS merge UPSERT retains own legacy avatar');
 }
 await assert.rejects(db.query(merge,[buyer,'buyer_updated',other]),error=>error.code==='23514');
 await assert.rejects(db.query(merge,[buyer,'buyer_updated',foreignVerified]),error=>error.code==='23514');
 await assert.rejects(db.query(merge,[buyer,'buyer_updated',wrongKind]),error=>error.code==='23514');
 await assert.rejects(db.query(merge,[buyer,'buyer_updated',arbitrary]),error=>error.code==='23514');
 assert.equal((await db.query(merge,[buyer,'buyer_updated',verified])).rows[0].avatar_url,verified);
 await assert.rejects(db.query('update profiles set id=$1 where id=$2',[seller,buyer]));
 await assert.rejects(db.query('select email from profiles'));
 await db.exec('reset role');
 const fresh='10000000-0000-4000-8000-000000000004';
 const freshAvatar='https://validated.example.invalid/fresh.jpg';
 await db.query('insert into auth.users(id,email) values($1,$2)',[fresh,'fresh@example.invalid']);
 await db.query('insert into validated_uploads(path,user_id,kind,url) values($1,$2,$3,$4)',['avatars/fresh.jpg',fresh,'avatars',freshAvatar]);
 await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${fresh}',false)`);
 assert.equal((await db.query(merge,[fresh,'fresh_sailor',freshAvatar])).rows[0].avatar_url,freshAvatar);
 await db.exec('reset role; set role anon');
 await assert.rejects(db.query('select email from profiles'));
 console.log('PASS foreign and arbitrary avatars rejected; validated owned avatar allowed; ID and private email protected');
 } finally {await db.close();await rm(directory,{recursive:true,force:true});}
}
