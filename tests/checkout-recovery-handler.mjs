import {createPaymentHandlers} from '../supabase/functions/_shared/checkout.js';
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
for(const name of ['202609070001_product_cart_messages.sql','202609070002_security_hardening.sql','202609070003_stripe_test_checkout.sql','202609080004_saved_products.sql','20261105022739_profile_privacy_repair.sql','20261105022740_checkout_recovery_protocol.sql'])await db.exec(await readFile(new URL(`../supabase/migrations/${name}`,import.meta.url),'utf8'));


await role('service_role');
let postCalls=[],drop=true,providerError=null,failBind=false,currentBuyer=buyer,providerCreations=0;
const idempotencyCache=new Map(),providerSessions=new Map();
const admin={auth:{getUser:async()=>({data:{user:{id:currentBuyer}}})},rpc:async(name,args)=>{
 try {if(name==='bind_test_checkout' && failBind){failBind=false;throw Error('lost bind');}const keys=Object.keys(args);const value=await scalar(`select public.${name}(${keys.map((_,i)=>'$'+(i+1)).join(',')})`,Object.values(args));return {data:value};}catch(error){return {error};}
},from:table=>({select:()=>({eq:(_key,id)=>({maybeSingle:async()=>({data:(await db.query(`select * from public.${table} where id=$1`,[id])).rows[0]}),order:async()=>({data:(await db.query(`select product_id,title,unit_amount,quantity from public.${table} where order_id=$1 order by product_id`,[id])).rows})})})})};
const stripe={checkout:{sessions:{create:async(params,options)=>{
 postCalls.push({params:structuredClone(params),options});if(providerError)throw typeof providerError==='string'?Error(providerError):providerError;if(drop){drop=false;throw Error('dropped before provider');}
 const key=options.idempotencyKey;
 if(idempotencyCache.has(key)) {
  const cached=idempotencyCache.get(key);assert.deepEqual(params,cached.params);return structuredClone(cached.response);
 }
 const session={id:`cs_test_${params.client_reference_id}`,livemode:false,mode:'payment',metadata:params.metadata,client_reference_id:params.client_reference_id,amount_total:2550,currency:'usd',status:'open',payment_status:'unpaid',url:'https://checkout.stripe.com/c/pay/recovery'};
 providerCreations++;idempotencyCache.set(key,{params:structuredClone(params),response:structuredClone(session)});providerSessions.set(session.id,structuredClone(session));return structuredClone(session);
},retrieve:async(id)=>structuredClone(providerSessions.get(id)),expire:async(id)=>{const session=providerSessions.get(id);session.status='expired';return structuredClone(session);}}}};
const make=(body)=>new Request('https://edge.example',{method:'POST',headers:{authorization:'Bearer test','content-type':'application/json'},body:JSON.stringify(body)});
let handlers=createPaymentHandlers({admin,stripe,siteUrl:'https://old.example',enabled:true});
const selection={productIds:[product],requestId:crypto.randomUUID(),source:'buy_now'};
assert.equal((await handlers.create(make(selection))).status,503);
const orderId=await scalar('select id from checkout_orders where buyer_id=$1',[buyer]);
await db.exec('reset role');await db.query("update checkout_orders set first_dispatch_at=first_dispatch_at-interval '16 minutes' where id=$1",[orderId]);await role('service_role');
handlers=createPaymentHandlers({admin,stripe,siteUrl:'https://new.example',enabled:true});
const result=await handlers.manage(make({orderId,action:'cancel'}));assert.equal(result.status,200);assert.equal((await result.json()).state,'expired');
assert.equal(postCalls.length,2);assert.equal(providerCreations,1);assert.deepEqual(postCalls[0],postCalls[1]);assert.match(postCalls[1].params.success_url,/old\.example/);
await equal('select count(*)::int from checkout_inventory where order_id=$1',[orderId],0,'16-minute dropped POST retry cancels and releases');
// A request arriving after 24 hours cannot satisfy Stripe's 30-minute minimum.
const staleParams=postCalls[0].params;const staleArrival=staleParams.expires_at+3600;
const providerCreateAt=async(params,now)=>{if(params.expires_at-now<1800)throw Error('provider expiry too soon');};
await assert.rejects(providerCreateAt(staleParams,staleArrival),/provider expiry too soon/);
const next=await scalar('select reserve_test_checkout_v2($1,$2,$3,$4)',[buyer,[product2],crypto.randomUUID(),'buy_now']);
await scalar('select prepare_test_checkout($1,$2,$3,$4)',[next,buyer,'create',{mode:'payment'}]);
for(const failure of ['timeout','HTTP 500','idempotency key in use']) {
 providerError=failure;const failed=await handlers.manage(make({orderId:next,action:'resume'}));assert.equal(failed.status,503);
 assert.equal(await scalar('select count(*)::int from checkout_inventory where order_id=$1',[next]),1);
}
providerError=Object.assign(Error('mismatched parameters'),{type:'StripeIdempotencyError',code:'idempotency_error'});
let mismatch=await handlers.manage(make({orderId:next,action:'resume'}));assert.equal(mismatch.status,409);assert.equal((await mismatch.json()).code,'checkout_review_required');
providerError=Object.assign(Error('in use'),{type:'StripeIdempotencyError',code:'idempotency_key_in_use'});
assert.equal((await handlers.manage(make({orderId:next,action:'resume'}))).status,503);
providerError=null;
await db.exec('reset role');await db.query("update checkout_orders set first_dispatch_at=clock_timestamp()-interval '23 hours' where id=$1",[next]);await role('service_role');
const before=postCalls.length;const review=await handlers.manage(make({orderId:next,action:'resume'}));assert.equal(review.status,409);assert.equal((await review.json()).code,'checkout_review_required');assert.equal(postCalls.length,before);
// Stripe succeeds but the first binding fails; retry reuses frozen parameters and key.
const thirdProduct=crypto.randomUUID();await db.exec('reset role');await db.query("insert into products(id,user_id,title,price) values($1,$2,'Lamp',25.50)",[thirdProduct,seller]);await role('service_role');currentBuyer=other;failBind=true;
const lostSelection={productIds:[thirdProduct],requestId:crypto.randomUUID(),source:'buy_now'};
assert.equal((await handlers.create(make(lostSelection))).status,503);
const lostOrder=await scalar('select id from checkout_orders where buyer_id=$1 and state=$2',[other,'creating']);
const lostPost=postCalls.at(-1);const createdBeforeRetry=providerCreations;
providerSessions.get(`cs_test_${lostOrder}`).status='expired';
const lostRetry=await handlers.manage(make({orderId:lostOrder,action:'resume'}));assert.equal(lostRetry.status,200);assert.equal((await lostRetry.json()).state,'expired');assert.equal(providerCreations,createdBeforeRetry);assert.deepEqual(postCalls.at(-1),lostPost);
// A cached open create response must not override the provider's current paid state.
const paidProduct=crypto.randomUUID();await db.exec('reset role');await db.query("insert into products(id,user_id,title,price) values($1,$2,'Desk',25.50)",[paidProduct,seller]);await role('service_role');failBind=true;
assert.equal((await handlers.create(make({productIds:[paidProduct],requestId:crypto.randomUUID(),source:'buy_now'}))).status,503);
const paidOrder=await scalar('select id from checkout_orders where buyer_id=$1 and state=$2',[other,'creating']);
const paidSession=providerSessions.get(`cs_test_${paidOrder}`);paidSession.status='complete';paidSession.payment_status='paid';paidSession.payment_intent={id:'pi_recovered',livemode:false,status:'succeeded',amount:2550,amount_received:2550,currency:'usd',metadata:paidSession.metadata};
const beforePaidRetry=providerCreations;const paidResult=await handlers.manage(make({orderId:paidOrder,action:'resume'}));assert.equal(paidResult.status,200);const paidBody=await paidResult.json();assert.equal(paidBody.state,'paid');assert.equal(paidBody.url,undefined);assert.equal(providerCreations,beforePaidRetry);
console.log('Recovery handler tests passed against migrated PGlite SQL.');
} finally {await db.close();}
