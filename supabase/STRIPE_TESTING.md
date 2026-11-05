# Stripe Checkout — test-only setup and acceptance

## Current status

Hosted Checkout, server-owned order snapshots, one-of-a-kind reservations,
verified/idempotent webhook handling, cancellation/reconciliation, and `/orders`
are implemented locally. No account credentials were read or used. No real Stripe
test payment or deployed webhook has been exercised yet. Do not enable live mode.

This is a platform-account TEST charge foundation, not a seller payout system.
No Connect integration exists. No real purchase, delivery, or payout is promised.
Use a separate Supabase test project with synthetic users/listings if possible.
A test payment marks `checkout_inventory` sold, removes those test items from carts,
and prevents editing/deleting the reserved/sold listing. It does not rewrite a
product's fields, move real money, or start fulfillment. Do not test real inventory.

## 1. Review and apply migrations

Inspect your Supabase test project's migration history/schema first. Apply missing
migrations in order, once only:

1. `202609070001_product_cart_messages.sql`
2. `202609070002_security_hardening.sql` (see HARDENING.md)
3. `202609070003_stripe_test_checkout.sql`
4. `202609080004_saved_products.sql`
5. `20261105022739_profile_privacy_repair.sql`
6. `20261105022740_checkout_recovery_protocol.sql`

Before the checkout recovery migration and compatible handler deployment, disable
and drain both buyer endpoints as described in Recovery protocol rollout below.
Keep webhook processing available or arrange redelivery.

Use Supabase Dashboard → SQL Editor, or your reviewed migration deployment process.
Do not blindly rerun migrations already applied; inspect migration history first. The checkout recovery migration is intended to run once. Migration 003 creates checkout_orders,
checkout_order_items, checkout_inventory and checkout_webhook_events, plus narrow
RPCs. It does not create another cart or change yard-sale events. Existing order
tables with those names cause the migration to fail/roll back; reconcile them first.
A reserved/sold product cannot be edited/deleted until the test order is resolved.
No blanket test-data deletion/reset command is included.

## 2. Configure credentials privately

Select the intended **Stripe sandbox / Test mode** before obtaining any values.
Keep the API key and webhook destination in the SAME Stripe account/sandbox.

| Supabase Edge Function secret | Obtain/set value |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys → reveal **test** Secret key (`sk_test_…`). Live keys are rejected by code. |
| `STRIPE_WEBHOOK_SECRET` | After creating the exact webhook destination in step 3: Stripe Dashboard → Workbench → Webhooks → that destination → Signing secret (`whsec_…`). This is not the API key. |
| `APP_SITE_URL` | Your approved frontend origin, e.g. `http://localhost:5173` or `https://your-test-site.example`. No path, query, credentials, or fragment. Used for redirects and CORS. `localhost` and `127.0.0.1` are different origins. |
| `STRIPE_TEST_CHECKOUT_ENABLED` | Set to `true` only in the test environment when ready to test. Anything else disables new checkout requests. Existing order cancellation/webhooks remain available. |

Store these through **Supabase Dashboard → your test project → Edge Functions →
Secrets → Add/replace secrets**. This is the recommended secure location; do not
paste secrets into chat, frontend `.env`, source files, screenshots, logs, or Git.
Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to hosted functions.
Never put the service key in a Vite variable.

No `STRIPE_PUBLISHABLE_KEY` or `VITE_STRIPE_*` variable is needed: the frontend
redirects to the hosted URL returned by the authenticated server. No Stripe.js
or Stripe dependency is bundled into React.

Optional CLI alternative: create a private file **outside this repository**, with
permissions 0600, using a local editor. Include only the four names above and their
values. Upload it without placing secret values in your shell command/history:

```sh
supabase secrets set --project-ref YOUR_TEST_PROJECT_REF --env-file /absolute/private/path/yard-sailor-stripe-test.env
```

Do not run `echo` with keys, pass keys as command-line arguments, or commit this
file. Keep it in a secure local location or remove it after storing the values.
The checked-in `stripe.env.example` contains placeholders only.

