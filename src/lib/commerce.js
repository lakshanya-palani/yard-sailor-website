import { supabase } from './supabase';

export function commerceError(error) {
  if (['42P01', '42883', 'PGRST202', 'PGRST205'].includes(error?.code)) return 'This feature is not available yet. Please try again after setup is complete.';
  if (error?.code === 'P0001' && error?.message?.startsWith('Please wait before')) return 'Please wait a moment before trying again.';
  if (error?.code === '42501') return 'This action is not available for your account. Please sign in again if needed.';
  return 'Unable to complete this action. Please refresh and try again.';
}
export async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}
export const productLogin = id => `/login?redirect=${encodeURIComponent(`/products/${id}`)}`;
export const startConversation = productId => rpc('open_product_conversation', { p_product_id: productId });
export const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);
