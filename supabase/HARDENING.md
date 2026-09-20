# Hardening review — September 7, 2026

**Payment follow-up:** Stripe test Checkout is now implemented locally in migration
003 and three Edge Functions. See [STRIPE_TESTING.md](STRIPE_TESTING.md) for secure
configuration and required real test-mode acceptance. The no-Stripe findings below
describe the earlier audit baseline, not the current payment code.

These changes are implemented locally, not deployed. The browser can read existing
listings using its current session; carts/messages display setup-required errors.
Neither the full live schema nor existing production storage policies have been
verified. Do not interpret the local tests as a production security audit.

## Deploy in order

1. Review the existing live tables/policies and migration history. Apply
   `202609070001_product_cart_messages.sql` only if that migration has not already
   been applied. Never recreate an existing messaging implementation blindly.
2. Review and apply `202609070002_security_hardening.sql` once. It is transactional,
   creates new tables/functions/policies, and does not rewrite existing data.
   It expects products with UUID id/user_id, title/description/brand/condition,
   numeric price and text[] image_urls; sales with UUID host_id, title/description,
   address, start_time/end_time, numeric lat/lng, text[] images; profiles with UUID
   id, username, avatar_url, email and updated_at. Reconcile different schemas first.
   Existing permissive owner write policies must exist; the new restrictive
   policies constrain them rather than opening additional access.
3. Deploy `secure-image-upload` with Supabase CLI and the supplied config.
   Set server-side `ALLOWED_ORIGINS` to exact comma-separated site origins
   (include the development origin only for development). Supabase provides
   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the function environment.
   Never copy the service key into VITE variables or client code.
4. Confirm the pinned magick-wasm 0.0.43 package's `dist/x86/magick.wasm` is included
   in the deployed function bundle and cold-start decoding works. The function
   resolves this asset relative to the npm module. The real Deno/Supabase runtime
   was not available locally; request-handler tests use isolated service adapters.
   Keep JWT gateway verification enabled and verify it supports your project's
   signing keys; the handler additionally verifies the user with Auth.getUser.
5. Release the frontend with the function/migration together. New uploads fail
   closed until this setup is complete. There is deliberately no direct-storage
   fallback. Test product, yard-sale and avatar uploads with a test account.
6. Verify the live `validated-images` bucket is public, JPEG-only, max 5 MiB.
   This bucket contains only intended-public listing/avatar images, not messages
   or private documents. Restrictive policies must block authenticated/anonymous
   writes to it AND to legacy `avatars`/`sale-images`, even if older permissive
   policies exist. Service role performs only validated generated-key writes.
   Test another user's object paths and uploaded URL references through the API.
7. Check actual storage/CDN response headers: image/jpeg, nosniff, and HTTPS.
   The function's JSON responses set nosniff/no-store; production storage/CDN
   headers were not verified. Configure hosting security headers separately.
8. Audit old objects for active/malformed formats and metadata; plan quarantine
   or reprocessing with the owner. Existing files/URLs were retained to avoid
   destructive changes. This pass does not make legacy uploads safe retroactively.
   Review every other live bucket, privileged RPC and service using a service key;
   those cannot be enumerated from this repository.

## Upload controls

All three browser upload flows use the existing Supabase client and one endpoint.
Input: nonempty JPEG/PNG/WebP, at most 5 MiB, 4096 pixels per side, 8 megapixels,
no animation/multiple frames. Signature checks choose a fixed decoder, then actual
WASM decoding and JPEG re-encoding strips metadata and trailing payloads. Raster
output is resized to at most 2048 pixels on its longest side (avatars: 512), with
memory/disk/frame-count limits and the hosting runtime's CPU limits. No SVG/HTML,
user-controlled object keys, external image fetching or executable server paths.

Database triggers allow at most 8 listing images or 1 avatar and require new URLs
to belong to that owner and upload category in validated_uploads. Unchanged legacy
references can remain. Upload attempts are limited to 40 per account/hour; new
requests stop once 400 registered uploads are observed. Simultaneous in-flight
requests can slightly exceed that storage threshold. Failed uploads consume the
hourly budget. Owner-managed cleanup is required for orphan images; automatic
retention/deletion was not invented. Message limits: 30/minute per sender and
20 new conversations/hour per buyer. Multi-account abuse still requires provider
abuse controls, account moderation and monitoring.

## Content, access, payments

Repository search found no dangerouslySetInnerHTML, innerHTML or HTML insertion.
Plain text remains React-escaped; Mapbox popup content uses textContent and
setDOMContent. No rich text, reviews, comments or message attachments are present.
New database triggers validate/trim listing and profile fields, enforce ownership,
validate upload references and normalize messages. Profile emails are supplied
from Auth server-side and excluded from public SELECT grants. Profile upserts
submit only public profile fields; updated_at is assigned by the server.
Login return paths reject protocol-relative, backslash and control-character URLs.
Auth debug logging was removed; commerce errors no longer expose raw DB errors.

There is no Stripe SDK, webhook endpoint, order/payment table or payment provider.
Checkout is a review screen only. No signature verification/payment idempotency
can be claimed. Before adding payments, implement atomic inventory reservation,
server-owned prices/orders, and a webhook that uses Stripe's official SDK with
raw request bytes and an environment-only endpoint signing secret. Reject missing
or invalid signatures before processing. Allowlist event types; match session,
payment and order identifiers, amount and currency; verify with Stripe's API when
needed. Use unique event IDs and an atomic guarded paid/fulfilled transition so
retries/out-of-order events cannot fulfill twice or undo a final state. Never
trust checkout redirects. No payment secrets are needed for the current app.

