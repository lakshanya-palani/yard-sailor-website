# Responsiveness pass

## Changes

- SavedProvider retains shared IDs across routes. Focus refreshes are limited to a 30-second freshness interval and concurrent fetches share one request. Background refresh keeps existing hearts available. Explicit retry remains available after failures.
- Hearts no longer disable during a write. Every click changes the desired state immediately; one serialized worker per product coalesces intervening intents and persists the latest state. Failures restore the last server-confirmed state and report an accessible error. Account changes invalidate old workers. No catalog refetch is triggered.
- Route-level lazy imports keep Three.js, Mapbox and secondary account pages out of Shop/auth's initial dependency graph. Navbar/footer remain outside Suspense.
- Homepage canvas uses no render loop off-screen or while the document is hidden, returning to normal rendering on entry. Scroll layout reads are scheduled at most once per animation frame. About already uses demand rendering and pauses off-screen; that implementation was retained.
- Cart actions finish when the server mutation finishes; the count refresh runs in the background. Confirmed removal filters the existing cart instead of fetching the entire checkout review again. Duplicate same-user Auth notifications no longer trigger additional cart-count queries. Payments/reservations still wait for server verification.
- Homepage and Shop request only columns consumed by their existing cards/search rather than every product column. Existing image dimensions and styling stay unchanged.

## Measurements

Controlled browser harness `/tests/favorites-latency.html`, isolated Supabase transport delayed 150 ms per write, one local run before and after:

| Metric | Before | After |
|---|---:|---:|
| First visible heart change | 76.0 ms | 65.2 ms |
| Final background completion | 227.1 ms | 304.3 ms |
| Requests after save then unsave 20 ms later | 1 | 2 |
| Final saved value (desired false) | true, incorrect | false, correct |

These are harness timings, not live Supabase latency benchmarks. The extra request is required to undo a save already in flight. Both visual changes happen before network completion; the important correction is honoring the second click. Repeated identical pending intent does not create extra writes (separate regression test).

Production build, uncompressed eager JavaScript: previous entry 3,417.05 KB; new entry plus its three module-preloaded chunks approximately 474.82 KB. Gzip falls from 938.45 KB to approximately 139.16 KB for this base graph. Heavy routes download their additional chunks when visited; this does not imply the homepage's full 3D/map payload became small. Build times are not treated as browser load times.

## Reviewed limitations

Shop search is local and sellers are batched already, so typing creates no search request. The catalog still loads all products; server-side search/pagination is deferred to avoid changing search coverage or ordering. Saved-page metadata is fetched on visits; the shared ID cache persists.

Product details already fetch seller/session in parallel after resolving the product. Messages already bound history and use realtime plus fallback polling; no delivery/read-receipt behavior was changed. Profile writes and secure upload decode/re-encode remain server-confirmed. Upload outputs are capped at 512px for avatars and 2048px for products; separate card thumbnail variants do not currently exist, so no nonexistent thumbnail URLs were substituted. No new upload format/pipeline or database index is introduced.

The map, authentication verification, and checkout security boundaries remain unchanged. Mapbox/Three chunks still exceed Vite's warning threshold. No live network speed, 3D FPS, or checkout timing improvement is claimed. Existing RLS and the applied favorites migration are unchanged.

## Verification

- Nine isolated browser state checks: retry, rapid intent coalescing, persistence, unsave, rollback and signed-out behavior.
- Controlled two-click harness verifies final visual and stored state agree.
- Twelve PostgreSQL favorites checks: ownership/RLS, duplicate prevention, persistence, deleted products and optional inventory.
- Production build and live Shop route smoke check.
