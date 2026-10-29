# AGENTS.md - Architecture & Engineering Guidelines

> Single source of truth for the Lydev Cloud platform. Read this before writing code. Update it in
> the same change whenever a route, table, env var, or contract changes.

---

## 0. Governance, Taste, and Agent Workflow

### 0.1 Precedence

1. A direct instruction from the project owner in the current task.
2. This document.
3. `README.md`.
4. Framework defaults.

If an instruction conflicts with this document, follow the instruction and update this document so
they never disagree again.

### 0.2 Taste (learned preferences)

Learned preferences live in `.commandcode/taste/` and are managed by the taste system.

- Read the taste files at the start of every session.
- Never hand-edit files under `.commandcode/taste/`; use the `taste` tool.
- The directory is currently empty, so the hard preferences below apply until entries exist.

Hard project preferences:

- No emojis anywhere.
- Strict TypeScript, no `any`.
- One responsibility per file; 200-line target, 300-line hard cap.
- UI renders, services orchestrate, repositories query. No layer skipping.
- Obsidian/navy dark theme; `lucide-react` icons only.

### 0.3 Workflow

1. Read this document and the taste files.
2. Find the feature in the traceability matrix (Section 21) and its phase in Section 23.
3. Do not start a phase before its dependencies are complete.
4. Read the existing implementation before changing it.
5. Implement in the correct layer.
6. Run typecheck, lint, and the relevant tests.
7. Update this document if routes, schema, env vars, or contracts changed.

### 0.4 Definition of Done

- [ ] Acceptance criteria implemented.
- [ ] No file exceeds 300 lines; 200-line target respected where practical.
- [ ] No `any`, no emoji, no dead code.
- [ ] Input validated at the API boundary.
- [ ] Loading, empty, error, and success states implemented.
- [ ] Auth and ownership checks on every mutating endpoint.
- [ ] Typecheck, lint, and tests pass.
- [ ] This document reflects any new route, table, env var, or contract.

---

## 1. System Overview

**Project:** Lydev Cloud (`cloud.lydev.id`)
**Purpose:** An all-in-one utility platform for CDN asset hosting, custom URL shortening, and file
sharing under the `lydev.id` ecosystem.

### 1.1 Product scope (MVP)

| Capability | In MVP | Notes |
| --- | --- | --- |
| Email/username + password auth | Yes | Argon2id, JWT cookie |
| CDN asset hosting (images/videos/raw) | Yes | Public, immutable cache |
| Custom short URLs with aliases | Yes | Redis-backed, click analytics |
| File sharing with expiring links | Yes | Private objects, presigned downloads |
| Per-user storage quota (50 GiB) | Yes | Enforced before upload |
| API keys for programmatic access | Yes | Shown once, hashed at rest |
| Teams, sharing, billing | No | Deferred |
| Password reset, email verification | No | Needs an email provider |
| Image transforms, virus scanning | No | Deferred |

Deferred features must not receive half-built pages or endpoints. Add them here first.

### 1.2 Architecture style

- Modular monolith: one Next.js application, strict internal layering.
- Server-first rendering; client components only where interaction requires them.
- Four hostnames, one deployment: the host decides the user journey.
- PostgreSQL is the source of truth; Redis is an accelerator and counter buffer.
- Tencent COS stores bytes; the application never proxies large uploads or downloads.

### 1.3 Subdomain map

| Host | Entry point | Responsibility |
| --- | --- | --- |
| `cloud.lydev.id` | Next.js app | Dashboard, auth, API |
| `cdn.lydev.id` | Cloudflare -> COS | Public static assets, cache-heavy |
| `uri.lydev.id` | Caddy -> Next.js `/r/[slug]` | Short-link redirects |
| `dl.lydev.id` | Caddy -> Next.js `/d/[fileId]/[[...slug]]` | Download landing page |

---

## 2. Layer Architecture

```
Browser
  |
  v
Cloudflare (TLS, WAF, cache)
  |
  +--> cdn.lydev.id -----> Tencent COS (static reads, no VPS hop)
  |
  +--> cloud / uri / dl --> Caddy -> Next.js (127.0.0.1:3000)
                                |
                                +-- app/          routing, RSC, route handlers
                                +-- components/   rendering only
                                +-- hooks/        client data + upload state
                                +-- services/     business rules, orchestration
                                +-- repositories/ SQL only
                                +-- db/           postgres.js + Drizzle
                                |
                                +--> PostgreSQL (truth)
                                +--> Redis (cache, counters, rate limits)
                                +--> Tencent COS (objects, presigned URLs)
```

### 2.1 Dependency rule

```
app -> components -> hooks -> lib
app -> services -> repositories -> db
services -> lib, cos-client, redis
repositories -> db only
components -> never import services or repositories
```

- Only route handlers, Server Components, and server actions call services.
- Only services call repositories.
- Repositories never contain business rules.
- `lib/` must stay free of database and React imports.
- Add `import "server-only"` to every service, repository, and database module.

### 2.2 Responsibility per layer

| Layer | Owns | Must not own |
| --- | --- | --- |
| `app/` | Routing, session gate, composition | Business rules, SQL |
| `components/` | Markup, local UI state | Fetching, validation rules |
| `hooks/` | Query/mutation state, upload progress | Business rules |
| `services/` | Validation, authorization, orchestration | JSX, SQL strings |
| `repositories/` | Queries, transactions | HTTP, UX decisions |
| `lib/` | Pure helpers, constants, errors | I/O side effects |

---

## 3. Tech Stack (fixed)

| Area | Decision |
| --- | --- |
| Framework | Next.js 16 App Router, React 19, TypeScript |
| Runtime | Node.js 20 LTS |
| Package manager | pnpm (lockfile committed) |
| Styling | Tailwind CSS 4 + shadcn-style primitives |
| Icons | `lucide-react` |
| Database | PostgreSQL 16 |
| ORM | Drizzle ORM + `postgres` (postgres.js) |
| Migrations | `drizzle-kit`, committed under `src/db/migrations/` |
| Cache / limits | Redis 7 via `ioredis` |
| Object storage | Cloudflare R2 via `@aws-sdk/client-s3` + `s3-request-presigner`; Tencent COS fallback |
| Auth | Argon2id + JWT (`jose`) in an HTTP-only cookie |
| Validation | Zod, shared between client and server |
| API keys | `lydev_` prefix, SHA-256 at rest |
| File inspection | `file-type` (magic bytes) |
| IDs | `nanoid` with custom alphabets |
| Client data | TanStack Query v5 |
| Toasts | `sonner`, text only |
| Charts | `recharts` |
| Logging | `pino` |
| Unit tests | Vitest + Testing Library |
| E2E | Playwright |

Do not swap a decision without updating this table and the directory structure.

---

## 4. Environment Variables

Validated at boot by `src/lib/env.ts` (Zod). The app must fail fast on a missing or malformed value.
Never read `process.env` outside that module.

| Variable | Scope | Required | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | server | yes | development / production / test |
| `APP_URL` | server | yes | `https://cloud.lydev.id` |
| `NEXT_PUBLIC_CDN_URL` | client | yes | `https://cdn.lydev.id` |
| `NEXT_PUBLIC_SHORT_URL` | client | yes | `https://uri.lydev.id` |
| `NEXT_PUBLIC_DL_URL` | client | yes | `https://dl.lydev.id` |
| `DATABASE_URL` | server | yes | PostgreSQL connection string |
| `REDIS_URL` | server | prod | Required in production. Optional in development with an in-memory fallback. |
| `JWT_SECRET` | server | yes | 32+ random bytes |
| `JWT_ISSUER` | server | yes | `cloud.lydev.id` |
| `SESSION_TTL_DAYS` | server | yes | default 7 |
| `R2_ACCOUNT_ID` | server | yes | Cloudflare account id |
| `R2_ENDPOINT` | server | no | defaults to `https://<account>.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` | server | yes | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | server | yes | R2 secret, never exposed to the client |
| `R2_SESSION_TOKEN` | server | no | only for temporary credentials |
| `R2_CDN_ACCESS_KEY_ID` | server | no | optional per-bucket credential override |
| `R2_FILES_ACCESS_KEY_ID` | server | no | optional per-bucket credential override |
| `R2_CDN_BUCKET` | server | yes | `lydev-cdn` |
| `R2_FILES_BUCKET` | server | yes | `lydev-files` |
| `R2_CDN_DOMAIN` | server | yes | `cdn.lydev.id` |
| `COS_*` | server | fallback | only when R2 is not configured |
| `CLOUDFLARE_API_TOKEN` | server | no | needs Zone Cache Purge for delete invalidation + Workers KV write for edge redirects |
| `CLOUDFLARE_ZONE_ID` | server | no | `lydev.id` zone id |
| `CLOUDFLARE_ACCOUNT_ID` | server | no | account the Workers KV namespace lives in |
| `CLOUDFLARE_KV_NAMESPACE_ID` | server | no | KV namespace backing the edge short-link Worker |
| `CLOUDFLARE_CDN_HOST` | server | no | `cdn.lydev.id` |
| `EDGE_EVENT_SECRET` | server | no | Shared secret for edge view beacons; unset disables them |
| `STORAGE_QUOTA_BYTES` | server | no | default 5368709120 (5 GiB free tier) |
| `MAX_IMAGE_BYTES` | server | no | default 20971520 (20 MiB) |
| `MAX_VIDEO_BYTES` | server | no | default 524288000 (500 MiB) |
| `MAX_RAW_BYTES` | server | no | default 104857600 (100 MiB) |
| `MAX_DL_BYTES` | server | no | default 2147483648 (2 GiB) |
| `UPLOAD_URL_TTL_SECONDS` | server | no | default 900 |
| `DOWNLOAD_URL_TTL_SECONDS` | server | no | default 300 |

`.env.example` lists every variable with a safe placeholder and no real secret.

### 4.1 Local development

- PostgreSQL runs as a project-local cluster in `.pgdata` on port 55432, so the system service on 5432 is untouched. Start it with
  `pg_ctl -D .pgdata -o "-p 55432" -l .pgdata/postgres.log start`.
