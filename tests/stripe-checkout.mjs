// Offline handler integration: real Stripe SDK signatures, isolated database/Stripe API adapters.
// This does NOT submit a Stripe test payment or use account credentials.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createPaymentHandlers,validateConfiguration,verifySession,verifyIntent} from '../supabase/functions/_shared/checkout.js';
const {default:Stripe}=await import(pathToFileURL(process.argv[2]).href);
const stripe=new Stripe('sk_test_offline_fixture');const secret=`whsec_${crypto.randomUUID()}`;
const buyer=crypto.randomUUID(),other=crypto.randomUUID(),product=crypto.randomUUID(),orderId=crypto.randomUUID();
const order={id:orderId,buyer_id:buyer,amount_total:2550,currency:'usd',state:'creating',stripe_session_id:null,expires_at:new Date(Date.now()+2700000).toISOString()};
const metadata={app:'yard_sailor_test',order_id:orderId,buyer_id:buyer};
const intent={id:'pi_fixture',livemode:false,status:'succeeded',amount:2550,amount_received:2550,currency:'usd',metadata};
let session={id:'cs_test_fixture',livemode:false,mode:'payment',metadata,client_reference_id:orderId,amount_total:2550,currency:'usd',status:'open',payment_status:'unpaid',payment_intent:null,url:'https://checkout.stripe.com/c/pay/cs_test_fixture'};
let creates=[],applied=[],reservations=[],expireFails=false,createFails=false,checks=0;
stripe.checkout.sessions.create=async(params,options)=>{creates.push({params,options});if(createFails)throw new Error('Simulated timeout');return structuredClone(session);};
stripe.checkout.sessions.retrieve=async()=>structuredClone(session);
stripe.checkout.sessions.expire=async()=>{if(expireFails)throw new Error('Concurrent completion');session.status='expired';session.payment_status='unpaid';return structuredClone(session);};
stripe.paymentIntents.retrieve=async()=>structuredClone(intent);
const admin={auth:{getUser:async token=>token==='buyer'?{data:{user:{id:buyer}}}:token==='other'?{data:{user:{id:other}}}:{data:{user:null},error:{}}},
 rpc:async(name,args)=>{
  if(name==='reserve_test_checkout'){reservations.push(args);return {data:orderId};}
  if(name==='bind_test_checkout'){order.stripe_session_id=args.p_session;order.state='open';return {data:null};}
  if(name==='apply_test_checkout'){applied.push(args);return {data:args.p_result};}
  throw new Error('Unexpected RPC');
 },from:table=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:structuredClone(order)}),order:async()=>({data:[{product_id:product,title:'Chair',unit_amount:2550,quantity:1}]})})})})};