## 3. Create the endpoint-specific webhook destination

In the same Stripe test/sandbox Dashboard, open Workbench → Webhooks → Add
destination. Choose events on **your account**, not connected accounts.

Endpoint URL:

```
https://YOUR_TEST_PROJECT_REF.supabase.co/functions/v1/stripe-webhook
```

Subscribe to these snapshot events:

- `checkout.session.completed`
- `checkout.session.expired`

Use API version **2025-08-27.basil**, matching pinned Stripe Node SDK 18.5.0.
Reveal this destination's signing secret and store it as STRIPE_WEBHOOK_SECRET.
Live events are rejected even if signed. Only cards are enabled; delayed bank
payment methods, async settlement, subscriptions, refunds and disputes are not
implemented in this test foundation. Do not enable them in the session code
without extending the event/state model and tests.

## 4. Deploy the functions and frontend

Install/authenticate the Supabase CLI privately, then from this repository:

```sh
supabase functions deploy create-checkout-session --project-ref YOUR_TEST_PROJECT_REF
supabase functions deploy manage-checkout --project-ref YOUR_TEST_PROJECT_REF
supabase functions deploy stripe-webhook --project-ref YOUR_TEST_PROJECT_REF
npm run build
```

`supabase/config.toml` keeps JWT verification on buyer endpoints and disables it
ONLY for stripe-webhook, which authenticates with Stripe's signature instead.
Buyer endpoints additionally validate the bearer token with Supabase Auth.getUser.
Verify the gateway accepts your project's signing keys when smoke-testing.
Ensure your frontend hosting routes `/orders` and `/checkout` to the SPA.
Deploy the updated frontend using the existing hosting workflow. The separate
secure-image-upload function/setup from HARDENING.md is still needed for uploads.

## 5. Run an actual test payment

1. Use synthetic listings owned by test seller A; sign in as test buyer B.
   Use exact USD prices of at least $0.50 with at most two decimal places.
2. Choose Buy Now on a product, or select one or more available cart items and
   choose Continue to test checkout. Check Stripe shows the database title/price.
   No prices, seller IDs, quantities other than 1, or totals are accepted from React.
3. In hosted Stripe TEST Checkout, use **4242 4242 4242 4242**, any future expiry,
   and any three-digit CVC. Use synthetic contact information. Never use a real card.
4. Confirm the Stripe test Dashboard shows a succeeded payment AND the endpoint's
   `checkout.session.completed` delivery shows HTTP 200. Confirm the corresponding
   checkout_webhook_events row exists, checkout_orders is paid with the matching
   session/payment identifiers, and checkout_inventory is sold for that order.
   The Orders UI alone is insufficient proof that webhook delivery worked: its
   reconciliation endpoint can also independently verify payment through Stripe.
5. Resend that same event in Workbench. Confirm one order, one payment association,
   unchanged paid_at, one inventory allocation, and no duplicate fulfillment.
6. With another test buyer, attempt to buy the same item during checkout and after
   payment. Both must fail while reserved/sold. Try to edit/delete the listing as
   the seller while reserved; it must fail server-side.
7. Start a fresh checkout, use Stripe's back/cancel link, then choose **Cancel
   checkout** on Orders. This explicitly expires the session through Stripe before
   releasing inventory. Verify expired state and that another buyer can buy it.
   Merely closing the browser does not cancel a Stripe session.
8. Test that accessing an open session after the nominal 45-minute deadline
   requests expiration and reconciles its current Stripe state. Separately test
   unattended natural provider expiration (up to 23 hours after dispatch), its
   signed expired event, and release. Try duplicate clicks, network interruption,
   and simultaneous buyers.
9. Test 3DS with **4000 0025 0000 3155**, and decline with
   **4000 0000 0000 0002**. An unsuccessful payment must not mark inventory sold.
10. In Orders, verify buyers see their full orders; each seller sees only their
    own item lines/subtotal. Another unrelated account must see neither.

