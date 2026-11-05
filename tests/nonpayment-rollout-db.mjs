import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {buildNonpaymentRollout} from '../scripts/build-nonpayment-rollout.mjs';
if (!process.argv[2]) throw new Error('Provide the path to the PGlite installation entry point');
const {PGlite}=await import(pathToFileURL(process.argv[2]).href);
const {sql:bundle}=await buildNonpaymentRollout();
const definitions=JSON.parse(await readFile(new URL('./fixtures/nonpayment-legacy-functions.json',import.meta.url),'utf8'));
const seller='10000000-0000-4000-8000-000000000001', buyer='10000000-0000-4000-8000-000000000002', fresh='10000000-0000-4000-8000-000000000003', product='20000000-0000-4000-8000-000000000001';
async function fixture(){
 const db=new PGlite(); await db.exec(`
 create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create schema storage;
 create table auth.users(id uuid primary key,email varchar(255));
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth,storage to anon,authenticated,service_role;
 create table products(id uuid primary key,user_id uuid,title text,description text,brand text,condition text,price numeric(12,2),image_urls text[],category text not null default 'other' check(category in ('other','furniture')));
 create table sales(id uuid primary key,host_id uuid,title text,description text,address text,start_time timestamptz,end_time timestamptz,lat numeric,lng numeric,images text[],location text);
 create table profiles(id uuid primary key,username text unique,avatar_url text,email text not null unique,updated_at timestamptz,full_name text,rating numeric,created_at timestamptz default now());
 create unique index profiles_username_trim on profiles(lower(trim(username)));
 create table saved_products(user_id uuid not null default auth.uid() references auth.users(id) on delete cascade, product_id uuid not null references products(id) on delete cascade,created_at timestamptz not null default now(),primary key(user_id,product_id));
 create index saved_products_product on saved_products(product_id);
 alter table saved_products enable row level security;
 create policy saved_read on saved_products for select to authenticated using(user_id=auth.uid());
 create policy saved_insert on saved_products for insert to authenticated with check(user_id=auth.uid());
 create policy saved_delete on saved_products for delete to authenticated using(user_id=auth.uid());
 grant all on saved_products to service_role; grant select,insert,delete on saved_products to authenticated; grant all on products,sales,profiles to authenticated; grant select on profiles to anon;
 create policy products_own on products for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
 create policy sales_own on sales for all to authenticated using(host_id=auth.uid()) with check(host_id=auth.uid());
 create policy profiles_own on profiles for all to authenticated using(id=auth.uid()) with check(id=auth.uid());
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant all on storage.objects to authenticated,anon;
 create policy storage_broad on storage.objects for all to authenticated using(true) with check(true);
 insert into auth.users values('${seller}','seller@example.invalid'),('${buyer}','buyer@example.invalid'),('${fresh}','fresh@example.invalid');
 insert into profiles(id,username,avatar_url,email) values('${seller}','seller','legacy.jpg','seller@example.invalid'),('${buyer}','buyer',null,'buyer@example.invalid');
 insert into products values('${product}','${seller}','Chair','Good chair',null,null,25.50,array['legacy.jpg'],'other');
 insert into sales values('30000000-0000-4000-8000-000000000001','${seller}','Sale','Good sale','Somewhere',now(),now()+interval '1 hour',1,1,array['legacy.jpg'],'stub');
 insert into saved_products(user_id,product_id) values('${buyer}','${product}');
 create publication supabase_realtime;
 `); await db.exec(definitions[1]); await db.exec(definitions[3]); await db.exec('revoke execute on function public.saved_product_availability() from public,anon; grant execute on function public.saved_product_availability() to authenticated,service_role'); return db;
}
async function val(db,sql){return Object.values((await db.query(sql)).rows[0])[0]}
async function role(db,id){await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id}',false)`)}
async function deny(db,sql){await assert.rejects(db.exec(sql))}
let db=await fixture();
try {
 const savedMetadata=await val(db,`select md5(concat_ws('|',
  (select relacl::text from pg_class where oid='public.saved_products'::regclass),
  (select string_agg(pg_get_constraintdef(oid),',' order by conname) from pg_constraint where conrelid='public.saved_products'::regclass),
  (select string_agg(policyname||':'||cmd||':'||coalesce(qual,'')||':'||coalesce(with_check,''),',' order by policyname) from pg_policies where schemaname='public' and tablename='saved_products'))) `);
 const before=await val(db,"select md5(prosrc) from pg_proc where oid='public.saved_product_availability()'::regprocedure");
 await db.exec(bundle);
 assert.equal(await val(db,"select count(*)::int from saved_products"),1);
 assert.equal(await val(db,`select md5(concat_ws('|',
  (select relacl::text from pg_class where oid='public.saved_products'::regclass),
  (select string_agg(pg_get_constraintdef(oid),',' order by conname) from pg_constraint where conrelid='public.saved_products'::regclass),
  (select string_agg(policyname||':'||cmd||':'||coalesce(qual,'')||':'||coalesce(with_check,''),',' order by policyname) from pg_policies where schemaname='public' and tablename='saved_products'))) `),savedMetadata);
 assert.equal(await val(db,"select md5(prosrc) from pg_proc where oid='public.saved_product_availability()'::regprocedure"),before);
 assert.equal(await val(db,"select title||':'||price::text||':'||category from products"),'Chair:25.50:other');
 assert.equal(await val(db,"select title from sales"),'Sale');
 assert.equal(await val(db,"select count(*)::int from pg_publication_tables where pubname='supabase_realtime'"),3);
 assert.equal(await val(db,"select count(*)::int from pg_class where relnamespace='public'::regnamespace and relname in ('checkout_inventory','orders','payments')"),0);
 await role(db,buyer);
 assert.equal(await val(db,`select public.add_product_to_cart('${product}')`),true);
 assert.equal(await val(db,'select count(*)::int from cart_items'),1);
 await deny(db,`insert into cart_items values('${buyer}','${product}',now())`);
 const conversation=await val(db,`select public.open_product_conversation('${product}')`);
 await db.exec(`insert into messages(conversation_id,body) values('${conversation}','hello')`);
 await deny(db,`insert into messages(conversation_id,sender_id,body) values('${conversation}','${seller}','forged')`);
 await deny(db,"insert into storage.objects(bucket_id,name) values('validated-images','bad')");
 await deny(db,"select email from profiles");
 await deny(db,`delete from profiles where id='${buyer}'`);
 await db.exec(`insert into profiles(id,username,avatar_url) values('${buyer}','buyer2',null) on conflict(id) do update set username=excluded.username,avatar_url=excluded.avatar_url`);
 await role(db,seller);
 await deny(db,`update products set image_urls=array['unvalidated.jpg'] where id='${product}'`);
 await db.exec(`insert into profiles(id,username,avatar_url) values('${seller}','seller2','legacy.jpg') on conflict(id) do update set username=excluded.username,avatar_url=excluded.avatar_url`);
 await role(db,fresh);
 await db.exec(`insert into profiles(id,username,avatar_url) values('${fresh}','fresh',null)`);
 assert.equal(await val(db,'select count(*)::int from messages'),0);
 await db.exec('reset role'); assert.equal(await val(db,`select email from profiles where id='${fresh}'`),'fresh@example.invalid');
 console.log('PASS exact bundle, preservation, ACL/RLS, uploads, profiles and Realtime');
} finally {await db.close()}
for(const mode of ['injected','mismatch','occupied','helper_acl','helper_config','storage_rls']) {
 db=await fixture(); try {
  if(mode==='mismatch') await db.exec("alter table products alter column category drop not null");
  if(mode==='occupied') await db.exec('create table cart_items(id int)');
  if(mode==='helper_acl') await db.exec('grant execute on function public.saved_product_availability() to anon');
  if(mode==='helper_config') await db.exec("alter function public.saved_product_availability() set search_path='public'");
  if(mode==='storage_rls') await db.exec('alter table storage.objects disable row level security');
  const sql=mode==='injected'?bundle.replace('-- END SOURCE supabase/migrations/202609070001_product_cart_messages.sql',"-- END SOURCE supabase/migrations/202609070001_product_cart_messages.sql\nselect 1/0;"):bundle;
  await assert.rejects(db.exec(sql)); await db.exec('rollback');
  assert.equal(await val(db,"select to_regclass('public.validated_uploads') is null"),true);
  assert.equal(await val(db,"select to_regclass('public.conversations') is null"),true);
  console.log(`PASS ${mode} failure rolls back`);
 } finally {await db.close()}
}
