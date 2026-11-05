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
alter table storage.objects enable row level security;
grant all on products,profiles,sales to authenticated;create policy old_products on products for all to authenticated using(true) with check(true);create policy old_profiles on profiles for all to authenticated using(true) with check(true);create policy old_sales on sales for all to authenticated using(true) with check(true);
insert into auth.users(id) values('${seller}'),('${buyer}'),('${other}'),('${seller2}');
insert into products(id,user_id,title,price,image_urls) values('${product}','${seller}','Chair',25.50,array['/chair.jpg']),('${product2}','${seller2}','Table',30,array['/table.jpg']);
`);
for(const name of ['202609070001_product_cart_messages.sql','202609070002_security_hardening.sql','202609070003_stripe_test_checkout.sql','20261105022740_checkout_recovery_protocol.sql'])await db.exec(await readFile(new URL(`../supabase/migrations/${name}`,import.meta.url),'utf8'));

for(const userRole of ['anon','authenticated','service_role']) {
 await role(userRole,buyer);
 await denied('select release_virgin_test_checkout($1)',[crypto.randomUUID()],`${userRole} cannot call internal release`);
 await denied('select reserve_test_checkout_internal($1,$2,$3,$4,$5)',[buyer,[product],crypto.randomUUID(),'buy_now',2],`${userRole} cannot call internal reserve`);
}
await role('anon',buyer);
await denied('select reserve_test_checkout_v2($1,$2,$3,$4)',[buyer,[product],crypto.randomUUID(),'buy_now'],'anon cannot call v2 reserve');
await denied('select prepare_test_checkout($1,$2,$3,null)',[crypto.randomUUID(),buyer,'cancel'],'anon cannot call prepare');
await role('authenticated',buyer);
await denied('select reserve_test_checkout_v2($1,$2,$3,$4)',[buyer,[product],crypto.randomUUID(),'buy_now'],'v2 reserve service only');
await denied('select prepare_test_checkout($1,$2,$3,null)',[crypto.randomUUID(),buyer,'cancel'],'prepare service only');
await role('service_role');
const v2=async(who,item)=>scalar('select reserve_test_checkout_v2($1,$2,$3,$4)',[who,[item],crypto.randomUUID(),'buy_now']);
const prep=async(id,who,action,params=null)=>scalar('select prepare_test_checkout($1,$2,$3,$4)',[id,who,action,params]);
const first=await v2(buyer,product);
assert.equal((await prep(first,buyer,'refresh')).kind,'creating');
await denied('select bind_test_checkout($1,$2)',[first,'cs_test_virgin'],'virgin bind rejected');
await denied('select apply_test_checkout($1,$2,2550,$3,$4,$5,null,$6)',[first,'cs_test_virgin','usd','paid','pi_virgin','test'],'virgin webhook rejected');
assert.equal((await prep(first,buyer,'cancel')).state,'expired');
assert.equal((await prep(first,buyer,'resume',{a:1})).state,'expired');
await denied('select bind_test_checkout($1,$2)',[first,'cs_test_late'],'terminal unbound bind rejected');
await equal('select count(*)::int from checkout_inventory where product_id=$1',[product],0,'virgin cancel releases own reservation');
const second=await v2(other,product);
await assert.rejects(prep(second,buyer,'cancel'));
const dispatch=await prep(second,other,'create',{success_url:'https://old.example',line_items:[{quantity:1}]});
assert.equal(dispatch.kind,'dispatch');assert.equal(dispatch.params.expires_at,Math.floor(Date.parse(dispatch.db_time)/1000)+23*3600);
const cancellation=await prep(second,other,'cancel');assert.equal(cancellation.kind,'dispatch');assert.deepEqual(cancellation.params,dispatch.params);
await equal('select count(*)::int from checkout_inventory where product_id=$1',[product],1,'attempted cancellation holds inventory');
await scalar('select bind_test_checkout($1,$2)',[second,'cs_test_attempt']);
assert.equal(await apply(second,'expired','cs_test_attempt',null,null,2550),'expired');
const third=await v2(buyer,product);
await db.exec('reset role');await db.query("update checkout_orders set expires_at=clock_timestamp()-interval '1 minute' where id=$1",[third]);await role('service_role');
const fourth=await v2(other,product);assert.notEqual(third,fourth);
await equal('select state from checkout_orders where id=$1',[third],'expired','new buyer reaps expired virgin reservation');
const attempted=await prep(fourth,other,'create',{success_url:'https://old.example'});
await db.exec('reset role');await db.query("update checkout_orders set first_dispatch_at=clock_timestamp()-interval '23 hours' where id=$1",[fourth]);await role('service_role');
assert.equal((await prep(fourth,other,'resume')).kind,'review');
await assert.rejects(v2(buyer,product));
await equal('select count(*)::int from checkout_inventory where product_id=$1',[product],1,'old attempted reservation never reaped');
// The old entrypoint always creates legacy rows, which remain held without a session.
const legacy=await reserve(buyer,[product2]);
assert.equal((await prep(legacy,buyer,'cancel')).kind,'review');
await equal('select protocol from checkout_orders where id=$1',[legacy],0,'legacy reserve never mints v2');
await scalar('select bind_test_checkout($1,$2)',[legacy,'cs_test_legacy']);
assert.equal((await prep(legacy,buyer,'resume')).kind,'bound');
assert.equal(await apply(legacy,'expired','cs_test_legacy',null,null,3000),'expired');
// Webhook may bind a legitimately dispatched v2 order before the handler binds it.
const webhookOrder=await v2(buyer,product2);
await prep(webhookOrder,buyer,'create',{mode:'payment'});
assert.equal(await apply(webhookOrder,'paid','cs_test_webhook',null,'pi_webhook',3000),'paid');
await scalar('select bind_test_checkout($1,$2)',[webhookOrder,'cs_test_webhook']);
await equal('select state from checkout_orders where id=$1',[webhookOrder],'paid','webhook first remains paid after bind');
console.log('Recovery SQL checks passed; ordered interleavings, not parallel transactions.');
} finally {await db.close();}
