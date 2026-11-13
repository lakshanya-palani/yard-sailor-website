# UI consolidation plan: shared components

Status: implemented on `ui-consolidation`; see [completion and verification](UI_CONSOLIDATION_STATUS.md). Original plan below is retained as design history. Based on a full read of `src/` (pages, components, every stylesheet) and a walkthrough of the running site at desktop and phone widths, November 2026.

## Why

The site has grown page by page, and each page restyled the same building blocks itself. Visitors see it:

- **The main action button comes in 3 colors.** It is red on Login, Register, Profile, About and Help, navy on the Home finder, Find a Yard Sale and Post Item, and periwinkle on Contact. There are 20+ button styles and border radii of 5, 7, 8, 9, 10, 12, 13, 22 and 23px.
- **Login and Register don't match.** Login has no card and puts icons in its inputs; Register has a white card and no icons. Each uses a different show-password control (an eye icon vs a checkbox). Their social sign-in buttons are blue (`#545bd8`), a color used nowhere else.
- **Contact has its own dark theme.** It uses a dark grey card, light grey labels, 5px corners and a blue Send button.
- **Post and Edit forms for the same listing look different.** Post Item uses sections, a photo grid and character counters. Edit Product is a plain grid with browser-default "Remove photo" buttons.
- **The same thing is styled several ways.** Product and sale data shows up in 8 card designs. Toggle buttons use 3 different "selected" colors (red, navy, lime). Error text comes in 5+ shades of red.

There is also a code cost. There is no design-token layer (no `:root` variables at all). The site uses 175 distinct colors and 24 different screen-width breakpoints. `accessibility.css` patches contrast class by class using `!important`. About 14 components each repeat the same fetch, loading, error and retry code.

## What already exists to build on

- `src/components/ui.css` has `.ui-button`, `.ui-button-secondary`, `.ui-card` and `.ui-select`. Only About and NearbyYardSales use the buttons.
- `src/components/SelectField.jsx` is shared and used by every dropdown (Radix, menu attached below the field).
- `src/lib/commerce.js` has a `money()` currency formatter, but only Cart and Orders use it. Seven other places format prices by hand with `$${Number(p).toFixed(2)}`.
- `src/lib/listingEditor.js` exports `PRODUCT_CATEGORIES`. Shop, PostSale and EditProduct each hardcode their own category list anyway.
- `src/utils/saleTime.js` has `getSaleStatus`.

## Design decisions to make first

These choices block everything else. Each line has a recommendation.

| Decision | Recommendation | Why |
|---|---|---|
| Main action color | Red `#b52c26` for the main action on each page. Navy `#1c2a39` as a "dark" variant for utility actions such as search. | Red is already the brand accent and `#b52c26` passes contrast. `#ef403a` stays as a decorative color only. |
| Control corner radius | 10px for buttons, inputs and selects. Drop the 22px pill buttons on the auth pages. | 10px is already the most common and matches `.ui-select`. |
| Control height | 46px for md, 38px for sm. | Matches `.ui-select` and the Register inputs, and gives touch targets of 44px or more. |
| Selected state for toggles and chips | Navy fill with white text. | One rule for the List/Map toggle, the date filters and delivery options. |
| Red "Yard Sailor" wordmark on Login, Register and Contact | Remove it, because the nav already shows the logo. | The pages look different from the rest of the site and it takes up space above the content. |
| Which homepage survives | `HomePage.jsx` (the live route) | `Shop`'s `home` prop is never used, so `HomeYardSales`, `SectionHeading` and the skeleton branch in `Shop.jsx:16-54,123-152` never render. Delete them before extracting components. |
| Styling approach | Keep plain CSS: one `.css` per component next to it, `ui-` class prefix, values from tokens | No new dependency, and it fits the existing code. Tailwind would mean rewriting everything. |

## Target structure