Only after these account-backed steps pass can the test checkout/webhook flow be
reported as working. Record test order/event IDs and outcomes, not secrets or card
information, when reporting results.

## Optional local webhook testing with Stripe CLI

Use `stripe login` to authenticate interactively (no key argument). For a locally
running Supabase stack with the same test schema and synthetic fixtures:

```sh
stripe login
stripe listen --events checkout.session.completed,checkout.session.expired --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook
supabase functions serve --env-file /absolute/private/path/yard-sailor-stripe-local.env
```

The listener supplies its own `whsec_…` secret: set it in the private LOCAL env file
as STRIPE_WEBHOOK_SECRET. It differs from the Dashboard destination secret; do not
replace the deployed destination's secret with it. Do not share listener startup
output because it contains the signing secret. Local config keeps the webhook
JWT exception without disabling auth globally. The frontend must target the local
Supabase stack for this test. The CLI's generic `stripe trigger` fixture has no
Yard Sailor order metadata and is intentionally ignored; complete a checkout from
the application to test the full association.

## Security model and recovery

- DB row locks and unique product reservations serialize buyers. All quantities
  equal 1; at most 20 different items per checkout, one pending order per buyer,
  and 10 new orders/hour per buyer. Prices are exact integer USD cents from DB.
- Order/item snapshots are immutable to clients. Only service-role RPCs create,
  bind, settle or release. Raw payment tables deny browser access; the narrow
  participant-filtered Orders RPC excludes payment identifiers and other sellers'
  lines. It returns the most recent 100 relevant orders.
- Stripe create retries use `yard-sailor-test-checkout:<order UUID>` and identical
  parameters. Repeated checkout selections resume the same pending order even if
  the frontend reloads. A changed selection requires resolving that order first.
- Webhooks verify exact raw bytes using the official SDK and a 300-second signature
  tolerance. Both signed event and API-retrieved session must match the order,
  amount, currency, buyer metadata and test mode. Paid state also requires a
  succeeded matching PaymentIntent with the exact amount_received.
- Event ledger insertion, paid state, inventory and cart updates are atomic.
  Different duplicate events cannot fulfill twice; late expiry cannot undo paid.
  Failures return non-2xx for Stripe retry and log only event ID/type.
- A v2 order proven never dispatched may be released under its row lock on cancel
  or after its nominal deadline. Attempted and legacy orders require verified Stripe
  expiry before release. A browser redirect, failed API call, or age alone cannot
  establish that an attempted session is safe to release. Orders → Check payment
  status provides authenticated recovery if webhook delivery is delayed.
- For attempted v2 orders, recovery uses the frozen payload and same key before
  the 22-hour cutoff. The pinned provider expiry is 23 hours after first dispatch.
  At or after the cutoff, unbound orders require operator review and remain held.
  Legacy unbound orders are ambiguous and also require review; their old fixed
  45-minute provider expiry may have made a delayed first request invalid, but
  does not prove no earlier request succeeded. See the operating procedure below.

## Stripe Connect and live-mode prerequisites (not implemented)

No seller account onboarding, transfer, payout, fee collection, refund API or
merchant-of-record arrangement is implemented. Test payments belong to the test
platform account; sellers receive no money. Live keys/events are rejected in code
and DB rows are constrained to livemode=false. Flipping an environment flag alone
cannot enable live payments.

Before a separate live implementation, decide the Stripe Connect account/charge
model (including mixed-seller carts), onboarding/verification, payout schedules,
platform fees, who pays Stripe fees, refunds/transfer reversals, disputes/negative
balances, tax/shipping and merchant-of-record responsibilities with Stripe and
appropriate business/legal advisers. Implement these explicitly, add live/test
isolation, and repeat payment/race/security tests before accepting real funds.

## Local checks completed

- `tests/payments-db.mjs`: 44 checks passed; payment migration with 001/002 in isolated PostgreSQL;
  auth/ownership, prices, idempotency, availability, cancellation, inventory, mixed-
  seller privacy and order transitions. This is not a production concurrency test.