- Redis is optional locally. When `REDIS_URL` is empty, `lib/redis.ts` uses an in-memory store; production requires Redis.
- Seed the debug account with `pnpm db:seed:dev`: username `lydev`, password `123456`, email `lydev@lydev.id`.
  The seed refuses any non-local database. This weak password is development-only.
- R2 is the default object store locally. Create an R2 API token with Object Read & Write for
  `lydev-cdn` and `lydev-files`, then set `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` in
  `.env.local`. The buckets, custom domain, CORS, and cache rule are already provisioned.
- Run `pnpm dev` (forces `NODE_ENV=development`) and open `http://localhost:3000`.
- Public link builders adapt to localhost: short links use `/r/{slug}` and download links use
  `/d/{fileId}`. Production keeps `uri.lydev.id/{slug}` and `dl.lydev.id/{fileId}`.
- Legacy local links `/{slug}` and `/{fileId}/{filename}` are rewritten by the proxy so old copies
  keep working during development.
- Verify `GET /api/health` reports `postgres: true` and `redis: true`.

---

## 5. Directory Structure

```text
cloud-lydev/
├── AGENTS.md
├── README.md
├── .env.example
├── Caddyfile
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── next.config.ts
├── drizzle.config.ts
├── eslint.config.mjs
├── vitest.config.ts
├── playwright.config.ts
├── src/
│   ├── app/
│   │   ├── (marketing)/
│   │   │   ├── layout.tsx                  # Public header + footer
│   │   │   ├── page.tsx                    # Landing; redirects signed-in users
│   │   │   ├── terms/page.tsx              # Terms of service
│   │   │   ├── privacy/page.tsx            # Privacy policy
│   │   │   └── docs/api/page.tsx           # Public API documentation
│   │   ├── (auth)/
│   │   │   ├── layout.tsx                  # Centered auth shell
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                  # Sidebar + topbar, session guard
│   │   │   ├── loading.tsx                 # Dashboard skeleton
│   │   │   ├── error.tsx                   # Dashboard recovery boundary
│   │   │   └── dashboard/
│   │   │       ├── page.tsx                # Overview
│   │   │       ├── activity/page.tsx       # Full activity log
│   │   │       ├── cdn/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [id]/page.tsx
│   │   │       ├── urls/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [id]/page.tsx
│   │   │       ├── files/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [fileId]/page.tsx
│   │   │       └── settings/
│   │   │           ├── layout.tsx
│   │   │           ├── page.tsx            # Redirect to profile
│   │   │           ├── profile/page.tsx
│   │   │           ├── security/page.tsx
│   │   │           ├── storage/page.tsx    # Quota breakdown
│   │   │           └── api-keys/page.tsx
│   │   ├── (public-dl)/
│   │   │   ├── loading.tsx
│   │   │   ├── error.tsx
│   │   │   ├── not-found.tsx
│   │   │   └── d/[fileId]/[[...slug]]/page.tsx
│   │   ├── r/[slug]/route.ts               # uri redirect, Node runtime
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── register/route.ts
│   │   │   │   ├── login/route.ts
│   │   │   │   ├── logout/route.ts
│   │   │   │   └── me/route.ts
│   │   │   ├── account/
│   │   │   │   ├── profile/route.ts
│   │   │   │   ├── password/route.ts
│   │   │   │   ├── logout-all/route.ts
│   │   │   │   └── api-keys/
│   │   │   │       ├── route.ts
│   │   │   │       └── [id]/route.ts
│   │   │   ├── cdn/
│   │   │   │   ├── route.ts                # GET list
│   │   │   │   ├── upload/route.ts         # POST presign
│   │   │   │   ├── upload/complete/route.ts
│   │   │   │   └── [id]/route.ts           # DELETE
│   │   │   ├── urls/
│   │   │   │   ├── route.ts
│   │   │   │   ├── check/route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       └── stats/route.ts
│   │   │   ├── dl/
│   │   │   │   ├── route.ts
│   │   │   │   ├── upload/route.ts
│   │   │   │   ├── upload/complete/route.ts
│   │   │   │   └── [fileId]/
│   │   │   │       ├── route.ts
│   │   │   │       └── download/route.ts
│   │   │   ├── stats/
│   │   │   │   ├── overview/route.ts
│   │   │   │   ├── activity/route.ts
│   │   │   │   └── storage/route.ts
│   │   │   └── health/route.ts
│   │   ├── error.tsx
│   │   ├── global-error.tsx
│   │   ├── not-found.tsx
│   │   ├── loading.tsx
│   │   ├── robots.ts
│   │   ├── sitemap.ts
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                             # shadcn/ui primitives
│   │   ├── marketing/
│   │   │   ├── site-header.tsx
│   │   │   └── site-footer.tsx
│   │   ├── dashboard/
│   │   │   ├── activity-table.tsx
│   │   │   └── storage-breakdown.tsx
│   │   ├── shared/
│   │   │   ├── page-header.tsx
│   │   │   ├── empty-state.tsx
│   │   │   ├── error-state.tsx
│   │   │   ├── loading-skeletons.tsx
│   │   │   ├── confirm-dialog.tsx
│   │   │   ├── copy-button.tsx
│   │   │   └── data-pagination.tsx
│   │   ├── layout/
│   │   │   ├── sidebar-nav.tsx
│   │   │   ├── mobile-nav.tsx
│   │   │   ├── storage-meter.tsx
│   │   │   └── top-navbar.tsx
│   │   ├── auth/
│   │   │   ├── login-form.tsx
│   │   │   └── register-form.tsx
│   │   ├── cdn/
│   │   │   ├── cdn-upload-dropzone.tsx
│   │   │   ├── cdn-asset-table.tsx
│   │   │   └── cdn-asset-detail.tsx
│   │   ├── urls/
│   │   │   ├── url-create-form.tsx
│   │   │   ├── url-list-table.tsx
│   │   │   └── url-stats-panel.tsx
│   │   ├── dl/
│   │   │   ├── file-upload-modal.tsx
│   │   │   ├── file-list-table.tsx
│   │   │   ├── file-detail-panel.tsx
│   │   │   └── download-card.tsx
│   │   └── settings/
│   │       ├── profile-form.tsx
│   │       ├── password-form.tsx
│   │       ├── api-key-table.tsx
│   │       └── api-key-create-dialog.tsx
│   ├── hooks/
│   │   ├── use-overview.ts
│   │   ├── use-cdn-assets.ts
│   │   ├── use-short-urls.ts
│   │   ├── use-dl-files.ts
│   │   ├── use-api-keys.ts
│   │   ├── use-activity.ts
│   │   ├── use-storage-stats.ts
│   │   └── use-direct-upload.ts
│   ├── services/
│   │   ├── auth/
│   │   │   ├── password.service.ts
│   │   │   ├── session.service.ts
│   │   │   └── api-key.service.ts
│   │   ├── account/
│   │   │   └── account.service.ts
│   │   ├── storage/
│   │   │   ├── cos-client.ts
│   │   │   ├── object-key.service.ts
│   │   │   ├── quota.service.ts
│   │   │   ├── cdn-upload.service.ts
│   │   │   ├── dl-presign.service.ts
│   │   │   └── cleanup.service.ts
│   │   ├── shortener/
│   │   │   ├── slug-validator.service.ts
│   │   │   ├── redirect.service.ts
│   │   │   └── click-tracker.service.ts
│   │   └── stats/
│   │       ├── overview.service.ts
│   │       ├── activity.service.ts
│   │       └── storage-stats.service.ts
│   ├── repositories/
│   │   ├── user.repository.ts
│   │   ├── api-key.repository.ts
│   │   ├── cdn-asset.repository.ts
│   │   ├── short-url.repository.ts
│   │   ├── url-click-event.repository.ts
│   │   ├── activity.repository.ts
│   │   └── dl-file.repository.ts
│   ├── db/
│   │   ├── index.ts                        # postgres.js pool + Drizzle client
│   │   ├── enums.ts
│   │   ├── migrations/
│   │   └── schema/
│   │       ├── users.schema.ts
│   │       ├── api-keys.schema.ts
│   │       ├── cdn-assets.schema.ts
│   │       ├── short-urls.schema.ts
│   │       ├── url-click-events.schema.ts
│   │       └── dl-files.schema.ts
│   ├── lib/
│   │   ├── api/
│   │   │   ├── handler.ts                  # auth, errors, logging wrapper
│   │   │   ├── response.ts                 # envelope helpers
│   │   │   ├── auth-guard.ts               # requireSession / requireApiKey
│   │   │   └── pagination.ts
│   │   ├── validation/
│   │   │   ├── auth.schema.ts
│   │   │   ├── account.schema.ts
│   │   │   ├── cdn.schema.ts
│   │   │   ├── url.schema.ts
│   │   │   └── dl.schema.ts
│   │   ├── api-client.ts
│   │   ├── constants.ts                    # reserved slugs, limits, TTLs
│   │   ├── env.ts
│   │   ├── errors.ts
│   │   ├── id-generator.ts
│   │   ├── file-validator.ts
│   │   ├── rate-limiter.ts
│   │   ├── redis.ts                        # ioredis client, graceful degradation
│   │   ├── urls.ts                         # host detection, public URL builders
│   │   ├── logger.ts
│   │   └── utils.ts
│   ├── types/
│   │   ├── api.types.ts
│   │   ├── auth.types.ts
│   │   ├── cdn.types.ts
│   │   ├── url.types.ts
│   │   ├── dl.types.ts
│   │   └── stats.types.ts
│   ├── worker/
│   │   ├── index.ts
│   │   ├── cleanup-expired.job.ts
│   │   ├── flush-counters.job.ts
│   │   └── prune-click-events.job.ts
│   └── proxy.ts                          # Next 16 host routing + session guard
└── tests/
    ├── unit/
    └── e2e/
```

---

## 6. Pages & Routes Inventory

### 6.1 Public site and auth

