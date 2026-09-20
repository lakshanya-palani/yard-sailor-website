import { supabase } from './supabase';
export class PaymentError extends Error {}
const attempts=new Map();
async function invoke(name,body) {
  const {data,error}=await supabase.functions.invoke(name,{body});
  if(error) {
    let message='Test checkout is unavailable. Please check Orders before retrying.';
    try {const details=await error.context?.json();if(typeof details?.error==='string')message=details.error;}catch { /* Generic feedback for network/gateway errors. */ }
    throw new PaymentError(message);
  }
  return data;
}
export async function startCheckout(productIds,source) {
  const ids=[...productIds].sort();const key=`${source}:${ids.join(',')}`;
  if(!attempts.has(key))attempts.set(key,crypto.randomUUID());
  const result=await invoke('create-checkout-session',{productIds:ids,source,requestId:attempts.get(key)});
  if(['paid','expired'].includes(result?.state))attempts.delete(key);
  return result;
}
export const manageCheckout=(orderId,action)=>invoke('manage-checkout',{orderId,action});
export function checkoutDestination(result,navigate) {
  if(result?.url) {
    const url=new URL(result.url);
    if(url.origin!=='https://checkout.stripe.com')throw new PaymentError('Invalid checkout destination. Please contact support.');
    window.location.assign(url.href);
  } else if(result?.orderId)navigate(`/orders?order=${encodeURIComponent(result.orderId)}`);
  else throw new PaymentError('Checkout could not be opened.');
}
