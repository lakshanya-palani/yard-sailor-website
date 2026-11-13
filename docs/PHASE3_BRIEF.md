# Phase 3 brief — migrating pages to shared components

Read before starting: `docs/COMPONENT_CONVENTIONS.md`, `docs/UI_CONSOLIDATION_PLAN.md`, `src/styles/tokens.css`.

## Available shared pieces (read the source for exact props)
- `src/components/ui/`: Button, IconButton, Badge, Avatar, Price, Spinner, Field, TextInput, TextArea, PriceInput, Checkbox, ChoiceCard, SegmentedControl, FormAlert, CategorySelect, ConditionSelect, StatusMessage, Skeleton/SkeletonCard/SkeletonGrid, DropdownMenu, ConfirmDialog (ConfirmProvider is mounted in App.jsx), Toast (ToastProvider mounted). Shared `src/components/ui/SelectField.jsx` is the dropdown.
- `src/hooks/`: useAsync, useConfirm (`const confirm = useConfirm(); if (await confirm({...}))`), useToast (`useToast().show(msg, {tone})`), useDismissable.
- `src/components/layout/`: PageShell, PageHeader, SectionHeader, CardGrid, FormLayout (FormCard, FormSection, FormGrid, FormActions), AuthCard, AccountLayout (+ `src/lib/accountLinks.js`).
- `src/components/listing/`: DeliveryTags, SaleStatusBadge, SellerChip (more arrive during Phase 3).
- `src/lib/format.js` (formatPrice, formatSaleStart, formatSaleRange, formatDateTime, formatMessageTime, formatDistance), `src/lib/listingOptions.js` (PRODUCT_CATEGORIES, PRODUCT_CONDITIONS, categoryLabel), `src/utils/saleStatus.js` (isSaleOpen).
- The temporary demo route and sheets were retired after browser verification. Repeatable synthetic regression checks live at `/tests/ui-consolidation.html`.

## Rules
1. **Behavior must not change.** Keep every Supabase query, validation, auth flow, redirect, draft/unsaved-changes hook, upload handling, event dispatch (`yardSailor*Updated`), feature flag, aria attribute and data flow. You are changing presentation and removing duplication, not logic. If logic is duplicated, you may move it into a shared helper only if behavior is identical.
2. Replace page-specific markup with shared components; delete the page CSS rules that become unused (grep the whole `src/` first — some page CSS files are imported by other pages). Do not leave dead CSS behind in files you own.
3. Replace `window.confirm` with `useConfirm`, `alert()` with `useToast`, hand-written price formatting with `Price`/`formatPrice`, date strings with `format.js`, avatar-letter logic with `Avatar`/`SellerChip`, ad-hoc loading/empty/error markup with `StatusMessage`/`SkeletonGrid`/`FormAlert`.
4. Visual direction follows the conventions doc (red primary, 10px radius, 46px controls, cream page). It is fine — expected — that pages look more consistent than before. Keep each page's information and layout intent.
5. **Tests depend on some markup.** Before changing a file, `grep -rn` its classnames/ids in `tests/`. Either keep those hooks (class names can be added alongside shared ones via `className`) or update the test file in the same change. Known hooks: `.social-button`, `.image-preview`, `#message-body`, `.show-on-map`, `input[type=file]`, `.yard-sale-map-container`, `.save-heart`, `.save-error button`, `.find-yard-sale-layout`, `.dm-header`, `.dm-compose`, `.cart-item`, `#yard-sale-title`, `#results`. `tests/marketplace-regressions.mjs` slices `src/pages/EditYardSale.jsx` from `  async function handleSubmit` to `\n  if (!form ||` and runs it in a VM — keep that function self-contained with those exact boundaries, or update the test accordingly and make it pass.
6. Only touch the files you were assigned (plus new files you create). Other workers are editing other files concurrently. Don't commit, stash, checkout, reset or start dev servers. Don't edit shared components in `src/components/ui|layout|listing` you didn't create — if one is missing a needed prop, work around it locally and report it.
7. Verify before reporting:
   - `npx eslint <your files>` clean (pre-existing errors in FindYardSale.jsx are known; if you own that file, fix them).
   - `npm run build` succeeds.
   - Node tests that passed before still pass: `node tests/auth-session.mjs && node tests/deployment-readiness.mjs && node tests/marketplace-regressions.mjs && node tests/profile-editor.mjs && node tests/social-auth.mjs && node tests/upload-handler.mjs`.
8. Report: files changed/created, CSS deleted (line counts), behavior you consciously preserved, anything you could not do, and any shared-component gaps.