| Route | File | Auth | Behavior |
| --- | --- | --- | --- |
| `/` | `(marketing)/page.tsx` | public | Landing with product overview and calls to action. Signed-in users redirect to `/dashboard`. |
| `/pricing` | `(marketing)/pricing/page.tsx` | public | Three plans (Free, Starter, Pro) rendered from `src/lib/plans.ts`. Never redirects signed-in users. |
| `/terms` | `(marketing)/terms/page.tsx` | public | Terms of service. |
| `/privacy` | `(marketing)/privacy/page.tsx` | public | Privacy policy, including analytics retention. |
| `/docs/api` | `(marketing)/docs/api/page.tsx` | public | API documentation with API key usage examples. |
| `/login` | `(auth)/login/page.tsx` | guest | Signed-in users redirect to `/dashboard`. |
| `/register` | `(auth)/register/page.tsx` | guest | Signed-in users redirect to `/dashboard`. |

The marketing layout (`(marketing)/layout.tsx`) supplies the shared public header and footer.

### 6.2 Dashboard

| Route | File | Behavior |
| --- | --- | --- |
| `/dashboard` | `(dashboard)/dashboard/page.tsx` | Four metric cards, Clicks and Views analytics cards (30-day sparkline plus change against the previous 30 days), recent activity with a link to the full log. |
| `/dashboard/analytics` | `analytics/page.tsx` | Clicks and download page views for 30 days with the previous 30 for comparison, plus top links, most viewed files, countries, devices, and referrers. |
| `/dashboard/activity` | `activity/page.tsx` | Paginated activity log across CDN, short URL, and file events. |
| `/dashboard/cdn` | `cdn/page.tsx` | Paginated table, search, folder filter, copy URL, delete, upload. |
| `/dashboard/cdn/[id]` | `cdn/[id]/page.tsx` | Preview, metadata, public URL, delete. |
| `/dashboard/urls` | `urls/page.tsx` | Create form, paginated link table, copy, edit, delete. |
| `/dashboard/urls/[id]` | `urls/[id]/page.tsx` | Totals, 30-day chart, top referrers. |
| `/dashboard/files` | `files/page.tsx` | Paginated file table, upload modal, copy link, delete. |
| `/dashboard/files/[fileId]` | `files/[fileId]/page.tsx` | Metadata, expiry editor, download count, copy, delete. |
| `/dashboard/settings` | `settings/page.tsx` | Redirect to profile. |
| `/dashboard/settings/profile` | `settings/profile/page.tsx` | Username and email update. |
| `/dashboard/settings/security` | `settings/security/page.tsx` | Password change, session info, logout all. |
| `/dashboard/settings/storage` | `settings/storage/page.tsx` | Quota breakdown by category and largest files. |
| `/dashboard/settings/plan` | `settings/plan/page.tsx` | Current plan, usage against its limits, upgrade request state, and the plan comparison. |
| `/dashboard/settings/api-keys` | `settings/api-keys/page.tsx` | List, create, revoke keys. Plaintext shown once. |

All dashboard routes require a valid session. The layout performs the authoritative user lookup;
the proxy only verifies the JWT signature.

### 6.3 Public download

| Route | File | Behavior |
| --- | --- | --- |
| `/d/[fileId]/[[...slug]]` | `(public-dl)/d/[fileId]/[[...slug]]/page.tsx` | Validates file and expiry. Any extra slug redirects to the short `/d/{fileId}` form. Expired returns 410, missing returns 404. Renders the download card. |

### 6.4 Route handlers outside `/api`

| Route | Runtime | Behavior |
| --- | --- | --- |
| `/r/[slug]` | Node | Redis lookup, PostgreSQL fallback, click tracking, 302 with `Cache-Control: no-store`. |

### 6.5 System routes

| Route | Behavior |
| --- | --- |
| `error.tsx`, `global-error.tsx` | Recovery UI with retry, no stack traces in production. |
| `not-found.tsx` | Branded 404. |
| `loading.tsx` | Root skeleton. |
| `(dashboard)/loading.tsx`, `(dashboard)/error.tsx` | Dashboard skeleton and recovery boundary. |
| `(public-dl)/loading.tsx`, `(public-dl)/error.tsx`, `(public-dl)/not-found.tsx` | Download page loading, error, and missing states. |
| `robots.ts`, `sitemap.ts` | Disallow `/dashboard` and `/api`. |
| `/api/health` | Liveness plus PostgreSQL and Redis checks. No secrets. |

### 6.6 Deferred pages

`/forgot-password`, `/reset-password`, `/verify-email`, `/dashboard/team`.
These need an email provider or product decisions outside MVP scope. Do not scaffold them yet.
Automatic payment (a real `/dashboard/billing` checkout) is also deferred: plans exist and are
enforced, but activation is manual through `pnpm plan:set`.

### 6.7 Coverage summary

| Group | Routes | Count |
| --- | --- | --- |
| Public site | `/`, `/pricing`, `/terms`, `/privacy`, `/docs/api` | 5 |
| Auth | `/login`, `/register` | 2 |
| Dashboard | `/dashboard` and 14 nested routes | 15 |
| Public download | `/d/[fileId]/[[...slug]]` | 1 |
| Route handler | `/r/[slug]` | 1 |
| State boundaries | root, dashboard group, public-dl group | 9 files |
| Deferred | forgot/reset password, verify email, team, billing | 5 |

Every route above maps to a feature in the traceability matrix (Section 21).

---

## 7. API Contract

### 7.1 Conventions

- JSON only.
- Success: `{ "data": <payload> }`.
- Error: `{ "error": { "code": "SNAKE_CASE", "message": "...", "details": {} } }`.
- Pagination: `?page=1&limit=20&q=&sort=created_at:desc`; response
  `{ "data": { "items": [], "page": 1, "limit": 20, "total": 0 } }`. Max `limit` is 100.
- Validate every input with Zod; failure returns `400 VALIDATION_ERROR`.
- Ownership failures return `404 NOT_FOUND`, never `403`.
- Auth: session cookie for the dashboard, `Authorization: Bearer lydev_...` for API keys.
- Mutating browser requests require an `Origin` matching `APP_URL`.
- Rate limits return `429 RATE_LIMITED` with `Retry-After`.
- Handlers touching database, COS, or Redis declare `export const runtime = "nodejs"`.
- Route handlers wrap errors with `src/lib/api/handler.ts`.

### 7.2 Auth

