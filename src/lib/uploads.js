import { supabase } from './supabase';
export async function uploadImage(file, kind) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024 || !file.size) throw new Error('Choose a JPEG, PNG, or WebP image no larger than 5 MB.');
  const { data, error } = await supabase.functions.invoke('secure-image-upload', { body:file, headers:{'Content-Type':file.type,'x-upload-kind':kind} });
  if (error || !data?.url) throw new Error('Image upload failed. Check the file limits and try again. If uploads remain unavailable, contact support.');
  return data.url;
}