```
src/
  styles/
    tokens.css        :root color, radius, shadow, spacing, z-index and motion tokens
    base.css          body, font: inherit for controls, the one :focus-visible rule (replaces index.css + accessibility.css)
  components/ui/      shared building blocks, no data fetching
  components/layout/  page frame, headers, grids, account layout
  components/listing/ marketplace-specific composites
  hooks/              useAsync, useDismissable, useConfirm, ...
  lib/format.js       formatPrice, formatSaleTime, formatDistance, ...
```

## Component inventory

### Building blocks (`components/ui/`)

| Component | Replaces | Main props |
|---|---|---|
| `Button` | 20+ classes: `.login-submit`, `.register-submit`, `.profile-save-button`, `.account-button(-secondary/-danger)`, `.publish-sale-button`, `.commerce-primary`, `.contact-send`, `.view-all-button`, `.social-button`, `.privacy-button`, `.cancel-post-button`, `.hero-button`, the About variants, … | `variant="primary\|secondary\|dark\|danger\|ghost"`, `size="sm\|md"`, `icon`, `loading`, `as={Link}` |
| `IconButton` | `.remove-image`, `.password-toggle`, `.gallery-arrow`, the nav cart and menu buttons, the search submit | `label` (required, used as aria-label), `size` |
| `Field` | 6 label styles plus scattered hints, errors and counters (only Contact and Profile connect errors to their inputs for screen readers) | `label`, `hint`, `error`, `required`, `count`/`max`. Sets `aria-describedby` and `aria-invalid` itself. |
| `TextInput` | 9 input styles (Login, Register, Profile, PostSale, Account, Contact, Shop, FindYardSale, Home) | `leadingIcon`, `trailing` (e.g. the password eye), `invalid` |
| `TextArea` | 3 textarea styles with min-heights of 100, 130 and 150px | `showCount`, `maxLength` |
| `PriceInput` | Bare `type=number` fields in PostSale, EditProduct and the Shop filters | Shows a `$` prefix. |
| `Checkbox`, `ChoiceCard` | Bare checkboxes in EditProduct, `.show-password`, and the `.delivery-option` cards in PostSale | `checked`, `title`, `description` |
| `SelectField` (move here) | already shared | Remove the stacked `className="sale-input sale-select"` at `PostSale.jsx:276,299`. |
| `CategorySelect`, `ConditionSelect` | 3 hardcoded copies of each list | `allowAll` adds "All categories" / "Any condition". Both read from `lib/listingEditor.js`. |
| `SegmentedControl` | Date filter chips and the List/Map toggle in FindYardSale | `options`, `value`, `onChange` (uses `aria-pressed`) |
| `Badge` | `.sale-card-status`, `.yard-sale-result-status`, the "Status:" text, 3 copies of the delivery-tag styles | `tone="neutral\|live\|upcoming\|ended\|success\|danger"` |
| `Avatar` | 7 copies of the "photo or first letter" logic, which disagree on the fallback letter | `src`, `name`, `size` |
| `Price` | 7 hand-written `toFixed(2)` calls | `value`. Uses `money()`. |
| `FormAlert` | 10+ error and success banners in 5 shades of red | `tone="error\|success\|info"` (picks `role=alert` or `role=status` to match), `onRetry` |
| `StatusMessage` | 10 empty-state, 6 error-state and about 15 loading-text versions | `kind="loading\|empty\|error"`, `title`, `body`, `action`, `onRetry` |
| `Skeleton`, `SkeletonGrid` | `ProductSkeleton`, `SaleSkeleton` and the "Coming Soon" cards in Products | `card`, `count` |
| `DropdownMenu` + `useDismissable` | 3 hand-built menus in `Navbar.jsx`, each with its own outside-click and Escape handling | `trigger`, `items` |
| `ConfirmDialog` / `useConfirm()` | 3 `window.confirm` calls | `title`, `body`, `confirmLabel`, `tone` |
| `Toast` / `useToast()` | 6+ `alert()` calls | `tone`, `message` |