| Method | Path | Body | Response | Notes |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/register` | `{ username, email, password, confirmPassword }` | 201 user | Sets session cookie. |
| POST | `/api/auth/login` | `{ identifier, password }` | 200 user | Email or username. |
| POST | `/api/auth/logout` | none | 204 | Blacklists `jti`, clears cookie. |
| GET | `/api/auth/me` | none | 200 user + quota | 401 when unauthenticated. |

### 7.3 Account

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| PATCH | `/api/account/profile` | `{ username?, email? }` | Uniqueness enforced. |
| POST | `/api/account/password` | `{ currentPassword, newPassword, confirmPassword }` | Bumps `session_version`. |
| POST | `/api/account/logout-all` | none | Bumps `session_version`, clears the current cookie, 204. |
| GET | `/api/account/api-keys` | none | Prefix, name, timestamps only. |
| POST | `/api/account/api-keys` | `{ name }` | Returns plaintext once. |
| DELETE | `/api/account/api-keys/[id]` | none | Revokes. |
| GET | `/api/account/plan` | none | Plan, usage against its limits, and any pending request. |
| POST | `/api/account/plan` | `{ plan: "starter" \| "pro" }` | Records an upgrade request; 409 when one is already pending. Does not change entitlement. |

### 7.4 CDN

| Method | Path | Body / Query | Notes |
| --- | --- | --- | --- |
| GET | `/api/cdn` | `page, limit, q, folder, bucket` | Owner-scoped. `bucket=unassigned` filters assets without a bucket. |
| POST | `/api/cdn/upload` | `{ filename, mimeType, sizeBytes, folder, bucketId? }` | Returns presigned PUT plus `fileKey`. |
| POST | `/api/cdn/upload/complete` | `{ fileKey, sizeBytes, bucketId? }` | HEAD verify, insert row, increment quota. |
| PATCH | `/api/cdn/[id]` | `{ bucketId }` | Moves the asset; `null` unassigns it. |
| DELETE | `/api/cdn/[id]` | none | Delete object, row, decrement quota. |
| GET | `/api/cdn/buckets` | none | Owner-scoped buckets with asset counts. |
| POST | `/api/cdn/buckets` | `{ name }` | Names are unique per user. 403 `PLAN_LIMIT_REACHED` past the plan's bucket count. |
| PATCH | `/api/cdn/buckets/[id]` | `{ name }` | Renames a bucket. |
| DELETE | `/api/cdn/buckets/[id]` | none | Assets become unassigned; objects are untouched. |

### 7.5 Short URLs

| Method | Path | Body / Query | Notes |
| --- | --- | --- | --- |
| GET | `/api/urls` | `page, limit, q` | Owner-scoped list. |
| POST | `/api/urls` | `{ targetUrl, slug?, title? }` | Slug generated when omitted. |
| GET | `/api/urls/check` | `?slug=` | `{ available, reason? }`. |
| PATCH | `/api/urls/[id]` | `{ targetUrl?, title?, isActive? }` | Invalidates cache. |
| DELETE | `/api/urls/[id]` | none | Invalidates cache. |
| GET | `/api/urls/[id]/stats` | `?days=30` | Totals, daily series, referrers. |

### 7.6 File share

| Method | Path | Body / Query | Notes |
| --- | --- | --- | --- |
| GET | `/api/dl` | `page, limit, q` | Owner-scoped. |
| POST | `/api/dl/upload` | `{ filename, mimeType, sizeBytes, expiresInDays?, password? }` | Quota and size enforced. |
| POST | `/api/dl/upload/complete` | `{ fileId, sizeBytes, password? }` | Insert row, hash the optional password, increment quota. Returns `edgeSynced`. |
| PATCH | `/api/dl/[fileId]` | `{ expiresInDays?, password? }` | `null` removes the expiry or the password. |
| POST | `/api/dl/[fileId]/access` | `{ password }` | Verifies the link password and sets a 30-minute `dl_access_{id}` cookie. |
| POST | `/api/dl/[fileId]/edge` | none | Republishes KV metadata; 503 when Cloudflare KV rejects the write. |
| POST | `/api/edge/view` | `{ fileId }` + `x-edge-secret` | Server-to-server view beacon from the Worker. 503 when `EDGE_EVENT_SECRET` is unset, 403 on a bad secret. |
| DELETE | `/api/dl/[fileId]` | none | Delete object, row, decrement quota. |
| GET | `/api/dl/[fileId]/download` | none | 410 if expired, 403 `TRANSFER_LIMIT_REACHED` when the owner's monthly transfer is spent, count, 302 to presigned GET with attachment. |

### 7.7 Stats and health

| Method | Path | Response |
| --- | --- | --- |
| GET | `/api/stats/overview` | `{ storageUsedBytes, storageQuotaBytes, activeAssets, activeShortUrls, totalDownloads, clicks: { total, currentPeriod, previousPeriod, changePercent, series: [{ day, count }] }, recentActivity[] }` |
| GET | `/api/stats/activity` | `{ items: [{ id, type, title, subtitle, createdAt }], page, limit, total }`; optional `?type=cdn\|url\|file\|click\|status` |
| GET | `/api/stats/storage` | `{ totalBytes, quotaBytes, byCategory: { images, videos, raw, files }, largest[] }` |
| GET | `/api/health` | `{ status, postgres, redis, version }` |

---

## 8. Database Schema

Rules:

- Every table has `created_at`; mutable tables add `updated_at`.
- Foreign keys use `ON DELETE CASCADE` unless stated otherwise.
- All timestamps are `timestamptz`.
- Unique constraints are enforced in the database and the service layer.
- Denormalized counters are documented and reconciled by workers.
- Migrations are generated and committed.

### 8.1 `users`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | `gen_random_uuid()` |
| `username` | varchar(32) | unique, case-insensitive |
| `email` | varchar(255) | unique, stored lowercase |
| `password_hash` | text | Argon2id |
| `plan` | enum `plan` | `free` (default), `starter`, `pro` |
| `storage_used_bytes` | bigint | default 0, never negative |
| `storage_quota_bytes` | bigint | default 5368709120 (5 GiB); overwritten with the plan's quota on activation |
| `bandwidth_used_bytes` | bigint | default 0, transfer consumed in the current UTC month |
| `bandwidth_period_start` | timestamptz | start of the month the counter belongs to |
| `session_version` | integer | bump to revoke all sessions |
| `created_at` / `updated_at` | timestamptz | |

### 8.2 `api_keys`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `user_id` | uuid fk users | cascade |
| `name` | varchar(64) | |
| `key_prefix` | varchar(12) | shown in UI |
| `key_hash` | text | SHA-256, unique |
| `last_used_at` | timestamptz | nullable |
| `revoked_at` | timestamptz | nullable |
| `created_at` | timestamptz | |

Index: `(user_id)`.

### 8.3 `cdn_buckets`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `user_id` | uuid fk users | cascade |
| `name` | varchar(40) | unique per user |
| `created_at` | timestamptz | |

Buckets are a UI grouping only: every asset still lives in the single `lydev-cdn` bucket, so
object keys and public URLs never change when an asset moves between buckets.

### 8.4 `cdn_assets`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `user_id` | uuid fk users | cascade |
| `bucket_id` | uuid fk cdn_buckets | nullable, `on delete set null` |
| `file_key` | varchar(255) | unique, e.g. `images/kBcRbXpZ.webp` |
| `folder` | enum | `images`, `videos`, `raw` |
| `original_name` | varchar(255) | sanitized for display |
| `mime_type` | varchar(127) | verified from magic bytes |
| `size_bytes` | bigint | |
| `created_at` | timestamptz | |

Indexes: `(user_id, created_at desc)`, unique `(file_key)`.

### 8.5 `short_urls`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `user_id` | uuid fk users | cascade |
| `slug` | varchar(32) | unique |
| `target_url` | text | http/https only |
| `title` | varchar(120) | nullable |
| `clicks` | integer | default 0 |
| `last_clicked_at` | timestamptz | nullable |
| `is_active` | boolean | default true |
| `created_at` / `updated_at` | timestamptz | |

Indexes: unique `(slug)`, `(user_id, created_at desc)`.

### 8.6 `url_click_events`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigserial pk | |
| `short_url_id` | uuid fk short_urls | cascade |
| `clicked_at` | timestamptz | default now |
| `referrer_host` | varchar(255) | nullable, host only |
| `country` | varchar(2) | nullable, from `CF-IPCountry` |
| `device` | varchar(16) | desktop / mobile / tablet / other |

Index: `(short_url_id, clicked_at desc)`. Retention 90 days. Never store raw IPs.

### 8.7 `dl_files`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | varchar(10) pk | alphabetic NanoID |
| `user_id` | uuid fk users | cascade |
| `original_name` | varchar(255) | user-facing name |
| `safe_slug` | varchar(255) | sanitized for URLs |
| `cos_object_key` | text | `files/{id}/{safe_slug}` |
| `mime_type` | varchar(127) | |
| `size_bytes` | bigint | |
| `downloads` | integer | default 0 |
| `password_hash` | text | nullable, Argon2id; null means an open link |
| `expires_at` | timestamptz | nullable, null means never |
| `created_at` | timestamptz | |

Indexes: `(user_id, created_at desc)`, `(expires_at)` for cleanup.

### 8.8 `service_status`

Latest health snapshot per monitored host. Rows are keyed by a stable service id
(`app`, `cdn`, `short`, `download`), not by user: host health is platform-wide.

| Column | Type | Notes |
| --- | --- | --- |
| `service_id` | varchar(32) pk | stable id, not the hostname |
| `hostname` | varchar(255) | host resolved from the configured URL |
| `status` | varchar(16) | `operational` \| `degraded` \| `down` \| `unknown` |
| `detail` | text | nullable, what the check observed (e.g. `HTTP 521`) |
| `latency_ms` | integer | nullable, null when the request never completed |
| `checked_at` | timestamptz | when the snapshot was taken |
| `previous_status` | varchar(16) | nullable, status replaced by the last write |
| `status_changed_at` | timestamptz | nullable, last transition time |

### 8.9 `service_status_events`

One row per transition. Routine checks only update `service_status`, so the
activity feed never fills with "still operational" noise.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | `gen_random_uuid()` |
| `service_id` | varchar(32) | matches `service_status.service_id` |
| `hostname` | varchar(255) | host at the time of the transition |
| `previous_status` / `new_status` | varchar(16) | the transition |
| `created_at` | timestamptz | when it was detected |

Indexes: `(created_at)`.

Monitoring rules:

- Hosts come from `APP_URL`, `NEXT_PUBLIC_CDN_URL`, `NEXT_PUBLIC_SHORT_URL`,
  `NEXT_PUBLIC_DL_URL`; services sharing one origin collapse into one row.
- A check runs at most once per `MONITORING.refreshIntervalMs` (60s) and is
  re-run on read when the snapshot is older. Each request has a
  `MONITORING.timeoutMs` (3s) budget; a failure is recorded as `down` with the
  reason in `detail`, never as `operational`.
- `unknown` is reserved for a host that has never been checked or whose result
  could not be stored.
- Uptime is never derived from upload, click, download, or application activity.

### 8.10 `plan_upgrade_requests`

Records intent, not payment. Nothing here grants entitlement; only `users.plan` does.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | `gen_random_uuid()` |
| `user_id` | uuid fk users | cascade |
| `plan` | enum `plan` | requested plan, always paid |
| `status` | enum `plan_request_status` | `pending` \| `approved` \| `rejected` |
| `created_at` | timestamptz | |
| `resolved_at` | timestamptz | nullable |

Index: `(user_id, created_at)`. At most one pending request per user is enforced in
`requestPlanUpgrade`, not by a partial index.

### 8.11 Plans and limits

`src/lib/plans.ts` is the single source of truth. Every guard reads from it; no call site
hard-codes a limit.

| Limit | Free | Starter (Rp29.000) | Pro (Rp99.000) |
| --- | --- | --- | --- |
| Storage | 5 GB | 25 GB | 100 GB |
| Buckets | 3 | 20 | 100 |
| Active API keys | 3 | 10 | 50 |
| Short links / hour | 30 | 150 | 400 |
| Uploads / hour | 60 | 240 | 600 |
| Transfer / month | 10 GB | uncapped | uncapped |

- `storage_quota_bytes` is written together with `plan` by `pnpm plan:set <email> <plan>`;
  quota checks keep reading the column, so no query changes when a plan changes.
- Bucket, API key, and rate-limit guards read the plan directly.
- Transfer is metered only where the app hands out the bytes: `prepareDlDownload` adds the
  file size before issuing a presigned GET. CDN objects are served straight from the R2 custom
  domain, so their egress is not visible to the app and is not counted. A cancelled download
  still consumes its allowance.
- The counter is charged per download request, not per byte delivered, and rolls over by
  reading `bandwidth_period_start` against the current UTC month — no cron needed.
- `TRANSFER_LIMIT_REACHED` (403) blocks the download; `PLAN_LIMIT_REACHED` (403) blocks bucket
  and API key creation.
- A plan limit rejection uses `PLAN_LIMIT_REACHED` with status 403 so the client can tell it
  apart from `QUOTA_EXCEEDED` (413).
- Activation is manual: a user submits a request, an operator runs `pnpm plan:set`, which also
  marks pending requests `approved`. Automatic payment is not implemented.

### 8.12 `dl_view_events`

One row per rendered download page. A download is not a view; the two are counted separately.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigserial pk | |
| `file_id` | varchar(10) fk dl_files | cascade |
| `viewed_at` | timestamptz | |
| `country` | varchar(2) | from `cf-ipcountry`, nullable |
| `device` | varchar(16) | `desktop` \| `mobile` \| `tablet` |
| `referrer_host` | varchar(255) | nullable |
| `source` | varchar(8) | `app` when Next.js rendered it, `edge` when the Worker reported it |

Index: `(file_id, viewed_at)`.

- The app records a view in `after()` once the page is unlocked, so rendering never waits on a write.
- Edge-served pages are reported by the Worker to `POST /api/edge/view`, guarded by
  `EDGE_EVENT_SECRET`. Until that secret exists on both sides, only app-rendered pages count.
- Views are never inferred from downloads, clicks, or activity events.

---

## 9. Authentication & Session Architecture

- Hashing: Argon2id, memory 19456 KiB, time 2, parallelism 1.
- Password policy: 10 to 128 characters; reject common passwords when a list is bundled.
- Username `^[a-z0-9_]{3,24}$`, case-insensitive uniqueness.
- Email normalized to lowercase before storage and lookup.
- JWT claims: `sub`, `username`, `ver`, `jti`, `iat`, `exp`, `iss`.
- Cookie `lydev_session`: `httpOnly`, `secure` in production, `sameSite=lax`, `path=/`, 7 days.
- Logout writes `session:blacklist:{jti}` with the remaining TTL.
- Password change increments `session_version`, invalidating every issued token.
- The proxy (`src/proxy.ts`) verifies the JWT with `jose` and never queries PostgreSQL or Redis.
- API keys: `lydev_` plus 40 base62 characters, SHA-256 at rest, constant-time comparison,
  `last_used_at` written at most once per minute.
- Login failures return a generic `INVALID_CREDENTIALS`; perform a dummy hash when the user is
  missing to keep timing uniform.

---

## 10. Storage Architecture

### 10.1 R2 client

- Two buckets: `lydev-cdn` (public) and `lydev-files` (private).
- `S3Client` with `region: "auto"`, endpoint `https://<account>.r2.cloudflarestorage.com`, path-style,
  SigV4.
