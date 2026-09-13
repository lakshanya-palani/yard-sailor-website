# Product carts and direct messages

## Before applying

The repo previously had no Supabase schema/migrations or payment backend. The
configured local API key was rejected during the read-only schema check, so the
live schema could not be verified. Confirm VITE_SUPABASE_URL and its matching
publishable/anon key in `.env`, then restart Vite. Never use a service-role key
in any VITE variable.

Inspect the live database first for carts, cart_items, conversations,
conversation_participants, and messages. The migration intentionally aborts
atomically if any already exist. Reconcile an existing implementation rather
than renaming tables or applying a duplicate schema.

Confirm the existing product schema has UUID `id` and `user_id`, `title`, numeric
`price`, and text-array `image_urls`. Profiles use UUID `id`, `username`, and
`avatar_url`. No event rows in `public.sales` are used or changed.

## Apply

Apply `migrations/202609070001_product_cart_messages.sql` once using the Supabase
SQL editor or your migration runner. It is a transaction: a conflict/error rolls
back the entire change. It creates three tables, scoped RPCs, grants, RLS, and
indexes. No existing records are updated/deleted. Future product deletion removes
that product from carts and clears the conversation's product link; messages
remain available to its original participants.

The migration adds the tables to `supabase_realtime` if that publication exists.
If it does not, enable Postgres Changes for cart_items, conversations, and messages
in Supabase. RLS filters delivery to authorized users. Messages also refresh every
15 seconds while the page is visible, and on focus/reconnection.

## Verification

`tests/commerce-security.mjs` runs the actual migration and allow/deny checks in a
fresh isolated PostgreSQL database using PGlite. This test-only tool is installed
outside the app, not shipped as a dependency. Run with:

```
node tests/commerce-security.mjs /tmp/yard-sailor-db-check/node_modules/@electric-sql/pglite/dist/index.js
npm run build
```

It creates minimal fixture versions of auth.users/products/profiles, verifies RLS,
RPC ownership checks, duplicate prevention, sender forgery rejection, read status,
message ordering, deleted-listing handling, and persistence after closing/reopening
the database. The expanded hardening suite now applies both migrations; see HARDENING.md for current results.
It does not validate your existing schema, production grants on products/profiles,
Supabase Auth, or the hosted Realtime configuration.

After applying, use two test accounts and an unrelated third account:

- Signed out: click a product's Add to Cart/Buy Now/Message Seller, log in, and
  confirm return to that product. Protected `/cart`, `/checkout`, and `/messages`
  should also preserve their return destination.
- Buyer: add another user's product twice, verify a single cart row/count, reload,
  remove it, and check the navbar count. Owner actions remain edit/cancel only.
- Buy Now: confirm `/checkout?product=...` reviews only that item without altering
  the cart. Cart checkout reviews the current cart using database prices.
- Buyer: click Message Seller twice; verify the same conversation opens.
- Seller: open Direct Messages, reply, and verify the buyer receives updates.
  Verify unread indicators clear only when the conversation is visibly opened.
- Third account: changing the conversation ID must not expose history or allow
  inserts. Verify no access to another user's cart via direct API requests.
- Try network interruption/reconnection, empty and long messages, deleted listings,
  and multiple browser tabs. Messages are immutable, limited to 4,000 characters;
  history loads newest 100 first with a Load earlier messages control.

## Stripe test checkout follow-up

Hosted test Checkout, order records, reservations and verified webhooks are now
implemented locally. Follow [STRIPE_TESTING.md](STRIPE_TESTING.md) for migration 003,
server-only secrets, deployment and actual Stripe test-mode acceptance. No live
payments or seller payouts are enabled. Do not apply migrations twice.

Read receipts are not shown; per-participant read watermarks support unread counts.
Attachments, user blocking/reporting, message moderation, and push
notifications are not included in this initial text-messaging implementation.

## Security hardening

Before releasing the updated upload frontend, follow [HARDENING.md](HARDENING.md)
for migration 002, Edge Function deployment, upload limits, and verification gaps.
