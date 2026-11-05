import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const dir=await mkdtemp(join(tmpdir(),'readiness-test-'));
try {
  const config=join(dir,'env');
  const log=join(dir,'requests');
  const preload=join(dir,'fetch.mjs');
  await writeFile(config,'VITE_SUPABASE_URL=https://example.supabase.co\nVITE_SUPABASE_ANON_KEY=sb_publishable_privateTestValue\nVITE_ENABLE_PAYMENTS=true\n');
  await writeFile(preload,`
import { appendFileSync } from 'node:fs';
globalThis.fetch=async (url, options) => {
  appendFileSync(process.env.TEST_LOG, options.method+' '+url.pathname+'\\n');
  if(process.env.TEST_THROW) throw new Error('privateTestValue');
  if(url.pathname==='/rest/v1/profiles') {
    if(!url.search.includes('select=email')) return new Response(null,{status:200});
    return new Response(process.env.TEST_PRIVATE_BODY || null,{status:Number(process.env.TEST_PRIVATE_STATUS || 403)});
  }
  if(options.method==='OPTIONS') {
    const status=Number(process.env.TEST_STATUS || 204);
    return new Response(null,{status,headers:{'access-control-allow-origin':process.env.TEST_ALLOW || 'http://localhost:5174','access-control-allow-methods':process.env.TEST_METHODS || 'POST, OPTIONS'}});
  }
  return new Response(null,{status:405});
};`);
  const baseEnv={...process.env,TEST_LOG:log};
  delete baseEnv.VITE_SUPABASE_URL; delete baseEnv.VITE_SUPABASE_ANON_KEY; delete baseEnv.VITE_ENABLE_PAYMENTS;
  async function run(args=[],env={}) {
    await writeFile(log,'');
    const result=spawnSync(process.execPath,['--import',preload,'scripts/check-deployment.mjs','--env-file',config,...args],{encoding:'utf8',env:{...baseEnv,...env}});
    assert.doesNotMatch(result.stdout+result.stderr,/privateTestValue/);
    return {result,report:JSON.parse(result.stdout),requests:await readFile(log,'utf8')};
  }
  let out=await run([],{VITE_ENABLE_PAYMENTS:'false'});
  assert.equal(out.report.payments,'disabled'); assert.equal(out.report.ready,true);
  assert.doesNotMatch(out.requests,/checkout|stripe/);
  out=await run([],{VITE_ENABLE_PAYMENTS:'TRUE'}); assert.equal(out.report.payments,'disabled');
  out=await run();
  assert.equal(out.report.payments,'enabled'); assert.equal(out.report.ready,true);
  assert.match(out.requests,/create-checkout-session/); assert.match(out.requests,/manage-checkout/); assert.match(out.requests,/stripe-webhook/);
  out=await run(['--origin','http://localhost:5174'],{VITE_ENABLE_PAYMENTS:'false'});
  assert.equal(out.report.functions['secure-image-upload'],'preflight_verified'); assert.equal(out.report.ready,true);
  assert.match(out.requests,/OPTIONS \/functions\/v1\/secure-image-upload/);
  out=await run([],{VITE_ENABLE_PAYMENTS:'false',TEST_PRIVATE_STATUS:'401',TEST_PRIVATE_BODY:'{"code":"42501"}'});
  assert.equal(out.report.profilesEmail,'denied'); assert.equal(out.report.ready,true);
  for(const body of ['', '{"code":"PGRST301"}', 'not json']) {
    out=await run([],{TEST_PRIVATE_STATUS:'401',TEST_PRIVATE_BODY:body});
    assert.equal(out.report.profilesEmail,'unknown'); assert.equal(out.report.ready,false);
  }
  for(const [env,expected] of [[{TEST_STATUS:'401'},'auth_unknown'],[{TEST_STATUS:'404'},'missing'],[{TEST_STATUS:'503'},'unavailable'],[{TEST_ALLOW:'http://localhost:5173'},'unknown'],[{TEST_METHODS:'OPTIONS'},'unknown']]) {
    out=await run(['--origin','http://localhost:5174'],env);
    assert.equal(out.report.functions['secure-image-upload'],expected); assert.equal(out.report.ready,false);
  }
  for(const invalid of ['http://localhost:5174/','https://example.com/path','https://example.com?x=1','https://user@example.com','https://*.example.com','null']) {
    out=await run(['--origin',invalid]); assert.equal(out.report.ready,false); assert.equal(out.requests,'');
  }
  out=await run(['--project-ref','wrong']); assert.equal(out.report.configuration,'project_mismatch'); assert.equal(out.requests,'');
  out=await run([],{VITE_SUPABASE_URL:'https://example.supabase.co.evil'}); assert.equal(out.report.ready,false); assert.equal(out.requests,'');
  out=await run([],{TEST_THROW:'1'}); assert.equal(out.report.ready,false);
  await writeFile(config,'VITE_SUPABASE_URL=https://example.supabase.co\nVITE_SUPABASE_ANON_KEY=sb_publishable_privateTestValue\n');
  out=await run(); assert.equal(out.report.payments,'disabled'); assert.doesNotMatch(out.requests,/checkout|stripe/);
  console.log('PASS readiness payment gating, preflight, target validation, and redaction');
} finally { await rm(dir,{recursive:true,force:true}); }