- `cdn.lydev.id` is attached as an R2 custom domain; Cloudflare terminates TLS and serves the bucket.
- CORS allows `GET`, `PUT`, and `HEAD` from `http://localhost:3000` and `https://cloud.lydev.id`.
- Public objects use `Cache-Control: public, max-age=31536000, immutable`.
- Private `files/*` objects are served only through presigned URLs; the R2 custom domain must never
  expose them.
- Tencent COS remains a fallback driver when R2 credentials are absent.

### 10.2 Direct upload flow (CDN and file share)

1. Client requests a presigned upload with filename, MIME type, size, and folder or expiry.
2. Server validates quota, size limit, MIME allowlist, and magic-byte policy.
3. Server generates the object key and returns a presigned PUT valid for 15 minutes.
4. Client uploads directly to COS with progress.
5. Client calls `complete`; server HEADs the object, verifies size and type, then inserts the row and
   increments quota in one transaction.
6. Objects that are presigned but never completed are deleted after 24 hours.

Rationale: uploads must not pass through Cloudflare (100 MB body limit on Free/Pro) or the VPS.

R2 is the default object store in local development and production. When R2 credentials are absent,
the same flow uses Tencent COS; when both are absent, the filesystem driver under `.uploads/` keeps
the client flow identical. `NODE_ENV=production` refuses to start without R2 or COS.

### 10.3 Limits

| Category | Max size | Allowed types |
| --- | --- | --- |
| `images` | 20 MiB | png, apng, jpeg, webp, gif, avif, svg, bmp, ico, tiff, heic, heif, jxl |
| `videos` | 500 MiB | mp4, webm, mov, m4v, mkv, avi, mpeg, ogv, 3gp |
| `raw` | 100 MiB | pdf, Office/OpenDocument, archives, text/data, audio, fonts, 3D, subtitles, psd/ai/eps |
| `files` (dl) | 2 GiB | any except executables, HTML, and scripts |

### 10.4 Quota

- Checked before presigning and re-verified on `complete`.
- Increment and decrement happen in the same transaction as the row change.
- Nightly reconciliation recomputes `storage_used_bytes` from both asset tables.
- Exceeding quota returns `413 QUOTA_EXCEEDED`.

### 10.5 Object keys

- CDN: `{folder}/{NanoID_12}.{ext}` using alphabetic-only NanoID.
- DL: `files/{id}/{safe_slug}`.

---

## 11. Short URL Architecture

- Slug `^[A-Za-z0-9_-]{3,32}$`; storage is case-sensitive, reserved checks are case-insensitive.
- Reserved: `api`, `login`, `register`, `logout`, `dashboard`, `settings`, `admin`, `health`,
  `robots.txt`, `sitemap.xml`, `favicon.ico`, `_next`, `static`, `assets`, `r`, `d`, `cdn`, `dl`.
- Generated slugs: 7 base62 characters, retried up to 5 times on collision.
- `target_url`: absolute http/https, no credentials, max 2048 characters, must not resolve to a
  private, loopback, link-local, or metadata address, and must not target `uri.lydev.id`.
- Redirect: Redis first (24 hours), PostgreSQL fallback, then cache refresh.
- Edge redirect: `uri.lydev.id/*` is served by a Cloudflare Worker
  (`workers/short-links/`) backed by a Workers KV namespace (`Map "slug:{slug}" to target URL`).
  The app syncs KV on create, update, and delete (`syncShortUrlToEdge`): active maps PUT the
  target, inactive or deleted slugs DELETE the key. Sync failure is logged, never blocks the
  DB operation. The edge redirect serves 302 with `no-store` and skips click accounting while
  the VPS is not deployed; clicks accrue only through the app redirect when the Worker route is
  unset.
- Click count: Redis `INCR` buffered and flushed every 60 seconds.
- Click events are inserted asynchronously and never block the redirect.
- Inactive returns 404; expired returns 410.
- Responses set `Cache-Control: no-store` and `Referrer-Policy: no-referrer`.

---

## 12. Download Architecture

- Public URL: `https://dl.lydev.id/{fileId}`. The filename is never part of the public link.
- Production is served at the edge by the Worker in `workers/short-links`:
  - `dl.lydev.id/{fileId}` reads metadata from KV (`file:{id}`), checks the private R2 object, and
    renders a MediaFire-style page with file name, size, upload date, expiry, and a large download
    button.
  - `dl.lydev.id/{fileId}/download` streams the object from the private `lydev-files` R2 bucket with
    `Content-Disposition: attachment`, `Cache-Control: private, no-store`, and `nosniff`.
  - Expired links return 410; missing objects return a "File unavailable" page (404).
  - Legacy links with a filename segment are accepted and use the first segment as the file id.
- Password-protected files are never served at the edge: the Worker sees `protected` in the KV
  metadata and redirects `dl.lydev.id/{fileId}` and `/{fileId}/download` to `APP_URL/d/{fileId}`.
  The app renders a password gate, and only a valid 30-minute `dl_access_{fileId}` cookie (HMAC over
  the file id, expiry, and current password hash) unlocks the details and the presigned download.
  Removing or changing the password invalidates every outstanding grant.
- The app syncs KV metadata on upload complete, expiry update, and delete (`syncDlFileToEdge`).
- Edge publishing is retried up to three times on network errors, 429, and 5xx; a 4xx is treated as
  terminal. Upload complete and the settings PATCH return `edgeSynced` so the client can warn when
  the file exists but `dl.lydev.id` cannot serve it yet, and `POST /api/dl/{fileId}/edge` republishes
  on demand ("Refresh link" in the detail panel). Never let a stored file stay invisible at the edge
  without telling the user.
- `scripts/sync-edge-state.mjs` backfills every slug and file into KV; it must include `protected`
  so a password-protected file is never republished as an open link.
- Local and cloud rendering: `/d/{fileId}` uses the same MediaFire-style card, checks storage
  availability, and links the download button to `/api/dl/{fileId}/download`.
- The app download endpoint re-validates expiry, increments `downloads` atomically, and returns a 302
  to a presigned R2 GET (5 minutes) with an attachment disposition. The edge download route does not
  update the Postgres download counter.
- Presigned downloads use the R2 native endpoint so Cloudflare never caches private files.
- Expired files are hidden immediately and removed from R2 by the cleanup worker.

---

## 13. Caching & Redis

| Key | Purpose | TTL |
| --- | --- | --- |
| `slug:{slug}` | slug to target URL | 24 hours |
| `slug:negative:{slug}` | missing slug cache | 5 minutes |
| `ratelimit:{scope}:{id}:{window}` | rate limiting | window length |
| `clicks:{slug}` | buffered click counters | until flushed |
| `session:blacklist:{jti}` | revoked tokens | remaining TTL |
| `apikey:lastused:{id}` | throttle last-used writes | 60 seconds |

Rules:

- Redis is not the source of truth; PostgreSQL is.
- Redis failure degrades gracefully: redirects fall back to PostgreSQL, rate limits fall back to a
  conservative in-memory limiter, and the app stays available.
- Slug updates and deletes invalidate `slug:{slug}`.

---

## 14. Security Architecture

- Validate every input with Zod; never trust query params, bodies, headers, or filenames.
- Enforce ownership on every read and write.
- SSRF defense in the shortener: block private, loopback, link-local, and metadata ranges after DNS
  resolution; block non-HTTP schemes.
- Open redirect defense: only redirect to stored targets.
- Filename sanitization: strip path separators, control characters, and leading dots; cap at 255
  bytes.
- Magic-byte validation; never trust the declared MIME type alone.
- Reject HTML and executables.
- Headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, HSTS in production, and a
  CSP limited to self, the COS upload origin, and required inline styles.
- Never log secrets, tokens, presigned URLs, or password material.
- Analytics store no raw IPs; country comes from `CF-IPCountry`.
- Rate limits per IP and per user:

| Scope | Limit |
| --- | --- |
| Login | 5 per 15 min per IP + identifier |
| Register | 5 per hour per IP |
| URL create | 30 per hour per user |
| Upload presign | 60 per hour per user |
| Redirect | 300 per minute per IP |
| Download | 30 per minute per IP |
| Link password | 10 per 15 min per IP + file |
| API key failures | 20 per hour per IP |