const handlers=createPaymentHandlers({admin,stripe,siteUrl:'https://yardsailor.example',webhookSecret:secret,cryptoProvider:Stripe.createSubtleCryptoProvider(),enabled:true});
const req=(body,token='buyer',origin='https://yardsailor.example')=>new Request('https://edge.example',{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`} : {}),origin},body:JSON.stringify(body)});
const selection={productIds:[product],requestId:crypto.randomUUID(),source:'buy_now'};
async function status(promise,expected,label){assert.equal((await promise).status,expected,label);checks++;console.log('PASS',label);}
await status(handlers.create(req(selection,null)),401,'authentication required');
await status(handlers.create(req(selection,'forged')),401,'invalid auth rejected');
await status(handlers.create(req(selection,'buyer','https://evil.example')),403,'unapproved origin rejected');
await status(handlers.create(req({...selection,amount:1})),400,'client prices rejected');
await status(handlers.create(req({...selection,sellerId:other})),400,'client seller identity rejected');
await status(handlers.create(req({...selection,productIds:[product,product]})),400,'quantity greater than one rejected');
await status(handlers.create(req({...selection,productIds:[]})),400,'empty selection rejected');
assert.equal(reservations.length,0);checks++;console.log('PASS invalid requests reserve nothing');
const result=await handlers.create(req(selection));assert.equal(result.status,200);const data=await result.json();assert.equal(data.url,session.url);
assert.equal(creates[0].params.line_items[0].price_data.unit_amount,2550);assert.equal(creates[0].params.line_items[0].quantity,1);
assert.deepEqual(creates[0].params.payment_method_types,['card']);assert.equal(reservations[0].p_buyer,buyer);checks++;console.log('PASS valid checkout uses trusted snapshot and authenticated buyer');
await handlers.create(req(selection));assert.equal(creates.length,1);checks++;console.log('PASS repeated checkout uses bound session');
// Ambiguous creation never releases inventory or changes the Stripe idempotency key.
order.stripe_session_id=null;order.state='creating';createFails=true;
await status(handlers.create(req(selection)),503,'network timeout fails closed');createFails=false;
await handlers.create(req(selection));assert.equal(creates.at(-1).options.idempotencyKey,creates[0].options.idempotencyKey);assert.deepEqual(creates.at(-1).params,creates[0].params);assert.equal(applied.length,0);checks++;console.log('PASS retry parameters/key stable and no premature release');
await status(handlers.manage(req({orderId,action:'cancel'},'other')),404,'other buyer cannot cancel order');
await status(handlers.manage(req({orderId,action:'refresh'},'other')),404,'other buyer cannot reconcile order');
await status(handlers.webhook(new Request('https://edge.example',{method:'POST',body:'{}'})),400,'missing webhook signature rejected');
await status(handlers.webhook(new Request('https://edge.example',{method:'POST',headers:{'stripe-signature':'forged'},body:'{}'})),400,'invalid webhook signature rejected');
async function signed(event,mutate=false,timestamp=Math.floor(Date.now()/1000)) {
 const payload=JSON.stringify(event);const signature=await stripe.webhooks.generateTestHeaderStringAsync({payload,secret,timestamp});
 return new Request('https://edge.example',{method:'POST',headers:{'stripe-signature':signature},body:mutate?payload+' ':payload});
}
function event(type='checkout.session.completed',id=`evt_${crypto.randomUUID()}`){return {id,type,livemode:false,data:{object:structuredClone(session)}};}
session={...session,status:'complete',payment_status:'paid',payment_intent:structuredClone(intent)};
await status(handlers.webhook(await signed(event(),true)),400,'changed raw bytes invalidate signature');
await status(handlers.webhook(await signed(event(),false,Math.floor(Date.now()/1000)-600)),400,'stale signature rejected');
await status(handlers.webhook(await signed({...event(),livemode:true})),400,'live events rejected');
const validEvent=event();await status(handlers.webhook(await signed(validEvent)),200,'official SDK verified completion processed');assert.equal(applied.at(-1).p_result,'paid');assert.equal(applied.at(-1).p_intent,intent.id);checks++;console.log('PASS verified PaymentIntent drives database application');
await status(handlers.webhook(await signed(validEvent)),200,'duplicate verified delivery safely reaches idempotent database RPC');assert.equal(applied.at(-1).p_event,applied.at(-2).p_event);
const priorCount=applied.length;
await status(handlers.webhook(await signed({...event(),data:{object:{...session,amount_total:1}}})),500,'signed wrong amount does not fulfill');
await status(handlers.webhook(await signed({...event(),data:{object:{...session,currency:'eur'}}})),500,'signed wrong currency does not fulfill');
assert.equal(applied.length,priorCount);checks++;console.log('PASS failed verification changes no inventory');
const goodIntent=structuredClone(session.payment_intent);session.payment_intent.status='processing';
await status(handlers.webhook(await signed(event())),500,'unsettled PaymentIntent does not fulfill');session.payment_intent=goodIntent;
const lateExpiry=event('checkout.session.expired');lateExpiry.data.object.status='expired';lateExpiry.data.object.payment_status='unpaid';lateExpiry.data.object.payment_intent=null;
await status(handlers.webhook(await signed(lateExpiry)),200,'out-of-order event uses current Stripe API state');assert.equal(applied.at(-1).p_result,'paid');
// Cancellation must expire the session before any release RPC.
session={...session,status:'open',payment_status:'unpaid',payment_intent:null};
await status(handlers.manage(req({orderId,action:'cancel'})),200,'cancel expires Stripe session before release');assert.equal(applied.at(-1).p_result,'expired');
session={...session,status:'open',payment_status:'unpaid',payment_intent:null};expireFails=true;const beforeFailed=applied.length;
await status(handlers.manage(req({orderId,action:'cancel'})),409,'failed expiration keeps reservation');assert.equal(applied.length,beforeFailed);expireFails=false;
session={...session,status:'expired',payment_status:'unpaid',payment_intent:null};
await status(handlers.webhook(await signed(event('checkout.session.expired'))),200,'natural expiry processed');
for(const overrides of [{STRIPE_SECRET_KEY:'sk_live_not_a_real_key'},{APP_SITE_URL:'https://evil.example/path'},{STRIPE_WEBHOOK_SECRET:''}])assert.throws(()=>validateConfiguration({STRIPE_SECRET_KEY:'sk_test_placeholder',STRIPE_WEBHOOK_SECRET:'whsec_placeholder',APP_SITE_URL:'https://yardsailor.example',...overrides}));checks++;console.log('PASS configuration rejects live keys and unsafe redirects');
assert.throws(()=>verifySession({...session,livemode:true},order));assert.throws(()=>verifyIntent({...intent,amount_received:1},order));checks++;console.log('PASS independent settlement guards');
console.log(`${checks} offline Stripe handler/signature checks passed. No real Stripe test payment was attempted.`);
