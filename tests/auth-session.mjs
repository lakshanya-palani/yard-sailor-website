import assert from 'node:assert/strict';
import { createAuthSession } from '../src/lib/authSession.js';
import { saveReturn, readReturn } from '../src/lib/authFlow.js';
let callback, resolveSession, subscriptions = 0, disposed = 0;
const store = createAuthSession({
  onAuthStateChange(fn) { subscriptions++; callback = fn; return {data:{subscription:{unsubscribe(){ disposed++; }}}}; },
  getSession() { return new Promise(resolve => { resolveSession = resolve; }); },
});
assert.equal(store.getSnapshot().loading, true);
let first = 0, second = 0;
const stop = store.subscribe(() => first++);
store.subscribe(() => second++);
assert.equal(subscriptions, 1);
callback('SIGNED_IN', {user:{id:'canonical-auth-id'}});
resolveSession({data:{session:null}});
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(store.getSnapshot().user.id, 'canonical-auth-id');
assert.equal(first, 1); assert.equal(second, 1);
stop(); store.subscribe(() => {});
assert.equal(subscriptions, 1);
callback('SIGNED_OUT', null);
assert.equal(store.getSnapshot().user, null);
assert.equal(store.getSnapshot().loading, false);
assert.equal(second, 2);
store.dispose(); assert.equal(disposed, 1);
const restored = createAuthSession({
  onAuthStateChange() { return {data:{subscription:{unsubscribe(){}}}}; },
  async getSession() { return {data:{session:{user:{id:'restored-id'}}}}; },
});
restored.subscribe(() => {});
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(restored.getSnapshot().user.id, 'restored-id');
restored.dispose();
const failed = createAuthSession({
  onAuthStateChange() { return {data:{subscription:{unsubscribe(){}}}}; },
  async getSession() { throw new Error('network'); },
});
failed.subscribe(() => {});
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(failed.getSnapshot().loading, false);
assert.ok(failed.getSnapshot().error);
failed.dispose();
const unavailable = {setItem(){throw new Error('blocked');},getItem(){throw new Error('blocked');}};
assert.equal(saveReturn(unavailable, '/cart'), '/cart');
assert.equal(readReturn(unavailable), '/');
console.log('PASS shared listener, StrictMode resubscription, auth race, login/logout notifications, restored session, load error, blocked return storage');

// Reload using another official SDK client with the same persistent storage.
const { createClient } = await import('@supabase/supabase-js');
const values = new Map();
const storage = {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
const user = {id:'00000000-0000-4000-8000-000000000002',aud:'authenticated',role:'authenticated',app_metadata:{provider:'google'},user_metadata:{name:'Test Sailor'},created_at:new Date().toISOString()};
const config = {auth:{storage,detectSessionInUrl:false,autoRefreshToken:false},global:{fetch:async url=>String(url).includes('/logout')?new Response(null,{status:204}):Response.json({access_token:'fixture-access',refresh_token:'fixture-refresh',expires_in:3600,token_type:'bearer',user})}};
const original = createClient('https://fixture.supabase.co','public-fixture',config);
await original.auth.signInWithPassword({email:'fixture@example.invalid',password:'fixture'});
const reloaded = createClient('https://fixture.supabase.co','public-fixture',config);
assert.equal((await reloaded.auth.getSession()).data.session.user.id,user.id);
let signedOut = false;
const {data:{subscription}} = reloaded.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')signedOut=true;});
assert.equal((await reloaded.auth.signOut()).error,null);
assert.equal((await reloaded.auth.getSession()).data.session,null);
assert.equal(signedOut,true);
assert.equal(values.has('sb-fixture-auth-token'),false);
subscription.unsubscribe();
console.log('PASS official SDK persistent storage reload and signOut event/storage cleanup (mock Auth transport)');
