import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {PGlite}=await import(pathToFileURL(process.argv[2]).href);
const db=new PGlite();let checks=0;
const seller='10000000-0000-4000-8000-000000000001',buyer='10000000-0000-4000-8000-000000000002',other='10000000-0000-4000-8000-000000000003',seller2='10000000-0000-4000-8000-000000000004';
const product='20000000-0000-4000-8000-000000000001',product2='20000000-0000-4000-8000-000000000002';
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
async function equal(sql,args,value,label){assert.deepEqual(await scalar(sql,args),value,label);checks++;console.log('PASS',label);}
async function denied(sql,args,label){await assert.rejects(db.query(sql,args),undefined,label);checks++;console.log('PASS',label);}
async function role(name,id=''){await db.exec(`reset role;set role ${name};select set_config('request.jwt.claim.sub','${id}',false)`);}
const reserve=(id,ids,key=crypto.randomUUID(),source='buy_now')=>scalar('select reserve_test_checkout($1,$2,$3,$4)',[id,ids,key,source]);
const apply=(id,result,session='cs_test_first',event=null,intent='pi_first',amount=2550)=>scalar('select apply_test_checkout($1,$2,$3,$4,$5,$6,$7,$8)',[id,session,amount,'usd',result,result==='paid'?intent:null,event,'checkout.session.completed']);
try {
await db.exec(`
create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create table auth.users(id uuid primary key,email text);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth,public to authenticated,anon,service_role;
create table products(id uuid primary key,user_id uuid references auth.users(id),title text,price numeric,image_urls text[],description text default 'Description',brand text,condition text);
create table profiles(id uuid primary key references auth.users(id),username text,avatar_url text,email text,updated_at timestamptz);
create table sales(id uuid primary key,host_id uuid,title text,description text,address text,start_time timestamptz,end_time timestamptz,lat numeric,lng numeric,images text[]);
create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid,bucket_id text,name text);
grant all on products,profiles,sales to authenticated;create policy old_products on products for all to authenticated using(true) with check(true);create policy old_profiles on profiles for all to authenticated using(true) with check(true);create policy old_sales on sales for all to authenticated using(true) with check(true);
insert into auth.users(id) values('${seller}'),('${buyer}'),('${other}'),('${seller2}');
insert into products(id,user_id,title,price,image_urls) values('${product}','${seller}','Chair',25.50,array['/chair.jpg']),('${product2}','${seller2}','Table',30,array['/table.jpg']);
`);
for(const name of ['202609070001_product_cart_messages.sql','202609070002_security_hardening.sql','202609070003_stripe_test_checkout.sql'])await db.exec(await readFile(new URL(`../supabase/migrations/${name}`,import.meta.url),'utf8'));
await role('authenticated',buyer);
await denied('select reserve_test_checkout($1,$2,$3,$4)',[buyer,[product],crypto.randomUUID(),'buy_now'],'buyer cannot call privileged reservation RPC directly');
await denied('select * from checkout_orders',[],'raw order/payment IDs are private');
await denied('select apply_test_checkout($1,$2,2550,$3,$4,$5,null,$6)',[crypto.randomUUID(),'cs_test_forged','usd','paid','pi_fake','reconcile'],'browser cannot mark orders paid');
await role('service_role');
for(const [who,ids,source,label] of [[seller,[product],'buy_now','cannot buy own product'],[buyer,[product,product],'cart','duplicate quantities rejected'],[buyer,[crypto.randomUUID()],'buy_now','missing product rejected'],[buyer,[product],'cart','cart membership required'],[null,[product],'buy_now','missing buyer rejected']]) {
 await assert.rejects(reserve(who,ids,undefined,source));checks++;console.log('PASS',label);
}
const key=crypto.randomUUID();const order=await reserve(buyer,[product],key);
await equal('select amount_total::int from checkout_orders where id=$1',[order],2550,'order uses database cents');
assert.equal(await reserve(buyer,[product],key),order);checks++;console.log('PASS same request creates one order');
assert.equal(await reserve(buyer,[product]),order);checks++;console.log('PASS new request for same pending selection reuses order');
await assert.rejects(reserve(buyer,[product2],key));checks++;console.log('PASS key cannot switch products');
await assert.rejects(reserve(other,[product]));checks++;console.log('PASS competing buyer cannot reserve item');
await equal('select count(*)::int from checkout_orders',[],1,'failed competing requests create no orders');
await role('authenticated',seller);
await denied('update products set price=1 where id=$1',[product],'seller cannot change reserved price');
await denied('delete from products where id=$1',[product],'seller cannot delete reserved listing');
await role('service_role');
await scalar('select bind_test_checkout($1,$2)',[order,'cs_test_first']);
await denied('select bind_test_checkout($1,$2)',[order,'cs_test_other'],'session binding immutable');
await assert.rejects(apply(order,'paid','cs_test_first','evt_wrong','pi_first',1));checks++;console.log('PASS wrong amount rejected');
await denied('select apply_test_checkout($1,$2,2550,$3,$4,$5,$6,$7)',[order,'cs_test_first','eur','paid','pi_first','evt_currency','checkout.session.completed'],'wrong currency rejected');
await assert.rejects(apply(order,'paid','cs_test_other','evt_bad'));checks++;console.log('PASS wrong session rejected');
assert.equal(await apply(order,'paid','cs_test_first','evt_paid'),'paid');checks++;console.log('PASS verified payment applies');
assert.equal(await apply(order,'paid','cs_test_first','evt_paid'),'paid');checks++;console.log('PASS duplicate delivery is idempotent');
assert.equal(await apply(order,'paid','cs_test_first','evt_paid_2'),'paid');checks++;console.log('PASS different event cannot fulfill twice');
assert.equal(await apply(order,'expired','cs_test_first','evt_late'),'paid');checks++;console.log('PASS out-of-order expiry cannot downgrade paid order');
await equal('select state from checkout_inventory where product_id=$1',[product],'sold','inventory sold only after payment apply');
await assert.rejects(reserve(other,[product]));checks++;console.log('PASS sold item cannot be purchased again');
await role('authenticated',other);await equal('select list_my_checkout_orders()',[],[],'outsider sees no private orders');
await role('authenticated',buyer);assert.equal((await scalar('select list_my_checkout_orders()'))[0].items.length,1);checks++;console.log('PASS buyer sees own order');
await role('authenticated',seller);const sellerOrder=(await scalar('select list_my_checkout_orders()'))[0];assert.equal(sellerOrder.is_buyer,false);assert.equal(sellerOrder.stripe_session_id,undefined);checks++;console.log('PASS seller summary excludes Stripe identifiers');
await role('service_role');const cancelled=await reserve(other,[product2]);await scalar('select bind_test_checkout($1,$2)',[cancelled,'cs_test_cancel']);
assert.equal(await apply(cancelled,'expired','cs_test_cancel','evt_cancel',null,3000),'expired');checks++;console.log('PASS verified cancellation expires order');
await equal('select count(*)::int from checkout_inventory where product_id=$1',[product2],0,'cancellation releases reservation');
const replacement=await reserve(buyer,[product2]);assert.notEqual(replacement,cancelled);checks++;console.log('PASS released item can be checked out again');
await assert.rejects(apply(cancelled,'paid','cs_test_cancel','evt_late_pay','pi_late',3000));checks++;console.log('PASS expired order cannot consume replacement reservation');
// Numeric boundary tests use new users/products so active-order deduplication cannot mask validation.
await db.exec('reset role');
for(const price of ['0','-1','0.501','NaN','Infinity','1000000']) {
 const pid=crypto.randomUUID();await db.query('insert into products(id,user_id,title,price) values($1,$2,$3,$4)',[pid,seller,'Invalid price',price]);
 await role('service_role');await assert.rejects(reserve(other,[pid]));checks++;console.log('PASS invalid database price rejected:',price);await db.exec('reset role');
}
const third=crypto.randomUUID(),fourth=crypto.randomUUID();
await db.query("insert into products(id,user_id,title,price) values($1,$2,'Book',5),($3,$4,'Lamp',10)",[third,seller,fourth,seller2]);
await db.query('insert into cart_items(user_id,product_id) values($1,$2),($1,$3)',[other,third,fourth]);
await role('service_role');const mixed=await reserve(other,[third,fourth],undefined,'cart');
await equal('select amount_total::int from checkout_orders where id=$1',[mixed],1500,'cart checkout totals selected products atomically');
await role('authenticated',seller);const mine=(await scalar('select list_my_checkout_orders()')).find(o=>o.id===mixed);assert.equal(mine.items.length,1);assert.equal(mine.amount_total,500);checks++;console.log('PASS seller sees only their own items and subtotal in mixed order');
await role('authenticated',seller2);const theirs=(await scalar('select list_my_checkout_orders()')).find(o=>o.id===mixed);assert.equal(theirs.items.length,1);assert.equal(theirs.amount_total,1000);checks++;console.log('PASS second seller cannot see first seller order lines');
await role('authenticated',other);assert.equal((await scalar('select list_my_checkout_orders()')).find(o=>o.id===mixed).items.length,2);checks++;console.log('PASS buyer sees full mixed-seller order');
await role('anon');await denied('select list_my_checkout_orders()',[],'signed-out users cannot list orders');
console.log(`${checks} payment database checks passed.`);
} catch(e){console.error('FAIL',e.message,e.detail||'',e.where||'');process.exitCode=1;} finally{await db.close();}
