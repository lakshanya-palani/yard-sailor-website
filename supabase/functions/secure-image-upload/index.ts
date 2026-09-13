import { createClient } from 'npm:@supabase/supabase-js@2.110.6';
import * as magick from 'npm:@imagemagick/magick-wasm@0.0.43';
import { boundedBody, configureLimits, reencodeImage } from './image.js';

const wasm = await Deno.readFile(new URL('x86/magick.wasm', import.meta.resolve('npm:@imagemagick/magick-wasm@0.0.43')));
await magick.initializeImageMagick(wasm);
configureLimits(magick);
const url = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession:false, autoRefreshToken:false } });
const origins = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean);
Deno.serve(async req => {
  const origin = req.headers.get('origin') || '';
  const headers = { 'Access-Control-Allow-Origin':origins.includes(origin) ? origin : '', 'Vary':'Origin',
    'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-upload-kind',
    'Access-Control-Allow-Methods':'POST, OPTIONS', 'X-Content-Type-Options':'nosniff', 'Cache-Control':'no-store' };
  const respond = (status:number, error:string) => Response.json({error},{status,headers});
  if (!origins.length) return respond(503,'Image uploads are not configured.');
  if (origin && !origins.includes(origin)) return respond(403,'Origin not allowed.');
  if (req.method === 'OPTIONS') return new Response(null,{status:204,headers});
  if (req.method !== 'POST') return respond(405,'Method not allowed.');
  const token = req.headers.get('authorization')?.replace(/^Bearer /i,'');
  if (!token) return respond(401,'Please sign in.');
  const { data:{user}, error:authError } = await admin.auth.getUser(token);
  if (authError || !user) return respond(401,'Please sign in again.');
  const kind = req.headers.get('x-upload-kind') || '';
  if (!['products','yard-sales','avatars'].includes(kind)) return respond(400,'Invalid image category.');
  const {data:allowed,error:budgetError} = await admin.rpc('consume_image_upload_budget',{p_user_id:user.id});
  if (budgetError) return respond(503,'Image uploads are temporarily unavailable.');
  if (!allowed) return respond(429,'Upload limit reached. Try again later or contact support.');
  let output:Uint8Array;
  try { output = reencodeImage(await boundedBody(req.body),kind,magick); }
  catch { return respond(400,'Use a valid, non-animated JPEG, PNG, or WebP up to 5 MB, 4096 pixels per side, and 8 megapixels.'); }
  const path = `${user.id}/${kind}/${crypto.randomUUID()}.jpg`;
  const {error:uploadError} = await admin.storage.from('validated-images').upload(path,output,{contentType:'image/jpeg',cacheControl:'3600',upsert:false});
  if (uploadError) return respond(503,'Unable to store image. Please try again.');
  const {data:publicData} = admin.storage.from('validated-images').getPublicUrl(path);
  const {error:recordError} = await admin.from('validated_uploads').insert({user_id:user.id,kind,path,url:publicData.publicUrl});
  if (recordError) { await admin.storage.from('validated-images').remove([path]); return respond(503,'Unable to save image. Please try again.'); }
  return Response.json({url:publicData.publicUrl},{headers});
});
