# UI/UX Audit — Lydev Cloud

**Method** · RYUX 2.19.5 (Analyze → Critique). Rendered with Playwright/Chromium at 1440×900, 768×1024 and 390×844, light and dark, authenticated and anonymous. Evidence labels: OBSERVED (seen in render/measure), INFERRED (reasoned from code), NOT VERIFIED. Severity: P0–P3.
**Scope** · 22 UI routes + 3 overlays. API routes were not audited (no UI surface).
**Status 2026-10-28** · Fixed and re-verified: F-01, F-03, F-10, F-11, F-12. Still open: F-02, F-04–F-09, F-13, F-14.

## 1. Executive Summary

The product is coherent and unusually consistent for its size: one token set, one card/table/empty-state language, honest empty states (no invented metrics — the Views card says so explicitly), and a working light/dark theme across every screen. Structure and hierarchy hold at 768px everywhere.

The three problems that matter most:

1. **The light theme fails WCAG AA almost everywhere.** `--primary` renders white-on-blue at **4.30:1** and `--muted-foreground` at **4.29:1** — both under 4.5:1. This hits every primary button, every badge, every secondary label on every page in light mode.
2. **The landing page overstates the storage quota by 10×.** It promises "a 50 GB storage quota"; the schema default is 5,368,709,120 B (**5 GiB**), and the dashboard sidebar confirms "5.0 GB". This is a false product claim, not a copy nit.
3. **Long content breaks the mobile layout.** `/dashboard/cdn/[id]` scrolls **170px sideways at 390px** because `PageHeader`'s `<h1>` cannot wrap a filename with underscores. The same header is used by 9 files covering 13 routes.

Secondary but structural: no `<h2>` exists anywhere in the product (every card title is an `h3`), `/login` and `/register` have no `h1` at all, and all seven destructive actions fall back to `window.confirm()`.

## 2. Page Inventory

| # | Route | Surface | Status |
|---|-------|---------|--------|
| 1 | `/` | Marketing home | Inspected 1440/390, both themes |
| 2 | `/docs/api` | API reference | Inspected 1440/390 |
| 3 | `/terms` | Legal | Inspected 1440/390 |
| 4 | `/privacy` | Legal | Inspected 1440/390 |
| 5 | `/login` | Auth | Inspected 1440/390, anonymous |
| 6 | `/register` | Auth | Inspected 1440/390, anonymous |
| 7 | `/d/[fileId]` | Public download | Inspected 1440/390 (unlocked file) |
| 8 | `/r/[slug]` | Short-link redirect | 302 verified; 404 variant verified via curl |
| 9 | 404 (any unmatched) | Not found | Verified via `Host: cloud.lydev.id` |
| 10 | `/dashboard` | Overview | Inspected 1440/768/390 |
| 11 | `/dashboard/activity` | Activity feed | Inspected 1440/768/390 |
| 12 | `/dashboard/cdn` | CDN manager | Inspected 1440/768/390 |
| 13 | `/dashboard/cdn/[id]` | Asset detail | Inspected 1440/390 — **mobile overflow** |
| 14 | `/dashboard/urls` | Short URL manager | Inspected 1440/768/390 |
| 15 | `/dashboard/urls/[id]` | Link analytics | Inspected 1440/390 |
| 16 | `/dashboard/files` | File uploader | Inspected 1440/768/390 |
| 17 | `/dashboard/files/[fileId]` | File detail | Inspected 1440/390 |
| 18 | `/dashboard/settings` | Redirect → profile | 307 verified |
| 19 | `/dashboard/settings/profile` | Settings tab | Inspected 1440/390 |
| 20 | `/dashboard/settings/security` | Settings tab | Inspected 1440/390 |
| 21 | `/dashboard/settings/storage` | Settings tab | Inspected 1440/390 |
| 22 | `/dashboard/settings/api-keys` | Settings tab | Inspected 1440/390 |
| O1 | Share dialog | Overlay (URLs) | Opened, keyboard-tested |
| O2 | Mobile nav drawer | Overlay | Inspected 390 |
| O3 | Delete / revoke confirms | Overlay | Native `window.confirm` (code + behaviour) |

States verified: loading skeletons (`(dashboard)/loading.tsx`), route error (`(dashboard)/error.tsx`), empty states (all 5 list surfaces), disabled pagination, 404, form validation errors.

## 3. Page-by-Page Findings

