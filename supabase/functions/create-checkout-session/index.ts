import { paymentHandlers } from '../_shared/stripe-runtime.ts';
Deno.serve(paymentHandlers().create);
