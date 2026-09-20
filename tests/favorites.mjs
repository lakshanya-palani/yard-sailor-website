import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {writeSaved,readSavedIds} from '../src/lib/favorites.js';
const {PGlite}=await import(pathToFileURL(process.argv[2]).href);
const dir=await mkdtemp(join(tmpdir(),'yard-sailor-favorites-'));let db=new PGlite(dir);let count=0;
const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002',p='20000000-0000-4000-8000-000000000001';
const as=async id=>db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`);
const n=async()=>Number((await db.query('select count(*) n from saved_products')).rows[0].n);
const pass=label=>{count++;console.log('PASS',label)};
try{
 await db.exec(`create role authenticated;create role anon;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;create table products(id uuid primary key);insert into auth.users values('${a}'),('${b}');insert into products values('${p}');`);
 await db.exec(await readFile(new URL('../supabase/migrations/202609080004_saved_products.sql',import.meta.url),'utf8'));
 await as(a);await db.query('insert into saved_products(product_id) values($1)',[p]);assert.equal(await n(),1);pass('authenticated save');
 assert.equal((await db.query('select * from saved_product_availability()')).rows[0].unavailable,false);pass('migration and availability work without payment inventory');
 await assert.rejects(db.query('insert into saved_products(product_id) values($1)',[p]));assert.equal(await n(),1);pass('unique pair prevents duplicate saves');
 await as(b);assert.equal(await n(),0);await assert.rejects(db.query('insert into saved_products(user_id,product_id) values($1,$2)',[a,p]));await db.query('delete from saved_products where user_id=$1',[a]);pass('cross-user read, insert and delete protected by RLS');
 assert.equal((await db.query('select * from saved_product_availability()')).rows.length,0);pass('availability function exposes no other users list');
 await as(a);assert.equal(await n(),1);await db.close();db=new PGlite(dir);await as(a);assert.equal(await n(),1);pass('persistence after database reload');
 await db.exec(`reset role;create table checkout_inventory(product_id uuid primary key references products(id));insert into checkout_inventory values('${p}');`);await as(a);assert.equal((await db.query('select * from saved_product_availability()')).rows[0].unavailable,true);pass('reserved/sold test inventory reported unavailable');
 await db.query('delete from saved_products where product_id=$1',[p]);assert.equal(await n(),0);pass('unsave');
 await db.query('insert into saved_products(product_id) values($1)',[p]);await db.exec(`reset role;delete from checkout_inventory;delete from products;`);await as(a);assert.equal(await n(),0);pass('product deletion cascades');
 await db.exec('reset role;set role anon');await assert.rejects(db.query('select * from saved_products'));await assert.rejects(db.query('select * from saved_product_availability()'));pass('anonymous access rejected');
 await writeSaved({from:()=>({insert:async()=>({error:{code:'23505'}})})},a,p,true);await assert.rejects(writeSaved({from:()=>({insert:async()=>({error:{code:'42501'}})})},a,p,true));pass('duplicate insert is idempotent; authorization errors propagate for rollback');
 const client={from:()=>({select:()=>({eq:()=>({order:()=>({range:async()=>({data:[{product_id:p}]})})})})})};assert.deepEqual(await readSavedIds(client,a),[p]);pass('saved ID loader restores persisted state');
 console.log(`${count} favorites checks passed using isolated PostgreSQL fixtures.`);
}finally{await db.close();await rm(dir,{recursive:true,force:true});}