### `/` — Marketing home
**F-01 · P1 · OBSERVED — False quota claim**
- Evidence: `src/app/(marketing)/page.tsx:126` "Create an account and get a 50 GB storage quota." vs `src/db/schema/users.schema.ts:11` default `5_368_709_120` (5 GiB); the dashboard sidebar renders "8.8 MB / 5.0 GB" for the same account.
- Impact: users are promised 10× the space they get — a support and trust problem, and a hard-gate factual error.
- Fix: derive the number from the quota constant, or write "5 GB".

**F-02 · P3 · OBSERVED — Hero leaves a dead band**
- Evidence: ~200px of empty space between the CTA row and the feature strip at 1440; the hero carries no product visual.
- Impact: weak specificity — the page could belong to any hosting product (the swap test fails).
- Fix: tighten the vertical rhythm, or place one real product screenshot in the band.

### `/dashboard/cdn/[id]` — Asset detail
**F-03 · P1 · OBSERVED — Horizontal overflow at 390px**
- Evidence: `document.scrollWidth - clientWidth = 170`; the `<h1>` measures 544px wide at a 390px viewport (`file_00000000a62c81faac388ec134d73989.png`). Source: `src/components/shared/page-header.tsx` has no `min-w-0`/`break-words`.
- Impact: the whole page scrolls sideways on phones and the title is clipped at the right edge.
- Fix: `min-w-0` on the header column plus `break-words` (or `line-clamp-2`) on the `h1`. One component, 13 routes.

### `/dashboard/activity` — Activity feed
**F-04 · P2 · OBSERVED — Flat feed, inverted hierarchy, duplicated header**
- Evidence: 14 rows, 8 of them identical "CLICK · porto" entries with no grouping, filtering or collapsing. Each row reads type + timestamp *before* the event name. The card header "Recent events / 14 events recorded." repeats the page header.
- Impact: at 20 rows per page the signal is buried, and users scan timestamps before they learn what happened.
- Fix: group by day with sticky headers, lead each row with the event name, drop the inner card header, add type filters.

### `/dashboard/urls` — Short URL manager
**F-05 · P2 · OBSERVED — Key columns unreachable on mobile**
- Evidence: the table is `min-w-[820px]` inside `overflow-x-auto` (`url-list-table.tsx:27-28`). At 390px only "Short link" and Share are visible; Destination, Clicks, Status, Created and all Actions sit off-screen with no scroll cue. The page itself does not overflow (correct).
- Impact: a phone user cannot disable, delete or open analytics for a link without discovering a hidden horizontal scroll.
- Fix: stack rows into labelled blocks below `md`, or pin the short link and expose Actions as a visible menu.

**F-06 · P2 · OBSERVED — Submit-only search**
- Evidence: an input plus a separate "Search" button; the placeholder truncates to "Search by slug, title, or des…" at 390; no result count, no clear affordance.
- Impact: an extra click per query, and the truncated hint hides what is searchable.
- Fix: filter as the user types (debounced), shorten the placeholder, show the result count.

**F-07 · P3 · OBSERVED — Icon-only row actions**
- Evidence: analytics / enable / delete are three unlabeled icons; `aria-label` is present (the accessible name passes) but there is no visible label or tooltip.
- Impact: first-time users must guess, and the destructive icon sits beside a harmless one.
- Fix: add `title` tooltips and a destructive hover state on delete.

### `/dashboard` — Overview
**F-08 · P2 · OBSERVED — The Views card is a permanent dead end**
- Evidence: `dashboard/page.tsx:75-82` renders `—` with "CDN assets are served from the edge, so views are not counted yet." It occupies half of a 2-column row.
- Impact: honest, but it tells the user the dashboard has a hole and offers no next step; it also breaks the 4-card rhythm above it.
- Fix: keep the honesty and add a path ("How to enable view tracking" → docs), or demote it to a footnote under Clicks.

### 404 — Not found
**F-09 · P3 · OBSERVED — Untitled error page**
- Evidence: `<title>Lydev Cloud</title>` — `src/app/not-found.tsx` declares no `metadata`, so the tab and history entry look identical to the home page. The copy itself is correct ("Page not found").
- Impact: weak orientation in browser history and analytics.
- Fix: add `export const metadata = { title: "Page not found" }`.

## 4. Cross-Page Issues

