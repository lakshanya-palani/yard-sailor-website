import Stripe from 'npm:stripe@18.5.0';
import { createClient } from 'npm:@supabase/supabase-js@2.110.6';
import { createPaymentHandlers, validateConfiguration } from './checkout.js';
export function paymentHandlers() {
  const env={STRIPE_SECRET_KEY:Deno.env.get('STRIPE_SECRET_KEY'),STRIPE_WEBHOOK_SECRET:Deno.env.get('STRIPE_WEBHOOK_SECRET'),APP_SITE_URL:Deno.env.get('APP_SITE_URL')};
  const siteUrl=validateConfiguration(env);
  const stripe=new Stripe(env.STRIPE_SECRET_KEY!,{apiVersion:'2025-08-27.basil',httpClient:Stripe.createFetchHttpClient(),maxNetworkRetries:2});
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  return createPaymentHandlers({admin,stripe,siteUrl,webhookSecret:env.STRIPE_WEBHOOK_SECRET,cryptoProvider:Stripe.createSubtleCryptoProvider(),enabled:Deno.env.get('STRIPE_TEST_CHECKOUT_ENABLED')==='true'});
}