- CI runs `pnpm audit`; no high or critical advisory ships.

---

## 15. UI/UX & Design System

### 15.1 Color palette (black and deep navy)

```css
@layer base {
  :root {
    --background: 222 47% 4%;        /* #050811 */
    --foreground: 210 40% 98%;       /* #F8FAFC */

    --card: 222 47% 7%;              /* #0A0F1D */
    --card-foreground: 210 40% 98%;

    --popover: 222 47% 6%;
    --popover-foreground: 210 40% 98%;

    --primary: 217 91% 60%;          /* #3B82F6 */
    --primary-foreground: 222 47% 4%;

    --secondary: 217 33% 14%;        /* #172033 */
    --secondary-foreground: 210 40% 98%;

    --muted: 217 33% 12%;
    --muted-foreground: 215 20% 65%; /* #94A3B8 */

    --accent: 217 33% 16%;
    --accent-foreground: 210 40% 98%;

    --destructive: 0 63% 31%;
    --destructive-foreground: 210 40% 98%;

    --border: 217 33% 15%;           /* #192338 */
    --input: 217 33% 15%;
    --ring: 217 91% 60%;
    --radius: 0.5rem;
  }
}
```

### 15.2 Typography and icons

- UI: `Inter` or `Geist Sans`.
- Mono: `JetBrains Mono` or `Geist Mono` for URLs, sizes, IDs, slugs.
- `lucide-react` only. No emoji, no icon fonts.
- `tabular-nums` for metrics.

### 15.3 Layout

- Auth: centered `max-w-md` card over a subtle radial navy gradient.
- Dashboard: fixed 240 px sidebar that collapses to a sheet below `lg`; topbar with breadcrumb,
  quick action, and user menu.
- Sidebar: brand header, `Overview`, `CDN Manager`, `Short URLs`, `File Uploader`, `Activity`,
  `Settings`, and a storage meter at the bottom linking to `/dashboard/settings/storage`.
- Overview: four metric cards, upload dropzone and shortener side by side, recent activity table.
- Tables: full table on desktop, stacked cards on mobile, sticky header, sortable where useful.
- Max content width 1280 px, consistent `p-6` page padding.

### 15.4 Required states

Every data view implements:

- Loading: layout-matched skeletons, never a spinner-only page.
- Empty: icon, short explanation, primary call to action.
- Error: message, retry, no stack trace.
- Success: optimistic update or toast.
- Pending and disabled states on every submit button.
- Uploads share `src/components/shared/upload-progress.tsx`: percent, transferred / total,
  transfer rate, and remaining time, then a distinct `Finishing…` phase while the object is
  registered and published. Never leave a bar at 100% still labelled "Uploading".
- Every mutation reports both outcomes: success toast with the resulting link, and an error toast
  carrying the API message. A partial success (stored but not published) uses a warning toast.

### 15.5 Accessibility and responsiveness

- Labels on every input; `aria-label` on icon-only buttons.
- Visible focus rings from `--ring`.
- WCAG AA contrast.
- Full keyboard navigation, including dialogs.
- Respect `prefers-reduced-motion`.
- No horizontal scroll at 360 px.

### 15.6 Time display

- Store timestamps in UTC (`timestamptz`); never store local time.
- Render dates and times in `Asia/Jakarta` with a `WIB` suffix in both server and client components,
  so hydration output is deterministic.
- Edge Worker pages use the same timezone.
- Analytics day buckets use `AT TIME ZONE 'Asia/Jakarta'`.

---

## 16. Client Data & State

- Server Components read through services and repositories directly; no internal `fetch`.
- Client components use TanStack Query through `src/hooks/`.
- Query keys are namespaced: `["cdn", { page, q, folder }]`, `["urls", id]`, `["dl", page]`.
- Mutations invalidate the affected namespace and overview stats.
- Browser calls go through `src/lib/api-client.ts`, which normalizes errors into `AppError`.
- No global state library; local state plus server cache is enough.
- Forms use controlled inputs with shared Zod schemas.

---

## 17. Error Handling

- `AppError` carries `code`, `message`, `status`, and optional `details`.
- `src/lib/api/handler.ts` wraps handlers: parse session, run callback, map errors, log request id.
- Unknown errors log the stack and return `500 INTERNAL_ERROR` with no details.
- Retryable database or COS failures return `503 SERVICE_UNAVAILABLE`.
- Never return presigned URLs, SQL errors, or secrets in error messages.
- Client hooks surface errors through `error-state` or a toast.

---

## 18. Testing & Quality Gates

- Unit tests: `lib`, services, slug and filename validation. Target 70 percent line coverage for
  services and repositories.
- API tests: route handlers against a test database with a mocked COS client.
- E2E: register, login, logout, CDN upload, short URL create and redirect, file upload and download,
  quota rejection.