**F-10 · P1 · OBSERVED — Light theme misses AA contrast**
- Evidence (measured in the browser): `--primary` = `217 91% 55%` → white text on it = **4.30:1**; `text-primary` on white = **4.30:1** (the "active" badge, active nav, links); `--muted-foreground` = `215 19% 42%` → **4.29:1**. Dark theme passes comfortably.
- Impact: every primary button, badge and secondary label in light mode is below 4.5:1 (WCAG 1.4.3); low-vision and outdoor users lose the text.
- Fix: light mode only — `--primary: 217 91% 46%` (→ 5.8:1) and `--muted-foreground: 215 25% 38%`. Two token values, product-wide.

**F-11 · P1 · OBSERVED — Share dialog is not modal for keyboard users**
- Evidence: after opening, `document.activeElement` stays on the trigger (`focusInside: false`). Eight Tab presses produced only `OUT:` targets — links and buttons of the table behind. `role="dialog"`, `aria-modal="true"` and a label are correct; Escape closes and returns focus to "Share".
- Impact: keyboard and screen-reader users tab into content they cannot see and never reach the dialog's own controls first.
- Fix: move focus to the first control on open and trap Tab inside (or use `<dialog>` with `showModal()`).

**F-12 · P2 · OBSERVED — No `h2` anywhere; auth pages have no `h1`**
- Evidence: all 13 dashboard routes skip `h1 → h3` (e.g. "Recent activity", "Link details", "Upload"); `/login` and `/register` return zero `h1`, their only title being a card `h3`.
- Impact: screen-reader heading navigation shows a flat, invalid outline, and the auth pages have no page-level heading at all.
- Fix: `CardTitle` → `h2` (it is the section heading inside a page `h1`); on auth pages render the card title as `h1`.

**F-13 · P2 · OBSERVED — `window.confirm()` for every destructive action**
- Evidence: 7 call sites — `cdn-asset-detail.tsx:40`, `cdn-manager.tsx:105,123`, `dl-manager.tsx:31`, `file-detail-panel.tsx:64`, `api-key-manager.tsx:43`, `logout-all-button.tsx:15`, `url-manager.tsx:41`.
- Impact: the browser dialog ignores the theme (a white sheet in dark mode), cannot state the consequence beyond one sentence, blocks the thread, and contradicts the app's own styled dialog.
- Fix: one `ConfirmDialog` built from the existing dialog pattern, taking a title, a consequence and a destructive confirm label.

**F-14 · P3 · OBSERVED — "Disabled" pagination is still a live link**
- Evidence: `activity/page.tsx` and the list tables use `<a href>` + `aria-disabled` + `pointer-events-none opacity-50`. `pointer-events-none` blocks the mouse only; the link stays tabbable and Enter still navigates.
- Impact: keyboard users focus a control that looks disabled and does nothing useful.
- Fix: render a non-interactive `<span aria-disabled>` at either end of the range.

## 5. Recommended Priorities

| Order | Finding | Why first |
|-------|---------|-----------|
| 1 | F-10 contrast tokens | Two values, fixes accessibility on every page |
| 2 | F-01 quota claim | Public false statement about the product |
| 3 | F-03 `PageHeader` wrap | One component, fixes 13 routes on mobile |
| 4 | F-11 dialog focus | Blocks keyboard users from the share flow |
| 5 | F-12 heading structure | One component change (`CardTitle`) |
| 6 | F-13 confirm dialog | Seven flows, one shared component |
| 7 | F-04 activity feed | Already the weakest screen; highest information cost |
| 8 | F-05 / F-06 / F-07 URLs surface | Mobile table + search + actions |
| 9 | F-02, F-08, F-09, F-14 | Small copy/structure fixes |

No P0: no flow is blocked, no data is lost, and every primary task completes.

## 6. Coverage and Limitations

- **Not verified:** hover and pressed states on every control, forced 500s and quota-exceeded/rate-limited states, the password-protected download gate (only the unlocked `/d/[fileId]` was rendered), API-key creation result, bucket rename/delete beyond the visible UI, and screen-reader output on real assistive technology.
- **Assumption:** the "50 GB" copy is wrong rather than the schema being wrong — the sidebar renders 5.0 GB for the same account, so marketing is the outlier.
- **Limitation:** a single evaluator. RYUX notes one evaluator finds roughly 35% of problems; this is not user research, and no analytics or support data was consulted.
- **Not reviewed:** all `/api/*` routes, the Cloudflare Worker (`workers/short-links`), and `global-error.tsx` (standalone document, unreachable without a fatal error).
- **Unchanged:** no application file was modified; only this report was created.
