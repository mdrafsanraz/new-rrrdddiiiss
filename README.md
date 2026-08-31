# RDISTRO

Music distribution platform (Next.js) — marketing site + multi-tenant user dashboard. One shared LabelGrid sandbox account underneath; Stripe for subscriptions.

## Local development

1. Start Postgres:

```bash
docker compose up -d
```

2. Copy env and install:

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up → `/dashboard`.

## Railway production

### 1. Services

1. New project → **PostgreSQL**
2. New service from this GitHub repo (`mdrafsanraz/new-rrrdddiiiss`)

### 2. Variables (web service — this is the step that usually fails)

Adding Postgres does **not** automatically give your web app `DATABASE_URL`.

1. Click your **web** service (the Next.js app), not Postgres  
2. Open **Variables**  
3. **Add Variable** → **Add Reference** (or paste a reference):

| Name | Value |
|------|--------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |

If your Postgres service has a different name, pick that service’s `DATABASE_URL` from the reference picker.

4. Also add these shared/raw variables on the **web** service:

| Name | Value |
|------|--------|
| `AUTH_SECRET` | any long random string (e.g. `openssl rand -hex 32`) |
| `NEXT_PUBLIC_APP_URL` | `https://rdistro.net` (see custom domain setup below) |
| `HOSTNAME` | `0.0.0.0` |
| `LABELGRID_ENV` | `sandbox` |
| `S3_ENDPOINT` | from your Bucket service's **Connect** panel |
| `S3_BUCKET` | from your Bucket service's **Connect** panel |
| `S3_ACCESS_KEY_ID` | from your Bucket service's **Connect** panel |
| `S3_SECRET_ACCESS_KEY` | from your Bucket service's **Connect** panel |
| `CRON_SECRET` | a separate long random string used by the delayed ACR worker |

5. **Document storage (required for review-issue uploads)**

Cover art and audio go straight to LabelGrid and never touch this app's storage. What *does* need persistent storage: release documents (proof of rights, track licenses, etc.) uploaded when a release is in "Changes Required" — LabelGrid has no upload endpoint for these, so RDISTRO stores them itself.

1. New service → **Bucket** (Railway's S3-compatible object storage template)
2. Bucket service → **Connect** tab → copy the endpoint, bucket name, access key, and secret key
3. Web service → Variables → set `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
4. Redeploy

Without these set, document uploads fall back to local disk, which does **not** survive a redeploy unless you separately mount a volume and set `UPLOADS_DIR`.

6. **Redeploy** the web service

On start, the app runs `prisma db push` to create tables in Postgres (no migration step).

The same service also starts a lightweight ACR worker when `CRON_SECRET` and all
three `ACRCLOUD_*` credentials are present. A submitted release is persisted in
Postgres with a due time five minutes ahead; the worker picks it up within about
ten seconds of that time. No separate Railway cron service is required.

### 3. Deploy settings

`railway.toml` uses **Nixpacks** (not the optional Dockerfile).

- **Build:** `npm run build`
- **Start:** `npm start` → schema sync + standalone server on `0.0.0.0`
- **Healthcheck:** `/api/health`

If Railway still builds with Docker, clear **Settings → Build → Dockerfile path** (leave empty) so Nixpacks is used.

### 4. Custom domain — rdistro.net

The production domain for this app is `https://rdistro.net`.

1. Web service → **Settings → Networking → Custom Domain** → enter `rdistro.net` (and `www.rdistro.net` if you want the www variant too — add it as a second custom domain)
2. Railway shows a DNS record to add (typically a `CNAME` pointing at your Railway-generated `*.up.railway.app` target; for an apex/root domain like `rdistro.net` Railway may instead ask for an `A`/`ALIAS`/`ANAME` record depending on what your DNS provider supports — follow exactly what Railway's panel displays for this project, since the target hostname is unique per service)
3. Add that record at whichever registrar/DNS provider manages `rdistro.net`
4. Wait for DNS to propagate and for Railway to show the domain as verified (usually minutes, can take longer depending on DNS TTLs)
5. Once verified, set `NEXT_PUBLIC_APP_URL=https://rdistro.net` in the web service's Variables (see table above) and redeploy

`NEXT_PUBLIC_APP_URL` is what every email this app sends (welcome, password reset, release status, withdrawal, etc.) uses to build links back into the dashboard — until it's updated, those links still point at the old Railway URL even after the domain itself resolves.

I can't do the DNS/Railway dashboard steps myself — they need your access to both. Let me know once the domain is verified and I'll help confirm everything (webhook URL below, `NEXT_PUBLIC_APP_URL`, email links) is consistent.

### 5. Stripe webhook (when ready)

Endpoint: `https://rdistro.net/api/stripe/webhook`  
Events: `checkout.session.completed`, `customer.subscription.*`

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local Next.js |
| `npm run build` | Prisma generate + standalone build |
| `npm run db:deploy` | Apply migrations (CI / Railway) |
| `npm run db:migrate` | Create migrations locally |

### Import migrated users

The migration workbook stays outside Git because it contains customer emails.
Validate it without writing to the database:

```bash
npm run import:migrated-users -- /path/to/rdistro_user_list-migrate.xlsx
```

Run the import against the intended database only after the migration flags have
been deployed:

```bash
npm run import:migrated-users -- /path/to/rdistro_user_list-migrate.xlsx --apply
```

The importer is repeatable. It preserves an existing user’s name and password,
applies the workbook plan, requires a password reset, and enables the catalog
migration notice. Newly created accounts receive an unusable random password
hash and must use the emailed reset flow.

## Architecture notes

See `important.md`: RDISTRO owns users/plans/ownership; LabelGrid is one distributor account; Free release limits count **submitted** releases only.