- `tests/stripe-checkout.mjs`: 32 checks passed using both Node and worker SDK builds; actual handler with real official SDK signing checks;
  mocked Stripe API/DB calls. No network payment is performed.
- Recovery database and handler tests exercise the migrated SQL, frozen retries,
  provider state and service-only access. Their ordered interleavings do not prove
  behavior under true concurrent database transactions.
- Existing cart/messaging/hardening suite: 45 checks passed with all three migrations.
- Vite build and Edge Function syntax transform passed. Existing large-bundle warning remains.

Run with test-only dependencies installed outside the app:

```sh
node tests/payments-db.mjs /absolute/path/to/external/node_modules/@electric-sql/pglite/dist/index.js
node tests/checkout-recovery-db.mjs /absolute/path/to/external/node_modules/@electric-sql/pglite/dist/index.js
node tests/checkout-recovery-handler.mjs /absolute/path/to/external/node_modules/@electric-sql/pglite/dist/index.js
node tests/stripe-checkout.mjs /absolute/path/to/external/node_modules/stripe/esm/stripe.esm.node.js
npm run build
```

Files: migration 003; `_shared/{checkout.js,stripe-runtime.ts}`; three new payment
Edge Functions; config.toml; `src/lib/payments.js`; ProductDetail/Cart/Orders;
App routing; an Orders link in the existing account dropdown; Commerce.css;
Privacy's payment paragraph; setup/hardening notes; two focused payment tests.
Homepage, 3D, Shop queries, messaging and footer behavior were not changed.

References: [API keys](https://docs.stripe.com/keys),
[Checkout creation](https://docs.stripe.com/api/checkout/sessions/create),
[webhook verification](https://docs.stripe.com/webhooks?lang=node),
[test cards](https://docs.stripe.com/testing),
[marketplace Connect](https://docs.stripe.com/connect/marketplace).

### Recovery protocol rollout and operations

This additive migration and the compatible create, manage, and webhook handlers must be deployed together. Disable ingress to **both** create-checkout-session and manage-checkout, then drain all old in-flight executions and retries before applying the migration and deploying the new handlers. The create feature flag alone does not disable manage. Keep webhook processing available, or arrange Stripe event redelivery. Restore ingress only after every old mutating handler has drained and the Stripe test account and API version have been verified. A migration by itself does not make old handlers safe.

For rollback, disable and drain both endpoints, stop issuing sessions, and retain the new schema and compatible reconciliation/webhook handlers for existing v2 orders. Do not restore old handlers while v2 orders exist. Do not truncate or force-expire pending orders.

The 45-minute order deadline is nominal: on access, the handler requests expiration and reconciles the current Stripe state. An unattended issued session can remain payable and hold inventory until its pinned provider expiry, up to 23 hours after dispatch. Verified payment is honored even after the nominal deadline. A never-dispatched v2 reservation can be released on cancellation or opportunistically after its nominal deadline; attempted and legacy reservations cannot be released merely due to age.

A `checkout_review_required` response includes the order ID. An operator should inspect the correct Stripe test account's request logs and events for that order and its `yard-sailor-test-checkout:<order ID>` idempotency key, identify any matching session, and verify its payment status through the compatible reconciliation path. No matching dashboard entry or webhook alone proves non-creation. Retain the inventory when evidence is inconclusive; do not use a blind release. Any supervised database repair requires authoritative proof, explicit operational authorization, and a fresh locked check of the unchanged order and its reservations. Legacy unbound orders are held for the same review. Retries stop creating sessions after 22 hours; the immutable 23-hour Stripe expiry also prevents a stale request from creating a session after the idempotency retention period.

Cancellation can start just after a resume response's final state check, so a browser may briefly receive a previously valid URL. Cancellation still expires the provider session and reconciles its authoritative state; the URL does not itself release inventory or guarantee a payment can proceed. If payment wins the race, verified payment is applied.
