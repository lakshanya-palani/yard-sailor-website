// Shared, testable payment logic. All privileged database calls remain server-side.
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class CheckoutError extends Error { constructor(message,status=400) { super(message); this.status=status; } }
export function validateConfiguration(env) {
  if (!env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) throw new Error('A Stripe test secret key is required.');
  if (!env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_')) throw new Error('A webhook signing secret is required.');
  const site=new URL(env.APP_SITE_URL);
  if ((site.protocol!=='https:' && !(site.protocol==='http:' && ['localhost','127.0.0.1'].includes(site.hostname))) || site.username || site.password || site.pathname!=='/' || site.search || site.hash) throw new Error('APP_SITE_URL must be an approved site origin.');
  return site.origin;
}
export async function rawBody(req,limit=8192) {
  if (!req.body) return new Uint8Array();
  const reader=req.body.getReader();const chunks=[];let size=0;
  try { while(true) { const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new CheckoutError('Request too large.',413);}chunks.push(value); } }
  finally { reader.releaseLock(); }
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}return bytes;
}
async function jsonBody(req) { try { return JSON.parse(new TextDecoder().decode(await rawBody(req))); } catch(e) { if(e instanceof CheckoutError)throw e;throw new CheckoutError('Invalid request.'); } }
function validateSelection(body) {
  if (!body || !Array.isArray(body.productIds) || body.productIds.length<1 || body.productIds.length>20 || body.productIds.some(id=>typeof id!=='string'||!UUID.test(id)) || new Set(body.productIds).size!==body.productIds.length || !UUID.test(body.requestId||'') || !['cart','buy_now'].includes(body.source) || (body.source==='buy_now' && body.productIds.length!==1) || Object.keys(body).some(k=>!['productIds','requestId','source'].includes(k))) throw new CheckoutError('Choose 1–20 different items, with quantity one each.');
}
export function verifySession(session,order) {
  if (session.livemode!==false || !session.id?.startsWith('cs_test_') || session.mode!=='payment' || session.metadata?.app!=='yard_sailor_test' || session.metadata.order_id!==order.id || session.metadata.buyer_id!==order.buyer_id || session.client_reference_id!==order.id || session.amount_total!==Number(order.amount_total) || session.currency!==order.currency || (order.stripe_session_id && session.id!==order.stripe_session_id)) throw new Error('Session verification failed.');
}
export function verifyIntent(intent,order) {
  if (!intent || intent.livemode!==false || !intent.id?.startsWith('pi_') || intent.status!=='succeeded' || intent.amount!==Number(order.amount_total) || intent.amount_received!==Number(order.amount_total) || intent.currency!==order.currency || intent.metadata?.order_id!==order.id || intent.metadata?.buyer_id!==order.buyer_id) throw new Error('Payment verification failed.');
}
const businessErrors=new Set(['An item is unavailable or belongs to you.','An item is reserved or already purchased in test mode.','An item is no longer in your cart.','An item has an invalid USD price.','Checkout total is too large.','Finish or cancel your pending checkout in Orders first.','Please wait before starting another checkout.']);
export function createPaymentHandlers({admin,stripe,siteUrl,webhookSecret,cryptoProvider,enabled}) {
  async function rpc(name,args) { const {data,error}=await admin.rpc(name,args);if(error){if(businessErrors.has(error.message))throw new CheckoutError(error.message,409);throw new Error('Database operation failed.');}return data; }
  async function loadOrder(id) {
    const {data,error}=await admin.from('checkout_orders').select('*').eq('id',id).maybeSingle();
    if(error)throw new Error('Order lookup failed.');if(!data)throw new CheckoutError('Order unavailable.',404);return data;
  }
  async function buyer(req) {
    const token=req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if(!token)throw new CheckoutError('Please sign in.',401);
    const {data,error}=await admin.auth.getUser(token);if(error||!data?.user)throw new CheckoutError('Please sign in again.',401);return data.user.id;
  }
  async function sessionFor(order) {
    if(order.stripe_session_id)return stripe.checkout.sessions.retrieve(order.stripe_session_id,{expand:['payment_intent']});
    const {data:items,error}=await admin.from('checkout_order_items').select('product_id,title,unit_amount,quantity').eq('order_id',order.id).order('product_id');
    if(error||!items?.length||items.some(i=>i.quantity!==1)||items.reduce((sum,i)=>sum+Number(i.unit_amount),0)!==Number(order.amount_total))throw new Error('Invalid order snapshot.');
    // Never change these parameters for a retry of the same order.
    const session=await stripe.checkout.sessions.create({mode:'payment',payment_method_types:['card'],
      client_reference_id:order.id,metadata:{app:'yard_sailor_test',order_id:order.id,buyer_id:order.buyer_id},
      payment_intent_data:{metadata:{app:'yard_sailor_test',order_id:order.id,buyer_id:order.buyer_id}},
      line_items:items.map(item=>({quantity:1,price_data:{currency:order.currency,unit_amount:Number(item.unit_amount),product_data:{name:item.title.slice(0,120)}}})),
      expires_at:Math.floor(new Date(order.expires_at).getTime()/1000),
      success_url:`${siteUrl}/orders?order=${order.id}&checkout=success`,cancel_url:`${siteUrl}/orders?order=${order.id}&checkout=cancelled`,
      custom_text:{submit:{message:'TEST MODE ONLY. No real purchase, delivery, or seller payout.'}}
    },{idempotencyKey:`yard-sailor-test-checkout:${order.id}`});
    verifySession(session,order);
    await rpc('bind_test_checkout',{p_order:order.id,p_session:session.id});return session;
  }
  async function reconcile(session,order,event) {
    verifySession(session,order);
    let result;let intentId=null;
    if(session.status==='complete' && session.payment_status==='paid') {
      const intent=typeof session.payment_intent==='string'?await stripe.paymentIntents.retrieve(session.payment_intent):session.payment_intent;
      verifyIntent(intent,order);intentId=intent.id;result='paid';
    } else if(session.status==='expired' && session.payment_status==='unpaid') result='expired';
    else if(session.status==='open' && session.payment_status==='unpaid') return 'open';
    else throw new Error('Payment is not settled.');
    return rpc('apply_test_checkout',{p_order:order.id,p_session:session.id,p_amount:session.amount_total,p_currency:session.currency,p_result:result,p_intent:intentId,p_event:event?.id||null,p_type:event?.type||'reconcile'});
  }
  function response(data,status=200,origin='') { return Response.json(data,{status,headers:{'Access-Control-Allow-Origin':origin===siteUrl?siteUrl:'','Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}}); }
  function endpoint(run) { return async req=>{
    const origin=req.headers.get('origin')||'';
    if(origin && origin!==siteUrl)return response({error:'Origin not allowed.'},403,origin);
    if(req.method==='OPTIONS')return response({},200,origin);
    if(req.method!=='POST')return response({error:'Method not allowed.'},405,origin);
    try{return response(await run(req),200,origin);}catch(e){return response({error:e instanceof CheckoutError?e.message:'Payment service unavailable. Your order can be checked in Orders. Please retry safely.'},e instanceof CheckoutError?e.status:503,origin);}
  }; }
  const create=endpoint(async req=>{
    if(!enabled)throw new CheckoutError('Test checkout has not been enabled.',503);
    const id=await buyer(req);const body=await jsonBody(req);validateSelection(body);
    const orderId=await rpc('reserve_test_checkout',{p_buyer:id,p_products:body.productIds,p_request:body.requestId,p_source:body.source});
    const order=await loadOrder(orderId);
    if(order.buyer_id!==id)throw new CheckoutError('Order unavailable.',404);
    if(['paid','expired'].includes(order.state))return {orderId,state:order.state};
    const session=await sessionFor(order);const state=await reconcile(session,order);
    if(state!=='open')return {orderId,state};
    if(!session.url?.startsWith('https://checkout.stripe.com/'))throw new Error('Invalid hosted checkout URL.');
    return {orderId,state,url:session.url,testMode:true};
  });
  const manage=endpoint(async req=>{
    const id=await buyer(req);const body=await jsonBody(req);
    if(!body||!UUID.test(body.orderId||'')||!['resume','cancel','refresh'].includes(body.action)||Object.keys(body).some(k=>!['orderId','action'].includes(k)))throw new CheckoutError('Invalid order request.');
    const order=await loadOrder(body.orderId);if(order.buyer_id!==id)throw new CheckoutError('Order unavailable.',404);
    if(['paid','expired'].includes(order.state))return {orderId:order.id,state:order.state};
    // A previously ambiguous create is retried with the SAME idempotency key,
    // even when cancelling, before it is safe to release inventory.
    let session=await sessionFor(order);verifySession(session,order);
    if(body.action==='cancel' && session.status==='open') {
      try {await stripe.checkout.sessions.expire(session.id);}catch { /* It may have completed concurrently. Retrieve authoritative state. */ }
      session=await stripe.checkout.sessions.retrieve(session.id,{expand:['payment_intent']});
    }
    const state=await reconcile(session,order);
    if(body.action==='cancel' && state==='open')throw new CheckoutError('Checkout is still open. Please retry cancellation.',409);
    return {orderId:order.id,state,url:body.action==='resume' && state==='open' && session.url?.startsWith('https://checkout.stripe.com/')?session.url:undefined};
  });
  const webhook=async req=>{
    if(req.method!=='POST')return response({error:'Method not allowed.'},405);
    const signature=req.headers.get('stripe-signature');if(!signature)return response({error:'Signature required.'},400);
    let event;
    try {
      // Exact bytes, never parsed/stringified before the official SDK verifies them.
      event=await stripe.webhooks.constructEventAsync(await rawBody(req,1048576),signature,webhookSecret,300,cryptoProvider);
    }catch{return response({error:'Invalid webhook signature or body.'},400);}
    if(event.livemode!==false)return response({error:'Live events are not accepted.'},400);
    if(!['checkout.session.completed','checkout.session.expired'].includes(event.type))return response({received:true,ignored:true});
    try {
      const original=event.data.object;
      if(original.metadata?.app!=='yard_sailor_test')return response({received:true,ignored:true});
      if(!UUID.test(original.metadata?.order_id||'') || original.livemode!==false || !original.id?.startsWith('cs_test_'))throw new Error('Invalid event association.');
      const order=await loadOrder(original.metadata.order_id);
      verifySession(original,order);
      // API retrieval handles delayed/out-of-order events and independently confirms settlement.
      const session=await stripe.checkout.sessions.retrieve(original.id,{expand:['payment_intent']});
      const state=await reconcile(session,order,event);
      if(state==='open')throw new Error('Event settlement is not yet available.');
      return response({received:true});
    }catch {console.error('Stripe test webhook processing failed; retry required.',{eventId:event.id,type:event.type});return response({error:'Webhook processing failed. Please retry.'},500);}
  };
  return {create,manage,webhook};
}