- Every bug fix ships with a regression test.
- Blocking CI gates:
  1. typecheck (`tsc --noEmit`)
  2. lint (`eslint .`)
  3. unit tests (`vitest run`)
  4. build (`next build`)
  5. audit (`pnpm audit --audit-level=high`)

Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:e2e`, `db:generate`,
`db:migrate`, `db:studio`, `worker`.

---

## 19. Infrastructure

### 19.1 Cloudflare

DNS:

- `A` `cloud.lydev.id` -> VPS, proxied.
- `A` `uri.lydev.id` -> VPS, proxied, and covered by the `lydev-short-links` Worker route
  (`uri.lydev.id/*`); the Worker resolves slugs from KV at the edge before origin.
- `A` `dl.lydev.id` -> VPS, proxied.
- `CNAME` `cdn.lydev.id` -> `<bucket>-<appid>.cos.<region>.myqcloud.com`, proxied, after binding the
  custom domain on the bucket.

Cache:

- `cdn.lydev.id`: cache everything, edge TTL 1 year, browser TTL 1 year, ignore origin headers.
- `cloud`, `uri`, `dl`: bypass HTML and API; cache only Next.js immutable build assets.
- Enable Brotli, HTTP/2 and HTTP/3, TLS 1.2 minimum, HSTS, Bot Fight Mode, and WAF rate limiting on
  `/api/auth/*`.
- Uploads never traverse Cloudflare; presigned PUTs target the COS native endpoint.

### 19.2 Caddy

```caddyfile
{
    servers {
        trusted_proxies static private_ranges
        client_ip_headers CF-Connecting-IP
    }
}

cloud.lydev.id, uri.lydev.id, dl.lydev.id {
    encode zstd gzip

    header {
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "camera=(), microphone=(), geolocation=()"
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        -Server
    }

    @api path /api/*
    request_body @api {
        max_size 2MB
    }

    reverse_proxy 127.0.0.1:3000 {
        header_up X-Real-IP {client_ip}
    }

    log {
        output file /var/log/caddy/lydev.log
    }
}
```

- JSON bodies are capped at 2 MB; binary uploads bypass Caddy.
- Next.js listens on `127.0.0.1:3000` only and is never exposed publicly.

### 19.3 Proxy (Next.js 16)

Runs on the Edge runtime with host routing and JWT signature verification only.

1. Read `host` without the port.
2. `uri.lydev.id`: root (`/`) redirects to `APP_URL`; other non-asset, non-API paths rewrite to
   `/r/{pathname}`.
3. `dl.lydev.id`: root (`/`) returns the branded 404; `/{fileId}` rewrites to `/d/{fileId}`, and
   legacy `/{fileId}/{slug}` links redirect to the short form.
4. `cloud.lydev.id`: protect `/dashboard/*` by verifying the cookie signature; redirect to `/login`
   with a `next` param when missing or invalid.
5. Matcher excludes `_next/static`, `_next/image`, `favicon.ico`, and public files.
6. Any other host returns 404.

The root page handles the signed-in redirect server-side.

---

## 20. Deployment & Operations

- Build with `next build` (`output: "standalone"`), run under systemd or PM2, restart on deploy.
- Run migrations before starting the new process.
- The worker runs as its own service and must not scale with the web process.
- Jobs:
  - `cleanup-expired.job.ts`: hourly. Delete expired `dl_files` and their objects; delete objects
    presigned but never completed after 24 hours.
  - `flush-counters.job.ts`: every 60 seconds. Flush Redis click counters to PostgreSQL.
  - `prune-click-events.job.ts`: daily. Remove click events older than 90 days.
- Backups: daily `pg_dump`, 14-day retention. COS versioning optional.
- Logging: `pino` JSON to stdout with a request id per line.
- Monitoring: health check every minute; alert on 5xx rate and PostgreSQL/Redis outages.
- Rollback: keep the previous release; migrations must stay backward compatible for one release.
- Never commit `.env`, credentials, or presigned URLs.

---

## 21. Traceability Matrix

A feature without a page or an API is incomplete; a page without a backing API is a mock.

| Phase | Feature | Pages | APIs / handlers | Tables |
| --- | --- | --- | --- | --- |
| 7 | Public site | `/`, `/terms`, `/privacy`, `/docs/api` | none | none |
| 1 | Auth | `/login`, `/register` | `/api/auth/register`, `/login`, `/logout`, `/me` | `users` |
| 6 | Dashboard overview | `/dashboard` | `/api/stats/overview` | all |
| 6 | Activity log | `/dashboard/activity` | `/api/stats/activity` | `cdn_assets`, `short_urls`, `dl_files` |
| 6 | Storage detail | `/dashboard/settings/storage` | `/api/stats/storage` | `cdn_assets`, `dl_files`, `users` |
| 3 | CDN manager | `/dashboard/cdn`, `/dashboard/cdn/[id]` | `/api/cdn`, `/cdn/upload`, `/cdn/upload/complete`, `/cdn/[id]` | `cdn_assets`, `users` |
| 4 | Short URLs | `/dashboard/urls`, `/dashboard/urls/[id]`, `uri.lydev.id/:slug` | `/api/urls`, `/urls/check`, `/urls/[id]`, `/urls/[id]/stats`, `/r/[slug]` | `short_urls`, `url_click_events` |
| 5 | File sharing | `/dashboard/files`, `/dashboard/files/[fileId]` | `/api/dl`, `/dl/upload`, `/dl/upload/complete`, `/dl/[fileId]` | `dl_files`, `users` |
| 5 | Public download | `/d/[fileId]/[[...slug]]` | `/api/dl/[fileId]/download` | `dl_files` |
| 6 | Settings | `/dashboard/settings/profile`, `/security`, `/storage`, `/api-keys` | `/api/account/profile`, `/password`, `/logout-all`, `/api-keys`, `/api-keys/[id]` | `users`, `api_keys` |
| 0 | Operations | none | `/api/health` | none |

---

## 22. Known Constraints

- Cloudflare Free/Pro limits request bodies to 100 MB; direct-to-COS uploads are mandatory.
- Tencent COS custom domains require an ICP filing for mainland China regions. Prefer
  `ap-southeast-1` unless filing is available.
- `cdn.lydev.id` is an R2 custom domain. Do not add a conflicting CNAME or A record for that host.
- Next.js 16 route handlers receive `params` as a Promise; always `await params`.
- Drizzle enums live in `src/db/enums.ts` and migrate with their tables.
- Presigned URLs are host-bound: sign against the R2/COS endpoint, never `cdn.lydev.id`.
- The Next 16 proxy (`src/proxy.ts`) cannot reliably reach PostgreSQL or Redis; keep it stateless.
- Large video uploads would need multipart; current scope is single-part PUT up to 500 MiB (CDN) and
  2 GiB (file share).
- The 200-line rule applies to code, not to this document.

---

## 23. Implementation Phases (Build Order)

Build strictly in phase order. A phase starts only when its dependencies are signed off, and ends
only when every exit criterion and test passes.

### 23.1 Phase rules

- One phase is one PR or a short series of PRs.
- `main` stays deployable at the end of every phase.
- Every phase ships tests for what it adds.
- No phase introduces a deferred feature (Section 6.6).
- If a phase needs a new route, table, env var, or contract, update Sections 4-8 first.
- Exit criteria are binary; "mostly done" is not done.
- Do not build the next phase's UI before the current phase's API and data layer are stable.

### 23.2 Phase overview

| Phase | Name | Depends on | Primary output |
| --- | --- | --- | --- |
| 0 | Foundation | none | Buildable skeleton, env, schema, health |
| 1 | Auth and access | 0 | Register, login, logout, session guard |
| 2 | App shell | 1 | Marketing and dashboard shells |
| 3 | CDN pipeline | 1, 2 | Asset upload, list, copy, delete |
| 4 | Short URL pipeline | 1, 2 | Create, redirect, click analytics |
| 5 | File share pipeline | 1, 2, 3 | Upload, expiry, public download |
| 6 | Account, keys, stats | 1-5 | Settings, API keys, overview, activity, storage |
| 7 | Public site and docs | 2 | Landing, legal, API docs, SEO |
| 8 | Security hardening | 1-7 | Limits, headers, negative tests, coverage |
| 9 | Deployment | 0-8 | Caddy, Cloudflare, COS, worker, monitoring |
| 10 | Polish and release | 0-9 | Accessibility, performance, final QA |

### 23.3 Phase 0 - Foundation

**Goal:** an executable skeleton where contracts are enforced from day one.

**Deliverables**

- pnpm project with Next.js 16, TypeScript strict, Tailwind 4, shadcn-style primitives.
- `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`,
  `playwright.config.ts`, `drizzle.config.ts`.
- `.env.example` and `src/lib/env.ts` with Zod validation.
- `src/lib/`: `errors.ts`, `logger.ts`, `constants.ts`, `utils.ts`, `id-generator.ts`,
  `file-validator.ts`, `rate-limiter.ts`, `redis.ts`, `urls.ts`.
- `src/lib/api/`: `handler.ts`, `response.ts`, `pagination.ts`.
- `src/db/`: `index.ts`, `enums.ts`, all six schema files, initial migration.
- Root `layout.tsx`, `globals.css`, `loading.tsx`, `error.tsx`, `global-error.tsx`,
  `not-found.tsx`, `robots.ts`, `sitemap.ts`.
- `GET /api/health`.

**Exit criteria**

- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm build` pass.
- [ ] The initial migration applies cleanly to an empty database.
- [ ] `/api/health` reports PostgreSQL and Redis connectivity.
- [ ] No feature pages or feature endpoints exist yet.

**Tests:** env parsing, ID generators, file validation, health handler.

### 23.4 Phase 1 - Auth and Access

**Goal:** identity, sessions, and route protection.

**Deliverables**

- `repositories/user.repository.ts`.
- `services/auth/password.service.ts`, `session.service.ts`.
- `lib/validation/auth.schema.ts`, `lib/api/auth-guard.ts`.
- `api/auth/{register,login,logout,me}/route.ts`.
- `(auth)/layout.tsx`, `login/page.tsx`, `register/page.tsx`, `login-form.tsx`,
  `register-form.tsx`.
- `proxy.ts`: host routing plus `/dashboard/*` session guard.
- Auth rate limits and `session:blacklist` on logout.

**Exit criteria**

- [ ] Register, login, logout, and `me` work through the browser.
- [ ] Cookie is `httpOnly`, `secure` in production, `sameSite=lax`, 7-day expiry.
- [ ] Signed-in users are redirected away from auth pages.
- [ ] Unknown user and wrong password return the same error.
- [ ] Password change and logout-all increment `session_version`.
- [ ] Unauthenticated `/dashboard/*` requests redirect to `/login?next=...`.

**Tests:** password hash/verify, JWT sign/verify, all four handlers, auth e2e.

### 23.5 Phase 2 - App Shell

**Goal:** navigable interface with no feature data yet.

**Deliverables**

- `(marketing)/layout.tsx`, `site-header.tsx`, `site-footer.tsx`, landing placeholder,
  `terms/page.tsx`, `privacy/page.tsx`.
- `(dashboard)/layout.tsx`, `sidebar-nav.tsx`, `mobile-nav.tsx`, `top-navbar.tsx`,
  `storage-meter.tsx` with static quota data.
- `components/shared/`: page header, empty state, error state, skeletons, confirm dialog, copy
  button, pagination.
- `(dashboard)/loading.tsx`, `(dashboard)/error.tsx`, `(public-dl)` boundaries.
- Static overview cards and panels.

**Exit criteria**

- [ ] Shell works at 360 px, 768 px, and 1440 px without horizontal scroll.
- [ ] Sidebar collapses to a sheet below `lg`.
- [ ] Active navigation state and breadcrumbs are correct.
- [ ] All icons come from `lucide-react`; no emoji.
- [ ] Keyboard navigation and focus rings work in the sidebar, menu, and dialogs.
- [ ] Empty, loading, and error states render for every placeholder panel.

**Tests:** component tests for shell pieces, e2e navigation.

### 23.6 Phase 3 - CDN Pipeline

**Goal:** upload, list, copy, and delete public CDN assets.

**Deliverables**

- `services/storage/cos-client.ts`, `object-key.service.ts`, `quota.service.ts`,
  `cdn-upload.service.ts`.
- `repositories/cdn-asset.repository.ts`.
- `api/cdn/route.ts`, `upload/route.ts`, `upload/complete/route.ts`, `[id]/route.ts`.
- `hooks/use-cdn-assets.ts`, `use-direct-upload.ts`.
- `components/cdn/`: dropzone, asset table, asset detail.
- `/dashboard/cdn` and `/dashboard/cdn/[id]`.
- Orphan object cleanup job stub.

**Exit criteria**

- [ ] Image, video, and raw uploads succeed directly to COS.
- [ ] Size limits and MIME/magic-byte rules are enforced server-side.
- [ ] Quota is checked before presigning and re-checked on complete.
- [ ] Listing, search, folder filter, copy URL, and delete are owner-scoped.
- [ ] Delete removes the object and decrements quota in one flow.
- [ ] Public URL resolves through `cdn.lydev.id`.

**Tests:** quota math, key generation, presign and complete handlers, delete ownership, e2e upload
with a mocked COS client.

### 23.7 Phase 4 - Short URL Pipeline

**Goal:** custom short links with Redis redirects and click analytics.

**Deliverables**

- `services/shortener/slug-validator.service.ts`, `redirect.service.ts`, `click-tracker.service.ts`.
- `repositories/short-url.repository.ts`, `url-click-event.repository.ts`.
- `api/urls/route.ts`, `check/route.ts`, `[id]/route.ts`, `[id]/stats/route.ts`.
- `app/r/[slug]/route.ts`.
- `hooks/use-short-urls.ts`.
- `components/urls/`: create form, list table, stats panel.
- `/dashboard/urls` and `/dashboard/urls/[id]`.
- Redis cache, negative cache, and click buffering.

**Exit criteria**

- [ ] Custom and generated slugs both work; collisions retry and fail cleanly.
- [ ] Reserved slugs are rejected.
- [ ] `target_url` rejects private, loopback, and metadata addresses.
- [ ] Redirect is 302, `no-store`, and `no-referrer`.
- [ ] Inactive returns 404; deleted returns 404; missing returns 404.
- [ ] Clicks increment in Redis and flush to PostgreSQL.
- [ ] Editing or deleting a slug invalidates the cache.
- [ ] Analytics page shows totals, daily series, and top referrers.

**Tests:** slug validation, SSRF rules, redirect handler, cache invalidation, stats query, e2e
create and redirect.

### 23.8 Phase 5 - File Share Pipeline

**Goal:** private file uploads, expiring links, and public download pages.

**Deliverables**

- `services/storage/dl-presign.service.ts`, `cleanup.service.ts`.
- `repositories/dl-file.repository.ts`.
- `api/dl/route.ts`, `upload/route.ts`, `upload/complete/route.ts`, `[fileId]/route.ts`,
  `[fileId]/download/route.ts`.
- `(public-dl)/d/[fileId]/[[...slug]]/page.tsx` plus its loading, error, and not-found boundaries.
- `hooks/use-dl-files.ts`.
- `components/dl/`: upload modal, file table, file detail, download card.
- `/dashboard/files` and `/dashboard/files/[fileId]`.
- `worker/cleanup-expired.job.ts`.

**Exit criteria**

- [ ] Uploads up to `MAX_DL_BYTES` work directly to COS.
- [ ] Expiry can be set, edited, and removed.
- [ ] Download counts increment atomically.
- [ ] Expired links return 410 and are removed by the worker.
- [ ] Presigned downloads set `Content-Disposition: attachment`.
- [ ] Wrong slug redirects to the canonical slug.
- [ ] Objects remain private; no public bucket URL works.

**Tests:** expiry logic, filename sanitization, download handler, cleanup job, e2e upload/download.

### 23.9 Phase 6 - Account, API Keys, and Stats

**Goal:** complete account management and real dashboard metrics.

**Deliverables**

- `services/account/account.service.ts`, `services/auth/api-key.service.ts`.
- `repositories/api-key.repository.ts`, `activity.repository.ts`.
- `services/stats/overview.service.ts`, `activity.service.ts`, `storage-stats.service.ts`.
- `api/account/{profile,password,logout-all}/route.ts`, `api-keys/route.ts`,
  `api-keys/[id]/route.ts`.
- `api/stats/{overview,activity,storage}/route.ts`.
- Settings layout plus profile, security, storage, and API key pages.
- `components/settings/`, `components/dashboard/activity-table.tsx`,
  `storage-breakdown.tsx`.
- `/dashboard/activity`, `/dashboard/settings/storage`.
- Wire the real overview page and live storage meter.

**Exit criteria**

- [ ] Profile and password updates work; password change revokes old sessions.
- [ ] Logout-all invalidates every session.
- [ ] API keys are shown once, stored hashed, listed by prefix, and revocable.
- [ ] API key authentication works with `Authorization: Bearer lydev_...`.
- [ ] Overview metrics match the underlying tables.
- [ ] Activity log paginates across all three features.
- [ ] Storage page shows totals by category and largest files.

**Tests:** profile/password handlers, API key lifecycle, stats aggregation, e2e settings.

### 23.10 Phase 7 - Public Site and Documentation

**Goal:** a complete public-facing site.

**Deliverables**

- Landing content: hero, feature sections for CDN, short links, and file sharing, calls to action.
- `docs/api/page.tsx` with authentication, endpoint, pagination, and error examples.
- Full `terms` and `privacy` content.
- Metadata, canonical URLs, `robots.ts`, `sitemap.ts`.
- Footer links to terms, privacy, docs, and login.

**Exit criteria**

- [ ] Public pages render without authentication and link correctly.
- [ ] Metadata and canonical URLs are correct per host.
- [ ] Sitemap excludes `/dashboard` and `/api`.
- [ ] No placeholder copy remains.

**Tests:** public route smoke e2e, metadata snapshot.

### 23.11 Phase 8 - Security Hardening and Coverage

**Goal:** close the security and quality gaps before deployment.

**Deliverables**

- Rate limits on every endpoint listed in Section 14.
- CSRF origin checks on all mutating endpoints.
- CSP, HSTS, and security headers verified end-to-end.
- Negative tests: SSRF, open redirect, path traversal, oversized upload, wrong owner, expired file,
  revoked key, malformed JWT.
- Coverage report for services and repositories.
- `pnpm audit` clean.

**Exit criteria**

- [ ] Every security item in Section 14 has a test or an explicit manual check.
- [ ] No high or critical dependency advisory.
- [ ] All critical-path e2e tests pass.
- [ ] Services and repositories meet the 70 percent line coverage target.

**Tests:** full unit, API, and e2e suite.

### 23.12 Phase 9 - Deployment and Operations

**Goal:** run the platform on the VPS with Cloudflare and COS.

**Deliverables**

- `Caddyfile` matching Section 19.2.
- systemd units or PM2 config for the web app and the worker.
- Worker service running cleanup, counter flush, and click pruning.
- Cloudflare DNS, cache rules, WAF, and TLS settings.
- COS custom domain binding, CORS, bucket policy, and ACL verification.
- Daily `pg_dump` backup job with retention.
- Health monitoring and alerting.
- Production `.env` on the server; no secrets in the repository.

**Exit criteria**

- [ ] Staging deploy passes the smoke suite.
- [ ] `cdn`, `uri`, and `dl` hosts behave as specified.
- [ ] Uploads, redirects, and downloads work through the real infrastructure.
- [ ] Worker jobs run on schedule and are observable.
- [ ] Restore from a backup is verified once.

**Tests:** staging smoke suite, manual infrastructure checklist.

### 23.13 Phase 10 - Polish and Release

**Goal:** release quality, not just working software.

**Deliverables**

- Accessibility audit: labels, focus order, contrast, reduced motion.
- Responsive audit at 360, 768, 1024, and 1440 px.
- Performance pass: LCP, image sizing, route bundle review.
- Copy review: no emoji, consistent terminology, no placeholder text.
- Final QA against the Definition of Done.
- Release checklist and rollback procedure.

**Exit criteria**

- [ ] No P0 or P1 bugs open.
- [ ] Every Definition of Done item passes.
- [ ] Documentation matches the shipped product.
- [ ] Rollback procedure is documented and tested.

### 23.14 Tracking checklist

- [ ] Phase 0 - Foundation
- [ ] Phase 1 - Auth and access
- [ ] Phase 2 - App shell
- [ ] Phase 3 - CDN pipeline
- [ ] Phase 4 - Short URL pipeline
- [ ] Phase 5 - File share pipeline
- [ ] Phase 6 - Account, keys, stats
- [ ] Phase 7 - Public site and docs
- [ ] Phase 8 - Security hardening
- [ ] Phase 9 - Deployment
- [ ] Phase 10 - Polish and release

---

## 24. Implementation Status

Local verification on 27 October 2026 with Next.js 16.4.3, PostgreSQL 16 on port 55432, and the
in-memory cache fallback.

| Phase | Status | Evidence |
| --- | --- | --- |
| 0 Foundation | Done | Build, strict TypeScript, Drizzle migration, `/api/health` reports PostgreSQL and cache |
| 1 Auth | Done | Register, login, logout, me, session cookie, proxy guard |
| 2 App shell | Done | Marketing and dashboard shells, solid mobile drawer, responsive at 390 and 1440 px |
| 3 CDN pipeline | Done | R2 upload, list, delete, quota, and cache purge after delete verified |
| 4 Short URL pipeline | Done | Create/update/delete sync to edge KV; Worker returns 302 on `uri.lydev.id`; analytics page |
| 5 File share pipeline | Done | Upload, expiry, MediaFire-style edge page, R2 streaming, KV sync, unavailable state, cleanup worker |
| 6 Account, keys, stats | Done | Profile, password, logout-all, API keys with Bearer auth, overview, activity, storage |
| 7 Public site and docs | Done | Landing, terms, privacy, robots, sitemap, `/docs/api` |
| 8 Security hardening | Done | CSP and security headers, origin checks, rate limits, 30 unit tests, negative tests |
| 9 Deployment | Artifacts ready | `Caddyfile`, systemd units, cleanup timer, backup script, R2, edge Worker; cutover needs VPS TLS and app deployment |
| 10 Polish and release | Local QA done | Playwright sweep: 22 route/viewport checks, zero horizontal overflow, zero console errors; Share QR tested |

Additional implementation files not shown in the earlier tree:

- `src/app/api/dev-storage/{upload,public,file}/route.ts` - development-only object storage.
- `src/lib/{api-key,upload-client}.ts`
- `src/lib/validation/{account,dl}.schema.ts`
- `src/repositories/stats.repository.ts`
- `src/types/stats.types.ts`
- `src/services/storage/cleanup.service.ts`
- `src/components/settings/*`, `src/components/dashboard/activity-table.tsx`
- `src/components/shared/share-dialog.tsx`, `src/components/shared/share-button.tsx`
- `src/services/shortener/edge-sync.service.ts`
- `workers/short-links/` (routes `uri.lydev.id/*` and `dl.lydev.id/*`, KV binding `LINKS`, R2 binding `FILES`)
- `scripts/{e2e-local.ps1,worker-cleanup.ts,seed-dev-user.ts,check-pages.mjs,check-share.mjs}`
- `scripts/{r2-check.mjs,r2-list.mjs,empty-r2-bucket.ps1,sync-edge-state.mjs}`
- `scripts/{test-dl-edge.ps1,test-dl-local-page.ps1}`
- `tests/unit/utils.test.ts` (WIB formatting)

Post-QA fixes applied:

- Local public links use `/r/{slug}` and `/d/{fileId}`; production keeps the subdomain forms.
- Download links expose only the short file id, never the original filename.
- The mobile navigation renders through a portal so the header backdrop-filter stacking context
  cannot paint page content over the drawer.
- CDN, short URL, and file rows use a Share button that opens a QR dialog with manual copy and a
  `Link copied.` toast.
- `uri.lydev.id/{slug}` redirects at the edge through a Worker backed by Workers KV; the app syncs
  KV on create, update, and delete.
- `dl.lydev.id/{fileId}` renders a MediaFire-style page at the edge and streams the private R2 object
  from `/{fileId}/download`; metadata syncs to KV on complete, expiry update, and delete.
- The free-tier storage quota is 5 GiB per user.
- All displayed timestamps use `Asia/Jakarta` (WIB); analytics day buckets are grouped in WIB.
- Shared files can carry an optional link password; the public page shows a gate instead of the
  file details, and the download endpoint requires the access cookie before issuing a presigned URL.

Known follow-ups before production: deploy Next.js + Caddy with TLS on the VPS (origin currently
returns nginx default over HTTP), install the systemd units, run the smoke test against staging,
and rotate every development token that was exposed during setup (R2 key pair, `cfut_` user token,
and `cfoat_` OAuth token).
