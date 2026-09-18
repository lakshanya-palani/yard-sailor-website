import { safeRedirect } from './redirect.js';
const INTENT='yard-sailor-auth-return';
export const authReturnStorage={
  getItem:key=>window.sessionStorage.getItem(key),
  setItem:(key,value)=>window.sessionStorage.setItem(key,value),
  removeItem:key=>window.sessionStorage.removeItem(key),
};
export function returnPath(value) {
  const path=safeRedirect(value);
  return /^\/(auth\/callback|login|register)(?:[/?#]|$)/.test(path)?'/':path;
}
export function saveReturn(storage,value) {
  const path=returnPath(value);
  try { storage.setItem(INTENT,JSON.stringify({path,created:Date.now()})); } catch { /* OAuth still works without return-path storage. */ }
  return path;
}
export function readReturn(storage) {
  try {const item=JSON.parse(storage.getItem(INTENT));return item && Date.now()-item.created<1800000 ? returnPath(item.path) : '/';}catch{return '/';}
}
export function clearReturn(storage) {try {storage.removeItem(INTENT);}catch { /* Navigation can continue if storage is unavailable. */ }}
export async function profileDestination(client,userId,redirect) {
  const {data,error}=await client.from('profiles').select('username').eq('id',userId).maybeSingle();
  if(error)throw new Error('Your account is signed in, but the profile could not be loaded. Please retry.');
  const path=returnPath(redirect);
  return data?.username?.trim()?path:`/profile/setup?redirect=${encodeURIComponent(path)}`;
}
export async function startSocial(client,provider,redirect,{origin,storage,fetcher=fetch,supabaseUrl,publicKey}) {
  if(!['google','facebook'].includes(provider))throw new Error('Unsupported sign-in provider.');
  // The public Auth settings endpoint prevents navigating to a disabled-provider error page.
  const response=await fetcher(`${supabaseUrl}/auth/v1/settings`,{headers:{apikey:publicKey},signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Unable to check sign-in availability. Please try again.');
  const settings=await response.json();
  if(settings.external?.[provider]!==true)throw new Error(`${provider==='google'?'Google':'Facebook'} sign-in is not configured yet. Please try another sign-in option.`);
  saveReturn(storage,redirect);
  const {data,error}=await client.auth.signInWithOAuth({provider,options:{redirectTo:`${origin}/auth/callback`,skipBrowserRedirect:true,...(provider==='facebook'?{scopes:'email'}:{})}});
  if(error||!data?.url)throw new Error('Unable to start social sign-in. Please try again.');
  const url=new URL(data.url);
  if(url.origin!==new URL(supabaseUrl).origin || url.pathname!==`${new URL(supabaseUrl).pathname.replace(/\/$/,'')}/auth/v1/authorize`)throw new Error('Unexpected sign-in destination.');
  return url.href;
}
export async function completeCallback(client,href,storage) {
  const url=new URL(href);const hash=new URLSearchParams(url.hash.slice(1));
  if(url.searchParams.has('error') || hash.has('error'))throw new Error('Sign-in was cancelled or could not be completed. Please try again.');
  const code=url.searchParams.get('code');
  if(!code)throw new Error('This sign-in link is incomplete. Please start sign-in again.');
  const {data,error}=await client.auth.exchangeCodeForSession(code);
  if(error||!data?.session)throw new Error('This sign-in link expired or was opened in a different browser. Please retry sign-in here. If you confirmed your email, you can now log in with your password.');
  const {data:verified,error:verifyError}=await client.auth.getUser();
  if(verifyError||!verified?.user)throw new Error('Unable to verify your sign-in. Please try again.');
  return {userId:verified.user.id,redirect:readReturn(storage)};
}
