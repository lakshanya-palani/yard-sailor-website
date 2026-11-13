# Shared component conventions

Applies to everything under `src/components/ui/`, `src/components/layout/`, `src/components/listing/`, `src/hooks/` and `src/lib/format.js`.

## Files
- One component per file: `Button.jsx` + `Button.css` side by side. The `.jsx` imports its own `.css`.
- Named exports only (`export function Button`), no default exports, no barrel `index.js`. Import by path.
- Plain function components. React 19: `ref` is a normal prop — no `forwardRef`.
- No data fetching inside `ui/` or `layout/` components.

## Styling
- Plain CSS. Class prefix `ui-` for ui/ and layout/ (`ui-btn`, `ui-btn--primary`, `ui-field__label`), `listing-` for listing/. BEM-ish: block, `__element`, `--modifier`. State via `is-*` classes or data/aria attributes.
- Every color, radius, shadow, z-index and duration comes from `src/styles/tokens.css` (`var(--…)`). No hex literals in component CSS.
- Font: inherit (body sets `var(--font-sans)`). Never redeclare the font family.
- Breakpoints, only these: 480, 640, 900, 1024, 1440 (`max-width: …px` or `min-width`).
- Don't add focus outlines — `src/styles/base.css` owns the one `:focus-visible` ring.
- Respect `prefers-reduced-motion` (base.css already zeroes durations globally).

## Design decisions
- Primary action: `--color-accent-strong` (#b52c26) fill, `--color-on-dark` text, hover `--color-accent-strong-hover`. One primary per view.
- Secondary: surface fill, 1px `--color-ink` border, ink text; hover `--color-cream-dark`.
- Dark (utility, e.g. search): `--color-ink` fill, hover `--color-ink-soft`.
- Danger: surface fill, 1px `--color-accent-strong` border and text; hover fill `--color-accent-strong` + on-dark text.
- Ghost/link: no border/fill, ink text, underline on hover.
- Radius `--radius-md` (10px) for buttons, inputs, selects, chips. Cards `--radius-lg`.
- Heights: md `--control-height` (46px), sm `--control-height-sm` (38px). Buttons: font-weight 700, 16px (md) / 15px (sm).
- Inputs: 1px `--color-control-border`, hover `--color-control-border-hover`, focus border `--color-ink` + `box-shadow: var(--ring)`; invalid border `--color-danger`.
- Selected state for toggles/chips/choice cards: `--color-ink` fill, `--color-on-dark` text.
- Muted/help text: `--color-muted`, 14px. Error text: `--color-danger`, 14px.

## Accessibility
- Icon-only buttons require a `label` prop → `aria-label`.
- `Field` wires `htmlFor`/`id` (generate with `useId` when not given), `aria-describedby` (hint + error ids) and `aria-invalid`.
- Status messages: errors `role="alert"`, loading/success `role="status"`.
- Clickable cards are real `<a>`/`<Link>`, never `div onClick`.
- Touch targets ≥ 44px.

## Verification each worker must run
- `npx eslint <your files>` clean.
- `npm run build` succeeds.
