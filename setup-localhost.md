# Local Setup (No Docker)

Everything runs natively on Windows. No Docker, no containers, no WSL.

## Ports

| Service | Port | Notes |
| --- | --- | --- |
| Next.js dev server | 3000 | `pnpm dev` |
| Project PostgreSQL | 5433 | matches `DATABASE_URL` in `.env.local` |
| System PostgreSQL | 5432 | left untouched, not used by this project |
| Redis | — | `REDIS_URL` is empty, so the in-memory store is used |

The cluster lives in `.pgdata/` (PostgreSQL 16). It is gitignored and must never be committed.

> `README.md` still says port 55432. The active `DATABASE_URL` is
> `postgresql://lydev@127.0.0.1:5433/lydev_cloud`, so always start the cluster on **5433**.

## 1. Start the database

```powershell
$pg = 'C:\Program Files\PostgreSQL\16\bin'
& "$pg\pg_ctl.exe" -D .pgdata -o "-p 5433" -l .pgdata\postgres.log start
```

Check it:

```powershell
& "$pg\pg_isready.exe" -h 127.0.0.1 -p 5433
# 127.0.0.1:5433 - accepting connections
```

First time only (cluster does not exist yet):

```powershell
$pg = 'C:\Program Files\PostgreSQL\16\bin'
& "$pg\initdb.exe" -D .pgdata -U lydev --auth=trust --encoding=UTF8 --locale=C
& "$pg\pg_ctl.exe" -D .pgdata -o "-p 5433" -l .pgdata\postgres.log start
& "$pg\createdb.exe" -h 127.0.0.1 -p 5433 -U lydev lydev_cloud
pnpm db:migrate
```

## 2. Environment

`.env.local` already exists. If you start from scratch:

```powershell
Copy-Item .env.example .env.local
```

Then set `DATABASE_URL=postgresql://lydev@127.0.0.1:5433/lydev_cloud` and fill the R2 keys.
`REDIS_URL` may stay empty locally.

## 3. Seed the debug account (optional, once)

```powershell
pnpm db:seed:dev
```

Login: `lydev` / `123456` (`lydev@lydev.id`). The seed refuses non-local databases.

## 4. Run the app

```powershell
pnpm dev
```

- Local: <http://localhost:3000>
- Login page: <http://localhost:3000/login>
- Health check: <http://localhost:3000/api/health> → `{"data":{"status":"ok","postgres":true,"redis":true,...}}`

## 5. Stop everything

```powershell
# Ctrl+C in the terminal running pnpm dev

$pg = 'C:\Program Files\PostgreSQL\16\bin'
& "$pg\pg_ctl.exe" -D .pgdata -m fast stop
```

## Troubleshooting

**`role "USER" does not exist`** in `.pgdata/postgres.log`
: Something connected without `-U lydev`. Always pass `-U lydev` to `psql`/`createdb` and keep
`DATABASE_URL` pointing at `lydev@127.0.0.1:5433`.

**Health check returns `postgres: false`**
: The cluster is not on 5433. Run `pg_ctl status`, then restart with `-o "-p 5433"`.

**Port 5433 already in use**
: `netstat -ano | findstr :5433` to find the PID, or stop the stray cluster with
`pg_ctl -D .pgdata -m fast stop`.

**`pnpm db:migrate` fails**
: Database up on the right port, and `lydev_cloud` exists (`createdb` step above).

**Checking the database by hand**

```powershell
& "$pg\psql.exe" -h 127.0.0.1 -p 5433 -U lydev -d lydev_cloud -c "\dt"
```
