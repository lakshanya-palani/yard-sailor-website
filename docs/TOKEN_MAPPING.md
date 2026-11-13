# Token mapping rules (Phase 1)

Tokens live in `src/styles/tokens.css`. When converting a stylesheet, replace literal values with `var(--token)` using these rules. Values not listed stay literal (Phase 3/5 handles them) — list them in your report.

## Colors (case-insensitive; `white` = `#fff` = `#ffffff`)
| Literal(s) | Token |
|---|---|
| #1c2a39, #1b2b3a, #1c2b3a, #111, #111111, #222, #222222 (when used as text/border/background, not inside shadows) | --color-ink |
| #304356 | --color-ink-soft |
| #0d1b2a | --color-ink-deep |
| #ef403a, #e8453c | --color-accent |
| #b52c26, #a32a25, #a32220, #c93631, #9b2828, #943020 | --color-accent-strong |
| #da3530, #9a241f (hover states of red) | --color-accent-strong-hover |
| #fff3df | --color-cream |
| #fff8ec, #fffefa, #fffcf5 | --color-cream-light |
| #f7ebd8, #fbf0dd, #f8e9d2, #f3ece0 | --color-cream-dark |
| #fff, #ffffff, white (backgrounds) | --color-surface |
| #fff, #ffffff, white (text color on dark/red/navy backgrounds) | --color-on-dark |
| #ece7df, #eee9df, #efe9df, #f0eee9 | --color-border-subtle |
| #ded4c5, #ddd6ca, #e5d9c9, #e7dfd3 | --color-border |
| #cbc8c2, #cfcfcf, #d2d4d5, #c7c7c7, #c8c6b8, #c9c9c9 (input/control borders) | --color-control-border |
| #8d989e | --color-control-border-hover |
| #687078, #555e65, #555f65, #596168, #626a70, #636a70, #616970, #697078, #6d747c, #737980, #74797d, #656565, #656b72, #697279 | --color-muted |
| #777, #999, #8a8a8a | --color-subtle |
| #b7e35a | --color-lime |
| #9ac743, #93be3d, #7fa92e | --color-lime-dark |
| #6d8f25, #55751d | --color-lime-ink |
| #545bd8, #4250b7, #6f6df6, #5145b0 | --color-link |

Do NOT tokenize: colors inside `rgb()/rgba()` alpha shadows or overlays (leave them), SVG/three.js colors in JSX, and colors in files you don't own.

## Other
- `"League Spartan", sans-serif` / `'League Spartan', sans-serif` / `League Spartan, sans-serif` → `var(--font-sans)` (in both `font-family:` and the `font:` shorthand).
- border-radius: only exact matches → 6px `--radius-sm`, 10px `--radius-md`, 14px `--radius-lg`, 20px `--radius-xl`, 999px/9999px `--radius-pill`. Leave other radii.
- box-shadow exact matches: `0 5px 18px rgb(0 0 0 / 10%)` → `--shadow-sm`; `0 8px 22px rgb(0 0 0 / 16%)` → `--shadow-md`; `0 12px 28px rgb(28 42 57 / 18%)` → `--shadow-lg`.
- z-index: 1000 → `--z-header` (navbar) or `--z-modal` (popups/overlays); 4000 → `--z-popover`; 10000 → `--z-skip-link`; 100 → `--z-dropdown`. Leave 1–10.
- transitions: `.15s`/`150ms` → `var(--dur-fast)`, `.2s`/`0.2s`/`200ms` → `var(--dur)`, `.35s` → `var(--dur-slow)`.
- `min-height: calc(100vh - 178px)` → `var(--page-min-height)`.
- Do not change media-query breakpoints, layout, spacing, or selectors in Phase 1.
