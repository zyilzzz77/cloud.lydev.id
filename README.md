# Lydev Cloud

CDN asset hosting, custom short URLs, and file sharing for the `lydev.id` ecosystem.

The full architecture, contracts, and phase plan live in
[`agents_md_cloud_lydev_architecture_guidelines.md`](./agents_md_cloud_lydev_architecture_guidelines.md).

## Stack

- Next.js 16 App Router, React 19, TypeScript strict
- Tailwind CSS 4 with a dark obsidian/navy design system
- PostgreSQL 16 and Drizzle ORM
- Redis for redirect caching, rate limits, and session revocation
- Cloudflare R2 for object storage (two buckets: public CDN and private files)
- Cloudflare Worker + Workers KV for edge short-link redirects
- Share dialogs with a scannable QR code and manual copy
- Argon2id passwords and JWT session cookies
- Free-tier storage quota: 5 GiB per user
- All timestamps are displayed in WIB (`Asia/Jakarta`)

## Local development

### 1. Database

The repository uses a project-local PostgreSQL cluster on port 55432 so the system service on 5432
is untouched.

```powershell
$pg = 'C:\Program Files\PostgreSQL\16\bin'
& "$pg\initdb.exe" -D .pgdata -U lydev --auth=trust --encoding=UTF8 --locale=C
& "$pg\pg_ctl.exe" -D .pgdata -o "-p 55432" -l .pgdata\postgres.log start
& "$pg\createdb.exe" -h 127.0.0.1 -p 55432 -U lydev lydev_cloud
```

Apply the schema:

```powershell
pnpm db:migrate
```

### 2. Environment

Copy `.env.example` to `.env.local` and adjust values. `REDIS_URL` is optional locally; when it is
empty the cache layer uses an in-memory store.

### 3. Seed the debug account

```powershell
pnpm db:seed:dev
```

The account is `lydev` / `123456` with email `lydev@lydev.id`. The seed refuses non-local databases.

### 4. Run

```powershell
pnpm dev
```

Open `http://localhost:3000` and sign in with the debug account.

Health check:

```powershell
curl http://localhost:3000/api/health
```

### Object storage (Cloudflare R2)

Local and development use Cloudflare R2 by default.

- `lydev-cdn`: public bucket served at `https://cdn.lydev.id`.
- `lydev-files`: private bucket; downloads use short-lived presigned URLs.

Create an R2 API token in the dashboard under R2 > Manage API tokens with Object Read & Write for
both buckets, then add the credentials to `.env.local`:

```text
R2_ACCOUNT_ID=35e5e2aeda35512c4edfb8eced06db50
R2_ENDPOINT=https://35e5e2aeda35512c4edfb8eced06db50.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_CDN_BUCKET=lydev-cdn
R2_FILES_BUCKET=lydev-files
R2_CDN_DOMAIN=cdn.lydev.id
```

`CLOUDFLARE_API_TOKEN` with Zone Cache Purge is used to invalidate `cdn.lydev.id` when an asset is
deleted. Tencent COS and the `.uploads/` filesystem remain available as fallbacks.

## Plans and boost packs

Transfer is metered per UTC month and resets automatically; there is no manual reset. When a plan
runs out mid-month the account can either upgrade or buy a one-time boost pack.

| Plan | Storage | Transfer / month | Price |
| --- | --- | --- | --- |
| Free | 2 GB | 10 GB | Rp 0 |
| Starter | 25 GB | 100 GB | Rp 39.000 |
| Pro | 100 GB | 500 GB | Rp 99.000 |

Free uploads expire after 7 days; paid plans keep files permanently.

| Boost | Storage | Transfer | Price |
| --- | --- | --- | --- |
| Boost 10 | +10 GB | +50 GB | Rp 9.900 |
| Boost 25 | +25 GB | +150 GB | Rp 24.000 |
| Boost 50 | +50 GB | +400 GB | Rp 49.000 |
| Boost 100 | +100 GB | +1 TB | Rp 99.000 |

Boost packs add storage and transfer for the current UTC month only, with charm prices so they read
as a deal. They are one-time; a plan is cheaper for steady traffic and renews every month.

A pack is recorded as a `transfer_topups` row with status `pending`; approving it adds the transfer
to `users.transfer_bonus_bytes` and the storage to `users.storage_bonus_bytes`, both for the current
UTC month only. Approve from the CLI:

```powershell
pnpm topup:approve lydev
pnpm topup:approve lydev boost-50
```

## Malware scanning

Download uploads accept every format, including `.exe`, `.msi`, and installers. Nothing is trusted
by extension: after the object lands in storage, `scanStoredFile` inspects it before the file is
registered, so a flagged upload never gets a download link.