### Layout (`components/layout/`)

| Component | Replaces |
|---|---|
| `PageShell width="narrow\|default\|wide"` | 9 page-wrapper styles, each repeating `min-height: calc(100vh - 178px)`, its own padding and the cream background |
| `PageHeader title subtitle actions backTo` | 5 page-heading styles and 3 ad-hoc "← Back" links |
| `SectionHeader title linkTo linkLabel count` | 4 versions ("See all →", "Explore the map →", "View All", the results count) |
| `CardGrid columns limit` | 6 grid definitions (4, 5, 4 and 3 columns, plus lists) |
| `AccountLayout` + one shared `ACCOUNT_LINKS` list | The account pages currently use 3 different page frames (Account, Shop and Commerce). The links are duplicated between `Profile.jsx` and `Navbar.jsx`. |
| `FormCard`, `FormSection`, `FormGrid`, `FormActions` | `.post-sale-form`/`.form-section`, `.account-form`, `.profile-form`, `.contact-form` |
| `AuthCard` | `.login-card` and `.register-card`, near-duplicate stylesheets |

### Marketplace pieces (`components/listing/`)

| Component | Replaces |
|---|---|
| `ListingCard variant="grid\|row\|compact"` | 8 card designs: ShopProductCard, the Products cards, SaleCard, NearbyYardSales, FindYardSale results, MyPostings, MyYardSales, Cart/Orders items. It should always be a real `<Link>`; some cards currently fake a link with `role="link"` plus a click handler. |
| `ProductCard`, `SaleCard` | Thin wrappers over `ListingCard` that map the data to props |
| `OwnerActions` | The Edit and Cancel buttons in MyPostings, MyYardSales and ProductDetail |
| `SellerChip` | "Listed by" in ProductDetail, "Hosted by" in SaleDetail, and the seller row on cards |
| `DeliveryTags`, `SaleStatusBadge` | Delivery tags (3 copies) and the sale status display (4 versions) |
| `ImageGallery` | Gallery CSS duplicated between ProductDetail and SaleDetail (only one has arrows) |
| `ImageUploader` | 3 upload patterns: the PostSale/PostYardSale grid, the bare file inputs in the Edit pages, and the Profile avatar |
| `ListingForm` | PostSale/EditProduct and PostYardSale/EditYardSale, so creating and editing a listing look the same |
| `LocationSearch` | The "location input + Search + Use my location" block, built twice (Home, FindYardSale) |

### Hooks and helpers

- `lib/format.js`:
  - `formatPrice` (wraps `money()`)
  - `formatSaleTime` / `formatSaleRange`, replacing 6 date formats, including one exact copy between SaleCard and FindYardSale
  - `formatDistance`, replacing 4 copies of "x.x miles away"
  - `formatDateTime`
- `isSaleOpen(sale, now)`, replacing 4 copies of `["upcoming","live"].includes(getSaleStatus(...))`.
- `useAsync(fn, deps, { refetchOn })`, replacing about 14 copies of fetch/loading/error/retry code. There are currently 3 different guards against stale responses: an active flag, a version ref and a request counter.
- `useOwnedRows(table)`: MyPostings and MyYardSales are near-identical.
- `useProfiles(ids)` for the batched seller lookups in Shop and SavedItems, plus the single-seller versions in the two detail pages.
- `deleteProduct()` in `lib`, replacing 3 copies of the cancel/delete logic.

## Rollout

Each phase merges on its own and keeps the site working.

### Phase 0: cleanup (no visual change)
- Delete dead stylesheets:
  - `src/App.css` (unused Vite boilerplate) and its import in `App.jsx:40`
  - the root `Register.css` (never imported)
- Delete dead CSS rules:
  - `Navbar.css`: 12 unused classes, including the old language picker and top bar
  - `Footer.css`: `.footer-newsletter*`, about 100 lines
  - stray rules in Login, Profile, AccountPages, HomePage and ProductDetail