Contact uses FormSubmit. Client length limits and validation are not a server
security boundary. CAPTCHA is no longer explicitly disabled in the request, but
provider-side validation, spam controls and AJAX CAPTCHA behavior need owner
configuration/verification. No contact submissions were sent during testing.
Supabase Auth password policies, CAPTCHA/rate limits, email confirmation, hosting
headers and provider logs also need dashboard review. No frontend service key was
found in the reviewed source; deployed configuration/bundles require owner review.

## Tests actually run

- `node tests/commerce-security.mjs <pglite>/dist/index.js`: 45 checks passed with
  BOTH migrations in an isolated PostgreSQL runtime, including persistence,
  participant privacy, sender forgery, private email denial, profile upsert,
  legacy broad-policy restrictions, upload URL rejection and rate limits.
- `node tests/upload-security.mjs <magick-wasm>/dist/index.js`: passed real WASM
  JPEG/PNG/WebP decode/re-encode, invalid signature, malformed image, trailing
  script stripping, avatar/listing output dimensions, streamed size cap and local redirect checks.
- `node tests/upload-handler.mjs`: passed actual handler with mock service adapters:
  auth denial, origin/category/rate/size rejection, generated keys, JPEG type and
  owner registration. This is not a deployed endpoint/integration test.
- Vite TypeScript transform of the Edge Function: passed syntax check.
- `npm run build`: passed; existing large bundle warning remains.

Test-only PGlite, magick-wasm and axe-core were installed outside the frontend in
`/tmp/yard-sailor-db-check`. The pinned WASM dependency is server-only. No new
frontend production dependencies were added.

## Accessibility verification and limits

Axe-core (WCAG 2 A/AA, 2.1 AA, 2.2 AA tags) ran in Chrome against real local pages
at 1280 and 320 CSS-pixel iframe widths. After focused fixes, no automated
violations were reported in the tested homepage, Shop, About, login, register,
contact, privacy, accessibility, real product owner detail, cart, checkout and
messages states. No horizontal document overflow was detected at these widths.
Axe still returned incomplete/manual-review contrast checks (and some canvas/ARIA
checks); this is not a WCAG compliance finding.

Cart/checkout/messages coverage was their setup-error state, not populated cart,
buyer purchase actions or live message history. A populated two-account test is
required after migration. The real product tested belonged to the signed-in user.
Keyboard checks exercised visible navigation focus, skip link -> main, search and
account Escape -> trigger, map rotate/zoom button activation, demo-sale selection
updating text, and empty contact submit -> first invalid field with linked errors.
No live message, upload, payment or contact submission was made.

Reduced-motion behavior was inspected in CSS/3D code, not comprehensively tested
across devices. Actual 200%/400% browser zoom, screen-reader speech, mobile touch,
3D camera framing, animated text contrast and third-party Mapbox controls still
need manual review. Native alerts remain in some existing posting/editing flows.
Social login/newsletter are unconfigured and shown disabled; password recovery
assistance links to existing support. Full password reset is not implemented.

`tests/accessibility-browser.html` preserves the audit harness. To rerun locally,
copy it to public/ys-audit.html and axe.min.js to public/ys-audit-axe.js; open the
local page and wait for “Audit finished.” Update the product ID for your fixture.
Remove both public test files before building/deploying. They are currently removed.

## Privacy/legal owner review

Confirm the operator's legal name and contact details, jurisdictions, hosting and
email providers, processor agreements/transfers, backup/log retention, deletion
procedures (including images and messages), privacy-rights handling, age policy,
and any providers' cookies/telemetry. No fixed retention period, statutory response
deadline, GDPR/CCPA compliance, WCAG certification or payment processing is claimed.
The policy and statement describe the repository's intended implementation; review
and publish them alongside the deployed controls, not as proof those controls are
live. Public photo metadata removal applies only to the new deployed pipeline.

References: [Supabase image processing](https://supabase.com/docs/guides/functions/examples/image-manipulation),
[function configuration](https://supabase.com/docs/guides/functions/function-configuration),
[WCAG 2.2](https://www.w3.org/TR/WCAG22/).

## Files changed in this hardening pass

- `supabase/migrations/202609070002_security_hardening.sql`,
  `supabase/functions/secure-image-upload/{index.ts,image.js}`, `supabase/config.toml`,
  `supabase/{SETUP,HARDENING}.md`.
- `src/lib/{uploads,redirect,commerce}.js`; `src/pages/{PostSale,PostYardSale,Profile}.jsx`.
- `src/pages/{Accessibility,Privacy,Contact,Login,Register,Messages}.jsx`.
- `src/components/{RouteAccessibility,NeighborhoodExperience,Navbar,SearchBar,Products,ProtectedRoute,Footer}.jsx`,
  `src/components/Footer.css`, `src/{App,main}.jsx`, `src/{index,accessibility}.css`.
- `tests/{commerce-security,upload-security,upload-handler}.mjs` and
  `tests/accessibility-browser.html`.

Existing homepage/3D/cart work visible in the overall git diff predates this pass;
no unrelated homepage redesign was performed here.
