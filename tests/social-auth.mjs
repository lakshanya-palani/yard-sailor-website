import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {startSocial,completeCallback,profileDestination,saveReturn,readReturn,clearReturn,returnPath} from '../src/lib/authFlow.js';
const cache=new Map();const storage={getItem:k=>cache.get(k)??null,setItem:(k,v)=>cache.set(k,v),removeItem:k=>cache.delete(k)};
const supabaseUrl='https://auth-fixture.supabase.co';let checks=0;
function pass(name){checks++;console.log('PASS',name);}
const client=createClient(supabaseUrl,'public-placeholder',{auth:{flowType:'pkce',detectSessionInUrl:false,storage,autoRefreshToken:false}});
for(const provider of ['google','facebook']) {
 const url=await startSocial(client,provider,'/products/sample?from=cart',{origin:'http://localhost:5173',storage,supabaseUrl,publicKey:'public-placeholder',fetcher:async()=>Response.json({external:{google:true,facebook:true}})});
 const parsed=new URL(url);assert.equal(parsed.searchParams.get('provider'),provider);assert.equal(parsed.searchParams.get('redirect_to'),'http://localhost:5173/auth/callback');assert.equal(parsed.searchParams.get('code_challenge_method'),'s256');assert.ok(parsed.searchParams.get('code_challenge'));if(provider==='facebook')assert.equal(parsed.searchParams.get('scopes'),'email');pass(`${provider} starts with official SDK PKCE challenge and fixed callback`);
}
assert.equal(readReturn(storage),'/products/sample?from=cart');pass('intended product/action preserved');
await assert.rejects(startSocial(client,'google','/',{origin:'http://localhost:5173',storage,supabaseUrl,publicKey:'public-placeholder',fetcher:async()=>Response.json({external:{google:false}})}),/not configured/);pass('disabled provider handled before navigation');
for(const value of ['//evil.example','/\\evil.example','https://evil.example','/auth/callback?code=bad','/login','/register'])assert.equal(returnPath(value),'/');pass('external/looping redirects rejected');
let exchanges=0,verifies=0;
const callbackClient={auth:{exchangeCodeForSession:async code=>{exchanges++;assert.equal(code,'fixture-code');return {data:{session:{user:{id:'user'}}}};},getUser:async()=>{verifies++;return {data:{user:{id:'user'}}};}},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{username:'sailor'}})})})})};
const result=await completeCallback(callbackClient,'http://localhost:5173/auth/callback?code=fixture-code',storage);assert.equal(result.userId,'user');assert.equal(result.redirect,'/products/sample?from=cart');assert.equal(verifies,1);pass('callback exchanges code and verifies restored user');
assert.equal(await profileDestination(callbackClient,'user',result.redirect),result.redirect);pass('existing profile returns to intended page without writes');
callbackClient.from=()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:null})})})});
assert.equal(await profileDestination(callbackClient,'user','/cart'),'/profile/setup?redirect=%2Fcart');pass('new social user uses existing profile setup');
await assert.rejects(completeCallback(callbackClient,'http://localhost:5173/auth/callback?error=access_denied',storage),/cancelled/);assert.equal(exchanges,1);pass('cancelled callback cannot accept old session');
await assert.rejects(completeCallback(callbackClient,'http://localhost:5173/auth/callback',storage),/incomplete/);pass('missing callback code rejected');
callbackClient.auth.exchangeCodeForSession=async()=>({data:{session:null},error:{}});
await assert.rejects(completeCallback(callbackClient,'http://localhost:5173/auth/callback?code=expired',storage),/expired/);pass('expired/invalid exchange fails closed');
clearReturn(storage);assert.equal(readReturn(storage),'/');pass('temporary return path cleared');
// Exercise email/password with the same SDK PKCE configuration and isolated Auth responses.
const fakeUser={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'test@example.invalid',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()};
const responseUser={access_token:'offline-access-placeholder',refresh_token:'offline-refresh-placeholder',expires_in:3600,token_type:'bearer',user:fakeUser};
const calls=[];const emailClient=createClient(supabaseUrl,'public-placeholder',{auth:{flowType:'pkce',detectSessionInUrl:false,storage,autoRefreshToken:false},global:{fetch:async(url,opts)=>{calls.push({url:String(url),body:JSON.parse(opts.body)});return Response.json(responseUser);}}});
const login=await emailClient.auth.signInWithPassword({email:fakeUser.email,password:'offline-test-password'});assert.equal(login.error,null);assert.ok(calls.at(-1).url.includes('grant_type=password'));assert.equal((await emailClient.auth.getSession()).data.session.user.id,fakeUser.id);pass('email/password SDK login and session restoration unchanged');
await emailClient.auth.signUp({email:fakeUser.email,password:'offline-test-password',options:{emailRedirectTo:'http://localhost:5173/auth/callback'}});assert.ok(calls.at(-1).url.includes('/signup'));assert.ok(calls.at(-1).body.code_challenge);pass('email registration uses SDK confirmation challenge');
await client.auth.stopAutoRefresh();await emailClient.auth.stopAutoRefresh();
console.log(`${checks} social-auth checks passed; no real provider account or password was used.`);
