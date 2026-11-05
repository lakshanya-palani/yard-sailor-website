import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { savePublicProfile } from '../src/lib/profileEditor.js';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
// Supply the path to an isolated PGlite installation as the first argument.
const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
const directory = await mkdtemp(join(tmpdir(), 'yard-sailor-security-'));
let db = new PGlite(directory);
let checks = 0;
const seller='10000000-0000-4000-8000-000000000001';
const buyer='10000000-0000-4000-8000-000000000002';
const outsider='10000000-0000-4000-8000-000000000003';
const product='20000000-0000-4000-8000-000000000001';
const first='30000000-0000-4000-8000-000000000001';
const reply='30000000-0000-4000-8000-000000000002';
async function as(id) { await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id}',false);`); }
async function scalar(sql, args=[]) { const result=await db.query(sql,args); return Object.values(result.rows[0])[0]; }
async function equal(sql, expected, label, args=[]) { assert.equal(await scalar(sql,args),expected,label); checks++; console.log('PASS',label); }
async function denied(sql,args,label) { await assert.rejects(db.query(sql,args), undefined,label); checks++; console.log('PASS',label); }
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
 await db.exec(await readFile(new URL('../supabase/migrations/202609070001_product_cart_messages.sql',import.meta.url),'utf8'));
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
 await db.exec(await readFile(new URL('../supabase/migrations/202609070002_security_hardening.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/202609070003_stripe_test_checkout.sql',import.meta.url),'utf8'));

 // Model the base schema's private email constraint after applying the real migrations.
 await db.exec("update auth.users set email='fixture@example.invalid'; update profiles set email='fixture@example.invalid'; alter table profiles alter column email set not null");
 const freshId='10000000-0000-4000-8000-000000000004';
 await db.query('insert into auth.users(id,email) values($1,$2)',[freshId,'fresh@example.invalid']);
 let currentId;
 const payloads=[];
 const client=createClient('https://profile-fixture.supabase.co','public-placeholder',{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
  global:{fetch:async(input,options)=>{
   const url=new URL(input);
   assert.equal(url.pathname,'/rest/v1/profiles');
   if(options.method==='GET') return Response.json(null);
   assert.equal(options.method,'POST');
   assert.equal(url.searchParams.get('select'),'username,avatar_url');
   const payload=JSON.parse(options.body);
   assert.deepEqual(Object.keys(payload).sort(),['avatar_url','id','username']);
   payloads.push(payload);
   try {
    const result=await db.query(`insert into public.profiles(id,username,avatar_url) values($1,$2,$3)
     on conflict(id) do update set id=excluded.id,username=excluded.username,avatar_url=excluded.avatar_url
     returning username,avatar_url`,[payload.id,payload.username,payload.avatar_url]);
    return Response.json(result.rows[0]);
   } catch(error) { return Response.json({code:error.code,message:error.message},{status:400}); }
  }}
 });
 client.auth.getUser=async()=>({data:{user:{id:currentId,email:'fixture@example.invalid'}},error:null});
 for(const [id,username] of [[buyer,'updated_buyer'],[freshId,'fresh_sailor']]) {
  currentId=id;
  await as(id);
  assert.deepEqual(await savePublicProfile(client,id,{username,avatar_url:'',email:'untrusted@example.invalid'}),{username,avatar_url:''});
 }
 assert.equal(payloads.length,2);
 await db.exec('reset role');
 const stored=await db.query('select id,email from profiles where id in ($1,$2) order by id',[buyer,freshId]);
 assert.deepEqual(stored.rows.map(row=>row.email),['fixture@example.invalid','fresh@example.invalid']);
 console.log('PASS actual client saves existing and new profiles with server-supplied email');
 for(const role of ['anon','authenticated']) {
  await db.exec(`set role ${role}`);
  await denied('select email from public.profiles',[],`${role} cannot select private email`);
  await db.exec('reset role');
 }
 await as(buyer);
 await denied(`insert into public.profiles(id,username,avatar_url) values($1,$2,$3)
  on conflict(id) do update set id=excluded.id,username=excluded.username,avatar_url=excluded.avatar_url
  returning username,avatar_url`,[freshId,'stolen_name',''],'another user cannot overwrite a profile');
} finally { await db.close(); await rm(directory,{recursive:true,force:true}); }