- Offline heuristics always run: EICAR signature, double extensions (`invoice.pdf.exe`), and
  magic-number mismatches (a PE binary named `.jpg`).
- ClamAV runs when `CLAMAV_HOST` points at a local `clamd` (native install, no Docker).
- VirusTotal is queried by SHA-256 when `VIRUSTOTAL_API_KEY` is set; the file never leaves the
  server.
- A `malicious` verdict deletes the object and returns `422 FILE_INFECTED`. `suspicious` and
  unscanned executables stay available, but the download page shows a warning and the scanner
  verdict. Files above `SCAN_MAX_BYTES` (32 MB by default) are only checked by name and header.

Without ClamAV or VirusTotal the verdict is `unscanned`, which is shown as "Not scanned" instead of
a fake "clean".

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm build` | Production build |
| `pnpm start` | Run the production build |
| `pnpm typecheck` | TypeScript check |
| `pnpm lint` | ESLint |
| `pnpm test` | Unit tests |
| `pnpm test:e2e` | Playwright tests |
| `pnpm db:generate` | Generate a Drizzle migration |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:seed:dev` | Seed the local debug account |
| `pnpm worker:cleanup` | Remove expired shared files |
| `pnpm worker:deploy` | Deploy the three edge Workers (downloads, CDN, short links) |

## End-to-end smoke test

With the dev server running:

```powershell
& ./scripts/e2e-local.ps1
```

The script covers login, CDN upload and deletion, short link creation and edge redirect, file upload
and download, API key authentication, and CSRF rejection. Edge redirects do not increment click
analytics while the app origin is unreachable.

## Cloudflare CDN

Wrangler is installed for Cloudflare tooling, but DNS records and cache rules are applied through the
Cloudflare API:

```powershell
pnpm exec wrangler --version
```

The zone already uses Cloudflare R2 for `cdn.lydev.id`; the custom domain was attached with:

```powershell
cf r2 buckets domains custom create lydev-cdn --domain cdn.lydev.id --zone-id <zone-id> --min-tls 1.2
```

For the application hostnames:

1. Create an API token at `https://dash.cloudflare.com/profile/api-tokens` with Zone Read, DNS Edit,
   Cache Rules Edit, Zone Settings Edit, and Cache Purge for `lydev.id`.
2. Copy `.env.cloudflare.example` to `.env.cloudflare` and fill `CLOUDFLARE_API_TOKEN` and `VPS_IP`.
   `COS_CDN_TARGET` is only needed when falling back to Tencent COS.
3. Preview the changes, then apply them:

```powershell
pnpm cloudflare:cdn -- --dry-run
pnpm cloudflare:cdn
```

The script upserts the `cloud`, `uri`, and `dl` A records, optionally the `cdn` CNAME, enables
HTTPS/HSTS/HTTP3, and creates the one-year cache rule for `cdn.lydev.id`. WAF rate limiting is
plan-dependent and must be added in the dashboard if your plan supports it.

`wrangler login` only authenticates the Workers/Pages tooling; it is not used by this DNS script.

### Edge short links

`uri.lydev.id/{slug}` and `dl.lydev.id/{fileId}` are served by the Worker in
`workers/short-links`, backed by the Workers KV namespace `lydev-short-links` (`LINKS` binding) and
the private `lydev-files` R2 bucket (`FILES` binding). The app writes the KV mapping on create,
update, enable/disable, and delete using `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_KV_NAMESPACE_ID`, and
`CLOUDFLARE_API_TOKEN`.

- `uri.lydev.id/{slug}` returns a 302 to the target.
- `dl.lydev.id/{fileId}` renders a MediaFire-style download page.
- `dl.lydev.id/{fileId}/download` streams the private R2 object as an attachment.

```powershell
pnpm worker:deploy
```

The deploy script temporarily hides `.env.local` so Wrangler uses its stored OAuth session instead
of the runtime API token, then restores the file.

The Worker serves both hosts at the edge, so links keep working even when the VPS is down. Edge
redirects and downloads do not currently increment the in-app click/download analytics.

## Deployment

1. Build with `pnpm build` and copy `.next/standalone`, `.next/static`, and `public` to
   `/srv/lydev-cloud`.
2. Copy `.env.example` to `/srv/lydev-cloud/.env` and fill every production value.
3. Install the systemd units from `deploy/` and enable the cleanup timer.
4. Point Caddy at `127.0.0.1:3000` using the provided `Caddyfile`.
5. Configure Cloudflare DNS, cache rules, WAF, and the R2 custom domain as described in the
   architecture document.
6. Schedule `scripts/backup-db.sh` with cron or a systemd timer.

Never commit `.env`, credentials, presigned URLs, or the `.pgdata` directory.
