# UI consolidation status

Implementation completed on `ui-consolidation`, November 12, 2026, and prepared for integration into `main`. This continues the original Claude migration and preserves its existing edits.

## Phase coverage

- **Phase 0 — cleanup:** previous dead-file/CSS removals retained and checked through current consumers/build. The earlier 375px/1280px baseline fingerprint comparison is recorded in the handoff; it was not independently recreated during continuation.
- **Phase 1 — tokens:** tokens and base styles own the shared palette, typography, controls, motion, elevation and layering. Every maintained source stylesheet now uses tokens for literal colors. Width breakpoints use 480/640/900/1024/1440, with complementary 639/1023/901 boundaries. Decorative SVG/WebGL colors remain with their artwork.
- **Phase 2 — building blocks:** shared UI, layout and listing components are integrated. SelectField now has a named export and adjacent stylesheet under `components/ui/`. Its old module and legacy `ui.css` are removed.
- **Phase 3 — consumers:** auth, create/edit forms, browse/saved/home cards, account pages including Cart/Orders/Messages, details, static/contact pages and navbar use the shared components. Home retains its map/sidebar composition; About retains its decorative scene and noninteractive form illustration. Homepage descriptions and live owner controls are preserved. `ShopProductCard` remains a thin adapter consumed by Shop/Saved Items; the unused SaleCard adapter and legacy skeleton exports are removed.
- **Phase 4 — data reuse:** useAsync backs owner lists/settings, listing details, nearby sales, home products and saved-item reads. useOwnedRows shares ownership-scoped queries; fetchProfilesByIds provides deduplicated 100-ID profile batches across Shop/Saved/About/details with explicit strict or best-effort errors. cancelProductPosting centralizes deletion and its single update event. Specialized paginated browse, realtime messages, payment polling, auth and draft effects retain their own lifecycle semantics.
- **Phase 5 — old styling:** superseded styles removed, including PostSale.css after About's illustration styles were scoped locally. Temporary demo route/sheets and public fingerprint/collector scripts removed after verification. Worker logs are local audit output and narrowly ignored.

## Fixes verified during continuation

- Mobile drawer moves focus inside, contains Tab/Shift+Tab, inerts background content, and returns focus on Escape.
- Accepted object-URL previews are released when edit/create forms unmount.
- Listing reads cannot replace a later route with an old response; delayed product actions cannot redirect a departed view.
- Account list components remount when the signed-in user changes. A confirmation cannot cancel an owner action that has unmounted.
- Homepage ownership controls update when accounts change. Descriptions remain visible, and loading skeletons match the responsive preview row.
- Shared dropdown keyboard navigation skips disabled items.
- Existing listing-editor test harness repaired to run its real category validation rather than failing to parse an exported constant.

## Verification result

Final build, lint, all nine Node scripts and independent Sol review passed. Eight browser fixtures passed, including all 16 UI lifecycle checks at both desktop and phone widths and the 35-result map-selection case. The 26-route/width responsive scan passed. No production deployment was performed.

## Repeatable validation

Run `npm run build`, `npm run lint`, and these Node scripts:

```
node tests/auth-session.mjs
node tests/deployment-readiness.mjs
node tests/marketplace-regressions.mjs
node tests/profile-editor.mjs
node tests/social-auth.mjs
node tests/upload-handler.mjs
node tests/listing-editor.mjs
node tests/profiles.mjs
node tests/style-contract.mjs
```

With `npm run dev`, open the browser fixtures under `/tests/`: account-isolation, shop-query, social-login, payments-disabled, listing-account-isolation, favorites-state, ui-consolidation and map-view. Synthetic fixtures avoid real account/database mutations. UI consolidation checks cover async races/retry/unmount, successful and failed seller lookups, delayed message actions, preview release, current-account owner controls, responsive loading rows and departed confirmations.

`/tests/responsive-ui.html` scans 13 public/fallback routes at actual iframe widths 375 and 1280 for overflow, labels, description references and one main landmark. `?route=/shop&width=1280` selects an individual visual preview. This is a focused regression check, not a full WCAG conformance audit.

Independent code review used GPT 6.1 Sol as requested. Both implementer batches used OpenCode's free DeepSeek V4.1 Flash through the worker pool; reported total cost: $0. Existing large JavaScript chunk warnings remain. Live OAuth/provider login, payment execution, database migrations/security suites requiring external setup and production deployment were not performed.
