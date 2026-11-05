#!/usr/bin/env node
// Read-only checks. Never print configuration values, response bodies, or exception text.
import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';

const help = `Usage: npm run check:deployment -- [--env-file PATH] [--project-ref REF] [--origin ORIGIN] [--json]
Reads .env then .env.local by default; shell variables take precedence. An explicit
file replaces those defaults. Performs read-only GET and optional OPTIONS requests and prints sanitized JSON.`;
const args=process.argv.slice(2);
if(args.includes('--help')) { console.log(help); process.exit(0); }
let envFile, expectedRef, origin;
for(let i=0;i<args.length;i++) {
  if(args[i]==='--json') continue;
  if((args[i]==='--env-file' || args[i]==='--project-ref' || args[i]==='--origin') && args[i+1] && !args[i+1].startsWith('--')) {
    if(args[i]==='--env-file') envFile=args[++i]; else if(args[i]==='--project-ref') expectedRef=args[++i]; else origin=args[++i];
  } else { console.error('Invalid arguments. Use --help.'); process.exit(2); }
}
const report={projectRef:null,configuration:'unknown',payments:'unknown',profilesPublic:'unknown',profilesEmail:'unknown',functions:{},ready:false};
const finish=()=>{console.log(JSON.stringify(report,null,2));if(!report.ready)process.exitCode=1;};
try {
  if(origin !== undefined) {
    const parsed=new URL(origin);
    if(origin.includes('*') || !['http:','https:'].includes(parsed.protocol) || parsed.origin!==origin) throw new Error('origin');
  }
  let config={};
  for(const file of envFile?[envFile]:['.env','.env.local']) {
    try { config={...config,...parseEnv(await readFile(file,'utf8'))}; }
    catch(error) { if(envFile || error.code!=='ENOENT') throw new Error('configuration'); }
  }
  const rawUrl=process.env.VITE_SUPABASE_URL ?? config.VITE_SUPABASE_URL;
  const key=process.env.VITE_SUPABASE_ANON_KEY ?? config.VITE_SUPABASE_ANON_KEY;
  report.payments=(process.env.VITE_ENABLE_PAYMENTS ?? config.VITE_ENABLE_PAYMENTS)==='true'?'enabled':'disabled';
  const url=new URL(rawUrl);
  const match=/^([a-z0-9-]+)\.supabase\.co$/.exec(url.hostname);
  if(url.protocol!=='https:' || !match || url.username || url.password || url.port || url.pathname!=='/' || url.search || url.hash) throw new Error('configuration');
  report.projectRef=match[1];
  if(expectedRef && (!/^[a-z0-9-]+$/.test(expectedRef) || expectedRef!==report.projectRef)) { report.configuration='project_mismatch'; finish(); process.exit(); }
  let kind;
  if(typeof key==='string' && /^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) kind='publishable';
  else if(typeof key==='string' && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) {
    const claims=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString('utf8'));
    if(claims.role==='anon' && claims.ref===report.projectRef) kind='legacy_anon';
  }
  if(!kind) throw new Error('configuration');
  report.configuration='valid_public_key_shape';
  const headers={apikey:key};
  // Legacy keys may be used as bearer tokens; publishable keys are not JWTs.
  if(kind==='legacy_anon') headers.Authorization=`Bearer ${key}`;
  const get=async path=>{try { const response=await fetch(new URL(path,url),{method:'GET',headers,redirect:'manual',signal:AbortSignal.timeout(10000)}); return response.status; } catch { return null; }};
  const publicStatus=await get('/rest/v1/profiles?select=id,username,avatar_url&limit=0');
  report.profilesPublic=publicStatus===200?'pass':publicStatus===404?'missing':'unknown';
  let privateStatus, privateErrorCode;
  try {
    const response=await fetch(new URL('/rest/v1/profiles?select=email&limit=0',url),{method:'GET',headers,redirect:'manual',signal:AbortSignal.timeout(10000)});
    privateStatus=response.status;
    if(privateStatus===401) {
      try { privateErrorCode=(await response.json())?.code; } catch { /* unknown */ }
    }
  } catch { /* unknown */ }
  report.profilesEmail=privateStatus===403 || (privateStatus===401 && privateErrorCode==='42501')?'denied':privateStatus===200?'privacy_failure':privateStatus===404?'missing':'unknown';
  const names=['secure-image-upload',...(report.payments==='enabled'?['create-checkout-session','manage-checkout','stripe-webhook']:[])];
  for(const name of names) {
    if(name==='secure-image-upload' && origin!==undefined) {
      let response;
      try { response=await fetch(new URL(`/functions/v1/${name}`,url),{method:'OPTIONS',headers:{...headers,Origin:origin,'Access-Control-Request-Method':'POST'},redirect:'manual',signal:AbortSignal.timeout(10000)}); } catch { /* unknown */ }
      const status=response?.status;
      const methods=response?.headers.get('access-control-allow-methods')?.split(',').map(value=>value.trim().toUpperCase()) ?? [];
      report.functions[name]=status===204 && response.headers.get('access-control-allow-origin')===origin && methods.includes('POST')?'preflight_verified':status===401?'auth_unknown':status===404?'missing':status===503?'unavailable':'unknown';
    } else {
      const status=await get(`/functions/v1/${name}`);
      report.functions[name]=status===405?'method_rejected':status===401?'auth_unknown':status===404?'missing':status===503?'unavailable':'unknown';
    }
  }
  report.ready=report.profilesPublic==='pass' && report.profilesEmail==='denied' && Object.values(report.functions).every(value=>value==='method_rejected' || value==='preflight_verified');
} catch { report.configuration='invalid_or_unavailable'; }
finish();
