# Saved Items setup

The existing `/saved` route and profile dropdown entry are reused. The corrected `migrations/202609080004_saved_products.sql` was applied successfully through the connected Supabase SQL Editor to project `kqceoaqkqsrwgcqaergx`. Do not reapply it there. Live schema inspection confirmed both saved_products and checkout_inventory were absent before application. Only existing products are required now; the availability function checks payment inventory only when that optional table exists. No payment tables were created or changed. This project had no CLI migration-history table, so reconcile/baseline migration history before a future CLI database push.

The new saved_products relationship uses a composite primary key, owner-only RLS and cascading deletion for users/products. The availability RPC reveals only the current user's saved product availability, not order/payment data. Checkout inventory is currently test-only: the page says unavailable for checkout without claiming a real-world sale. Saving never writes inventory, carts, or products.

Shared React context loads saved IDs in paginated batches, reloads on sign-in and window focus, and shares optimistic changes across cards/detail/saved page. Per-item locks prevent rapid duplicate toggles. Errors restore state and show feedback. Cross-device changes appear on refresh or returning focus; realtime updates are not configured.

Signed-out hearts use the existing login redirect to `/products/:id?save=1`. After authentication/profile setup, that page explains how to finish saving with the heart. No automatic anonymous account or implicit save is created.

Shop and Saved Items reuse ShopProductCard, extracted from the existing Shop markup. The homepage retains its own existing richer card layout with the same SaveButton. Real links provide keyboard navigation; heart clicks and key events do not bubble to the card navigation.

Deleted products cascade out of saved lists. Inaccessible joined products render a removable unavailable placeholder. Existing checkout reservations/test-sold items are labeled unavailable; they remain removable.

Verification command (uses an existing temporary test dependency, not a new app dependency):

`node tests/favorites.mjs /tmp/yard-sailor-db-check/node_modules/@electric-sql/pglite/dist/index.js`

Tests use isolated PostgreSQL fixtures and the actual new migration. The migration is deployed. Authenticated browser save, refresh persistence, saved-page display, unsave and refreshed empty state all passed against the connected project. Multi-device testing remains manual. Test save/unsave from homepage, Shop and product detail, refresh `/saved`, and check another account cannot read the first account's list. If the migration is missing, errors are shown rather than claiming a save succeeded.

## Regression fix verification

Root cause: the live REST API returned HTTP 404 / PGRST205, “Could not find the table public.saved_products in the schema cache.” The previous migration also incorrectly required undeployed checkout inventory. The corrected migration preserves owner-only RLS and adds no unrelated tables.

Load errors now distinguish missing setup from a transient failure. A separate “Retry saved items” button refetches; hearts wait for a successful load before toggling. No automatic save is triggered by Retry.

`tests/favorites-state.html` is a Vite development-only browser harness with stubbed Auth/database methods. Nine state checks passed: failed load, successful retry, rapid-click lock, save, restored state, unsave, rollback, and signed-out behavior. No real sessions are signed out by these tests. PostgreSQL fixture checks cover owner-only RLS, duplicate prevention, deletion, persistence and availability with/without optional inventory.