- Delete the unused `home` branch of `Shop.jsx`.
- Fix the `#ffff` typo at `AnnouncementBar.css:12`.
- Replace the 3 inline `style={{}}` uses with classes.

### Phase 1: tokens
- Add `styles/tokens.css`:
  - Colors: `--color-ink`, `-ink-deep`, `-cream`, `-cream-light`, `-cream-dark`, `-accent`, `-accent-strong`, `-danger`, `-success`, `-muted`, `-border`, `-lime`.
  - Scales: `--radius-sm/md/lg/xl/pill`, `--shadow-sm/md/lg`, `--ring`, `--z-dropdown/header/modal/popover`, `--dur-fast/dur/dur-slow`, plus a 4/8px spacing scale.
- Agree on 5 breakpoints: 480 / 640 / 900 / 1024 / 1440. CSS variables don't work inside `@media` queries, so document the values and use them as literals.
- Merge `index.css` and `accessibility.css` into `styles/base.css`. Keep one `:focus-visible` rule and replace the per-class contrast patches with the token colors.
- Remove the ~67 `League Spartan` declarations; `body` sets the font and controls use `font: inherit`.
- Switch existing CSS to the tokens one file at a time. This is mechanical, and colors should change only where two near-identical values merge.

### Phase 2: building blocks
- Build `Button`, `IconButton`, `Field`, `TextInput`, `TextArea`, `PriceInput`, `Checkbox`, `ChoiceCard`, `Badge`, `Avatar`, `Price`, `FormAlert` and `StatusMessage`.
- Move `SelectField` into `components/ui/` and add `CategorySelect` and `ConditionSelect`.
- Add `lib/format.js`.

### Phase 3: move pages over, highest payoff first
1. **Login and Register:** `AuthCard` + `TextInput` + `Button`. This fixes the most visible mismatch.
2. **Listing forms:** build `ListingForm` + `ImageUploader`, then use them in PostSale, EditProduct, PostYardSale and EditYardSale.
3. **Cards:** build `ListingCard`, `CardGrid`, `SectionHeader` and `Skeleton`, then use them on Shop, Saved, Home and NearbyYardSales.
4. **Account area:** `AccountLayout`, `PageHeader`, `StatusMessage`, `OwnerActions`, `useConfirm`, `useToast`. This covers MyPostings, MyYardSales, Settings, Profile, Orders, Cart and Messages.
5. **Detail pages:** `ImageGallery`, `SellerChip`, `DetailLayout`.
6. **Contact:** rebuild it on `FormCard` + `Field` and drop the dark theme.
7. **Find a Yard Sale and Home:** `LocationSearch`, `SegmentedControl`, `ListingCard variant="row"`.
8. **Navbar:** `DropdownMenu` + `useDismissable`.

### Phase 4: data hooks
- `useAsync`, `useOwnedRows`, `useProfiles` and `deleteProduct`.
- These change no visuals, so they can be done alongside Phase 3 or after it.

### Phase 5: remove the old styles
- Delete page-level CSS that the shared components have replaced.
- Goal: no hex colors outside `tokens.css`, and only the 5 agreed breakpoints.

## Related issues found during the audit

- Product photos load at full size (3024px wide) into small cards. Generating thumbnails at upload time, or using Supabase image transforms, is a performance task separate from this plan.
- No form marks required fields, and only Contact and Profile show errors next to the field they belong to. `Field` solves this once for every form.
- `.header-search` gets conflicting widths from `Navbar.css` and `SearchBar.css`, which use different breakpoints. Resolve this when the navbar moves to the shared components.

## How to check each phase

- Run `npm run build` and `npm run lint`.
- Use the existing browser test pages under `tests/` (e.g. `accessibility-browser.html`, `social-login.html`, `shop-query.html`).
- Do a quick visual pass at 375px and 1280px on every page the phase touched.
- Phases 0 and 1 should show no visible changes. Comparing screenshots before and after is enough to check that.
